"""
Router — Warehouses Multi-Gudang Monitoring
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/")
async def list_warehouses(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar semua gudang dengan ringkasan stok."""
    extra = ""
    params = {}
    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " WHERE w.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai and current_user.role in ("warehouse", "warehouse_staff"):
            extra = " WHERE w.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            w.id_gudang, w.nama_gudang, w.nama_kantor, w.alamat, w.inisial,
            w.parent,
            COUNT(DISTINCT ib.id_barang) AS jumlah_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count
        FROM operational.warehouses w
        LEFT JOIN operational.inventory_balances ib ON w.id_gudang = ib.id_gudang
        {extra}
        GROUP BY w.id_gudang, w.nama_gudang, w.nama_kantor, w.alamat, w.inisial, w.parent
        ORDER BY w.nama_gudang
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["total_nilai"] = None
        res.append(d)
    return res


@router.get("/comparison")
async def compare_warehouses(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Perbandingan ketersediaan vs kebutuhan antargudang."""
    extra = ""
    params = {}
    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " WHERE w.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai and current_user.role in ("warehouse", "warehouse_staff"):
            extra = " WHERE w.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            w.id_gudang, w.nama_gudang, w.nama_kantor,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.reserved) AS stok_reserved,
            SUM(ib.stok_min) AS total_stok_min,
            SUM(ib.nilai_persediaan) AS total_nilai,
            COUNT(DISTINCT CASE WHEN ib.available < ib.stok_min AND ib.stok_min > 0 THEN ib.id_barang END) AS low_stock_count,
            COUNT(DISTINCT CASE WHEN ib.available <= 0 THEN ib.id_barang END) AS zero_stock_count,
            -- Recent movement
            (SELECT SUM(sm.masuk)
             FROM operational.stock_movements sm
             WHERE sm.id_gudang = w.id_gudang
             AND sm.tahun = TO_CHAR(CURRENT_DATE, 'YYYY')
             AND sm.bulan = TO_CHAR(CURRENT_DATE, 'MM')
            ) AS masuk_bulan_ini,
            (SELECT SUM(sm.keluar)
             FROM operational.stock_movements sm
             WHERE sm.id_gudang = w.id_gudang
             AND sm.tahun = TO_CHAR(CURRENT_DATE, 'YYYY')
             AND sm.bulan = TO_CHAR(CURRENT_DATE, 'MM')
            ) AS keluar_bulan_ini
        FROM operational.warehouses w
        LEFT JOIN operational.inventory_balances ib ON w.id_gudang = ib.id_gudang
        {extra}
        GROUP BY w.id_gudang, w.nama_gudang, w.nama_kantor
        ORDER BY total_nilai DESC
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["total_nilai"] = None
        res.append(d)
    return res


@router.get("/{id_gudang}/stock")
async def get_warehouse_stock(
    id_gudang: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Stok detail untuk satu gudang."""
    conditions = ["ib.id_gudang = :id_gudang"]
    params = {"id_gudang": id_gudang, "limit": limit, "offset": (page - 1) * limit}

    if search:
        conditions.append("(p.nama_barang ILIKE :search OR ib.id_barang ILIKE :search)")
        params["search"] = f"%{search}%"
    if status == "low":
        conditions.append("ib.stok_min > 0 AND ib.available < ib.stok_min")
    elif status == "zero":
        conditions.append("ib.available <= 0")
    elif status == "over":
        conditions.append("ib.stok_max > 0 AND ib.on_hand > ib.stok_max")

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            # Just verify if id_gudang parameter is in allowed list
            if id_gudang not in gudangs:
                raise HTTPException(status_code=403, detail="Akses gudang ditolak")
        elif current_user.id_pegawai and current_user.role in ("warehouse", "warehouse_staff"):
            if id_gudang != current_user.id_pegawai:
                raise HTTPException(status_code=403, detail="Akses gudang ditolak")

    where = " AND ".join(conditions)

    rows = db.execute(text(f"""
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori, p.nama_brand, p.barcode,
            ib.on_hand, ib.reserved, ib.available,
            ib.damaged, ib.quarantine, ib.pending_transfer,
            ib.stok_min, ib.stok_max, ib.hpp, ib.nilai_persediaan, ib.batch,
            CASE
                WHEN ib.available <= 0 THEN 'zero'
                WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 'low_stock'
                WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 'overstock'
                ELSE 'ok'
            END AS stock_status
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        WHERE {where}
        ORDER BY ib.available ASC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["hpp"] = None
            d["nilai_persediaan"] = None
        res.append(d)
    return {"id_gudang": id_gudang, "data": res}


@router.get("/transfers")
async def get_warehouse_transfers(
    id_gudang_asal: Optional[str] = None,
    id_gudang_tujuan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Histori transfer antargudang."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}
    if id_gudang_asal:
        conditions.append("wt.id_gudang_asal = :id_gudang_asal")
        params["id_gudang_asal"] = id_gudang_asal
    if id_gudang_tujuan:
        conditions.append("wt.id_gudang_tujuan = :id_gudang_tujuan")
        params["id_gudang_tujuan"] = id_gudang_tujuan
    if status:
        conditions.append("wt.status_label = :status")
        params["status"] = status

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("(wt.id_gudang_asal IN :gudangs OR wt.id_gudang_tujuan IN :gudangs)")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai and current_user.role in ("warehouse", "warehouse_staff"):
            conditions.append("(wt.id_gudang_asal = :user_gudang OR wt.id_gudang_tujuan = :user_gudang)")
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT *
        FROM operational.warehouse_transfers wt
        WHERE {' AND '.join(conditions)}
        ORDER BY tanggal DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/performance")
async def get_warehouse_performance(
    year: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Performa gudang per periode."""
    from datetime import datetime
    now = datetime.now()
    year = year or str(now.year)
    month = month or str(now.month).zfill(2)
    
    extra = ""
    params = {"year": year, "month": month}
    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " AND id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai and current_user.role in ("warehouse", "warehouse_staff"):
            extra = " AND id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT *
        FROM analytics.warehouse_performance
        WHERE period_year = :year AND period_month = :month {extra}
        ORDER BY nilai_persediaan_akhir DESC
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["nilai_persediaan_awal"] = None
            d["nilai_persediaan_akhir"] = None
            d["nilai_masuk"] = None
            d["nilai_keluar"] = None
        res.append(d)
    return res
