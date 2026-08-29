"""
Router — Inventory Monitoring
Stok real-time, aging, low-stock, overstock, mutasi
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, case
from typing import Optional
from datetime import date

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/summary")
async def get_inventory_summary(
    id_gudang: Optional[str] = Query(None, description="Filter per gudang"),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan inventory: total stok, nilai, low-stock, overstock, zero-stock."""
    filter_clause = "AND ib.id_gudang = :id_gudang" if id_gudang else ""
    params = {"id_gudang": id_gudang} if id_gudang else {}

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            filter_clause += " AND ib.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            filter_clause += " AND ib.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    result = db.execute(text(f"""
        SELECT
            COUNT(DISTINCT ib.id_barang) AS total_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count,
            SUM(CASE WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 1 ELSE 0 END) AS overstock_count,
            COUNT(DISTINCT ib.id_gudang) AS total_gudang
        FROM operational.inventory_balances ib
        WHERE 1=1 {filter_clause}
    """), params).mappings().first()

    return dict(result) if result else {}


@router.get("/by-product")
async def get_inventory_by_product(
    id_gudang: Optional[str] = None,
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    status: Optional[str] = Query(None, description="low_stock|overstock|zero|ok"),
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Stok per produk dengan filter dan paginasi."""
    conditions = ["1=1"]
    params: dict = {"offset": (page - 1) * limit, "limit": limit}

    if id_gudang:
        conditions.append("ib.id_gudang = :id_gudang")
        params["id_gudang"] = id_gudang
    if search:
        conditions.append("(p.nama_barang ILIKE :search OR p.id_barang ILIKE :search)")
        params["search"] = f"%{search}%"
    if kategori:
        conditions.append("p.id_kategori = :kategori")
        params["kategori"] = kategori
    if status == "low_stock":
        conditions.append("ib.stok_min > 0 AND ib.available < ib.stok_min")
    elif status == "zero":
        conditions.append("ib.available <= 0")
    elif status == "overstock":
        conditions.append("ib.stok_max > 0 AND ib.on_hand > ib.stok_max")
    elif status == "ok":
        conditions.append("ib.available >= ib.stok_min OR ib.stok_min = 0")

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("ib.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("ib.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    where = " AND ".join(conditions)

    rows = db.execute(text(f"""
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori, p.nama_brand,
            ib.id_gudang, w.nama_gudang,
            ib.on_hand, ib.reserved, ib.available,
            ib.damaged, ib.quarantine, ib.pending_transfer,
            ib.stok_min, ib.stok_max,
            ib.hpp, ib.nilai_persediaan, ib.batch,
            ib.last_sync,
            CASE
                WHEN ib.available <= 0 THEN 'zero'
                WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 'low_stock'
                WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 'overstock'
                ELSE 'ok'
            END AS stock_status
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE {where}
        ORDER BY ib.available ASC, p.nama_barang
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE {where}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    return {
        "data": [dict(r) for r in rows],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit)},
    }


@router.get("/by-warehouse")
async def get_inventory_by_warehouse(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan stok per gudang."""
    extra = ""
    params = {}
    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " AND ib.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            extra = " AND ib.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            ib.id_gudang, w.nama_gudang, w.nama_kantor,
            COUNT(DISTINCT ib.id_barang) AS jumlah_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count
        FROM operational.inventory_balances ib
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE 1=1 {extra}
        GROUP BY ib.id_gudang, w.nama_gudang, w.nama_kantor
        ORDER BY total_nilai DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/low-stock")
async def get_low_stock(
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Barang yang stoknya di bawah batas minimum."""
    params = {}
    filter_clause = ""
    if id_gudang:
        filter_clause = "AND ib.id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            filter_clause += " AND ib.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            filter_clause += " AND ib.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori,
            ib.id_gudang, w.nama_gudang,
            ib.available, ib.stok_min,
            ib.stok_min - ib.available AS kekurangan,
            lt.leadtime AS lead_time_days
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        LEFT JOIN public.leadtime lt
            ON ib.id_barang = lt.id_barang AND ib.id_gudang = lt.id_gudang
        WHERE ib.stok_min > 0 AND ib.available < ib.stok_min
        {filter_clause}
        ORDER BY (ib.stok_min - ib.available) DESC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/overstock")
async def get_overstock(
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Barang yang stoknya melebihi batas maksimum."""
    params = {}
    filter_clause = ""
    if id_gudang:
        filter_clause = "AND ib.id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            filter_clause += " AND ib.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            filter_clause += " AND ib.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori,
            ib.id_gudang, w.nama_gudang,
            ib.on_hand, ib.stok_max,
            ib.on_hand - ib.stok_max AS kelebihan,
            ib.nilai_persediaan
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE ib.stok_max > 0 AND ib.on_hand > ib.stok_max
        {filter_clause}
        ORDER BY (ib.on_hand - ib.stok_max) DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/movements")
async def get_stock_movements(
    id_barang: Optional[str] = None,
    id_gudang: Optional[str] = None,
    tahun: Optional[str] = None,
    bulan: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Histori mutasi stok bulanan."""
    conditions = ["1=1"]
    params: dict = {}
    if id_barang:
        conditions.append("sm.id_barang = :id_barang")
        params["id_barang"] = id_barang
    if id_gudang:
        conditions.append("sm.id_gudang = :id_gudang")
        params["id_gudang"] = id_gudang
    if tahun:
        conditions.append("sm.tahun = :tahun")
        params["tahun"] = tahun
    if bulan:
        conditions.append("sm.bulan = :bulan")
        params["bulan"] = bulan

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("sm.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("sm.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            sm.tahun, sm.bulan, sm.id_gudang, w.nama_gudang,
            sm.id_barang, p.nama_barang,
            sm.saldo_awal, sm.masuk, sm.keluar, sm.saldo_akhir
        FROM operational.stock_movements sm
        JOIN operational.products p ON sm.id_barang = p.id_barang
        JOIN operational.warehouses w ON sm.id_gudang = w.id_gudang
        WHERE {' AND '.join(conditions)}
        ORDER BY sm.tahun DESC, sm.bulan DESC
        LIMIT 500
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/aging")
async def get_inventory_aging(
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """
    Umur persediaan berdasarkan histori mutasi.
    Barang dengan saldo_akhir tinggi tapi keluar rendah = lambat bergerak.
    """
    params = {}
    filter_clause = ""
    if id_gudang:
        filter_clause = "AND sm.id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang

    # Role-based Row-Level Security
    if current_user and current_user.role == "warehouse":
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            filter_clause += " AND sm.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            filter_clause += " AND sm.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori,
            ib.id_gudang, w.nama_gudang,
            ib.on_hand,
            ib.nilai_persediaan,
            -- Avg monthly sales last 3 months
            COALESCE(avg_sales.avg_keluar, 0) AS avg_keluar_bulanan,
            -- Days of stock based on avg sales
            CASE
                WHEN COALESCE(avg_sales.avg_keluar, 0) > 0
                THEN (ib.on_hand / avg_sales.avg_keluar * 30)::INTEGER
                ELSE 9999
            END AS estimated_days_remaining
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        LEFT JOIN (
            SELECT id_barang, id_gudang, AVG(keluar) AS avg_keluar
            FROM operational.stock_movements
            WHERE (tahun || bulan)::integer >= (
                TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM')::integer
            )
            GROUP BY id_barang, id_gudang
        ) avg_sales ON ib.id_barang = avg_sales.id_barang AND ib.id_gudang = avg_sales.id_gudang
        WHERE ib.on_hand > 0
        {filter_clause}
        ORDER BY estimated_days_remaining DESC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]
