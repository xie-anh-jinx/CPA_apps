"""
Router — Customer 360 & CRM
Profil terpadu, histori, aktivitas, opportunities, complaints
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date
from pydantic import BaseModel

from app.database import get_analytics_db, get_existing_db
from app.models.analytics.models import (
    CRMActivity, CRMOpportunity, CRMComplaint, CRMFollowupReminder
)
from app.routers.auth import CurrentUser, forbid_roles

router = APIRouter(dependencies=[Depends(forbid_roles("warehouse", "warehouse_staff", detail="Akses ditolak. Pengguna gudang tidak memiliki akses data customer."))])


# ─── Customer List ─────────────────────────────────────────────────────────────
@router.get("/")
async def list_customers(
    search: Optional[str] = None,
    segment: Optional[str] = Query(None, description="active|dormant|at_risk|churned|lead"),
    segment_dim: Optional[str] = Query(None, description="kategori|activity|top|revenue_tier|credit_limit|kantor"),
    segment_val: Optional[str] = Query(None, description="Exact segment value to filter"),
    isaktif: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    db_existing: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar customer dengan metrik dan segmentasi multi-dimensi."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if search:
        search_term = f"%{search.strip()}%"
        matched_sales_ids = []
        try:
            sales_matches = db_existing.execute(
                text("SELECT id_pegawai FROM pegawai WHERE nama ILIKE :s OR nama_panggilan ILIKE :s OR id_pegawai ILIKE :s"),
                {"s": search_term}
            ).scalars().all()
            matched_sales_ids = list(sales_matches)
        except Exception:
            pass

        search_conds = [
            "cust.nama_customer ILIKE :search",
            "cust.id_kontak ILIKE :search",
            "cust.id_salesman ILIKE :search",
        ]
        params["search"] = search_term

        if matched_sales_ids:
            placeholders = ",".join([f":msid{i}" for i in range(len(matched_sales_ids))])
            for i, msid in enumerate(matched_sales_ids):
                params[f"msid{i}"] = msid
            search_conds.append(f"cust.id_salesman IN ({placeholders})")

        conditions.append(f"({' OR '.join(search_conds)})")

    # Direct segment filter (legacy or shortcut for activity)
    if segment:
        conditions.append("cust.dim_activity = :segment")
        params["segment"] = segment

    # Multi-dimensional segment filter
    if segment_dim and segment_val:
        dim_col_map = {
            "kategori": "cust.dim_kategori",
            "activity": "cust.dim_activity",
            "top": "cust.dim_top",
            "credit_limit": "cust.dim_credit_limit",
            "revenue_tier": "cust.dim_revenue_tier",
            "kantor": "cust.dim_kantor",
        }
        col = dim_col_map.get(segment_dim)
        if col:
            conditions.append(f"{col} = :segment_val")
            params["segment_val"] = segment_val

    if isaktif is not None:
        conditions.append("cust.isaktif = :isaktif")
        params["isaktif"] = isaktif

    # Role-based Row-Level Security
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        conditions.append("cust.id_salesman = :user_pegawai")
        params["user_pegawai"] = current_user.id_pegawai

    sql = f"""
        WITH anchor AS (
            SELECT COALESCE(MAX(tanggal), CURRENT_DATE) as anchor_dt
            FROM operational.invoices
        ),
        cust AS (
            SELECT
                c.id_kontak, c.nama_customer, c.telepon, c.email,
                c.nama_kategori, c.isaktif, c.id_salesman, c.id_kantor,
                c.top, c.batas_kredit,
                COALESCE(cm.total_orders, 0) AS total_orders,
                COALESCE(cm.total_revenue, 0) AS total_revenue,
                cm.last_purchase_date,
                cm.days_since_last_purchase,
                COALESCE(cm.total_piutang, 0) AS total_piutang,
                COALESCE(NULLIF(TRIM(c.nama_kategori), ''), 'Umum') AS dim_kategori,
                CASE
                    WHEN cm.last_purchase_date IS NULL THEN 'lead'
                    WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 60 THEN 'active'
                    WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 120 THEN 'dormant'
                    WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 180 THEN 'at_risk'
                    ELSE 'churned'
                END AS dim_activity,
                CASE 
                    WHEN c.top IS NULL OR c.top <= 0 THEN 'Cash / COD'
                    WHEN c.top <= 14 THEN '14 Hari'
                    WHEN c.top <= 30 THEN '30 Hari'
                    WHEN c.top <= 45 THEN '45 Hari'
                    WHEN c.top <= 60 THEN '60 Hari'
                    WHEN c.top <= 90 THEN '90 Hari'
                    ELSE '> 90 Hari'
                END AS dim_top,
                CASE 
                    WHEN c.batas_kredit IS NULL OR c.batas_kredit <= 0 THEN 'Tanpa Plafon (Rp 0)'
                    WHEN c.batas_kredit < 50000000 THEN '< Rp 50 Jt'
                    WHEN c.batas_kredit < 200000000 THEN 'Rp 50 Jt - 200 Jt'
                    WHEN c.batas_kredit < 1000000000 THEN 'Rp 200 Jt - 1 Miliar'
                    ELSE '> Rp 1 Miliar'
                END AS dim_credit_limit,
                COALESCE(NULLIF(TRIM(c.id_kantor), ''), 'HO') AS dim_kantor,
                CASE
                    WHEN COALESCE(cm.total_revenue, 0) >= 10000000000 THEN 'Platinum (> 10 M)'
                    WHEN COALESCE(cm.total_revenue, 0) >= 1000000000 THEN 'Gold (1 - 10 M)'
                    WHEN COALESCE(cm.total_revenue, 0) >= 100000000 THEN 'Silver (100 Jt - 1 M)'
                    WHEN COALESCE(cm.total_revenue, 0) > 0 THEN 'Bronze (< 100 Jt)'
                    ELSE 'Non-Transaksi'
                END AS dim_revenue_tier
            FROM operational.customers c
            LEFT JOIN analytics.customer_metrics cm ON c.id_kontak = cm.id_kontak
        )
        SELECT 
            id_kontak, nama_customer, telepon, email,
            nama_kategori, isaktif, id_salesman, id_kantor,
            top, batas_kredit,
            total_orders, total_revenue, last_purchase_date,
            days_since_last_purchase, total_piutang,
            dim_activity AS segment,
            dim_kategori, dim_top, dim_credit_limit, dim_revenue_tier, dim_kantor
        FROM cust
        WHERE {' AND '.join(conditions)}
        ORDER BY total_revenue DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """
    rows = db.execute(text(sql), params).mappings().all()
    result = [dict(r) for r in rows]

    # Enrich with sales name from cpa_existing
    salesman_ids = list({r["id_salesman"] for r in result if r.get("id_salesman")})
    if salesman_ids:
        try:
            placeholders = ",".join([f":s{i}" for i in range(len(salesman_ids))])
            sales_params = {f"s{i}": sid for i, sid in enumerate(salesman_ids)}
            sales_rows = db_existing.execute(
                text(f"SELECT id_pegawai, nama, nama_panggilan FROM pegawai WHERE id_pegawai IN ({placeholders})"),
                sales_params
            ).mappings().all()
            sales_map = {r["id_pegawai"]: {"nama": r["nama"], "panggilan": r["nama_panggilan"]} for r in sales_rows}
            for r in result:
                sid = r.get("id_salesman")
                if sid and sid in sales_map:
                    r["nama_sales"] = sales_map[sid]["nama"]
                    r["panggilan_sales"] = sales_map[sid]["panggilan"]
                else:
                    r["nama_sales"] = None
                    r["panggilan_sales"] = None
        except Exception:
            for r in result:
                r["nama_sales"] = None
                r["panggilan_sales"] = None
    else:
        for r in result:
            r["nama_sales"] = None
            r["panggilan_sales"] = None

    return result


# ─── Customer Segmentation ───────────────────────────────────────────────────
@router.get("/segmentation")
async def get_customer_segmentation(
    dim: Optional[str] = Query("all", description="all|kategori|activity|top|revenue_tier|credit_limit|kantor"),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """
    Statistik multi-dimensi segmentasi pelanggan CPA:
    1. kategori: Badan Usaha (Perusahaan) vs Personal vs Umum
    2. activity: Status keaktifan berbasis tanggal transaksi terakhir (Active, Dormant, At Risk, Churned, Lead)
    3. top: Distribusi Terms of Payment (Cash / COD s/d > 90 Hari)
    4. revenue_tier: Kontribusi omzet LTV (Platinum, Gold, Silver, Bronze, Non-Transaksi)
    5. credit_limit: Distribusi plafon kredit (Tanpa Plafon s/d > 1 Miliar)
    6. kantor: Wilayah kantor cabang operasional
    """
    extra_filter = ""
    params = {}
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        extra_filter = " WHERE c.id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    sql = f"""
    WITH anchor AS (
        SELECT COALESCE(MAX(tanggal), CURRENT_DATE) as anchor_dt
        FROM operational.invoices
    ),
    cust_base AS (
        SELECT 
            c.id_kontak,
            COALESCE(NULLIF(TRIM(c.nama_kategori), ''), 'Umum') AS dim_kategori,
            CASE 
                WHEN c.top IS NULL OR c.top <= 0 THEN 'Cash / COD'
                WHEN c.top <= 14 THEN '14 Hari'
                WHEN c.top <= 30 THEN '30 Hari'
                WHEN c.top <= 45 THEN '45 Hari'
                WHEN c.top <= 60 THEN '60 Hari'
                WHEN c.top <= 90 THEN '90 Hari'
                ELSE '> 90 Hari'
            END AS dim_top,
            CASE 
                WHEN c.batas_kredit IS NULL OR c.batas_kredit <= 0 THEN 'Tanpa Plafon (Rp 0)'
                WHEN c.batas_kredit < 50000000 THEN '< Rp 50 Jt'
                WHEN c.batas_kredit < 200000000 THEN 'Rp 50 Jt - 200 Jt'
                WHEN c.batas_kredit < 1000000000 THEN 'Rp 200 Jt - 1 Miliar'
                ELSE '> Rp 1 Miliar'
            END AS dim_credit_limit,
            COALESCE(NULLIF(TRIM(c.id_kantor), ''), 'HO') AS dim_kantor,
            COALESCE(cm.total_revenue, 0) AS total_revenue,
            COALESCE(cm.total_orders, 0) AS total_orders,
            cm.last_purchase_date,
            CASE
                WHEN cm.last_purchase_date IS NULL THEN 'lead'
                WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 60 THEN 'active'
                WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 120 THEN 'dormant'
                WHEN ((SELECT anchor_dt FROM anchor) - cm.last_purchase_date) <= 180 THEN 'at_risk'
                ELSE 'churned'
            END AS dim_activity,
            CASE
                WHEN COALESCE(cm.total_revenue, 0) >= 10000000000 THEN 'Platinum (> 10 M)'
                WHEN COALESCE(cm.total_revenue, 0) >= 1000000000 THEN 'Gold (1 - 10 M)'
                WHEN COALESCE(cm.total_revenue, 0) >= 100000000 THEN 'Silver (100 Jt - 1 M)'
                WHEN COALESCE(cm.total_revenue, 0) > 0 THEN 'Bronze (< 100 Jt)'
                ELSE 'Non-Transaksi'
            END AS dim_revenue_tier
        FROM operational.customers c
        LEFT JOIN analytics.customer_metrics cm ON c.id_kontak = cm.id_kontak
        {extra_filter}
    )
    SELECT 'kategori' as dim, dim_kategori as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_kategori
    UNION ALL
    SELECT 'activity' as dim, dim_activity as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_activity
    UNION ALL
    SELECT 'top' as dim, dim_top as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_top
    UNION ALL
    SELECT 'revenue_tier' as dim, dim_revenue_tier as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_revenue_tier
    UNION ALL
    SELECT 'credit_limit' as dim, dim_credit_limit as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_credit_limit
    UNION ALL
    SELECT 'kantor' as dim, dim_kantor as seg, COUNT(*) as cnt, SUM(total_revenue) as rev, AVG(total_revenue) as avg_rev FROM cust_base GROUP BY dim_kantor
    """
    rows = db.execute(text(sql), params).mappings().all()

    SORT_ORDERS = {
        "activity": ["active", "dormant", "at_risk", "churned", "lead"],
        "top": ["Cash / COD", "14 Hari", "30 Hari", "45 Hari", "60 Hari", "90 Hari", "> 90 Hari"],
        "revenue_tier": ["Platinum (> 10 M)", "Gold (1 - 10 M)", "Silver (100 Jt - 1 M)", "Bronze (< 100 Jt)", "Non-Transaksi"],
        "credit_limit": ["Tanpa Plafon (Rp 0)", "< Rp 50 Jt", "Rp 50 Jt - 200 Jt", "Rp 200 Jt - 1 Miliar", "> Rp 1 Miliar"],
    }

    raw_dims = {
        "kategori": [],
        "activity": [],
        "top": [],
        "revenue_tier": [],
        "credit_limit": [],
        "kantor": [],
    }

    total_cust = 0
    total_rev = 0.0

    for r in rows:
        d = r["dim"]
        cnt = int(r["cnt"])
        rev = float(r["rev"]) if r["rev"] else 0.0
        avg = float(r["avg_rev"]) if r["avg_rev"] else 0.0
        item = {
            "segment": r["seg"],
            "jumlah": cnt,
            "total_revenue": rev,
            "avg_revenue": avg,
        }
        if d in raw_dims:
            raw_dims[d].append(item)
            if d == "kategori":
                total_cust += cnt
                total_rev += rev

    for d, items in raw_dims.items():
        for it in items:
            it["percentage"] = round((it["jumlah"] / total_cust * 100), 1) if total_cust > 0 else 0
            it["revenue_percentage"] = round((it["total_revenue"] / total_rev * 100), 1) if total_rev > 0 else 0

        if d in SORT_ORDERS:
            order_map = {name: idx for idx, name in enumerate(SORT_ORDERS[d])}
            items.sort(key=lambda x: order_map.get(x["segment"], 99))
        else:
            items.sort(key=lambda x: x["jumlah"], reverse=True)

    dimensions_meta = [
        {
            "id": "kategori",
            "label": "Kategori Entitas",
            "icon": "🏢",
            "description": "Segmentasi badan usaha vs perorangan (Perusahaan, Personal, Umum)",
            "total_segments": len(raw_dims["kategori"]),
        },
        {
            "id": "activity",
            "label": "Aktivitas & Siklus",
            "icon": "⚡",
            "description": "Status keaktifan pelanggan berdasarkan recency pembelian",
            "total_segments": len(raw_dims["activity"]),
        },
        {
            "id": "top",
            "label": "Terms of Payment (TOP)",
            "icon": "⏱️",
            "description": "Termin jatuh tempo pembayaran invoice penjualan",
            "total_segments": len(raw_dims["top"]),
        },
        {
            "id": "revenue_tier",
            "label": "Tier Omzet (LTV)",
            "icon": "💰",
            "description": "Tingkat kontribusi omzet akumulatif pelanggan",
            "total_segments": len(raw_dims["revenue_tier"]),
        },
        {
            "id": "credit_limit",
            "label": "Plafon Kredit",
            "icon": "💳",
            "description": "Tingkatan plafon batas kredit yang diberikan ke pelanggan",
            "total_segments": len(raw_dims["credit_limit"]),
        },
        {
            "id": "kantor",
            "label": "Wilayah Cabang",
            "icon": "📍",
            "description": "Distribusi pelanggan menurut kantor cabang operasional",
            "total_segments": len(raw_dims["kantor"]),
        },
    ]

    if dim and dim in raw_dims and dim != "all":
        return {
            "dimension": dim,
            "dimensions": dimensions_meta,
            "segments": raw_dims[dim],
            "total_customers": total_cust,
            "total_revenue": total_rev,
        }

    return {
        "dimensions": dimensions_meta,
        "data": raw_dims,
        "total_customers": total_cust,
        "total_revenue": total_rev,
    }


# ─── Sales Relations (Relasi Sales & Customer) ─────────────────────────────────
@router.get("/sales-relations")
async def get_sales_relations(
    search: Optional[str] = None,
    id_sales: Optional[str] = None,
    db_existing: Session = Depends(get_existing_db),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar seluruh salesperson dengan relasi ke customer yang menjadi tanggung jawabnya."""
    conditions = ["1=1"]
    params: dict = {}

    if search:
        conditions.append("(p.nama ILIKE :search OR p.nama_panggilan ILIKE :search OR p.id_pegawai ILIKE :search)")
        params["search"] = f"%{search}%"

    # Role-based Row-Level Security: restrict to own salesperson id
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        conditions.append("p.id_pegawai = :user_sales")
        params["user_sales"] = current_user.id_pegawai
    elif id_sales:
        conditions.append("p.id_pegawai = :id_sales")
        params["id_sales"] = id_sales

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT
            p.id_pegawai,
            p.nama AS nama_sales,
            p.nama_panggilan AS panggilan,
            p.hp AS telepon_sales,
            p.email AS email_sales,
            p.status AS is_aktif,
            COUNT(c.id_kontak) AS jumlah_customer
        FROM pegawai p
        INNER JOIN customer c ON c.id_sales = p.id_pegawai
        WHERE {where_clause}
        GROUP BY p.id_pegawai, p.nama, p.nama_panggilan, p.hp, p.email, p.status
        ORDER BY jumlah_customer DESC
        LIMIT 200
    """
    sales_rows = db_existing.execute(text(sql), params).mappings().all()

    # Get revenue per salesperson from analytics DB
    rev_conditions = ["c.id_salesman IS NOT NULL", "c.id_salesman != ''"]
    rev_params: dict = {}
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        rev_conditions.append("c.id_salesman = :user_sales")
        rev_params["user_sales"] = current_user.id_pegawai

    rev_where = " AND ".join(rev_conditions)
    rev_rows = db.execute(text(f"""
        SELECT c.id_salesman, SUM(cm.total_revenue) AS total_omzet, SUM(cm.total_piutang) AS total_piutang
        FROM operational.customers c
        JOIN analytics.customer_metrics cm ON c.id_kontak = cm.id_kontak
        WHERE {rev_where}
        GROUP BY c.id_salesman
    """), rev_params).mappings().all()
    rev_map = {r["id_salesman"]: {"total_omzet": float(r["total_omzet"] or 0), "total_piutang": float(r["total_piutang"] or 0)} for r in rev_rows}

    result = []
    for r in sales_rows:
        sid = r["id_pegawai"]
        entry = dict(r)
        entry["total_omzet"] = rev_map.get(sid, {}).get("total_omzet", 0)
        entry["total_piutang"] = rev_map.get(sid, {}).get("total_piutang", 0)
        result.append(entry)

    return result


@router.get("/sales-relations/{id_sales}/customers")
async def get_sales_customers(
    id_sales: str,
    db_existing: Session = Depends(get_existing_db),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar customer yang ditangani oleh salesperson tertentu."""
    # Role-based Row-Level Security: for sales and sales_rep, only allow access to their own customer relation
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        if id_sales != current_user.id_pegawai:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak. Anda hanya dapat melihat relasi customer milik Anda sendiri."
            )

    cust_rows = db_existing.execute(text("""
        SELECT c.id_kontak, c.customer AS nama_customer, c.telepon, c.email,
               c.id_kantor, c.isaktif
        FROM customer c
        WHERE c.id_sales = :id_sales
        ORDER BY c.customer ASC
    """), {"id_sales": id_sales}).mappings().all()

    if not cust_rows:
        return []

    cust_ids = [r["id_kontak"] for r in cust_rows]
    placeholders = ",".join([f":c{i}" for i in range(len(cust_ids))])
    id_params = {f"c{i}": cid for i, cid in enumerate(cust_ids)}

    metrics = db.execute(
        text(f"""
            SELECT id_kontak, total_revenue, total_orders, last_purchase_date, total_piutang
            FROM analytics.customer_metrics
            WHERE id_kontak IN ({placeholders})
        """),
        id_params
    ).mappings().all()
    metrics_map = {m["id_kontak"]: dict(m) for m in metrics}

    result = []
    for r in cust_rows:
        row = dict(r)
        m = metrics_map.get(r["id_kontak"], {})
        row["total_revenue"] = float(m.get("total_revenue") or 0)
        row["total_orders"] = int(m.get("total_orders") or 0)
        row["last_purchase_date"] = m.get("last_purchase_date")
        row["total_piutang"] = float(m.get("total_piutang") or 0)
        result.append(row)

    result.sort(key=lambda x: x["total_revenue"], reverse=True)
    return result


