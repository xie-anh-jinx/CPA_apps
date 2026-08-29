"""
Router — Sales Monitoring
SO pipeline, invoice, trend, per salesman/customer
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date, timedelta

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/summary")
async def get_sales_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    id_gudang: Optional[str] = None,
    id_salesman: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan penjualan dalam rentang waktu."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to}
    extra = ""
    if id_gudang:
        extra += " AND id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang
    if id_salesman:
        extra += " AND id_salesman = :id_salesman"
        params["id_salesman"] = id_salesman
        
    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra += " AND id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    inv = db.execute(text(f"""
        SELECT
            COUNT(*) AS total_invoice,
            SUM(grandtotal) AS total_omzet,
            SUM(total_discount) AS total_diskon,
            SUM(total_ppn) AS total_ppn,
            SUM(total_bayar) AS total_bayar,
            SUM(CASE WHEN is_lunas = true THEN grandtotal ELSE 0 END) AS total_lunas,
            SUM(CASE WHEN is_lunas = false THEN grandtotal - total_bayar ELSE 0 END) AS total_piutang,
            AVG(grandtotal) AS avg_order_value
        FROM operational.invoices
        WHERE tanggal BETWEEN :date_from AND :date_to
        AND status != '2' {extra}
    """), params).mappings().first()

    so_count = db.execute(text(f"""
        SELECT COUNT(*) FROM operational.sales_orders
        WHERE tanggal BETWEEN :date_from AND :date_to
        AND status != '2' {extra}
    """), params).scalar()

    return {
        "period": {"from": str(date_from), "to": str(date_to)},
        "total_so": so_count,
        **dict(inv),
    }


@router.get("/trend")
async def get_sales_trend(
    period: str = Query("daily", description="daily|weekly|monthly"),
    months: int = Query(6, description="Berapa bulan ke belakang"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Tren penjualan harian/mingguan/bulanan."""
    if not date_from:
        date_from = date.today() - timedelta(days=30 * months)
    params = {"date_from": date_from}
    
    extra = ""
    if date_to:
        extra += " AND tanggal <= :date_to"
        params["date_to"] = date_to

    if id_gudang:
        extra += " AND id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang

    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra += " AND id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    if period == "daily":
        trunc = "day"
    elif period == "weekly":
        trunc = "week"
    else:
        trunc = "month"

    rows = db.execute(text(f"""
        SELECT
            DATE_TRUNC('{trunc}', tanggal) AS period,
            COUNT(*) AS total_invoice,
            SUM(grandtotal)::FLOAT AS omzet,
            SUM(total_discount)::FLOAT AS diskon
        FROM operational.invoices
        WHERE tanggal >= :date_from AND status != '2' {extra}
        GROUP BY DATE_TRUNC('{trunc}', tanggal)
        ORDER BY period
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/by-product")
async def get_sales_by_product(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    id_gudang: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Top produk berdasarkan penjualan."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to, "limit": limit}
    extra = ""
    if id_gudang:
        extra += " AND i.id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang
        
    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra += " AND i.id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            soi.id_barang, p.nama_barang, p.nama_kategori,
            SUM(soi.qty) AS total_qty,
            SUM(soi.total) AS total_omzet,
            AVG(soi.harga) AS avg_harga,
            COUNT(DISTINCT soi.no_so) AS jumlah_order
        FROM operational.sales_order_items soi
        JOIN operational.sales_orders i ON soi.no_so = i.nomor
        JOIN operational.products p ON soi.id_barang = p.id_barang
        WHERE i.tanggal BETWEEN :date_from AND :date_to
        AND i.status != '2' {extra}
        GROUP BY soi.id_barang, p.nama_barang, p.nama_kategori
        ORDER BY total_omzet DESC
        LIMIT :limit
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/by-customer")
async def get_sales_by_customer(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 20,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Top customer berdasarkan omzet."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to, "limit": limit}
    extra = ""
    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra += " AND i.id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            i.id_customer, i.nama_customer,
            COUNT(*) AS total_invoice,
            SUM(i.grandtotal) AS total_omzet,
            AVG(i.grandtotal) AS avg_order_value,
            MAX(i.tanggal) AS last_purchase
        FROM operational.invoices i
        WHERE i.tanggal BETWEEN :date_from AND :date_to
        AND i.status != '2' {extra}
        GROUP BY i.id_customer, i.nama_customer
        ORDER BY total_omzet DESC
        LIMIT :limit
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/by-salesperson")
async def get_sales_by_salesperson(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Performa per salesman."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to}
    extra = ""
    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra += " AND i.id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            i.id_salesman,
            COUNT(*) AS total_invoice,
            COUNT(DISTINCT i.id_customer) AS total_customer,
            SUM(i.grandtotal) AS total_omzet
        FROM operational.invoices i
        WHERE i.tanggal BETWEEN :date_from AND :date_to
        AND i.status != '2' {extra}
        GROUP BY i.id_salesman
        ORDER BY total_omzet DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/orders")
async def get_sales_orders(
    status: Optional[str] = None,
    id_customer: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar Sales Order dengan pipeline status."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if status:
        conditions.append("so.status_label = :status")
        params["status"] = status
    if id_customer:
        conditions.append("so.id_customer = :id_customer")
        params["id_customer"] = id_customer
    if date_from:
        conditions.append("so.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("so.tanggal <= :date_to")
        params["date_to"] = date_to

    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        conditions.append("so.id_salesman = :user_pegawai")
        params["user_pegawai"] = current_user.id_pegawai

    where_clause = " AND ".join(conditions)
    rows = db.execute(text(f"""
        SELECT
            so.*,
            d.nomor AS nomor_do,
            d.status_label AS do_status,
            i.no_penjualan,
            i.is_lunas
        FROM operational.sales_orders so
        LEFT JOIN operational.deliveries d ON so.nomor = d.nomor
        LEFT JOIN operational.invoices i ON d.nomor = i.no_do
        WHERE {' AND '.join(conditions)}
        ORDER BY so.tanggal DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(r) for r in rows]
