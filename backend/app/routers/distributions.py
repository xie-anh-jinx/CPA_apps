"""
Router — Distributions Monitoring
DO tracking, status pengiriman, peta distribusi
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/")
async def list_deliveries(
    status: Optional[str] = Query(None, description="draft|in_transit|delivered|void"),
    id_customer: Optional[str] = None,
    id_gudang: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar delivery order dengan status tracking."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if status:
        conditions.append("d.status_label = :status")
        params["status"] = status
    if id_customer:
        conditions.append("d.id_customer = :id_customer")
        params["id_customer"] = id_customer
    if id_gudang:
        conditions.append("d.id_gudang = :id_gudang")
        params["id_gudang"] = id_gudang
    if date_from:
        conditions.append("d.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("d.tanggal <= :date_to")
        params["date_to"] = date_to

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("d.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("d.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            d.*,
            w.nama_gudang,
            -- Days since departure
            CASE WHEN d.tgl_keluar IS NOT NULL AND d.received_date IS NULL
                THEN CURRENT_DATE - d.tgl_keluar
                ELSE NULL
            END AS days_in_transit
        FROM operational.deliveries d
        LEFT JOIN operational.warehouses w ON d.id_gudang = w.id_gudang
        WHERE {' AND '.join(conditions)}
        ORDER BY d.tanggal DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM operational.deliveries d
        WHERE {' AND '.join(conditions)}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    return {
        "data": [dict(r) for r in rows],
        "pagination": {"page": page, "limit": limit, "total": total},
    }


@router.get("/pending")
async def get_pending_deliveries(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Pesanan yang menunggu pengiriman (draft/belum keluar)."""
    rows = db.execute(text("""
        SELECT
            d.nomor, d.tanggal, d.id_customer, d.nama_customer,
            d.id_gudang, w.nama_gudang, d.alamat,
            d.status_label,
            CURRENT_DATE - d.tanggal AS days_waiting
        FROM operational.deliveries d
        LEFT JOIN operational.warehouses w ON d.id_gudang = w.id_gudang
        WHERE d.status_label = 'draft'
        AND d.tgl_keluar IS NULL
        ORDER BY d.tanggal ASC
        LIMIT 200
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/in-transit")
async def get_in_transit(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Pengiriman yang sedang dalam perjalanan."""
    rows = db.execute(text("""
        SELECT
            d.nomor, d.tanggal, d.tgl_keluar,
            d.id_customer, d.nama_customer,
            d.origin, d.destination,
            d.driver, d.lic_plate, d.transporter,
            d.tgl_sampai,
            CURRENT_DATE - d.tgl_keluar AS days_in_transit,
            CASE
                WHEN d.tgl_sampai < CURRENT_DATE THEN 'overdue'
                WHEN d.tgl_sampai = CURRENT_DATE THEN 'due_today'
                ELSE 'on_time'
            END AS delivery_status
        FROM operational.deliveries d
        WHERE d.status_label = 'in_transit'
        ORDER BY d.tgl_keluar ASC
        LIMIT 200
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/summary")
async def get_distribution_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan distribusi: status, biaya, on-time rate."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to}
    extra = ""
    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " AND id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            extra = " AND id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    result = db.execute(text(f"""
        SELECT
            COUNT(*) AS total_do,
            SUM(CASE WHEN status_label = 'delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status_label = 'in_transit' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN status_label = 'draft' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status_label = 'void' THEN 1 ELSE 0 END) AS void_count,
            SUM(shippingcosts) AS total_shipping_cost,
            AVG(CASE WHEN received_date IS NOT NULL AND tgl_keluar IS NOT NULL
                THEN received_date - tgl_keluar
                ELSE NULL
            END)::FLOAT AS avg_delivery_days,
            -- On-time rate
            ROUND(
                100.0 * SUM(CASE
                    WHEN received_date IS NOT NULL AND tgl_sampai IS NOT NULL
                    AND received_date <= tgl_sampai THEN 1 ELSE 0
                END) / NULLIF(SUM(CASE WHEN received_date IS NOT NULL THEN 1 ELSE 0 END), 0),
                2
            ) AS on_time_rate_pct
        FROM operational.deliveries
        WHERE tanggal BETWEEN :date_from AND :date_to {extra}
    """), params).mappings().first()
    return dict(result) if result else {}


@router.get("/map-data")
async def get_map_data(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Data untuk peta distribusi (origin-destination)."""
    conditions = ["origin IS NOT NULL", "destination IS NOT NULL"]
    params = {}
    if status:
        conditions.append("status_label = :status")
        params["status"] = status
    if date_from:
        conditions.append("tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("tanggal <= :date_to")
        params["date_to"] = date_to

    rows = db.execute(text(f"""
        SELECT
            nomor, id_customer, nama_customer,
            origin, destination,
            tgl_keluar, tgl_sampai, received_date,
            status_label, driver, lic_plate,
            shippingcosts
        FROM operational.deliveries
        WHERE {' AND '.join(conditions)}
        ORDER BY tanggal DESC
        LIMIT 500
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/{nomor}")
async def get_delivery_detail(
    nomor: str,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Detail satu Delivery Order."""
    delivery = db.execute(text("""
        SELECT d.*, w.nama_gudang
        FROM operational.deliveries d
        LEFT JOIN operational.warehouses w ON d.id_gudang = w.id_gudang
        WHERE d.nomor = :nomor
    """), {"nomor": nomor}).mappings().first()

    if not delivery:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="DO tidak ditemukan")

    # Get items dari DB lama langsung (join read-only)
    items = db.execute(text("""
        SELECT dd.id_barang, p.nama_barang, dd.qty, dd.satuan
        FROM public.do_detail dd
        LEFT JOIN public.barang p ON dd.id_barang = p.id_barang
        WHERE dd.nomor = :nomor
    """), {"nomor": nomor}).mappings().all()

    return {
        "delivery": dict(delivery),
        "items": [dict(i) for i in items],
    }
