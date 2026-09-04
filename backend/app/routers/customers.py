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

from app.database import get_analytics_db
from app.models.analytics.models import (
    CRMActivity, CRMOpportunity, CRMComplaint, CRMFollowupReminder
)
from app.routers.auth import CurrentUser

router = APIRouter()


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
    current_user: CurrentUser = None,
):
    """Daftar customer dengan metrik dan segmentasi multi-dimensi."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if search:
        conditions.append("(cust.nama_customer ILIKE :search OR cust.id_kontak ILIKE :search)")
        params["search"] = f"%{search}%"

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
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
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
    return [dict(r) for r in rows]


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
    sql = """
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
    rows = db.execute(text(sql)).mappings().all()

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


# ─── Customer 360 ──────────────────────────────────────────────────────────────
@router.get("/{id_customer}/360")
async def get_customer_360(
    id_customer: str,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Customer 360 View — profil lengkap dengan semua dimensi."""
    extra = ""
    params = {"id": id_customer}
    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
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
        ORDER BY tanggal DESC LIMIT 10
    """), {"id": id_customer}).mappings().all()

    # Recent invoices
    recent_invoices = db.execute(text("""
        SELECT no_penjualan, tanggal, grandtotal, total_bayar, is_lunas, tgl_jatuh_tempo
        FROM operational.invoices
        WHERE id_customer = :id
        ORDER BY tanggal DESC LIMIT 10
    """), {"id": id_customer}).mappings().all()

    # Recent deliveries
    recent_deliveries = db.execute(text("""
        SELECT nomor, tanggal, tgl_keluar, received_date, status_label, driver
        FROM operational.deliveries
        WHERE id_customer = :id
        ORDER BY tanggal DESC LIMIT 10
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
        LIMIT 10
    """), {"id": id_customer}).mappings().all()

    # CRM activities
    activities = db.execute(text("""
        SELECT * FROM crm.activities
        WHERE id_customer = :id
        ORDER BY activity_date DESC LIMIT 10
    """), {"id": id_customer}).mappings().all()

    # CRM complaints
    complaints = db.execute(text("""
        SELECT * FROM crm.complaints
        WHERE id_customer = :id
        ORDER BY created_at DESC LIMIT 5
    """), {"id": id_customer}).mappings().all()

    return {
        "profile": dict(customer),
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
    """Histori transaksi lengkap satu customer."""
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



