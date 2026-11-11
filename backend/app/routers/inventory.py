"""
Router — Inventory Monitoring
Stok real-time, aging, low-stock, overstock, mutasi, inbound, outbound
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, case
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import io

from app.database import get_analytics_db, get_existing_db
from app.routers.auth import CurrentUser
from app.utils.warehouse_master import get_warehouse_code_area, WAREHOUSE_CODE_AREA_MAP

router = APIRouter()


@router.get("/summary")
async def get_inventory_summary(
    id_gudang: Optional[str] = Query(None, description="Filter per gudang"),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan inventory: total stok, nilai, low-stock, overstock, zero-stock, fast, medium, slow, deadstock."""
    filter_clause = "AND ib.id_gudang = :id_gudang" if id_gudang else ""
    sales_filter = "AND so.id_gudang = :id_gudang" if id_gudang else ""
    params = {"id_gudang": id_gudang} if id_gudang else {}

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            filter_clause += " AND ib.id_gudang IN :gudangs"
            sales_filter += " AND so.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            filter_clause += " AND ib.id_gudang = :user_gudang"
            sales_filter += " AND so.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    result = db.execute(text(f"""
        WITH sales_3m AS (
            SELECT 
                soi.id_barang,
                COALESCE(so.id_gudang, '') AS id_gudang,
                ROUND(COALESCE(SUM(soi.qty) / 3.0, 0), 1) AS demand
            FROM operational.sales_order_items soi
            JOIN operational.sales_orders so ON soi.no_so = so.nomor
            WHERE so.tanggal >= CURRENT_DATE - INTERVAL '3 months' {sales_filter}
            GROUP BY soi.id_barang, so.id_gudang
        )
        SELECT
            COUNT(DISTINCT ib.id_barang) AS total_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count,
            SUM(CASE WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 1 ELSE 0 END) AS overstock_count,
            SUM(CASE WHEN COALESCE(s.demand, 0) >= 9 THEN 1 ELSE 0 END) AS fast_count,
            SUM(CASE WHEN s.demand >= 4 AND s.demand < 9 THEN 1 ELSE 0 END) AS medium_count,
            SUM(CASE WHEN s.demand > 0 AND s.demand < 4 THEN 1 ELSE 0 END) AS slow_count,
            SUM(CASE WHEN COALESCE(s.demand, 0) <= 0 THEN 1 ELSE 0 END) AS deadstock_count,
            COUNT(DISTINCT ib.id_gudang) AS total_gudang
        FROM operational.inventory_balances ib
        LEFT JOIN sales_3m s ON ib.id_barang = s.id_barang AND ib.id_gudang = s.id_gudang
        WHERE 1=1 {filter_clause}
    """), params).mappings().first()

    res = dict(result) if result else {}
    if current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff"):
        res["total_nilai"] = None
    return res


@router.get("/by-product")
async def get_inventory_by_product(
    id_gudang: Optional[str] = None,
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    status: Optional[str] = Query(None, description="low_stock|overstock|zero|ok|fast|medium|slow|deadstock"),
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Stok per produk dengan filter dan paginasi (termasuk klasifikasi Min-Max: Fast, Medium, Slow, Deadstock)."""
    conditions = ["1=1"]
    params: dict = {"offset": (page - 1) * limit, "limit": limit}
    sales_filter = ""

    if id_gudang:
        conditions.append("ib.id_gudang = :id_gudang")
        sales_filter = "AND so.id_gudang = :id_gudang"
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
    elif status == "fast":
        conditions.append("COALESCE(s.demand, 0) >= 9")
    elif status == "medium":
        conditions.append("s.demand >= 4 AND s.demand < 9")
    elif status == "slow":
        conditions.append("s.demand > 0 AND s.demand < 4")
    elif status == "deadstock":
        conditions.append("COALESCE(s.demand, 0) <= 0")

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("ib.id_gudang IN :gudangs")
            sales_filter += " AND so.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("ib.id_gudang = :user_gudang")
            sales_filter += " AND so.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    where = " AND ".join(conditions)

    cte = f"""
        WITH sales_3m AS (
            SELECT 
                soi.id_barang,
                COALESCE(so.id_gudang, '') AS id_gudang,
                MAX(so.tanggal) AS last_call,
                ROUND(COALESCE(SUM(soi.qty) / 3.0, 0), 1) AS demand
            FROM operational.sales_order_items soi
            JOIN operational.sales_orders so ON soi.no_so = so.nomor
            WHERE so.tanggal >= CURRENT_DATE - INTERVAL '3 months' {sales_filter}
            GROUP BY soi.id_barang, so.id_gudang
        )
    """

    rows = db.execute(text(f"""
        {cte}
        SELECT
            ib.id_barang, p.nama_barang, p.nama_kategori, p.nama_brand,
            ib.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area,
            ib.on_hand, ib.reserved, ib.available,
            ib.damaged, ib.quarantine, ib.pending_transfer,
            ib.stok_min, ib.stok_max,
            ib.hpp, ib.nilai_persediaan, ib.batch,
            ib.last_sync,
            COALESCE(s.demand, 0) AS demand,
            s.last_call,
            CASE 
                WHEN COALESCE(s.demand, 0) <= 0 THEN 'Deadstock'
                WHEN s.demand < 4 THEN 'Slow'
                WHEN s.demand <= 8 THEN 'Medium'
                ELSE 'Fast'
            END AS movement_category,
            CASE
                WHEN ib.available <= 0 THEN 'zero'
                WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 'low_stock'
                WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 'overstock'
                ELSE 'ok'
            END AS stock_status
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        LEFT JOIN sales_3m s ON ib.id_barang = s.id_barang AND ib.id_gudang = s.id_gudang
        WHERE {where}
        ORDER BY ib.available ASC, p.nama_barang
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        {cte}
        SELECT COUNT(*) FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        LEFT JOIN sales_3m s ON ib.id_barang = s.id_barang AND ib.id_gudang = s.id_gudang
        WHERE {where}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    data_list = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        if hide_financial:
            d["hpp"] = None
            d["nilai_persediaan"] = None
        data_list.append(d)

    return {
        "data": data_list,
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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " AND ib.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            extra = " AND ib.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            ib.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area,
            COUNT(DISTINCT ib.id_barang) AS jumlah_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count
        FROM operational.inventory_balances ib
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE 1=1 {extra}
        GROUP BY ib.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area
        ORDER BY total_on_hand DESC
    """), params).mappings().all()
    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    result_rows = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        if hide_financial:
            d["total_nilai"] = None
        result_rows.append(d)
    return result_rows


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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
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
            ib.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area,
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
    results = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        results.append(d)
    return results


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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
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
            ib.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area,
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
    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        if hide_financial:
            d["nilai_persediaan"] = None
        res.append(d)
    return res


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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("sm.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("sm.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            sm.tahun, sm.bulan, sm.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area,
            sm.id_barang, p.nama_barang,
            sm.saldo_awal, sm.masuk, sm.keluar, sm.saldo_akhir
        FROM operational.stock_movements sm
        JOIN operational.products p ON sm.id_barang = p.id_barang
        JOIN operational.warehouses w ON sm.id_gudang = w.id_gudang
        WHERE {' AND '.join(conditions)}
        ORDER BY sm.tahun DESC, sm.bulan DESC
        LIMIT 500
    """), params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        results.append(d)
    return results


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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
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
    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["nilai_persediaan"] = None
        res.append(d)
    return res


@router.get("/aging-fifo")
async def get_inventory_aging_fifo(
    id_gudang: Optional[str] = Query(None, description="Pilihan gudang atau 'ALL'/kosong untuk semua warehouse"),
    date_from: Optional[str] = Query(None, description="Filter tanggal awal stok/penerimaan (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter tanggal akhir stok/penerimaan (YYYY-MM-DD)"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Menghitung umur persediaan (Stock Aging) berdasarkan aturan resmi:
    1. Aging barang dihitung dari tanggal penerimaan barang (tgl_penerimaan), bukan tanggal posting.
    2. Barang yang pindah gudang lewat Internal Transfer tetap membawa tanggal penerimaan asalnya (aging tidak ter-reset).
    3. Rumus aging: aging (hari) = tanggal hari ini - tanggal stok.
    4. Urutan prioritas penentuan tanggal stok:
       - Prioritas 1: Stok hasil Cancel IT, batch sama — tanggal stok asal paling awal dengan batch yang sama.
       - Prioritas 2: Stok hasil Cancel IT, batch beda — tanggal stok asal paling awal untuk barang yang sama.
       - Prioritas 3: Selain itu — tanggal paling awal antara stok_barang.tanggal dan tanggal dokumen Internal Transfer (kalau stok berasal dari IT).
    5. Menampilkan kolom kemasan (Drum, Pail, IBC, dll.) berdasarkan master product dan nomor PO Sell In.
    """
    today = date.today()

    if id_gudang:
        gudang_list = [g.strip() for g in id_gudang.split(",") if g.strip()]
        if any(g.upper() in ("ALL", "SEMUA") for g in gudang_list) or not gudang_list:
            is_all = True
            gudang_list = []
        else:
            is_all = False
    else:
        is_all = True
        gudang_list = []

    if is_all:
        cob_filter = ""
        coi_filter = ""
        main_filter = ""
        params = {}
    elif len(gudang_list) == 1:
        cob_filter = "AND sb.id_gudang = :id_gudang"
        coi_filter = "AND sb.id_gudang = :id_gudang"
        main_filter = "AND sb.id_gudang = :id_gudang"
        params = {"id_gudang": gudang_list[0]}
    else:
        cob_filter = "AND sb.id_gudang IN :id_gudang_tuple"
        coi_filter = "AND sb.id_gudang IN :id_gudang_tuple"
        main_filter = "AND sb.id_gudang IN :id_gudang_tuple"
        params = {"id_gudang_tuple": tuple(gudang_list)}

    query = f"""
        WITH cancel_origin_batch AS (
            -- Prioritas 1: Stok asal paling awal dengan batch yang sama
            SELECT 
                sb.id_stok,
                MIN(orig.tanggal) as tgl_batch
            FROM stok_barang sb
            JOIN stok_barang orig ON orig.id_barang = sb.id_barang 
                                 AND orig.batch = sb.batch 
                                 AND orig.reff NOT LIKE '%CANCEL%'
                                 AND orig.tanggal <= sb.tanggal
            WHERE sb.stok > 0 
              AND (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%')
              AND sb.batch IS NOT NULL 
              AND TRIM(sb.batch) != ''
              {cob_filter}
            GROUP BY sb.id_stok
        ),
        cancel_origin_item AS (
            -- Prioritas 2: Stok asal paling awal untuk barang yang sama di gudang asal
            SELECT 
                sb.id_stok,
                MIN(orig.tanggal) as tgl_item
            FROM stok_barang sb
            JOIN stok_barang orig ON orig.id_barang = sb.id_barang 
                                 AND orig.id_gudang = sb.id_gudang
                                 AND orig.reff NOT LIKE '%CANCEL%'
                                 AND orig.tanggal <= sb.tanggal
            WHERE sb.stok > 0 
              AND (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%')
              {coi_filter}
            GROUP BY sb.id_stok
        )
        SELECT 
            sb.id_stok,
            sb.id_barang,
            sb.id_gudang,
            b.nama_barang,
            b.id_satuan_besar,
            b.id_satuan_kecil,
            b.isi_satuan,
            COALESCE(kb.kategori_barang, b.id_kategori_barang, '-') AS kategori,
            sb.stok,
            sb.tanggal AS tgl_tercatat,
            sb.batch,
            sb.reff,
            g_curr.gudang AS nama_gudang_curr,
            it.tanggal AS tgl_dokumen_it,
            it.tanggal_terima AS tgl_terima_it,
            it.id_gudang_asal,
            g_asal.gudang AS nama_gudang_asal,
            pg.nomor_po AS po_direct,
            s.supplier AS nama_supplier,
            CASE 
                WHEN sb.reff LIKE '%CANCEL%' THEN 'Cancel IT'
                WHEN it.nomor IS NOT NULL THEN COALESCE(g_asal.gudang, it.id_gudang_asal)
                WHEN sb.reff LIKE '%BTB%' OR sb.reff LIKE '%BPB%' THEN 
                    CASE 
                        WHEN s.supplier ILIKE '%Shell%' THEN 'Shell'
                        WHEN s.supplier ILIKE '%Cahaya Resources%' OR s.supplier ILIKE '%CRA%' THEN 'CRA'
                        WHEN s.supplier IS NOT NULL THEN s.supplier
                        ELSE 'Supplier'
                    END
                WHEN sb.reff LIKE '%SPK%' OR sb.reff LIKE '%DCNT%' THEN 'Decanting'
                WHEN sb.reff LIKE '%/IN/%' OR sb.reff LIKE '%PENAMBAHAN%' OR sb.reff LIKE '%ADJ%' THEN 'Penambahan'
                ELSE 'Lainnya'
            END AS asal,
            -- Penerapan Urutan Prioritas dari Dokumen
            CASE 
                WHEN (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%') AND cob.tgl_batch IS NOT NULL THEN cob.tgl_batch
                WHEN (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%') AND coi.tgl_item IS NOT NULL THEN coi.tgl_item
                WHEN it.nomor IS NOT NULL AND it.tanggal IS NOT NULL THEN LEAST(sb.tanggal, it.tanggal)
                ELSE sb.tanggal
            END AS tanggal_stok
        FROM stok_barang sb
        JOIN barang b ON sb.id_barang = b.id_barang
        LEFT JOIN kategori_barang kb ON b.id_kategori_barang = kb.id_kategori_barang
        LEFT JOIN gudang g_curr ON sb.id_gudang = g_curr.id_gudang
        LEFT JOIN internal_transfer it ON sb.reff = it.nomor
        LEFT JOIN gudang g_asal ON it.id_gudang_asal = g_asal.id_gudang
        LEFT JOIN penerimaan_gudang pg ON sb.reff = pg.no_penerimaan
        LEFT JOIN supplier s ON pg.id_supplier = s.id
        LEFT JOIN cancel_origin_batch cob ON sb.id_stok = cob.id_stok
        LEFT JOIN cancel_origin_item coi ON sb.id_stok = coi.id_stok
        WHERE sb.stok > 0 {main_filter}
        ORDER BY tanggal_stok ASC, sb.id_barang
    """

    rows = [dict(r) for r in db.execute(text(query), params).mappings().all()]

    # Fast Sell In PO Resolution untuk stok yang berasal dari IT
    it_rows = [r for r in rows if r['id_gudang_asal'] and not r['po_direct']]
    if it_rows:
        asal_whs = list({r['id_gudang_asal'] for r in it_rows})
        item_ids = list({r['id_barang'] for r in it_rows})
        q_po = """
            SELECT pg.id_gudang, pgd.id_barang, pgd.batch, pg.tgl_penerimaan, pg.nomor_po
            FROM penerimaan_gudang pg
            JOIN penerimaan_gudang_detail pgd ON pg.no_penerimaan = pgd.no_penerimaan
            WHERE pg.id_gudang IN :asal_whs AND pgd.id_barang IN :item_ids AND pg.nomor_po IS NOT NULL AND pg.nomor_po != ''
            ORDER BY pg.tgl_penerimaan DESC
        """
        po_records = [dict(p) for p in db.execute(text(q_po), {"asal_whs": tuple(asal_whs), "item_ids": tuple(item_ids)}).mappings().all()]
        for r in it_rows:
            matching_po = None
            matching_tgl = None
            if r['batch'] and r['batch'].strip():
                for p in po_records:
                    if p['id_gudang'] == r['id_gudang_asal'] and p['id_barang'] == r['id_barang'] and p['batch'] == r['batch'] and p['tgl_penerimaan'] <= (r['tgl_dokumen_it'] or today):
                        matching_po = p['nomor_po']
                        matching_tgl = p['tgl_penerimaan']
                        break
            if not matching_po:
                for p in po_records:
                    if p['id_gudang'] == r['id_gudang_asal'] and p['id_barang'] == r['id_barang'] and p['tgl_penerimaan'] == r['tanggal_stok']:
                        matching_po = p['nomor_po']
                        matching_tgl = p['tgl_penerimaan']
                        break
            if not matching_po:
                for p in po_records:
                    if p['id_gudang'] == r['id_gudang_asal'] and p['id_barang'] == r['id_barang'] and p['tgl_penerimaan'] <= (r['tgl_dokumen_it'] or today):
                        matching_po = p['nomor_po']
                        matching_tgl = p['tgl_penerimaan']
                        break
            r['sell_in_po'] = matching_po
            if matching_tgl:
                r['tanggal_stok'] = matching_tgl

    summary = {
        "0-149": {"label": "Acceptable", "skuCount": 0, "unitCount": 0},
        "150-239": {"label": "Over-stock", "skuCount": 0, "unitCount": 0},
        ">=240": {"label": "Deadstock", "skuCount": 0, "unitCount": 0}
    }
    sku_set_per_cat = {"0-149": set(), "150-239": set(), ">=240": set()}
    results = []

    for r in rows:
        stok_val = float(r['stok']) if r['stok'] is not None else 0.0
        tgl_stok = r['tanggal_stok'] or r['tgl_tercatat'] or today

        # Filter periode tanggal penerimaan / stok
        if date_from:
            try:
                d_from = datetime.strptime(date_from.strip(), "%Y-%m-%d").date()
                if tgl_stok and tgl_stok < d_from:
                    continue
            except Exception:
                pass
        if date_to:
            try:
                d_to = datetime.strptime(date_to.strip(), "%Y-%m-%d").date()
                if tgl_stok and tgl_stok > d_to:
                    continue
            except Exception:
                pass

        aging_hari = max((today - tgl_stok).days, 0)

        # Umur di gudang saat ini (cut-off tepat saat barang diterima di gudang tujuan)
        tgl_di_gudang = r['tgl_terima_it'] or r['tgl_tercatat'] or tgl_stok
        umur_gudang = max((today - tgl_di_gudang).days, 0)
        if umur_gudang > aging_hari:
            umur_gudang = aging_hari
        umur_gudang_asal = max(int(aging_hari) - int(umur_gudang), 0)

        # Hitung Kemasan
        isi = float(r['isi_satuan']) if r['isi_satuan'] else 1.0
        stok_kemasan = (stok_val / isi) if isi > 0 else stok_val
        sat_besar = r['id_satuan_besar'] or 'Kemasan'
        sat_kecil = r['id_satuan_kecil'] or 'Ltr'

        # Format label kemasan (contoh: "5 Drum" atau "5.5 Drum")
        kemasan_label = f"{int(stok_kemasan) if stok_kemasan.is_integer() else round(stok_kemasan, 1)} {sat_besar}"
        volume_label = f"{stok_val:,.0f} {sat_kecil}"
        qty_detail_label = f"{stok_val:,.0f} {sat_kecil} ({stok_kemasan:.1f} {sat_besar})"

        # Klasifikasi Summary berdasarkan aturan:
        # 0-149: Acceptable
        # 150-239: Over-stock
        # >=240: Deadstock
        if aging_hari <= 149:
            key = "0-149"
            status_aging = "Acceptable"
        elif aging_hari <= 239:
            key = "150-239"
            status_aging = "Over-stock"
        else:
            key = ">=240"
            status_aging = "Deadstock"

        summary[key]["unitCount"] += stok_val
        sku_set_per_cat[key].add(r['id_barang'])

        formatted_date = tgl_stok.strftime('%d %b %Y') if tgl_stok else '-'
        sell_in_po_val = r.get('sell_in_po') or r.get('po_direct') or '-'

        results.append({
            "id": f"{r['id_barang']}-{r['id_stok']}",
            "id_stok": int(r['id_stok']) if r['id_stok'] is not None else 0,
            "id_barang": str(r['id_barang']),
            "id_gudang": str(r.get('id_gudang') or ''),
            "code_area": get_warehouse_code_area(r.get('id_gudang'), r.get('nama_gudang_curr')),
            "material_code": str(r['id_barang']),
            "nama_barang": str(r['nama_barang']),
            "produk": f"{r['id_barang']} - {r['nama_barang']}",
            "sisaStok": float(stok_val),
            "stok": float(stok_val),
            "stok_kemasan": float(stok_kemasan),
            "stok_kemasan_label": kemasan_label,
            "volume_label": volume_label,
            "qty_kemasan_detail": qty_detail_label,
            "satuan_besar": sat_besar,
            "satuan_kecil": sat_kecil,
            "isi_satuan": float(isi),
            "aging_hari": int(aging_hari),
            "status_aging": status_aging,
            "sell_in_po": sell_in_po_val,
            "kategori": r.get('kategori') or '-',
            "gudang": r['nama_gudang_curr'] or 'Gudang',
            "asal": r['asal'],
            "dokumen": r['reff'] or '-',
            "batch": r['batch'] or '-',
            "nomor_po": sell_in_po_val,
            "supplier": r['nama_supplier'] or r['asal'],
            "tanggal_stok": tgl_stok.isoformat() if hasattr(tgl_stok, 'isoformat') else str(tgl_stok),
            "diterimaDiMakassar": formatted_date,
            "tgl_diterima": formatted_date,
            "umurGudang": f"{umur_gudang} hari",
            "umur_gudang_hari": int(umur_gudang),
            "umur_gudang_asal_hari": int(umur_gudang_asal),
            "umurKeseluruhan": f"{aging_hari} hari",
            "umur_hari": int(aging_hari),
            "status": "verified"
        })

    for k in summary.keys():
        summary[k]["skuCount"] = len(sku_set_per_cat[k])

    results.sort(key=lambda x: (x['umur_hari'], x['id_barang']))

    return {
        "summary": summary,
        "data": results
    }


class StockAgingExportRequest(BaseModel):
    items: Optional[List[Dict[str, Any]]] = None
    summary: Optional[Dict[str, Any]] = None
    id_gudang: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    search: Optional[str] = None
    gudang_label: Optional[str] = None
    periode_label: Optional[str] = None


class StockInventoryExportRequest(BaseModel):
    items: Optional[List[Dict[str, Any]]] = None
    id_gudang: Optional[str] = None
    kategori: Optional[str] = None
    status: Optional[str] = None
    code_area: Optional[str] = None
    search: Optional[str] = None
    gudang_label: Optional[str] = None
    area_label: Optional[str] = None
    status_label: Optional[str] = None


def _format_date_dd_mon_yy(val) -> str:
    if not val or str(val).strip() in ("", "-", "None"):
        return "-"
    if isinstance(val, (datetime, date)):
        return val.strftime("%d-%b-%y")
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d-%m-%Y"):
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.strftime("%d-%b-%y")
        except Exception:
            pass
    try:
        dt = datetime.strptime(val_str[:10], "%Y-%m-%d")
        return dt.strftime("%d-%b-%y")
    except Exception:
        pass
    return val_str


def _generate_stock_aging_excel(
    items: List[Dict[str, Any]],
    summary: Optional[Dict[str, Any]] = None,
    gudang_label: str = "Semua Warehouse",
    periode_label: str = "Semua Periode"
) -> io.BytesIO:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Stock Aging"

    # 1. Header Banner
    ws.merge_cells("A1:Q1")
    ws["A1"] = "PT. CAHAYA PENGAJARAN ABADI"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")

    ws.merge_cells("A2:Q2")
    ws["A2"] = "LAPORAN STOCK AGING & JEJAK BATCH PERSEDIAAN (FIFO)"
    ws["A2"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")

    now_str = datetime.now().strftime("%d-%b-%y %H:%M WIB")
    ws.merge_cells("A3:Q3")
    ws["A3"] = f"Gudang: {gudang_label} | Periode: {periode_label} | Diekspor pada: {now_str} | Total Stok: {len(items):,} baris"
    ws["A3"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    # 2. KPI Summary Cards
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )
    card_header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    tot_vol = sum(float(r.get("stok") or r.get("sisaStok") or 0) for r in items)

    ws.merge_cells("A5:C5")
    ws["A5"] = "TOTAL VOLUME PERSEDIAAN"
    ws["A5"].font = Font(name="Calibri", size=9, bold=True, color="1E3A5F")
    ws["A5"].fill = card_header_fill
    ws["A5"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("A6:C6")
    ws["A6"] = f"{tot_vol:,.0f} Liter ({len(items):,} Baris Stok)"
    ws["A6"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")
    ws["A6"].alignment = Alignment(horizontal="center", vertical="center")

    acc_vol = sum(float(r.get("stok") or r.get("sisaStok") or 0) for r in items if r.get("status_aging") == "Acceptable")
    acc_count = sum(1 for r in items if r.get("status_aging") == "Acceptable")
    acc_card_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    ws.merge_cells("D5:F5")
    ws["D5"] = "ACCEPTABLE (0 - 149 HARI)"
    ws["D5"].font = Font(name="Calibri", size=9, bold=True, color="15803D")
    ws["D5"].fill = acc_card_fill
    ws["D5"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("D6:F6")
    ws["D6"] = f"{acc_vol:,.0f} Liter ({acc_count:,} Stok)"
    ws["D6"].font = Font(name="Calibri", size=11, bold=True, color="15803D")
    ws["D6"].alignment = Alignment(horizontal="center", vertical="center")

    ovr_vol = sum(float(r.get("stok") or r.get("sisaStok") or 0) for r in items if r.get("status_aging") == "Over-stock")
    ovr_count = sum(1 for r in items if r.get("status_aging") == "Over-stock")
    ovr_card_fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
    ws.merge_cells("G5:I5")
    ws["G5"] = "OVER-STOCK (150 - 239 HARI)"
    ws["G5"].font = Font(name="Calibri", size=9, bold=True, color="A16207")
    ws["G5"].fill = ovr_card_fill
    ws["G5"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("G6:I6")
    ws["G6"] = f"{ovr_vol:,.0f} Liter ({ovr_count:,} Stok)"
    ws["G6"].font = Font(name="Calibri", size=11, bold=True, color="A16207")
    ws["G6"].alignment = Alignment(horizontal="center", vertical="center")

    ded_vol = sum(float(r.get("stok") or r.get("sisaStok") or 0) for r in items if r.get("status_aging") == "Deadstock")
    ded_count = sum(1 for r in items if r.get("status_aging") == "Deadstock")
    ded_card_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    ws.merge_cells("J5:L5")
    ws["J5"] = "DEADSTOCK (≥ 240 HARI)"
    ws["J5"].font = Font(name="Calibri", size=9, bold=True, color="B91C1C")
    ws["J5"].fill = ded_card_fill
    ws["J5"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("J6:L6")
    ws["J6"] = f"{ded_vol:,.0f} Liter ({ded_count:,} Stok)"
    ws["J6"].font = Font(name="Calibri", size=11, bold=True, color="B91C1C")
    ws["J6"].alignment = Alignment(horizontal="center", vertical="center")

    for row_idx in (5, 6):
        for col_idx in range(1, 13):
            cell = ws.cell(row_idx, col_idx)
            cell.border = thin_border

    # 3. Table Headers
    headers = [
        "No", "Material Code", "Nama Barang", "Kategori", "Volume (Liter)",
        "Stok Kemasan", "Asal (Supplier / Gudang)", "Lifetime Aging (Hari)",
        "Tgl. Penerimaan / Masuk", "Aging Gudang Ini (Hari)", "Aging Asal (Hari)",
        "Sell In PO", "Status Aging", "Code Area", "Gudang Saat Ini", "No. Dokumen Reff", "No. Batch"
    ]

    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    ws.row_dimensions[8].height = 28

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(8, col_idx, h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # 4. Data Rows
    fill_acc = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    font_acc = Font(name="Calibri", size=10, bold=True, color="15803D")

    fill_ovr = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
    font_ovr = Font(name="Calibri", size=10, bold=True, color="A16207")

    fill_ded = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    font_ded = Font(name="Calibri", size=10, bold=True, color="B91C1C")

    font_regular = Font(name="Calibri", size=10, color="000000")
    font_code = Font(name="Consolas", size=9, bold=True, color="0F172A")

    for idx, r in enumerate(items, 1):
        row_num = 8 + idx
        ws.row_dimensions[row_num].height = 20

        stk_vol = float(r.get("stok") or r.get("sisaStok") or 0)
        kemasan_lbl = str(r.get("stok_kemasan_label") or "")
        aging_days = int(r.get("aging_hari") or r.get("umur_hari") or 0)
        umur_gd = int(r.get("umur_gudang_hari") if r.get("umur_gudang_hari") is not None else aging_days)
        umur_asal = int(r.get("umur_gudang_asal_hari") or max(aging_days - umur_gd, 0))
        tgl_rcv = _format_date_dd_mon_yy(r.get("tgl_diterima") or r.get("tanggal_stok"))
        st_aging = str(r.get("status_aging") or ("Acceptable" if aging_days <= 149 else "Over-stock" if aging_days <= 239 else "Deadstock"))
        po_str = str(r.get("sell_in_po") or r.get("nomor_po") or "-")
        if po_str == "":
            po_str = "-"
        code_area_val = str(r.get("code_area") or get_warehouse_code_area(r.get("id_gudang"), r.get("gudang")))

        row_values = [
            (idx, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (str(r.get("material_code") or r.get("id_barang") or "-"), Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(r.get("nama_barang") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(r.get("kategori") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (stk_vol, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (kemasan_lbl, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (str(r.get("asal") or "-"), Alignment(horizontal="center", vertical="center"), font_regular, None),
            (aging_days, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (tgl_rcv, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (umur_gd, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (umur_asal, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (po_str, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (st_aging, Alignment(horizontal="center", vertical="center"), font_acc if st_aging == "Acceptable" else font_ovr if st_aging == "Over-stock" else font_ded, fill_acc if st_aging == "Acceptable" else fill_ovr if st_aging == "Over-stock" else fill_ded),
            (code_area_val, Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(r.get("gudang") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(r.get("dokumen") or r.get("reff") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(r.get("batch") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
        ]

        for col_idx, (val, align, fnt, num_fmt_or_fill) in enumerate(row_values, 1):
            cell = ws.cell(row_num, col_idx, val)
            cell.alignment = align
            cell.font = fnt
            cell.border = thin_border
            if col_idx == 13 and num_fmt_or_fill:
                cell.fill = num_fmt_or_fill
            elif isinstance(num_fmt_or_fill, str):
                cell.number_format = num_fmt_or_fill

    # 5. Auto column widths
    min_widths = {
        1: 6,   # No
        2: 15,  # Material Code
        3: 38,  # Nama Barang
        4: 16,  # Kategori
        5: 15,  # Volume (Liter)
        6: 15,  # Stok Kemasan
        7: 18,  # Asal
        8: 15,  # Lifetime Aging
        9: 16,  # Tgl Penerimaan
        10: 15, # Aging Gudang Ini
        11: 14, # Aging Asal
        12: 18, # Sell In PO
        13: 15, # Status Aging
        14: 12, # Code Area
        15: 22, # Gudang Saat Ini
        16: 20, # Dokumen Reff
        17: 16, # Batch
    }

    for col_idx in range(1, 18):
        col_letter = get_column_letter(col_idx)
        max_len = 0
        for r_idx in range(8, 8 + len(items) + 1):
            val_s = str(ws.cell(r_idx, col_idx).value or "")
            if len(val_s) > max_len:
                max_len = len(val_s)
        base_min = min_widths.get(col_idx, 12)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, base_min), 55)

    ws.freeze_panes = "A9"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


@router.post("/aging-fifo/export-excel")
async def export_inventory_aging_excel_post(
    payload: Optional[StockAgingExportRequest] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Ekspor data Stock Aging ke format Excel (.xlsx).
    Menerima items yang telah difilter di frontend atau menarik ulang data dari database.
    """
    items = payload.items if payload and payload.items is not None else None
    summary = payload.summary if payload else None
    gudang_label = payload.gudang_label if payload and payload.gudang_label else (payload.id_gudang or "Semua Warehouse")
    periode_label = payload.periode_label if payload and payload.periode_label else "Semua Periode"

    if items is None:
        data_res = await get_inventory_aging_fifo(
            id_gudang=payload.id_gudang if payload else None,
            date_from=payload.date_from if payload else None,
            date_to=payload.date_to if payload else None,
            db=db,
            current_user=current_user
        )
        items = data_res.get("data", [])
        if not summary:
            summary = data_res.get("summary")

        if payload and payload.search:
            s = payload.search.lower().strip()
            items = [
                r for r in items
                if s in str(r.get("material_code", "")).lower()
                or s in str(r.get("nama_barang", "")).lower()
                or s in str(r.get("sell_in_po", "")).lower()
                or s in str(r.get("asal", "")).lower()
                or s in str(r.get("gudang", "")).lower()
                or s in str(r.get("dokumen", "")).lower()
            ]

    buf = _generate_stock_aging_excel(
        items=items,
        summary=summary,
        gudang_label=gudang_label,
        periode_label=periode_label
    )

    now_tag = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Stock_Aging_CPA_{now_tag}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/aging-fifo/export-excel")
async def export_inventory_aging_excel_get(
    id_gudang: Optional[str] = Query(None, description="Pilihan gudang atau 'ALL'/kosong untuk semua warehouse"),
    date_from: Optional[str] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Kata kunci pencarian"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Ekspor data Stock Aging via GET request query parameters ke format Excel (.xlsx).
    """
    payload = StockAgingExportRequest(
        id_gudang=id_gudang,
        date_from=date_from,
        date_to=date_to,
        search=search,
        gudang_label=id_gudang or "Semua Warehouse",
        periode_label=f"{date_from or 'Awal'} s/d {date_to or 'Hari Ini'}" if (date_from or date_to) else "Semua Periode"
    )
    return await export_inventory_aging_excel_post(payload=payload, db=db, current_user=current_user)


def _generate_stock_inventory_excel(
    items: List[Dict[str, Any]],
    gudang_label: str = "Semua Warehouse",
    area_label: str = "Semua Area",
    status_label: str = "Semua Status"
) -> io.BytesIO:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Stok Persediaan"

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )

    # 1. Header Banner
    ws.merge_cells("A1:O1")
    ws["A1"] = "PT. CAHAYA PENGAJARAN ABADI"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")

    ws.merge_cells("A2:O2")
    ws["A2"] = "LAPORAN MONITORING STOK & PERSEDIAAN GUDANG"
    ws["A2"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")

    now_str = datetime.now().strftime("%d-%b-%y %H:%M WIB")
    ws.merge_cells("A3:O3")
    ws["A3"] = f"Gudang: {gudang_label} | Code Area: {area_label} | Status: {status_label} | Diekspor pada: {now_str} | Total SKU: {len(items):,} baris"
    ws["A3"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    # 2. Table Headers
    headers = [
        "No", "Kode Barang", "Nama Produk", "Kategori", "Code Area",
        "Nama Gudang", "Kantor / Cabang", "On Hand", "Reserved", "Available",
        "Stok Min", "Stok Max", "Demand (3M)", "Kategori Min-Max", "Status Stok"
    ]

    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    ws.row_dimensions[5].height = 26

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(5, col_idx, h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # 3. Data Rows
    font_regular = Font(name="Calibri", size=10, color="000000")
    font_code = Font(name="Consolas", size=9, bold=True, color="0F172A")

    for idx, r in enumerate(items, 1):
        row_num = 5 + idx
        ws.row_dimensions[row_num].height = 19

        code_area_val = str(r.get("code_area") or get_warehouse_code_area(r.get("id_gudang"), r.get("nama_gudang"), r.get("nama_kantor")))
        on_hand = float(r.get("on_hand") or 0)
        reserved = float(r.get("reserved") or 0)
        available = float(r.get("available") or 0)
        stok_min = float(r.get("stok_min") or 0)
        stok_max = float(r.get("stok_max") or 0)
        demand = float(r.get("demand") or 0)
        mov_cat = str(r.get("movement_category") or ("Fast" if demand >= 9 else "Medium" if demand >= 4 else "Slow" if demand > 0 else "Deadstock"))
        stk_status = str(r.get("stock_status") or ("zero" if available <= 0 else "low_stock" if (stok_min > 0 and available < stok_min) else "overstock" if (stok_max > 0 and on_hand > stok_max) else "ok"))

        status_lbl_map = {"zero": "Stok Kosong", "low_stock": "Stok Menipis", "overstock": "Kelebihan Stok", "ok": "Stok Aman"}
        status_label_str = status_lbl_map.get(stk_status, stk_status.title())

        row_values = [
            (idx, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (str(r.get("id_barang") or "-"), Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(r.get("nama_barang") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(r.get("nama_kategori") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (code_area_val, Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(r.get("nama_gudang") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(r.get("nama_kantor") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (on_hand, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (reserved, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (available, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (stok_min, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (stok_max, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (demand, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0.0"),
            (mov_cat, Alignment(horizontal="center", vertical="center"), font_regular, None),
            (status_label_str, Alignment(horizontal="center", vertical="center"), font_regular, None),
        ]

        for col_idx, (val, align, fnt, num_fmt) in enumerate(row_values, 1):
            cell = ws.cell(row_num, col_idx, val)
            cell.alignment = align
            cell.font = fnt
            cell.border = thin_border
            if num_fmt:
                cell.number_format = num_fmt

    min_widths = {
        1: 6,   # No
        2: 15,  # Kode Barang
        3: 38,  # Nama Produk
        4: 16,  # Kategori
        5: 12,  # Code Area
        6: 22,  # Nama Gudang
        7: 18,  # Kantor / Cabang
        8: 12,  # On Hand
        9: 12,  # Reserved
        10: 12, # Available
        11: 12, # Min
        12: 12, # Max
        13: 14, # Demand
        14: 16, # Kategori Min-Max
        15: 16, # Status
    }

    for col_idx in range(1, 16):
        col_letter = get_column_letter(col_idx)
        max_len = 0
        for r_idx in range(5, 5 + len(items) + 1):
            val_s = str(ws.cell(r_idx, col_idx).value or "")
            if len(val_s) > max_len:
                max_len = len(val_s)
        base_min = min_widths.get(col_idx, 12)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, base_min), 50)

    ws.freeze_panes = "A6"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


@router.post("/export-excel")
async def export_inventory_stock_excel_post(
    payload: Optional[StockInventoryExportRequest] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """
    Ekspor data Monitoring Stok Persediaan ke format Excel (.xlsx).
    """
    items = payload.items if payload and payload.items is not None else None
    gudang_label = payload.gudang_label if payload and payload.gudang_label else "Semua Warehouse"
    area_label = payload.area_label if payload and payload.area_label else "Semua Area"
    status_label = payload.status_label if payload and payload.status_label else "Semua Status"

    if items is None:
        data_res = await get_inventory_by_product(
            id_gudang=payload.id_gudang if payload else None,
            search=payload.search if payload else None,
            kategori=payload.kategori if payload else None,
            status=payload.status if payload else None,
            page=1,
            limit=5000,
            db=db,
            current_user=current_user
        )
        items = data_res.get("data", [])

    if payload and payload.code_area and payload.code_area.upper() != "ALL":
        ca_filter = payload.code_area.upper()
        items = [r for r in items if str(r.get("code_area", "")).upper() == ca_filter]

    buf = _generate_stock_inventory_excel(
        items=items,
        gudang_label=gudang_label,
        area_label=area_label,
        status_label=status_label
    )

    now_tag = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Monitoring_Stok_CPA_{now_tag}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export-excel")
async def export_inventory_stock_excel_get(
    id_gudang: Optional[str] = Query(None, description="Pilihan gudang"),
    code_area: Optional[str] = Query(None, description="Pilihan code area (CPA01, CPA02, CPA03, HO)"),
    status: Optional[str] = Query(None, description="Filter status stok"),
    kategori: Optional[str] = Query(None, description="Filter kategori"),
    search: Optional[str] = Query(None, description="Pencarian nama atau kode"),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """
    Ekspor data Monitoring Stok via GET query parameters.
    """
    payload = StockInventoryExportRequest(
        id_gudang=id_gudang,
        code_area=code_area,
        status=status,
        kategori=kategori,
        search=search,
        gudang_label=id_gudang or "Semua Warehouse",
        area_label=code_area or "Semua Area",
        status_label=status or "Semua Status"
    )
    return await export_inventory_stock_excel_post(payload=payload, db=db, current_user=current_user)


@router.get("/stock-trace")
async def get_stock_trace(
    id_stok: Optional[str] = None,
    id_barang: Optional[str] = None,
    dokumen: Optional[str] = None,
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Menelusuri jejak perpindahan produk antar gudang dan tracking aging produk per gudang
    untuk modal 'Detail Barang' Ultima:
    - Ringkasan: Material Code, Nama Barang, Qty, Gudang Saat Ini, Gudang Asal,
                 Lama di Gudang Asal, Lama di Gudang Saat Ini, Total Aging Keseluruhan.
    - Tracking Flow: Rute perpindahan produk beserta durasi hari di tiap gudang yang dilalui.
    - Tabel History: Step | No Dokumen | Tgl Transaksi | Gudang Asal | Gudang Tujuan | Lokasi Penyimpanan | Lama di Gudang | Keterangan.
    """
    today = date.today()

    # 1. Cari baris stok yang dimaksud
    sb = None
    if id_stok and str(id_stok).strip().isdigit() and int(id_stok) > 0:
        sb = db.execute(text("""
            SELECT sb.*, b.nama_barang, b.id_satuan_besar, b.id_satuan_kecil, b.isi_satuan, g.gudang AS nama_gudang
            FROM stok_barang sb
            JOIN barang b ON sb.id_barang = b.id_barang
            JOIN gudang g ON sb.id_gudang = g.id_gudang
            WHERE sb.id_stok = :id_stok
        """), {"id_stok": int(id_stok)}).mappings().first()

    clean_gudang = id_gudang.strip() if id_gudang and id_gudang.strip().upper() not in ("ALL", "SEMUA", "") else None
    if not sb and id_barang and clean_gudang:
        sb = db.execute(text("""
            SELECT sb.*, b.nama_barang, b.id_satuan_besar, b.id_satuan_kecil, b.isi_satuan, g.gudang AS nama_gudang
            FROM stok_barang sb
            JOIN barang b ON sb.id_barang = b.id_barang
            JOIN gudang g ON sb.id_gudang = g.id_gudang
            WHERE sb.id_barang = :id_barang AND sb.id_gudang = :id_gudang
              AND (:dokumen IS NULL OR :dokumen = '' OR :dokumen = '-' OR sb.reff = :dokumen)
            ORDER BY sb.stok DESC
            LIMIT 1
        """), {"id_barang": id_barang, "id_gudang": clean_gudang, "dokumen": dokumen}).mappings().first()
    elif not sb and id_barang:
        sb = db.execute(text("""
            SELECT sb.*, b.nama_barang, b.id_satuan_besar, b.id_satuan_kecil, b.isi_satuan, g.gudang AS nama_gudang
            FROM stok_barang sb
            JOIN barang b ON sb.id_barang = b.id_barang
            JOIN gudang g ON sb.id_gudang = g.id_gudang
            WHERE sb.id_barang = :id_barang
              AND (:dokumen IS NULL OR :dokumen = '' OR :dokumen = '-' OR sb.reff = :dokumen)
            ORDER BY sb.stok DESC
            LIMIT 1
        """), {"id_barang": id_barang, "dokumen": dokumen}).mappings().first()

    if not sb:
        return {
            "material_code": id_barang or "-",
            "nama_barang": "-",
            "qty": "0",
            "gudang": "-",
            "gudang_saat_ini": "-",
            "gudang_asal": "-",
            "aging": "0 hari",
            "aging_hari": 0,
            "lama_gudang_saat_ini_hari": 0,
            "lama_gudang_saat_ini_label": "0 hari",
            "lama_gudang_asal_hari": 0,
            "lama_gudang_asal_label": "0 hari",
            "asal": "-",
            "tracking_summary": "-",
            "rute_gudang": [],
            "history": []
        }

    # Hitung Qty & Kemasan
    volume = float(sb['stok']) if sb['stok'] is not None else 0.0
    isi = float(sb['isi_satuan']) if sb['isi_satuan'] else 1.0
    stok_kemasan = (volume / isi) if isi > 0 else volume
    sat_besar = sb['id_satuan_besar'] or 'Drum'
    sat_kecil = sb['id_satuan_kecil'] or 'Ltr'
    qty_label = f"{volume:,.0f} {sat_kecil} ({stok_kemasan:.1f} {sat_besar})"

    nama_gudang_kini = sb['nama_gudang']
    current_doc = sb['reff']
    current_batch = sb['batch']
    current_item_id = sb['id_barang']

    # Multi-hop traversal mundur antar gudang
    hops = []
    prev_date = today

    for step in range(5):
        if not current_doc or current_doc == '-':
            durasi = max((prev_date - (sb['tanggal'] or today)).days, 0)
            hops.append({
                "no_transaksi": "Saldo Awal / Penerimaan Langsung",
                "tanggal_terima": (sb['tanggal'] or today).strftime('%d-%m-%Y'),
                "gudang_asal": nama_gudang_kini,
                "gudang_tujuan": "-",
                "lokasi": nama_gudang_kini,
                "lama_hari": durasi,
                "lama_label": f"{durasi} hari",
                "keterangan": f"Tersimpan {durasi} hari di {nama_gudang_kini}",
                "tipe": "Stok Awal"
            })
            break

        # 1. Cek apakah Internal Transfer (IT)
        it = db.execute(text("""
            SELECT it.*, ga.gudang AS nama_gudang_asal, gt.gudang AS nama_gudang_tujuan
            FROM internal_transfer it
            LEFT JOIN gudang ga ON it.id_gudang_asal = ga.id_gudang
            LEFT JOIN gudang gt ON it.id_gudang_tujuan = gt.id_gudang
            WHERE it.nomor = :nomor
        """), {"nomor": current_doc}).mappings().first()

        if it:
            tgl_terima = it['tanggal_terima'] or it['tanggal'] or prev_date
            durasi = max((prev_date - tgl_terima).days, 0)
            gudang_asal_label = it['nama_gudang_asal'] or it['id_gudang_asal'] or 'Gudang Asal'
            gudang_tujuan_label = it['nama_gudang_tujuan'] or nama_gudang_kini

            hops.append({
                "no_transaksi": it['nomor'],
                "nomor_po": it.get('no_po') or None,
                "tanggal_terima": tgl_terima.strftime('%d-%m-%Y'),
                "tanggal_kirim": it['tanggal_kirim'].strftime('%d-%m-%Y') if it['tanggal_kirim'] else None,
                "gudang_asal": gudang_asal_label,
                "gudang_tujuan": gudang_tujuan_label,
                "lokasi": gudang_tujuan_label,
                "lama_hari": durasi,
                "lama_label": f"{durasi} hari",
                "keterangan": f"Tersimpan {durasi} hari di {gudang_tujuan_label}" + (" (sampai hari ini)" if step == 0 else ""),
                "tipe": "Internal Transfer"
            })

            # Mundur ke gudang asal IT: cut off umur gudang asal dihitung sampai saat barang diterima di gudang tujuan (tgl_terima)
            prev_date = tgl_terima
            curr_asal_id = it['id_gudang_asal']
            curr_asal_nama = gudang_asal_label

            # Cek apakah ada penerimaan_gudang (Supplier BTB/BPB) di gudang asal
            inbound = db.execute(text("""
                SELECT pg.no_penerimaan, pg.tgl_penerimaan, pg.nomor_po, s.supplier, g.gudang
                FROM penerimaan_gudang pg
                JOIN penerimaan_gudang_detail pgd ON pg.no_penerimaan = pgd.no_penerimaan
                LEFT JOIN supplier s ON pg.id_supplier = s.id
                LEFT JOIN gudang g ON pg.id_gudang = g.id_gudang
                WHERE pg.id_gudang = :id_gudang AND pgd.id_barang = :id_barang
                  AND (
                      (pgd.batch = :batch AND :batch IS NOT NULL AND TRIM(:batch) != '')
                      OR pg.tgl_penerimaan <= :tgl_batas
                  )
                ORDER BY 
                  CASE WHEN pgd.batch = :batch THEN 1 ELSE 2 END,
                  pg.tgl_penerimaan DESC
                LIMIT 1
            """), {
                "id_gudang": curr_asal_id,
                "id_barang": current_item_id,
                "batch": current_batch,
                "tgl_batas": prev_date
            }).mappings().first()

            if inbound:
                current_doc = inbound['no_penerimaan']
                continue

            # Cek apakah ada IT sebelumnya yang masuk ke gudang asal ini (multi-hop transfer)
            prior_it = db.execute(text("""
                SELECT it.nomor
                FROM internal_transfer it
                JOIN internal_transfer_detail itd ON it.nomor = itd.nomor
                WHERE it.id_gudang_tujuan = :id_gudang AND itd.id_barang = :id_barang
                  AND COALESCE(it.tanggal_terima, it.tanggal) <= :tgl_batas
                ORDER BY COALESCE(it.tanggal_terima, it.tanggal) DESC
                LIMIT 1
            """), {
                "id_gudang": curr_asal_id,
                "id_barang": current_item_id,
                "tgl_batas": prev_date
            }).mappings().first()

            if prior_it:
                current_doc = prior_it['nomor']
                continue

            # Jika tidak ada dokumen inbound spesifik, catat sebagai Penerimaan Awal di Gudang Asal
            sb_asal = db.execute(text("""
                SELECT tanggal FROM stok_barang 
                WHERE id_gudang = :id_gudang AND id_barang = :id_barang AND tanggal <= :tgl_batas
                ORDER BY tanggal ASC LIMIT 1
            """), {"id_gudang": curr_asal_id, "id_barang": current_item_id, "tgl_batas": prev_date}).mappings().first()

            tgl_asal = sb_asal['tanggal'] if sb_asal else (sb['tanggal'] or prev_date)
            durasi_asal = max((prev_date - tgl_asal).days, 0)
            hops.append({
                "no_transaksi": "Penerimaan di Gudang Asal",
                "tanggal_terima": tgl_asal.strftime('%d-%m-%Y'),
                "gudang_asal": curr_asal_nama,
                "gudang_tujuan": "-",
                "lokasi": curr_asal_nama,
                "lama_hari": durasi_asal,
                "lama_label": f"{durasi_asal} hari",
                "keterangan": f"Tersimpan {durasi_asal} hari di {curr_asal_nama} sebelum ditransfer",
                "tipe": "Penerimaan Gudang Asal"
            })
            break

        # 2. Cek apakah Cancel IT
        elif 'CANCEL' in current_doc:
            itc = db.execute(text("""
                SELECT itc.*, it.id_gudang_asal, ga.gudang AS nama_gudang_asal
                FROM internaltransfer_cancel itc
                LEFT JOIN internal_transfer it ON itc.no_it = it.nomor
                LEFT JOIN gudang ga ON it.id_gudang_asal = ga.id_gudang
                WHERE itc.nomor = :nomor
            """), {"nomor": current_doc}).mappings().first()
            tgl_c = (itc['tanggal'] if itc else sb['tanggal']) or sb['tanggal'] or prev_date
            durasi = max((prev_date - tgl_c).days, 0)
            g_asal_cancel = itc['nama_gudang_asal'] if itc and itc['nama_gudang_asal'] else nama_gudang_kini
            hops.append({
                "no_transaksi": current_doc,
                "tanggal_terima": tgl_c.strftime('%d-%m-%Y'),
                "gudang_asal": g_asal_cancel,
                "gudang_tujuan": nama_gudang_kini,
                "lokasi": nama_gudang_kini,
                "lama_hari": durasi,
                "lama_label": f"{durasi} hari",
                "keterangan": f"Dibatalkan dan kembali ke stok {nama_gudang_kini}, tersimpan {durasi} hari",
                "tipe": "Cancel IT"
            })
            break

        # 3. Penerimaan Supplier Langsung (BTB / BPB)
        else:
            pg = db.execute(text("""
                SELECT pg.no_penerimaan, pg.tgl_penerimaan, pg.nomor_po, s.supplier, g.gudang
                FROM penerimaan_gudang pg
                LEFT JOIN supplier s ON pg.id_supplier = s.id
                LEFT JOIN gudang g ON pg.id_gudang = g.id_gudang
                WHERE pg.no_penerimaan = :nomor
            """), {"nomor": current_doc}).mappings().first()

            tgl_p = (pg['tgl_penerimaan'] if pg else sb['tanggal']) or sb['tanggal'] or prev_date
            durasi = max((prev_date - tgl_p).days, 0)
            lokasi_penerimaan = pg['gudang'] if pg and pg['gudang'] else nama_gudang_kini
            nama_sup = pg['supplier'] if pg and pg['supplier'] else 'Supplier'

            hops.append({
                "no_transaksi": current_doc,
                "nomor_po": pg['nomor_po'] if pg and pg['nomor_po'] else None,
                "tanggal_terima": tgl_p.strftime('%d-%m-%Y'),
                "gudang_asal": nama_sup,
                "gudang_tujuan": lokasi_penerimaan,
                "lokasi": lokasi_penerimaan,
                "lama_hari": durasi,
                "lama_label": f"{durasi} hari",
                "keterangan": f"Diterima dari {nama_sup}, tersimpan {durasi} hari di {lokasi_penerimaan}" + (" (sampai hari ini)" if step == 0 else " sebelum transfer"),
                "tipe": f"Penerimaan Supplier ({nama_sup})"
            })
            break

    # Urutkan secara kronologis (dari tahap 1 penerimaan awal sampai tahap akhir di gudang saat ini)
    chronological_history = list(reversed(hops))
    for idx, h in enumerate(chronological_history):
        h["step"] = idx + 1

    # Identifikasi durasi di gudang saat ini vs gudang asal
    hop_kini = chronological_history[-1] if chronological_history else None
    lama_kini_hari = hop_kini['lama_hari'] if hop_kini else 0

    hops_asal = chronological_history[:-1] if len(chronological_history) > 1 else []
    lama_asal_hari = sum(h['lama_hari'] for h in hops_asal)

    total_aging_hari = lama_kini_hari + lama_asal_hari
    if sb['tanggal']:
        total_aging_hari = max(total_aging_hari, (today - sb['tanggal']).days)

    # Cut off saat barang diterima di gudang tujuan:
    # aging_gudang_asal = total_aging_sell_in - aging_gudang_saat_ini
    lama_asal_hari = max(total_aging_hari - lama_kini_hari, 0)
    if hops_asal:
        # Sinkronkan durasi hop asal terakhir agar tepat sesuai cut-off
        selisih = lama_asal_hari - sum(h['lama_hari'] for h in hops_asal[:-1])
        hops_asal[-1]['lama_hari'] = max(selisih, 0)
        hops_asal[-1]['lama_label'] = f"{hops_asal[-1]['lama_hari']} hari"

    aging_label = f"{total_aging_hari} hari"
    lama_kini_label = f"{lama_kini_hari} hari"
    lama_asal_label = f"{lama_asal_hari} hari"

    # Buat rute dan tracking summary
    rute_parts = []
    rute_gudang = []
    for h in chronological_history:
        g_name = h['lokasi']
        lama_txt = f"{h['lama_hari']} hari"
        rute_parts.append(f"{g_name} ({lama_txt})")
        rute_gudang.append({
            "step": h['step'],
            "gudang": g_name,
            "lama_hari": h['lama_hari'],
            "lama_label": lama_txt,
            "tipe": h['tipe'],
            "tanggal_terima": h.get('tanggal_terima'),
            "is_current": (h == hop_kini)
        })

    tracking_summary = " ➔ ".join(rute_parts)
    asal_utama = hops_asal[0]['lokasi'] if hops_asal else (chronological_history[0]['gudang_asal'] if chronological_history else nama_gudang_kini)

    return {
        "material_code": sb['id_barang'],
        "nama_barang": sb['nama_barang'],
        "qty": qty_label,
        "volume": volume,
        "stok_kemasan": stok_kemasan,
        "satuan_besar": sat_besar,
        "satuan_kecil": sat_kecil,
        "gudang": nama_gudang_kini,
        "gudang_saat_ini": nama_gudang_kini,
        "lama_gudang_saat_ini_hari": lama_kini_hari,
        "lama_gudang_saat_ini_label": lama_kini_label,
        "gudang_asal": asal_utama,
        "lama_gudang_asal_hari": lama_asal_hari,
        "lama_gudang_asal_label": lama_asal_label,
        "aging": aging_label,
        "aging_hari": total_aging_hari,
        "asal": asal_utama,
        "tracking_summary": tracking_summary,
        "rute_gudang": rute_gudang,
        "history": chronological_history
    }




# ─── INBOUND ──────────────────────────────────────────────────────────────────

@router.get("/inbound")
async def get_inbound_transactions(
    id_gudang: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    tipe: Optional[str] = Query(None, description="penerimaan_barang|receipt_internal|penambahan|decanting"),
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Transaksi Inbound:
    - Penerimaan Barang (penerimaan)
    - Receipt Internal Transfer (penerimaan_gudang)
    - Penambahan Barang (penambahan)
    - Decanting (decanting)
    """
    df = date_from or (date.today().replace(day=1).isoformat())
    dt = date_to or date.today().isoformat()
    offset = (page - 1) * limit

    gudang_filter_pg = "AND pg.id_gudang = :id_gudang" if id_gudang else ""
    gudang_filter_p  = "AND p.id_gudang = :id_gudang"  if id_gudang else ""
    gudang_filter_it = "AND it.id_gudang_tujuan = :id_gudang" if id_gudang else ""
    gudang_filter_pn = "AND pn.id_gudang = :id_gudang" if id_gudang else ""
    gudang_filter_d  = "AND d.id_gudang = :id_gudang"  if id_gudang else ""

    params: dict = {"date_from": df, "date_to": dt, "limit": limit, "offset": offset}
    if id_gudang:
        params["id_gudang"] = id_gudang

    # Role-based warehouse restriction
    extra_pg = extra_p = extra_it = extra_pn = extra_d = ""
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs_str = current_user.id_gudang_access
            gudangs = tuple(g.strip() for g in gudangs_str.split(','))
            params["user_gudangs"] = gudangs
            extra_pg = "AND pg.id_gudang IN :user_gudangs"
            extra_p  = "AND p.id_gudang IN :user_gudangs"
            extra_it = "AND it.id_gudang_tujuan IN :user_gudangs"
            extra_pn = "AND pn.id_gudang IN :user_gudangs"
            extra_d  = "AND d.id_gudang IN :user_gudangs"

    queries = []

    # 1. Penerimaan Barang (BTB - Bukti Terima Barang dari supplier / PO & data historis)
    if not tipe or tipe == "penerimaan_barang":
        queries.append(f"""
            SELECT
                'penerimaan_barang'::text AS tipe,
                'Penerimaan Barang'::text AS tipe_label,
                pg.no_penerimaan::text AS nomor,
                pg.tgl_penerimaan AS tanggal,
                pg.id_gudang,
                g.gudang AS nama_gudang,
                pg.referensi::text,
                pg.keterangan::text,
                pg.kode_user::text,
                (SELECT COALESCE(SUM(qty), 0) FROM penerimaan_gudang_detail WHERE no_penerimaan = pg.no_penerimaan) AS total_qty,
                0::numeric AS total_nilai,
                pg.status::text
            FROM penerimaan_gudang pg
            LEFT JOIN gudang g ON pg.id_gudang = g.id_gudang
            WHERE pg.tgl_penerimaan BETWEEN :date_from AND :date_to
            {gudang_filter_pg} {extra_pg}

            UNION ALL

            SELECT
                'penerimaan_barang'::text AS tipe,
                'Penerimaan Barang'::text AS tipe_label,
                p.no_penerimaan::text AS nomor,
                p.tgl_penerimaan AS tanggal,
                p.id_gudang,
                g.gudang AS nama_gudang,
                p.referensi::text AS referensi,
                p.keterangan::text,
                p.kode_user::text,
                (SELECT COALESCE(SUM(qty), 0) FROM penerimaan_detail WHERE no_penerimaan = p.no_penerimaan) AS total_qty,
                COALESCE(p.grandtotal, p.total, 0) AS total_nilai,
                p.status::text
            FROM penerimaan p
            LEFT JOIN gudang g ON p.id_gudang = g.id_gudang
            WHERE p.tgl_penerimaan BETWEEN :date_from AND :date_to
            {gudang_filter_p} {extra_p}
        """)

    # 2. Receipt Internal Transfer (penerimaan transfer barang antar-gudang di gudang tujuan)
    if not tipe or tipe == "receipt_internal":
        queries.append(f"""
            SELECT
                'receipt_internal'::text AS tipe,
                'Receipt Internal Transfer'::text AS tipe_label,
                it.nomor::text AS nomor,
                it.tanggal_terima AS tanggal,
                it.id_gudang_tujuan AS id_gudang,
                g.gudang AS nama_gudang,
                CONCAT('Dari: ', COALESCE(ga.gudang, it.id_gudang_asal))::text AS referensi,
                it.keterangan::text,
                COALESCE(it.penerima, '')::text AS kode_user,
                (SELECT COALESCE(SUM(qty), 0) FROM internal_transfer_detail WHERE nomor = it.nomor) AS total_qty,
                0::numeric AS total_nilai,
                it.status::text
            FROM internal_transfer it
            LEFT JOIN gudang g ON it.id_gudang_tujuan = g.id_gudang
            LEFT JOIN gudang ga ON it.id_gudang_asal = ga.id_gudang
            WHERE it.tanggal_terima BETWEEN :date_from AND :date_to
              AND it.tanggal_terima IS NOT NULL
            {gudang_filter_it} {extra_it}
        """)

    # 3. Penambahan Barang
    if not tipe or tipe == "penambahan":
        queries.append(f"""
            SELECT
                'penambahan'::text AS tipe,
                'Penambahan Barang'::text AS tipe_label,
                pn.nomor::text AS nomor,
                pn.tanggal AS tanggal,
                pn.id_gudang,
                g.gudang AS nama_gudang,
                COALESCE(pn.po, pn.dn, '')::text AS referensi,
                pn.keterangan::text,
                pn.kode_user::text,
                (SELECT COALESCE(SUM(qty), 0) FROM penambahan_detail WHERE id = pn.id) AS total_qty,
                0::numeric AS total_nilai,
                pn.status::text
            FROM penambahan pn
            LEFT JOIN gudang g ON pn.id_gudang = g.id_gudang
            WHERE pn.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_pn} {extra_pn}
        """)

    # 4. Decanting (inbound: bahan baku masuk ke gudang produksi)
    if not tipe or tipe == "decanting":
        queries.append(f"""
            SELECT
                'decanting'::text AS tipe,
                'Decanting'::text AS tipe_label,
                d.no_decanting::text AS nomor,
                d.tanggal AS tanggal,
                d.id_gudang,
                g.gudang AS nama_gudang,
                d.referensi::text,
                d.keterangan::text,
                d.diajukan::text AS kode_user,
                COALESCE(d.totalbawah, 0) AS total_qty,
                0::numeric AS total_nilai,
                d.status::text
            FROM decanting d
            LEFT JOIN gudang g ON d.id_gudang = g.id_gudang
            WHERE d.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_d} {extra_d}
        """)

    if not queries:
        return {"data": [], "pagination": {"page": page, "limit": limit, "total": 0, "pages": 0}}

    union_sql = " UNION ALL ".join(queries)
    full_sql = f"""
        SELECT * FROM ({union_sql}) combined
        ORDER BY tanggal DESC, nomor DESC
        LIMIT :limit OFFSET :offset
    """
    count_sql = f"SELECT COUNT(*) FROM ({union_sql}) combined"

    rows = db.execute(text(full_sql), params).mappings().all()
    total = db.execute(text(count_sql), {k: v for k, v in params.items() if k not in ("limit","offset")}).scalar() or 0

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    result = []
    for r in rows:
        d = dict(r)
        d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"))
        if hide_financial:
            d["total_nilai"] = None
        else:
            d["total_nilai"] = float(d["total_nilai"]) if d.get("total_nilai") is not None else 0
        d["total_qty"] = float(d["total_qty"]) if d.get("total_qty") is not None else 0
        result.append(d)

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit) if total else 0},
    }


# ─── OUTBOUND ─────────────────────────────────────────────────────────────────

@router.get("/outbound")
async def get_outbound_transactions(
    id_gudang: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    tipe: Optional[str] = Query(None, description="packing_list|internal_transfer|pemakaian|decanting"),
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Transaksi Outbound:
    - Packing List (packinglist → pengiriman ke customer)
    - Internal Transfer (internal_transfer → antar gudang keluar)
    - Pemakaian Barang (pemakaian → konsumsi internal)
    - Decanting (decanting → keluar bahan baku)
    """
    df = date_from or (date.today().replace(day=1).isoformat())
    dt = date_to or date.today().isoformat()
    offset = (page - 1) * limit

    gudang_filter_pl = "AND pl.id_gudang = :id_gudang" if id_gudang else ""
    gudang_filter_it = "AND it.id_gudang_asal = :id_gudang" if id_gudang else ""
    gudang_filter_pm = "AND pm.id_gudang = :id_gudang" if id_gudang else ""
    gudang_filter_d  = "AND d.id_gudang = :id_gudang"  if id_gudang else ""

    params: dict = {"date_from": df, "date_to": dt, "limit": limit, "offset": offset}
    if id_gudang:
        params["id_gudang"] = id_gudang

    # Role-based warehouse restriction
    extra_pl = extra_it = extra_pm = extra_d = ""
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            params["user_gudangs"] = gudangs
            extra_pl = "AND pl.id_gudang IN :user_gudangs"
            extra_it = "AND it.id_gudang_asal IN :user_gudangs"
            extra_pm = "AND pm.id_gudang IN :user_gudangs"
            extra_d  = "AND d.id_gudang IN :user_gudangs"

    queries = []

    # 1. Packing List (pengiriman ke customer)
    if not tipe or tipe == "packing_list":
        queries.append(f"""
            SELECT
                'packing_list'::text AS tipe,
                'Packing List'::text AS tipe_label,
                pl.nomor::text AS nomor,
                pl.tanggal AS tanggal,
                pl.id_gudang,
                g.gudang AS nama_gudang,
                pl.no_so::text AS referensi,
                pl.kepada::text AS keterangan,
                pl.kode_user::text,
                (SELECT COALESCE(SUM(qty), 0) FROM packinglist_detail WHERE no_pl = pl.nomor) AS total_qty,
                0::numeric AS total_nilai,
                pl.status::text
            FROM packinglist pl
            LEFT JOIN gudang g ON pl.id_gudang = g.id_gudang
            WHERE pl.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_pl} {extra_pl}
        """)

    # 2. Internal Transfer (keluar dari gudang asal)
    if not tipe or tipe == "internal_transfer":
        queries.append(f"""
            SELECT
                'internal_transfer'::text AS tipe,
                'Internal Transfer'::text AS tipe_label,
                it.nomor::text AS nomor,
                it.tanggal AS tanggal,
                it.id_gudang_asal AS id_gudang,
                COALESCE(ga.gudang, it.id_gudang_asal)::text AS nama_gudang,
                it.id_gudang_tujuan::text AS referensi,
                CONCAT('→ ', COALESCE(gt.gudang, it.id_gudang_tujuan))::text AS keterangan,
                it.pengirim::text AS kode_user,
                (SELECT COALESCE(SUM(qty), 0) FROM internal_transfer_detail WHERE nomor = it.nomor) AS total_qty,
                COALESCE(it.total, it.biaya, 0) AS total_nilai,
                it.status::text
            FROM internal_transfer it
            LEFT JOIN gudang ga ON it.id_gudang_asal = ga.id_gudang
            LEFT JOIN gudang gt ON it.id_gudang_tujuan = gt.id_gudang
            WHERE it.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_it} {extra_it}
        """)

    # 3. Pemakaian Barang (konsumsi internal)
    if not tipe or tipe == "pemakaian":
        queries.append(f"""
            SELECT
                'pemakaian'::text AS tipe,
                'Pemakaian Barang'::text AS tipe_label,
                pm.nomor::text AS nomor,
                pm.tanggal AS tanggal,
                pm.id_gudang,
                g.gudang AS nama_gudang,
                ''::text AS referensi,
                pm.keterangan::text,
                pm.kode_user::text,
                (SELECT COALESCE(SUM(qty), 0) FROM pemakaian_detail WHERE id = pm.id) AS total_qty,
                0::numeric AS total_nilai,
                pm.status::text
            FROM pemakaian pm
            LEFT JOIN gudang g ON pm.id_gudang = g.id_gudang
            WHERE pm.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_pm} {extra_pm}
        """)

    # 4. Decanting (outbound: bahan atas → bawah)
    if not tipe or tipe == "decanting":
        queries.append(f"""
            SELECT
                'decanting'::text AS tipe,
                'Decanting'::text AS tipe_label,
                d.no_decanting::text AS nomor,
                d.tanggal AS tanggal,
                d.id_gudang,
                g.gudang AS nama_gudang,
                d.referensi::text,
                d.keterangan::text,
                d.diajukan::text AS kode_user,
                COALESCE(d.totalatas, 0) AS total_qty,
                0::numeric AS total_nilai,
                d.status::text
            FROM decanting d
            LEFT JOIN gudang g ON d.id_gudang = g.id_gudang
            WHERE d.tanggal BETWEEN :date_from AND :date_to
            {gudang_filter_d} {extra_d}
        """)

    if not queries:
        return {"data": [], "pagination": {"page": page, "limit": limit, "total": 0, "pages": 0}}

    union_sql = " UNION ALL ".join(queries)
    full_sql = f"""
        SELECT * FROM ({union_sql}) combined
        ORDER BY tanggal DESC, nomor DESC
        LIMIT :limit OFFSET :offset
    """
    count_sql = f"SELECT COUNT(*) FROM ({union_sql}) combined"

    rows = db.execute(text(full_sql), params).mappings().all()
    total = db.execute(text(count_sql), {k: v for k, v in params.items() if k not in ("limit","offset")}).scalar() or 0

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    result = []
    for r in rows:
        d = dict(r)
        d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"))
        if hide_financial:
            d["total_nilai"] = None
        else:
            d["total_nilai"] = float(d["total_nilai"]) if d.get("total_nilai") is not None else 0
        d["total_qty"] = float(d["total_qty"]) if d.get("total_qty") is not None else 0
        result.append(d)

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit) if total else 0},
    }