# ─── CRM Credit Health ────────────────────────────────────────────────────────
@router.get("/credit-health")
async def get_customers_credit_health(
    search: Optional[str] = None,
    risk_level: Optional[str] = Query(None, description="all|low|medium|high|critical"),
    delivery_status: Optional[str] = Query(None, description="all|APPROVED|HOLD_OVERDUE|HOLD_LIMIT|WARNING_LIMIT"),
    id_kantor: Optional[str] = None,
    sort_by: str = Query("overdue_amount", description="overdue_amount|total_piutang|batas_kredit|utilization|max_days_overdue|nama_customer"),
    sort_order: str = Query("desc", description="asc|desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db_existing: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Analisis risiko kredit customer untuk Finance Manager, AR Staff, dan Credit Control.
    Memantau Overdue AR, Plafon Kredit vs Realisasi, Hari Keterlambatan, dan Kelayakan Rilis Pengiriman.
    """
    import math

    conditions = ["(COALESCE(ar.total_piutang, 0) > 0 OR COALESCE(c.batas_kredit, 0) > 0)"]
    params: dict = {}

    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        conditions.append("c.id_sales = :user_sales")
        params["user_sales"] = current_user.id_pegawai

    if search:
        conditions.append("(c.customer ILIKE :search OR c.id_kontak ILIKE :search OR p.nama ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    if id_kantor:
        conditions.append("c.id_kantor = :id_kantor")
        params["id_kantor"] = id_kantor

    where_clause = " AND ".join(conditions)

    # Base query for all customers having AR or Credit Limit
    sql = f"""
        WITH ar_summary AS (
            SELECT 
                customer_code,
                COUNT(*) AS open_invoices,
                SUM(total - COALESCE(bayar, 0)) AS total_piutang,
                SUM(CASE WHEN due_date < CURRENT_DATE THEN (total - COALESCE(bayar, 0)) ELSE 0 END) AS overdue_amount,
                SUM(CASE WHEN due_date >= CURRENT_DATE THEN (total - COALESCE(bayar, 0)) ELSE 0 END) AS current_amount,
                COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END) AS overdue_count,
                MAX(CASE WHEN due_date < CURRENT_DATE THEN (CURRENT_DATE - due_date) ELSE 0 END) AS max_days_overdue
            FROM acc_ar_faktur
            WHERE (total - COALESCE(bayar, 0)) > 0
            GROUP BY customer_code
        )
        SELECT 
            c.id_kontak,
            c.customer AS nama_customer,
            COALESCE(c.batas_kredit, 0) AS batas_kredit,
            COALESCE(c.top, 0) AS top_days,
            COALESCE(c.id_kantor, 'HO') AS id_kantor,
            c.telepon,
            c.email,
            c.id_sales,
            p.nama AS nama_sales,
            COALESCE(ar.total_piutang, 0) AS total_piutang,
            COALESCE(ar.overdue_amount, 0) AS overdue_amount,
            COALESCE(ar.current_amount, 0) AS current_amount,
            COALESCE(ar.open_invoices, 0) AS open_invoices,
            COALESCE(ar.overdue_count, 0) AS overdue_count,
            COALESCE(ar.max_days_overdue, 0) AS max_days_overdue
        FROM customer c
        LEFT JOIN ar_summary ar ON c.id_kontak = ar.customer_code
        LEFT JOIN pegawai p ON p.id_pegawai = c.id_sales
        WHERE {where_clause}
    """
    all_rows = db_existing.execute(text(sql), params).mappings().all()

    processed = []
    total_exposure = 0.0
    total_overdue = 0.0
    total_limit = 0.0
    over_limit_count = 0
    hold_delivery_count = 0
    critical_count = 0

    for r in all_rows:
        d = dict(r)
        piutang = float(d["total_piutang"] or 0)
        overdue = float(d["overdue_amount"] or 0)
        current_amt = float(d["current_amount"] or 0)
        plafon = float(d["batas_kredit"] or 0)
        max_days = int(d["max_days_overdue"] or 0)
        overdue_cnt = int(d["overdue_count"] or 0)

        total_exposure += piutang
        total_overdue += overdue
        total_limit += plafon

        if plafon > 0:
            utilization_pct = round((piutang / plafon) * 100, 1)
        else:
            utilization_pct = 100.0 if piutang > 0 else 0.0

        if max_days > 90 or overdue > 100_000_000:
            r_level = "critical"
            r_label = "Kritis (Potensi Macet)"
            r_color = "#DC2626"
            critical_count += 1
        elif max_days > 30 or (plafon > 0 and piutang > plafon) or (plafon == 0 and overdue > 0):
            r_level = "high"
            r_label = "Tinggi (Risiko Kredit)"
            r_color = "#EF4444"
        elif overdue > 0 or (plafon > 0 and utilization_pct >= 80):
            r_level = "medium"
            r_label = "Waspada"
            r_color = "#F59E0B"
        else:
            r_level = "low"
            r_label = "Lancar"
            r_color = "#10B981"

        if overdue > 0:
            deliv_status = "HOLD_OVERDUE"
            deliv_label = "🛑 TAHAN PENGIRIMAN (Ada Faktur Overdue)"
            deliv_color = "#EF4444"
            deliv_bg = "rgba(239,68,68,0.15)"
            recom = f"Tahan order pengiriman baru sampai {overdue_cnt} faktur jatuh tempo (Rp {overdue:,.0f}) diselesaikan."
            hold_delivery_count += 1
        elif plafon > 0 and piutang > plafon:
            deliv_status = "HOLD_LIMIT"
            deliv_label = "⚠️ TAHAN PENGIRIMAN (Over Plafon Kredit)"
            deliv_color = "#F59E0B"
            deliv_bg = "rgba(245,158,11,0.15)"
            recom = f"Piutang telah melebihi batas kredit sebesar Rp {(piutang - plafon):,.0f}. Minta pelunasan sebelum kirim."
            over_limit_count += 1
            hold_delivery_count += 1
        elif plafon > 0 and piutang >= (0.85 * plafon):
            deliv_status = "WARNING_LIMIT"
            deliv_label = "⚡ PERINGATAN (Mendekati Batas Plafon)"
            deliv_color = "#FBBF24"
            deliv_bg = "rgba(251,191,36,0.15)"
            recom = f"Penggunaan kredit telah mencapai {utilization_pct}%. Pantau batas kredit sebelum rilis PO besar."
        else:
            deliv_status = "APPROVED"
            deliv_label = "✅ AMAN RILIS PENGIRIMAN"
            deliv_color = "#10B981"
            deliv_bg = "rgba(16,185,129,0.15)"
            recom = "Kredit sehat, tidak ada faktur overdue dan plafon mencukupi."

        if plafon > 0 and piutang > plafon and overdue == 0:
            over_limit_count += 1

        d["total_piutang"] = piutang
        d["overdue_amount"] = overdue
        d["current_amount"] = current_amt
        d["batas_kredit"] = plafon
        d["utilization_pct"] = utilization_pct
        d["risk_level"] = r_level
        d["risk_label"] = r_label
        d["risk_color"] = r_color
        d["delivery_status"] = deliv_status
        d["delivery_label"] = deliv_label
        d["delivery_color"] = deliv_color
        d["delivery_bg"] = deliv_bg
        d["recommendation"] = recom

        if risk_level and risk_level.lower() != "all" and r_level != risk_level.lower():
            continue
        if delivery_status and delivery_status.upper() != "ALL" and deliv_status != delivery_status.upper():
            continue

        processed.append(d)

    reverse = (sort_order.lower() == "desc")
    if sort_by == "overdue_amount":
        processed.sort(key=lambda x: x["overdue_amount"], reverse=reverse)
    elif sort_by == "total_piutang":
        processed.sort(key=lambda x: x["total_piutang"], reverse=reverse)
    elif sort_by == "batas_kredit":
        processed.sort(key=lambda x: x["batas_kredit"], reverse=reverse)
    elif sort_by == "utilization":
        processed.sort(key=lambda x: x["utilization_pct"], reverse=reverse)
    elif sort_by == "max_days_overdue":
        processed.sort(key=lambda x: x["max_days_overdue"], reverse=reverse)
    elif sort_by == "nama_customer":
        processed.sort(key=lambda x: x["nama_customer"], reverse=reverse)

    total_filtered = len(processed)
    offset = (page - 1) * limit
    paged_items = processed[offset: offset + limit]
    total_pages = max(1, math.ceil(total_filtered / limit))

    return {
        "summary": {
            "total_exposure": total_exposure,
            "total_exposure_ar": total_exposure,
            "total_overdue": total_overdue,
            "total_overdue_ar": total_overdue,
            "total_credit_limit": total_limit,
            "total_monitored_customers": len(all_rows),
            "total_customers_monitored": len(all_rows),
            "over_limit_count": over_limit_count,
            "hold_delivery_count": hold_delivery_count,
            "critical_count": critical_count,
            "critical_risk_count": critical_count,
        },
        "items": paged_items,
        "total": total_filtered,
        "total_filtered": total_filtered,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/credit-health/{id_customer}/invoices")
async def get_customer_open_invoices(
    id_customer: str,
    db_existing: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar faktur belum lunas dan status aging untuk satu customer tertentu."""
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        cust_check = db_existing.execute(
            text("SELECT 1 FROM customer WHERE id_kontak = :id AND id_sales = :user_sales"),
            {"id": id_customer, "user_sales": current_user.id_pegawai}
        ).first()
        if not cust_check:
            raise HTTPException(status_code=403, detail="Akses ditolak. Customer ini bukan milik Anda.")

    sql = """
        SELECT 
            a.ar_number,
            COALESCE(a.no_invoice, a.ar_number) AS no_invoice,
            a.invoice_date,
            a.due_date,
            COALESCE(a.top, 0) AS top_days,
            a.total AS total_amount,
            COALESCE(a.bayar, 0) AS paid_amount,
            (a.total - COALESCE(a.bayar, 0)) AS outstanding_amount,
            (CURRENT_DATE - a.due_date) AS days_overdue,
            a.status
        FROM acc_ar_faktur a
        WHERE a.customer_code = :id_customer AND (a.total - COALESCE(a.bayar, 0)) > 0
        ORDER BY (CURRENT_DATE - a.due_date) DESC, a.invoice_date ASC
    """
    rows = db_existing.execute(text(sql), {"id_customer": id_customer}).mappings().all()
    invoices = []
    for r in rows:
        d = dict(r)
        d["total_amount"] = float(d["total_amount"] or 0)
        d["paid_amount"] = float(d["paid_amount"] or 0)
        d["outstanding_amount"] = float(d["outstanding_amount"] or 0)
        d["is_overdue"] = int(d["days_overdue"] or 0) > 0
        invoices.append(d)
    return {"invoices": invoices, "total": len(invoices)}


# ─── Customer 360 ──────────────────────────────────────────────────────────────
@router.get("/{id_customer}/360")
async def get_customer_360(
    id_customer: str,
    db: Session = Depends(get_analytics_db),
    db_existing: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Customer 360 View — profil lengkap dengan semua dimensi."""
    extra = ""
    params = {"id": id_customer}
    # Role-based Row-Level Security
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        extra += " AND c.id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    customer = db.execute(text(f"""
        SELECT c.*, cm.*
        FROM operational.customers c
        LEFT JOIN analytics.customer_metrics cm ON c.id_kontak = cm.id_kontak
        WHERE c.id_kontak = :id {extra}
    """), params).mappings().first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")

    # Recent sales orders
    recent_so = db.execute(text("""
        SELECT nomor, tanggal, grandtotal, status_label
        FROM operational.sales_orders
        WHERE id_customer = :id
        ORDER BY tanggal DESC LIMIT 20
    """), {"id": id_customer}).mappings().all()

    # Recent invoices
    recent_invoices = db.execute(text("""
        SELECT no_penjualan, tanggal, grandtotal, total_bayar, is_lunas, tgl_jatuh_tempo
        FROM operational.invoices
        WHERE id_customer = :id
        ORDER BY tanggal DESC LIMIT 20
    """), {"id": id_customer}).mappings().all()

    # Recent deliveries
    recent_deliveries = db.execute(text("""
        SELECT nomor, tanggal, tgl_keluar, received_date, status_label, driver
        FROM operational.deliveries
        WHERE id_customer = :id
        ORDER BY tanggal DESC LIMIT 20
    """), {"id": id_customer}).mappings().all()

    # Top products bought
    top_products = db.execute(text("""
        SELECT
            soi.id_barang, p.nama_barang,
            SUM(soi.qty) AS total_qty,
            SUM(soi.total) AS total_value,
            COUNT(DISTINCT soi.no_so) AS order_count
        FROM operational.sales_order_items soi
        JOIN operational.sales_orders so ON soi.no_so = so.nomor
        JOIN operational.products p ON soi.id_barang = p.id_barang
        WHERE so.id_customer = :id AND so.status != '2'
        GROUP BY soi.id_barang, p.nama_barang
        ORDER BY total_value DESC
        LIMIT 20
    """), {"id": id_customer}).mappings().all()

    # CRM activities
    activities = db.execute(text("""
        SELECT * FROM crm.activities
        WHERE id_customer = :id
        ORDER BY activity_date DESC LIMIT 20
    """), {"id": id_customer}).mappings().all()

    # CRM complaints
    complaints = db.execute(text("""
        SELECT * FROM crm.complaints
        WHERE id_customer = :id
        ORDER BY created_at DESC LIMIT 5
    """), {"id": id_customer}).mappings().all()

    profile = dict(customer)
    sid = profile.get("id_salesman")
    if sid:
        try:
            sales_info = db_existing.execute(
                text("SELECT id_pegawai, nama, nama_panggilan, hp, email FROM pegawai WHERE id_pegawai = :sid"),
                {"sid": sid}
            ).mappings().first()
            if sales_info:
                profile["nama_sales"] = sales_info["nama"]
                profile["panggilan_sales"] = sales_info["nama_panggilan"]
                profile["telepon_sales"] = sales_info["hp"]
                profile["email_sales"] = sales_info["email"]
        except Exception:
            pass

    return {
        "profile": profile,
        "recent_orders": [dict(r) for r in recent_so],
        "recent_invoices": [dict(r) for r in recent_invoices],
        "recent_deliveries": [dict(r) for r in recent_deliveries],
        "top_products": [dict(r) for r in top_products],
        "crm_activities": [dict(r) for r in activities],
        "complaints": [dict(r) for r in complaints],
    }


@router.get("/{id_customer}/history")
async def get_customer_history(
    id_customer: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    # Role-based Row-Level Security
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        cust_check = db.execute(
            text("SELECT 1 FROM operational.customers WHERE id_kontak = :id AND id_salesman = :user_pegawai"),
            {"id": id_customer, "user_pegawai": current_user.id_pegawai}
        ).first()
        if not cust_check:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak. Customer ini bukan milik Anda."
            )

    params = {"id": id_customer}
    date_filter = ""
    if date_from:
        date_filter += " AND tanggal >= :date_from"
        params["date_from"] = date_from
    if date_to:
        date_filter += " AND tanggal <= :date_to"
        params["date_to"] = date_to

    invoices = db.execute(text(f"""
        SELECT no_penjualan, tanggal, grandtotal, is_lunas, tgl_jatuh_tempo, status_label
        FROM operational.invoices
        WHERE id_customer = :id {date_filter}
        ORDER BY tanggal DESC
    """), params).mappings().all()
    return [dict(r) for r in invoices]
