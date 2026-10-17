"""
Router — Reports & Laporan Finansial
Laporan Aging AR (Accounts Receivable), Summary Aging Buckets, dan Ekspor Excel/CSV
"""
import math
import io
import csv
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_existing_db, get_analytics_db
from app.routers.auth import CurrentUser, forbid_roles

router = APIRouter(
    dependencies=[
        Depends(forbid_roles("warehouse", "warehouse_staff", detail="Akses ditolak. Pengguna gudang tidak memiliki akses laporan finansial."))
    ]
)


# ─── Laporan Aging AR ─────────────────────────────────────────────────────────
@router.get("/ar-aging")
async def get_ar_aging_report(
    search: Optional[str] = None,
    bucket: Optional[str] = Query(None, description="all|current|1-30|31-60|61-90|over_90|all_overdue"),
    top: Optional[int] = None,
    id_kantor: Optional[str] = None,
    id_sales: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_by: str = Query("days_overdue", description="days_overdue|outstanding_amount|total_amount|invoice_date|due_date|customer_name"),
    sort_order: str = Query("desc", description="asc|desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Laporan Aging AR (Accounts Receivable) terpadu untuk Finance Manager, AR Staff, dan Credit Control.
    Menyajikan ringkasan metrik per bucket aging dan rincian transaksi piutang terbuka.
    """
    conditions = ["(a.total - COALESCE(a.bayar, 0)) > 0"]
    params = {}

    # Role-based restriction for sales rep
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        conditions.append("c.id_sales = :user_sales")
        params["user_sales"] = current_user.id_pegawai
    elif id_sales:
        conditions.append("c.id_sales = :id_sales")
        params["id_sales"] = id_sales

    if search:
        conditions.append(
            "(a.ar_number ILIKE :search OR a.no_invoice ILIKE :search OR c.customer ILIKE :search OR a.customer_code ILIKE :search)"
        )
        params["search"] = f"%{search.strip()}%"

    if top is not None:
        conditions.append("COALESCE(a.top, 0) = :top")
        params["top"] = top

    if id_kantor:
        conditions.append("c.id_kantor = :id_kantor")
        params["id_kantor"] = id_kantor

    if date_from:
        conditions.append("a.invoice_date >= :date_from")
        params["date_from"] = date_from

    if date_to:
        conditions.append("a.invoice_date <= :date_to")
        params["date_to"] = date_to

    # Bucket filtering
    if bucket:
        b_clean = bucket.lower().strip()
        if b_clean in ("current", "lancar"):
            conditions.append("a.due_date >= CURRENT_DATE")
        elif b_clean in ("all_overdue", "overdue"):
            conditions.append("a.due_date < CURRENT_DATE")
        elif b_clean == "1-30":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 1 AND 30")
        elif b_clean == "31-60":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 31 AND 60")
        elif b_clean == "61-90":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 61 AND 90")
        elif b_clean in (">90", "90+", "over_90"):
            conditions.append("(CURRENT_DATE - a.due_date) > 90")

    where_clause = " AND ".join(conditions)

    # 1. Aging Buckets Summary (Global across current search/office/sales filter, excluding bucket filter)
    base_conditions = ["(a.total - COALESCE(a.bayar, 0)) > 0"]
    base_params = {}
    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        base_conditions.append("c.id_sales = :user_sales")
        base_params["user_sales"] = current_user.id_pegawai
    elif id_sales:
        base_conditions.append("c.id_sales = :id_sales")
        base_params["id_sales"] = id_sales
    if id_kantor:
        base_conditions.append("c.id_kantor = :id_kantor")
        base_params["id_kantor"] = id_kantor
    if search:
        base_conditions.append("(a.ar_number ILIKE :search OR a.no_invoice ILIKE :search OR c.customer ILIKE :search OR a.customer_code ILIKE :search)")
        base_params["search"] = f"%{search.strip()}%"

    base_where = " AND ".join(base_conditions)

    summary_sql = f"""
        SELECT
            COUNT(*) AS total_invoices,
            COALESCE(SUM(a.total - COALESCE(a.bayar, 0)), 0) AS total_receivables,
            
            -- Belum Jatuh Tempo (Current)
            COUNT(CASE WHEN a.due_date >= CURRENT_DATE THEN 1 END) AS count_current,
            COALESCE(SUM(CASE WHEN a.due_date >= CURRENT_DATE THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_current,
            
            -- Overdue 1-30 Hari
            COUNT(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 1 AND 30 THEN 1 END) AS count_1_30,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 1 AND 30 THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_1_30,
            
            -- Overdue 31-60 Hari
            COUNT(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 31 AND 60 THEN 1 END) AS count_31_60,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 31 AND 60 THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_31_60,
            
            -- Overdue 61-90 Hari
            COUNT(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 61 AND 90 THEN 1 END) AS count_61_90,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - a.due_date) BETWEEN 61 AND 90 THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_61_90,
            
            -- Overdue > 90 Hari
            COUNT(CASE WHEN (CURRENT_DATE - a.due_date) > 90 THEN 1 END) AS count_over_90,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - a.due_date) > 90 THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_over_90,
            
            -- Total Overdue
            COUNT(CASE WHEN a.due_date < CURRENT_DATE THEN 1 END) AS count_overdue,
            COALESCE(SUM(CASE WHEN a.due_date < CURRENT_DATE THEN (a.total - COALESCE(a.bayar, 0)) ELSE 0 END), 0) AS amount_overdue,
            
            -- Average Days Overdue
            COALESCE(AVG(CASE WHEN a.due_date < CURRENT_DATE THEN (CURRENT_DATE - a.due_date) END), 0) AS avg_days_overdue
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        WHERE {base_where}
    """
    sum_row = db.execute(text(summary_sql), base_params).mappings().first()

    total_rec = float(sum_row["total_receivables"]) if sum_row else 0.0
    amt_overdue = float(sum_row["amount_overdue"]) if sum_row else 0.0
    overdue_pct = round((amt_overdue / total_rec * 100), 1) if total_rec > 0 else 0.0

    summary = {
        "total_invoices": int(sum_row["total_invoices"]) if sum_row else 0,
        "total_receivables": total_rec,
        "total_overdue": amt_overdue,
        "overdue_invoices_count": int(sum_row["count_overdue"]) if sum_row else 0,
        "overdue_percentage": overdue_pct,
        "avg_days_overdue": round(float(sum_row["avg_days_overdue"] or 0), 1),
        "buckets": {
            "current": {
                "label": "Lancar / Belum Jatuh Tempo",
                "count": int(sum_row["count_current"]) if sum_row else 0,
                "amount": float(sum_row["amount_current"]) if sum_row else 0.0,
                "pct": round((float(sum_row["amount_current"] or 0) / total_rec * 100), 1) if total_rec > 0 else 0,
                "color": "#10B981",
            },
            "days_1_30": {
                "label": "1 - 30 Hari",
                "count": int(sum_row["count_1_30"]) if sum_row else 0,
                "amount": float(sum_row["amount_1_30"]) if sum_row else 0.0,
                "pct": round((float(sum_row["amount_1_30"] or 0) / total_rec * 100), 1) if total_rec > 0 else 0,
                "color": "#FBBF24",
            },
            "days_31_60": {
                "label": "31 - 60 Hari",
                "count": int(sum_row["count_31_60"]) if sum_row else 0,
                "amount": float(sum_row["amount_31_60"]) if sum_row else 0.0,
                "pct": round((float(sum_row["amount_31_60"] or 0) / total_rec * 100), 1) if total_rec > 0 else 0,
                "color": "#F97316",
            },
            "days_61_90": {
                "label": "61 - 90 Hari",
                "count": int(sum_row["count_61_90"]) if sum_row else 0,
                "amount": float(sum_row["amount_61_90"]) if sum_row else 0.0,
                "pct": round((float(sum_row["amount_61_90"] or 0) / total_rec * 100), 1) if total_rec > 0 else 0,
                "color": "#EF4444",
            },
            "days_over_90": {
                "label": "> 90 Hari (Macet)",
                "count": int(sum_row["count_over_90"]) if sum_row else 0,
                "amount": float(sum_row["amount_over_90"]) if sum_row else 0.0,
                "pct": round((float(sum_row["amount_over_90"] or 0) / total_rec * 100), 1) if total_rec > 0 else 0,
                "color": "#B91C1C",
            },
        },
    }

    # 2. Count for filtered items
    count_sql = f"""
        SELECT COUNT(*) 
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        WHERE {where_clause}
    """
    total_items = db.execute(text(count_sql), params).scalar() or 0

    # 3. Paged list
    sort_map = {
        "days_overdue": "(CURRENT_DATE - a.due_date)",
        "outstanding_amount": "(a.total - COALESCE(a.bayar, 0))",
        "total_amount": "a.total",
        "invoice_date": "a.invoice_date",
        "due_date": "a.due_date",
        "customer_name": "COALESCE(c.customer, a.customer_code)",
    }
    order_expr = sort_map.get(sort_by, "(CURRENT_DATE - a.due_date)")
    direction = "ASC" if sort_order.lower() == "asc" else "DESC"
    offset = (page - 1) * limit

    list_params = {**params, "limit": limit, "offset": offset}
    list_sql = f"""
        SELECT 
            a.ar_number,
            COALESCE(a.no_invoice, a.ar_number) AS no_invoice,
            a.customer_code,
            COALESCE(c.customer, a.customer_code) AS customer_name,
            c.id_kantor,
            p.nama AS nama_sales,
            p.id_pegawai AS id_sales,
            a.invoice_date,
            a.due_date,
            COALESCE(a.top, 0) AS top_days,
            a.total AS total_amount,
            COALESCE(a.bayar, 0) AS paid_amount,
            (a.total - COALESCE(a.bayar, 0)) AS outstanding_amount,
            (CURRENT_DATE - a.due_date) AS days_overdue,
            a.status
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        LEFT JOIN pegawai p ON p.id_pegawai = c.id_sales
        WHERE {where_clause}
        ORDER BY {order_expr} {direction}, a.ar_number DESC
        LIMIT :limit OFFSET :offset
    """
    rows = db.execute(text(list_sql), list_params).mappings().all()

    items = []
    for r in rows:
        d = dict(r)
        d["total_amount"] = float(d["total_amount"] or 0)
        d["paid_amount"] = float(d["paid_amount"] or 0)
        d["outstanding_amount"] = float(d["outstanding_amount"] or 0)
        days_ov = int(d["days_overdue"] or 0)

        # Assign bucket label & color
        if days_ov <= 0:
            b_key = "current"
            b_label = "Lancar"
            b_color = "#10B981"
            b_bg = "rgba(16,185,129,0.15)"
        elif days_ov <= 30:
            b_key = "1-30"
            b_label = "1 - 30 Hari"
            b_color = "#FBBF24"
            b_bg = "rgba(251,191,36,0.15)"
        elif days_ov <= 60:
            b_key = "31-60"
            b_label = "31 - 60 Hari"
            b_color = "#F97316"
            b_bg = "rgba(249,115,22,0.15)"
        elif days_ov <= 90:
            b_key = "61-90"
            b_label = "61 - 90 Hari"
            b_color = "#EF4444"
            b_bg = "rgba(239,68,68,0.15)"
        else:
            b_key = "over_90"
            b_label = "> 90 Hari (Macet)"
            b_color = "#DC2626"
            b_bg = "rgba(220,38,38,0.15)"

        d["aging_bucket"] = b_key
        d["aging_label"] = b_label
        d["aging_color"] = b_color
        d["aging_bg"] = b_bg
        items.append(d)

    total_pages = max(1, math.ceil(total_items / limit))

    return {
        "summary": summary,
        "items": items,
        "total": total_items,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


# ─── Export Laporan Aging AR ke Excel/CSV ─────────────────────────────────────
@router.get("/ar-aging/export")
async def export_ar_aging(
    search: Optional[str] = None,
    bucket: Optional[str] = None,
    top: Optional[int] = None,
    id_kantor: Optional[str] = None,
    id_sales: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Download data Laporan Aging AR dalam format CSV / Excel akuntansi."""
    conditions = ["(a.total - COALESCE(a.bayar, 0)) > 0"]
    params = {}

    if current_user and current_user.role in ("sales", "sales_rep") and current_user.id_pegawai:
        conditions.append("c.id_sales = :user_sales")
        params["user_sales"] = current_user.id_pegawai
    elif id_sales:
        conditions.append("c.id_sales = :id_sales")
        params["id_sales"] = id_sales

    if search:
        conditions.append(
            "(a.ar_number ILIKE :search OR a.no_invoice ILIKE :search OR c.customer ILIKE :search OR a.customer_code ILIKE :search)"
        )
        params["search"] = f"%{search.strip()}%"

    if top is not None:
        conditions.append("COALESCE(a.top, 0) = :top")
        params["top"] = top

    if id_kantor:
        conditions.append("c.id_kantor = :id_kantor")
        params["id_kantor"] = id_kantor

    if bucket:
        b_clean = bucket.lower().strip()
        if b_clean in ("current", "lancar"):
            conditions.append("a.due_date >= CURRENT_DATE")
        elif b_clean in ("all_overdue", "overdue"):
            conditions.append("a.due_date < CURRENT_DATE")
        elif b_clean == "1-30":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 1 AND 30")
        elif b_clean == "31-60":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 31 AND 60")
        elif b_clean == "61-90":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 61 AND 90")
        elif b_clean in (">90", "90+", "over_90"):
            conditions.append("(CURRENT_DATE - a.due_date) > 90")

    where_clause = " AND ".join(conditions)

    sql = f"""
        SELECT 
            a.ar_number,
            COALESCE(a.no_invoice, a.ar_number) AS no_invoice,
            a.customer_code,
            COALESCE(c.customer, a.customer_code) AS customer_name,
            COALESCE(c.id_kantor, 'HO') AS id_kantor,
            COALESCE(p.nama, '—') AS nama_sales,
            a.invoice_date,
            a.due_date,
            COALESCE(a.top, 0) AS top_days,
            a.total AS total_amount,
            COALESCE(a.bayar, 0) AS paid_amount,
            (a.total - COALESCE(a.bayar, 0)) AS outstanding_amount,
            (CURRENT_DATE - a.due_date) AS days_overdue
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        LEFT JOIN pegawai p ON p.id_pegawai = c.id_sales
        WHERE {where_clause}
        ORDER BY (CURRENT_DATE - a.due_date) DESC, a.total DESC
        LIMIT 5000
    """
    rows = db.execute(text(sql), params).mappings().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header akuntansi
    writer.writerow([
        "No AR",
        "No Invoice",
        "Kode Customer",
        "Nama Customer",
        "Cabang / Kantor",
        "Salesperson",
        "Tgl Invoice",
        "Tgl Jatuh Tempo",
        "TOP (Hari)",
        "Total Tagihan (Rp)",
        "Terbayar (Rp)",
        "Sisa Piutang (Rp)",
        "Keterlambatan (Hari)",
        "Kategori Aging",
    ])

    for r in rows:
        days = int(r["days_overdue"] or 0)
        if days <= 0:
            cat = "Lancar"
        elif days <= 30:
            cat = "1 - 30 Hari"
        elif days <= 60:
            cat = "31 - 60 Hari"
        elif days <= 90:
            cat = "61 - 90 Hari"
        else:
            cat = "> 90 Hari (Macet)"

        writer.writerow([
            r["ar_number"],
            r["no_invoice"],
            r["customer_code"],
            r["customer_name"],
            r["id_kantor"],
            r["nama_sales"],
            str(r["invoice_date"] or ""),
            str(r["due_date"] or ""),
            int(r["top_days"] or 0),
            f"{float(r['total_amount'] or 0):.2f}",
            f"{float(r['paid_amount'] or 0):.2f}",
            f"{float(r['outstanding_amount'] or 0):.2f}",
            max(0, days),
            cat,
        ])

    csv_data = output.getvalue()
    output.close()

    filename = f"Laporan_Aging_AR_{date.today().isoformat()}.csv"
    response = StreamingResponse(iter([csv_data]), media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
