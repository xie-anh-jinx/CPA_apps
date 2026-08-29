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
    segment: Optional[str] = Query(None, description="active|dormant|at_risk|churned"),
    isaktif: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar customer dengan metrik dan segmentasi."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if search:
        conditions.append("(c.nama_customer ILIKE :search OR c.id_kontak ILIKE :search)")
        params["search"] = f"%{search}%"
    if segment:
        conditions.append("cm.segment = :segment")
        params["segment"] = segment
    if isaktif is not None:
        conditions.append("c.isaktif = :isaktif")
        params["isaktif"] = isaktif

    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        conditions.append("c.id_salesman = :user_pegawai")
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            c.id_kontak, c.nama_customer, c.telepon, c.email,
            c.nama_kategori, c.isaktif, c.id_salesman, c.id_kantor,
            cm.total_orders, cm.total_revenue, cm.last_purchase_date,
            cm.days_since_last_purchase, cm.segment, cm.total_piutang
        FROM operational.customers c
        LEFT JOIN analytics.customer_metrics cm ON c.id_kontak = cm.id_kontak
        WHERE {' AND '.join(conditions)}
        ORDER BY cm.total_revenue DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(r) for r in rows]


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


@router.get("/segmentation")
async def get_customer_segmentation(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Statistik segmentasi pelanggan."""
    rows = db.execute(text("""
        SELECT
            segment,
            COUNT(*) AS jumlah,
            SUM(total_revenue) AS total_revenue,
            AVG(total_revenue) AS avg_revenue,
            AVG(days_since_last_purchase) AS avg_days_inactive
        FROM analytics.customer_metrics
        GROUP BY segment
        ORDER BY jumlah DESC
    """)).mappings().all()
    return [dict(r) for r in rows]
