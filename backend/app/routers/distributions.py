"""
Router — Distributions Monitoring
DO tracking, status pengiriman, peta distribusi
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from app.database import get_analytics_db, get_existing_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/")
async def list_deliveries(
    status: Optional[str] = Query(None, description="all|send|received|invoice|cancel|draft|S|R|I|C|D"),
    id_customer: Optional[str] = None,
    id_gudang: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar delivery order dengan status tracking langsung dari live database cpa_existing."""
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}

    if status and status != "all":
        status_clean = status.lower().strip()
        status_map_filter = {
            "send": "S",
            "in_transit": "S",
            "s": "S",
            "received": "R",
            "delivered": "R",
            "r": "R",
            "invoice": "I",
            "i": "I",
            "cancel": "C",
            "void": "C",
            "c": "C",
            "draft": "D",
            "d": "D",
        }
        target_status = status_map_filter.get(status_clean, status.upper())
        conditions.append("d.status = :target_status")
        params["target_status"] = target_status

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
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("d.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("d.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    where_clause = " AND ".join(conditions)

    rows = db.execute(text(f"""
        SELECT
            d.nomor,
            d.tanggal,
            d.id_customer,
            COALESCE(c.customer, d.kepada, '') AS nama_customer,
            d.id_gudang,
            COALESCE(g.gudang, d.id_gudang, '') AS nama_gudang,
            COALESCE(d.destination, '') AS destination,
            COALESCE(d.origin, '') AS origin,
            d.driver,
            d.lic_plate,
            d.transporter,
            d.tgl_keluar,
            d.tgl_sampai,
            d.received_date,
            d.received_name,
            d.shippingcosts,
            d.return_date,
            d.status,
            d.no_pl,
            COALESCE(s.referensi, '') AS po_no,
            d.kepada,
            d.alamat,
            CASE
                WHEN d.status = 'R' THEN 'received'
                WHEN d.status = 'S' THEN 'send'
                WHEN d.status = 'I' THEN 'invoice'
                WHEN d.status = 'C' THEN 'cancel'
                WHEN d.status = 'D' THEN 'draft'
                ELSE LOWER(COALESCE(d.status, 'send'))
            END AS status_label,
            CASE WHEN d.tgl_keluar IS NOT NULL AND d.received_date IS NULL
                THEN CURRENT_DATE - d.tgl_keluar
                ELSE NULL
            END AS days_in_transit
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
        LEFT JOIN public.so s ON pl.no_so = s.nomor
        WHERE {where_clause}
        ORDER BY d.tanggal DESC, d.nomor DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM public.do_tbl d
        WHERE {where_clause}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    hide_financial = current_user and current_user.role in ("warehouse", "warehouse_staff")
    data = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["shippingcosts"] = None
        data.append(d)

    return {
        "data": data,
        "pagination": {"page": page, "limit": limit, "total": total},
    }


@router.get("/pending")
async def get_pending_deliveries(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Pesanan yang menunggu pengiriman (draft/belum keluar)."""
    where_clauses = ["d.status_label = 'draft'", "d.tgl_keluar IS NULL"]
    params = {}
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            where_clauses.append("d.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            where_clauses.append("d.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    where_str = " AND ".join(where_clauses)
    rows = db.execute(text(f"""
        SELECT
            d.nomor, d.tanggal, d.id_customer, d.nama_customer,
            d.id_gudang, w.nama_gudang, d.alamat,
            d.status_label,
            CURRENT_DATE - d.tanggal AS days_waiting
        FROM operational.deliveries d
        LEFT JOIN operational.warehouses w ON d.id_gudang = w.id_gudang
        WHERE {where_str}
        ORDER BY d.tanggal ASC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/in-transit")
async def get_in_transit(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Pengiriman yang sedang dalam perjalanan."""
    where_clauses = ["d.status_label = 'in_transit'"]
    params = {}
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            where_clauses.append("d.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            where_clauses.append("d.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    where_str = " AND ".join(where_clauses)
    rows = db.execute(text(f"""
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
        WHERE {where_str}
        ORDER BY d.tgl_keluar ASC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/summary")
async def get_distribution_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Ringkasan distribusi: status, biaya, on-time rate langsung dari database cpa_existing."""
    if not date_from:
        date_from = date(2024, 1, 1)
    if not date_to:
        date_to = date.today()

    params = {"date_from": date_from, "date_to": date_to}
    extra = ""
    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            extra = " AND d.id_gudang IN :gudangs"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            extra = " AND d.id_gudang = :user_gudang"
            params["user_gudang"] = current_user.id_pegawai

    result = db.execute(text(f"""
        SELECT
            COUNT(*) AS total_do,
            SUM(CASE WHEN d.status = 'S' THEN 1 ELSE 0 END) AS send,
            SUM(CASE WHEN d.status = 'R' THEN 1 ELSE 0 END) AS received,
            SUM(CASE WHEN d.status = 'I' THEN 1 ELSE 0 END) AS invoice,
            SUM(CASE WHEN d.status = 'C' THEN 1 ELSE 0 END) AS cancel,
            SUM(CASE WHEN d.status = 'D' THEN 1 ELSE 0 END) AS draft,
            -- compatibility aliases
            SUM(CASE WHEN d.status = 'S' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN d.status = 'R' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN d.status = 'D' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN d.status = 'C' THEN 1 ELSE 0 END) AS void_count,
            SUM(d.shippingcosts) AS total_shipping_cost,
            AVG(CASE WHEN d.received_date IS NOT NULL AND d.tgl_keluar IS NOT NULL
                THEN d.received_date - d.tgl_keluar
                ELSE NULL
            END)::FLOAT AS avg_delivery_days,
            -- On-time rate
            ROUND(
                100.0 * SUM(CASE
                    WHEN d.received_date IS NOT NULL AND d.tgl_sampai IS NOT NULL
                    AND d.received_date <= d.tgl_sampai THEN 1 ELSE 0
                END) / NULLIF(SUM(CASE WHEN d.received_date IS NOT NULL THEN 1 ELSE 0 END), 0),
                2
            ) AS on_time_rate_pct
        FROM public.do_tbl d
        WHERE d.tanggal BETWEEN :date_from AND :date_to {extra}
    """), params).mappings().first()
    res = dict(result) if result else {}
    if current_user and current_user.role in ("warehouse", "warehouse_staff"):
        res["total_shipping_cost"] = None
    return res


@router.get("/map-data")
async def get_map_data(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Data untuk peta distribusi (origin-destination) dari database cpa_existing."""
    conditions = ["d.origin IS NOT NULL", "d.destination IS NOT NULL"]
    params = {}
    if status and status != "all":
        status_clean = status.lower().strip()
        status_map_filter = {
            "send": "S",
            "in_transit": "S",
            "s": "S",
            "received": "R",
            "delivered": "R",
            "r": "R",
            "invoice": "I",
            "i": "I",
            "cancel": "C",
            "void": "C",
            "c": "C",
            "draft": "D",
            "d": "D",
        }
        target_status = status_map_filter.get(status_clean, status.upper())
        conditions.append("d.status = :target_status")
        params["target_status"] = target_status

    if date_from:
        conditions.append("d.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("d.tanggal <= :date_to")
        params["date_to"] = date_to

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            conditions.append("d.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append("d.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT
            d.nomor, d.id_customer, COALESCE(c.customer, d.kepada, '') AS nama_customer,
            d.origin, d.destination,
            d.tgl_keluar, d.tgl_sampai, d.received_date,
            CASE
                WHEN d.status = 'R' THEN 'received'
                WHEN d.status = 'S' THEN 'send'
                WHEN d.status = 'I' THEN 'invoice'
                WHEN d.status = 'C' THEN 'cancel'
                WHEN d.status = 'D' THEN 'draft'
                ELSE 'send'
            END AS status_label,
            d.driver, d.lic_plate,
            d.shippingcosts
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        WHERE {' AND '.join(conditions)}
        ORDER BY d.tanggal DESC
        LIMIT 500
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["shippingcosts"] = None
        res.append(d)
    return res



@router.get("/internal-orders")
async def get_internal_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 10000,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan daftar Internal Order dari cpa_existing dengan format dan kolom yang sama persis seperti export Excel."""
    where_clauses = ["1=1"]
    params = {"limit": limit}

    if date_from:
        where_clauses.append("t.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("t.tanggal <= :date_to")
        params["date_to"] = date_to
    if status:
        where_clauses.append("t.status = :status")
        params["status"] = status

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            where_clauses.append("(t.id_gudang_asal IN :gudangs OR t.id_gudang_tujuan IN :gudangs)")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            where_clauses.append("(t.id_gudang_asal = :user_gudang OR t.id_gudang_tujuan = :user_gudang)")
            params["user_gudang"] = current_user.id_pegawai

    where_str = " AND ".join(where_clauses)

    query = f"""
        SELECT 
            t.nomor_io, 
            TO_CHAR(t.tanggal, 'DD-MM-YYYY') AS tanggal,
            COALESCE(ikc_code.nama, ikc_id.nama, 'HO - Balikpapan') AS nama_kantor,
            COALESCE(ga.gudang, t.id_gudang_asal, '') AS gudang_asal,
            COALESCE(gt.gudang, t.id_gudang_tujuan, '') AS gudang_tujuan,
            COALESCE(p_kontak.nama, p_buat.nama, t.kontak, t.dibuat, '') AS dibuat_oleh,
            COALESCE(t.modified_date, t.create_date) AS dibuat_tanggal,
            CASE 
                WHEN t.send_by_date IS NOT NULL THEN TO_CHAR(t.send_by_date, 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS send_date,
            CASE 
                WHEN t.send_by_date IS NOT NULL THEN TO_CHAR(t.send_by_date, 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS send_by_date,
            CASE 
                WHEN t.check_dsm_date IS NOT NULL THEN TO_CHAR(t.check_dsm_date, 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS check_dsm_date,
            CASE 
                WHEN COALESCE(t.check_st_date, t.st_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_st_date, t.st_date), 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS check_st_date,
            CASE 
                WHEN COALESCE(t.check_st_date, t.st_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_st_date, t.st_date), 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS st_date,
            CASE 
                WHEN COALESCE(t.check_whm_date, t.whm_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_whm_date, t.whm_date), 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS check_whm_date,
            CASE 
                WHEN COALESCE(t.check_whm_date, t.whm_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_whm_date, t.whm_date), 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS whm_date,
            CASE 
                WHEN t.approve_tanggal IS NOT NULL THEN TO_CHAR(t.approve_tanggal, 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS approve_date,
            CASE 
                WHEN t.approve_tanggal IS NOT NULL THEN TO_CHAR(t.approve_tanggal, 'DD-MM-YYYY HH24:MI "WIB"')
                ELSE ''
            END AS approve_tanggal,
            COALESCE(t.id_ip::text, '') AS id_ip,
            t.status AS status_code,
            COALESCE(b.nama_barang, iod.id_barang, '') AS nama_barang,
            COALESCE(iod.id_barang, '') AS kode_barang,
            CASE WHEN iod.id_barang IS NOT NULL THEN iod.qty ELSE NULL END AS qty,
            CASE WHEN iod.id_barang IS NOT NULL THEN COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') ELSE '' END AS satuan,
            COALESCE(iod.keterangan, '') AS keterangan,
            iod.urut AS urut
        FROM public.internal_order t
        LEFT JOIN public.internal_kantor_cabang ikc_id ON t.id_kantor = ikc_id.id_kantor_cabang
        LEFT JOIN public.internal_kantor_cabang ikc_code ON split_part(t.nomor_io, '/', 3) = 'CPA-' || ikc_code.numbercode OR t.nomor_io LIKE '%/' || ikc_code.numbercode || '/%'
        LEFT JOIN public.gudang ga ON t.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON t.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN public.pegawai p_kontak ON t.kontak = p_kontak.id_pegawai
        LEFT JOIN public.pegawai p_buat ON t.dibuat = p_buat.id_pegawai
        LEFT JOIN public.internal_order_detail iod ON t.nomor_io = iod.nomor_io
        LEFT JOIN public.barang b ON iod.id_barang = b.id_barang
        WHERE {where_str}
        ORDER BY t.tanggal DESC, t.nomor_io DESC, iod.urut ASC LIMIT :limit
    """

    result = db.execute(text(query), params).mappings().all()

    io_status_map = {
        "D": "Draft",
        "S": "Checked DSM",
        "A": "Approve",
        "P": "IT Process",
        "Z": "Partial",
        "C": "IT Completed",
        "K": "Reject DSM",
        "Y": "Reject ST",
        "X": "Cancel",
        "R": "Cancel",
    }

    formatted_rows = []
    for r in result:
        row = dict(r)
        code = (row.get("status_code") or "").strip()
        row["status"] = io_status_map.get(code, code)
        formatted_rows.append(row)

    return {"data": formatted_rows}


@router.get("/internal-orders/items")
async def get_internal_order_items(
    nomor_io: str = Query(..., description="Nomor Internal Order"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan header + rincian daftar barang untuk Internal Order tertentu."""
    # Header query
    header_query = """
        SELECT 
            io.nomor_io,
            io.tanggal,
            COALESCE(ga.gudang, io.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, io.id_gudang_tujuan) AS gudang_tujuan,
            io.id_ip,
            io.status,
            COALESCE(p_kontak.nama, p_buat.nama, io.kontak, io.dibuat, '—') AS dibuat_nama,
            COALESCE(j_buat.jabatan, 'Sales Admin 1 [b]') AS dibuat_jabatan,
            COALESCE(io.modified_date, io.create_date) AS dibuat_tanggal,
            COALESCE(p_send.nama, io.send_by, '—') AS dsm_nama,
            COALESCE(j_send.jabatan, 'DSM - Distributor Sales Manager') AS dsm_jabatan,
            io.send_by_date,
            io.check_dsm_date,
            COALESCE(p_st.nama, io.st, '—') AS st_nama,
            COALESCE(j_st.jabatan, 'Stock controller') AS st_jabatan,
            COALESCE(io.check_st_date, io.st_date) AS st_date,
            COALESCE(p_whm.nama, io.whm, '—') AS whm_nama,
            COALESCE(j_whm.jabatan, 'Warehouse Manager') AS whm_jabatan,
            COALESCE(io.check_whm_date, io.whm_date) AS whm_date,
            COALESCE(p_app.nama, io.approve, '—') AS approve_nama,
            COALESCE(j_app.jabatan, 'Supply Chain Manager') AS approve_jabatan,
            io.approve_tanggal,
            COALESCE(io.it_nomor, it.nomor) AS it_nomor,
            COALESCE(io.it_tanggal, it.tanggal) AS it_tanggal,
            io.it_complete
        FROM public.internal_order io
        LEFT JOIN public.gudang ga ON io.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON io.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN public.pegawai p_kontak ON io.kontak = p_kontak.id_pegawai
        LEFT JOIN public.pegawai p_buat ON io.dibuat = p_buat.id_pegawai
        LEFT JOIN public.master_jabatan j_buat ON COALESCE(p_kontak.id_jabatan, p_buat.id_jabatan) = j_buat.id_jabatan
        LEFT JOIN public.pegawai p_send ON io.send_by = p_send.id_pegawai
        LEFT JOIN public.master_jabatan j_send ON p_send.id_jabatan = j_send.id_jabatan
        LEFT JOIN public.pegawai p_st ON io.st = p_st.id_pegawai
        LEFT JOIN public.master_jabatan j_st ON p_st.id_jabatan = j_st.id_jabatan
        LEFT JOIN public.pegawai p_whm ON io.whm = p_whm.id_pegawai
        LEFT JOIN public.master_jabatan j_whm ON p_whm.id_jabatan = j_whm.id_jabatan
        LEFT JOIN public.pegawai p_app ON io.approve = p_app.id_pegawai
        LEFT JOIN public.master_jabatan j_app ON p_app.id_jabatan = j_app.id_jabatan
        LEFT JOIN public.internal_transfer it ON io.nomor_io = it.nomor_io
        WHERE io.nomor_io = :nomor_io
        LIMIT 1
    """
    header_row = db.execute(text(header_query), {"nomor_io": nomor_io}).mappings().first()

    # Items query
    items_query = """
        SELECT 
            iod.urut AS no,
            COALESCE(b.nama_barang, iod.id_barang) AS nama_barang,
            iod.id_barang AS kode_barang,
            COALESCE(iod.diminta, iod.qty, 0) AS diminta,
            COALESCE(iod.diambil, 0) AS diambil,
            COALESCE(iod.qty, 0) AS qty,
            COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') AS satuan,
            COALESCE(iod.keterangan, '') AS keterangan
        FROM public.internal_order_detail iod
        LEFT JOIN public.barang b ON iod.id_barang = b.id_barang
        WHERE iod.nomor_io = :nomor_io
        ORDER BY iod.urut ASC
    """
    rows = db.execute(text(items_query), {"nomor_io": nomor_io}).mappings().all()

    header = {}
    if header_row:
        dibuat_tgl = header_row["dibuat_tanggal"]
        dsm_tgl = header_row["check_dsm_date"]
        st_tgl = header_row["st_date"]
        app_tgl = header_row["approve_tanggal"]

        approvals = [
            {
                "stage": "Dibuat oleh",
                "name": header_row["dibuat_nama"] or "—",
                "title": header_row["dibuat_jabatan"] if (header_row["dibuat_jabatan"] and "Warehouseman" not in header_row["dibuat_jabatan"]) else "Sales Admin 1 [b]",
                "date": str(dibuat_tgl) if dibuat_tgl else None,
                "checked": bool(header_row["dibuat_nama"] and header_row["dibuat_nama"] != "—"),
            },
            {
                "stage": "Dicek oleh1",
                "name": header_row["dsm_nama"] or "—",
                "title": "DSM - Distributor Sales Manager",
                "date": str(dsm_tgl) if dsm_tgl else None,
                "checked": bool(dsm_tgl),
            },
            {
                "stage": "Dicek oleh2",
                "name": header_row["st_nama"] or "—",
                "title": "Stock controller",
                "date": str(st_tgl) if st_tgl else None,
                "checked": bool(st_tgl),
            },
            {
                "stage": "Disetujui oleh",
                "name": header_row["approve_nama"] or "—",
                "title": "Supply Chain Manager",
                "date": str(app_tgl) if app_tgl else None,
                "checked": bool(app_tgl),
            }
        ]

        header = {
            "nomor_io": header_row["nomor_io"] or nomor_io,
            "tanggal": str(header_row["tanggal"]) if header_row["tanggal"] else None,
            "gudang_asal": header_row["gudang_asal"] or "—",
            "gudang_tujuan": header_row["gudang_tujuan"] or "—",
            "id_ip": str(header_row["id_ip"]) if header_row["id_ip"] else None,
            "it_nomor": header_row["it_nomor"] or None,
            "it_tanggal": str(header_row["it_tanggal"]) if header_row["it_tanggal"] else None,
            "it_complete": str(header_row["it_complete"]) if header_row["it_complete"] else None,
            "status": header_row["status"] or None,
            "dibuat_oleh": header_row["dibuat_nama"] or "—",
            "dibuat_tanggal": str(dibuat_tgl) if dibuat_tgl else None,
            "approvals": approvals
        }

    return {
        "nomor_io": nomor_io,
        "header": header,
        "items": [
            {
                "no": int(r["no"] or (i + 1)),
                "nama_barang": r["nama_barang"] or "—",
                "kode_barang": r["kode_barang"] or "—",
                "diminta": float(r["diminta"] or 0),
                "diambil": float(r["diambil"] or 0),
                "qty": float(r["qty"] or 0),
                "satuan": r["satuan"] or "Drum",
                "keterangan": r["keterangan"] or "",
            }
            for i, r in enumerate(rows)
        ]
    }


@router.get("/transfer-orders/items")
async def get_transfer_order_items(
    nomor: str = Query(..., description="Nomor Internal Transfer"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan header + rincian daftar barang untuk Internal Transfer tertentu."""
    # Header query
    header_query = """
        SELECT 
            it.nomor,
            it.nomor_io,
            it.tanggal,
            it.tanggal_kirim,
            it.jam_kirim,
            COALESCE(ga.gudang, it.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, it.id_gudang_tujuan) AS gudang_tujuan,
            COALESCE(p_penerima.nama, p_pengirim.nama, it.pengirim) AS contact_person,
            it.telpon,
            it.sipb,
            it.istransporter,
            it.transporter,
            it.driver,
            it.nopol,
            COALESCE(kj.jenis, '') AS jenis_kendaraan,
            COALESCE(it.biaya, 0) AS biaya,
            COALESCE(it.total, 0) AS total_liter,
            it.no_po,
            it.status,
            it.keterangan
        FROM public.internal_transfer it
        LEFT JOIN public.gudang ga ON it.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON it.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN public.kendaraan_jenis kj ON it.id_jenis = kj.id_jenis
        LEFT JOIN public.pegawai p_pengirim ON it.pengirim = p_pengirim.id_pegawai
        LEFT JOIN public.pegawai p_penerima ON it.penerima = p_penerima.id_pegawai
        WHERE it.nomor = :nomor
        LIMIT 1
    """
    header_row = db.execute(text(header_query), {"nomor": nomor}).mappings().first()

    # Items query
    items_query = """
        SELECT 
            itd.urut AS no,
            COALESCE(b.nama_barang, itd.id_barang) AS nama_barang,
            itd.id_barang AS kode_barang,
            COALESCE(itd.qty, 0) AS qty,
            COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Unit') AS satuan,
            COALESCE(itd.no_ibc, '') AS no_ibc,
            COALESCE(itd.no_skid_tank, '') AS no_skid_tank,
            COALESCE(itd.keterangan, itd.catatan, '') AS keterangan
        FROM public.internal_transfer_detail itd
        LEFT JOIN public.barang b ON itd.id_barang = b.id_barang
        WHERE itd.nomor = :nomor
        ORDER BY itd.urut ASC
    """
    rows = db.execute(text(items_query), {"nomor": nomor}).mappings().all()

    header = {}
    if header_row:
        hide_financial = current_user and current_user.role in ("warehouse", "warehouse_staff")
        header = {
            "nomor": header_row["nomor"] or nomor,
            "nomor_io": header_row["nomor_io"] or None,
            "tanggal": str(header_row["tanggal"]) if header_row["tanggal"] else None,
            "tanggal_kirim": str(header_row["tanggal_kirim"]) if header_row["tanggal_kirim"] else None,
            "jam_kirim": header_row["jam_kirim"] or None,
            "gudang_asal": header_row["gudang_asal"] or "—",
            "gudang_tujuan": header_row["gudang_tujuan"] or "—",
            "contact_person": header_row["contact_person"] or "—",
            "telpon": header_row["telpon"] or None,
            "sipb": header_row["sipb"] or None,
            "istransporter": bool(header_row["istransporter"]),
            "transporter": header_row["transporter"] or None,
            "driver": header_row["driver"] or None,
            "nopol": header_row["nopol"] or None,
            "jenis_kendaraan": header_row["jenis_kendaraan"] or None,
            "biaya": None if hide_financial else float(header_row["biaya"] or 0),
            "total_liter": float(header_row["total_liter"] or 0),
            "no_po": header_row["no_po"] or None,
            "status": header_row["status"] or None,
            "keterangan": header_row["keterangan"] or None,
        }

    return {
        "nomor": nomor,
        "header": header,
        "items": [
            {
                "no": int(r["no"] or (i + 1)),
                "nama_barang": r["nama_barang"] or "—",
                "kode_barang": r["kode_barang"] or "—",
                "qty": float(r["qty"] or 0),
                "satuan": r["satuan"] or "Unit",
                "ongkir": "",
                "no_ibc": r["no_ibc"] or "",
                "no_skid_tank": r["no_skid_tank"] or "",
                "no_segel": "",
                "keterangan": r["keterangan"] or "",
            }
            for i, r in enumerate(rows)
        ]
    }


@router.get("/transfer-orders")
async def get_transfer_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,  # 'in' (Receipt IT In), 'out' (IT Out)
    limit: int = 5000,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan daftar Transfer Order dari cpa_existing dengan tracking IT In / IT Out."""
    query = """
        SELECT 
            it.nomor,
            it.tanggal,
            it.create_date,
            it.tanggal_kirim,
            it.tanggal_terima,
            it.id_gudang_asal,
            it.id_gudang_tujuan,
            COALESCE(ga.gudang, it.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, it.id_gudang_tujuan) AS gudang_tujuan,
            it.nomor_io,
            io.approve_tanggal AS tgl_io_approve,
            it.keterangan AS receive_note,
            it.status
        FROM public.internal_transfer it
        LEFT JOIN public.internal_order io ON it.nomor_io = io.nomor_io
        LEFT JOIN public.gudang ga ON it.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON it.id_gudang_tujuan = gt.id_gudang
        WHERE 1=1
    """
    params = {"limit": limit}

    if date_from:
        query += " AND it.tanggal >= :date_from"
        params["date_from"] = date_from
    if date_to:
        query += " AND it.tanggal <= :date_to"
        params["date_to"] = date_to
    if status:
        query += " AND it.status = :status"
        params["status"] = status

    # Role-based Row-Level Security
    user_gudangs = set()
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            user_gudangs = set(gudangs)
            if direction == "in":
                query += " AND it.id_gudang_tujuan IN :gudangs"
            elif direction == "out":
                query += " AND it.id_gudang_asal IN :gudangs"
            else:
                query += " AND (it.id_gudang_asal IN :gudangs OR it.id_gudang_tujuan IN :gudangs)"
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            user_gudangs = {current_user.id_pegawai}
            if direction == "in":
                query += " AND it.id_gudang_tujuan = :user_gudang"
            elif direction == "out":
                query += " AND it.id_gudang_asal = :user_gudang"
            else:
                query += " AND (it.id_gudang_asal = :user_gudang OR it.id_gudang_tujuan = :user_gudang)"
            params["user_gudang"] = current_user.id_pegawai

    query += " ORDER BY it.tanggal DESC, it.nomor DESC LIMIT :limit"

    result = db.execute(text(query), params).mappings().all()
    rows = []
    for r in result:
        row = dict(r)
        orig = str(row.get("id_gudang_asal") or "")
        dest = str(row.get("id_gudang_tujuan") or "")
        if user_gudangs:
            if dest in user_gudangs and orig in user_gudangs:
                row["transfer_type"] = "Internal Cabang"
            elif dest in user_gudangs:
                row["transfer_type"] = "Receipt IT In (Masuk)"
            elif orig in user_gudangs:
                row["transfer_type"] = "IT Out (Keluar)"
            else:
                row["transfer_type"] = "Transfer"
        else:
            row["transfer_type"] = "Transfer"
        rows.append(row)

    return {"data": rows}


@router.get("/export-excel")
async def export_distribution_excel(
    export_type: str = Query(..., alias="type", description="IO (Internal Order) atau IT (Internal Transfer)"),
    period: Optional[str] = Query(None, description="1_day, 7_days, 1_month, 3_months, 6_months, 1_year, all, or custom"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Export data Internal Order (IO) atau Internal Transfer (IT) ke format file Excel (.xlsx)."""
    import io
    import pandas as pd
    from datetime import date as dt_date, timedelta
    from fastapi import HTTPException
    from fastapi.responses import StreamingResponse

    type_upper = export_type.upper().strip()
    if type_upper not in ["IO", "IT", "DO"]:
        raise HTTPException(status_code=400, detail="Tipe export harus 'IO', 'IT', atau 'DO'")

    if type_upper == "IO":
        target_table = "public.internal_order"
    elif type_upper == "IT":
        target_table = "public.internal_transfer"
    else:
        target_table = "public.do_tbl"

    # Tentukan date range
    if not date_to:
        max_db_date = db.execute(text(f"SELECT MAX(tanggal) FROM {target_table}")).scalar()
        anchor = max_db_date or dt_date.today()
        date_to = anchor
    else:
        anchor = date_to

    period_clean = period.lower().replace(" ", "_") if period else "custom"
    days_map = {
        "1_day": 1, "1d": 1,
        "7_day": 7, "7_days": 7, "7d": 7,
        "1_month": 30, "1m": 30,
        "3_month": 90, "3_months": 90, "3m": 90,
        "6_month": 180, "6_months": 180, "6m": 180,
        "1_year": 365, "1y": 365
    }

    if not date_from and period_clean in days_map:
        date_from = anchor - timedelta(days=days_map[period_clean])

    # Query data
    params = {}
    where_clauses = ["1=1"]
    if date_from:
        where_clauses.append("t.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("t.tanggal <= :date_to")
        params["date_to"] = date_to
    if status:
        where_clauses.append("t.status = :status")
        params["status"] = status

    # Role-based Row-Level Security
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(','))
            if type_upper in ["IO", "IT"]:
                where_clauses.append("(t.id_gudang_asal IN :gudangs OR t.id_gudang_tujuan IN :gudangs)")
            else:
                where_clauses.append("t.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            if type_upper in ["IO", "IT"]:
                where_clauses.append("(t.id_gudang_asal = :user_gudang OR t.id_gudang_tujuan = :user_gudang)")
            else:
                where_clauses.append("t.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai

    where_str = " AND ".join(where_clauses)

    if type_upper == "IO":
        io_status_map = {
            "D": "Draft",
            "S": "Checked DSM",
            "A": "Approve",
            "P": "IT Process",
            "Z": "Partial",
            "C": "IT Completed",
            "K": "Reject DSM",
            "Y": "Reject ST",
            "X": "Cancel",
            "R": "Cancel",
        }
        sql = f"""
            SELECT 
                t.nomor_io AS "Nomor IO",
                TO_CHAR(t.tanggal, 'DD-MM-YYYY') AS "Tanggal",
                COALESCE(ikc_code.nama, ikc_id.nama, 'HO - Balikpapan') AS "Kantor",
                COALESCE(ga.gudang, t.id_gudang_asal, '') AS "Gudang Asal",
                COALESCE(gt.gudang, t.id_gudang_tujuan, '') AS "Gudang Tujuan",
                COALESCE(p_kontak.nama, p_buat.nama, t.kontak, t.dibuat, '') AS "Dibuat oleh",
                CASE 
                    WHEN t.send_by_date IS NOT NULL THEN TO_CHAR(t.send_by_date, 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Send",
                CASE 
                    WHEN t.check_dsm_date IS NOT NULL THEN TO_CHAR(t.check_dsm_date, 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Check By DSM",
                CASE 
                    WHEN COALESCE(t.check_st_date, t.st_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_st_date, t.st_date), 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Dicek ST",
                CASE 
                    WHEN COALESCE(t.check_whm_date, t.whm_date) IS NOT NULL THEN TO_CHAR(COALESCE(t.check_whm_date, t.whm_date), 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Dicek WHM",
                CASE 
                    WHEN t.approve_tanggal IS NOT NULL THEN TO_CHAR(t.approve_tanggal, 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Approve",
                COALESCE(t.id_ip::text, '') AS "No. IP",
                t.status AS "Status Kode",
                COALESCE(b.nama_barang, iod.id_barang, '') AS "Nama Barang",
                COALESCE(iod.id_barang, '') AS "Kode Barang",
                CASE WHEN iod.id_barang IS NOT NULL THEN iod.qty ELSE NULL END AS "Qty",
                CASE WHEN iod.id_barang IS NOT NULL THEN COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') ELSE '' END AS "Satuan",
                COALESCE(iod.keterangan, '') AS "Keterangan"
            FROM public.internal_order t
            LEFT JOIN public.internal_kantor_cabang ikc_id ON t.id_kantor = ikc_id.id_kantor_cabang
            LEFT JOIN public.internal_kantor_cabang ikc_code ON split_part(t.nomor_io, '/', 3) = 'CPA-' || ikc_code.numbercode OR t.nomor_io LIKE '%/' || ikc_code.numbercode || '/%'
            LEFT JOIN public.gudang ga ON t.id_gudang_asal = ga.id_gudang
            LEFT JOIN public.gudang gt ON t.id_gudang_tujuan = gt.id_gudang
            LEFT JOIN public.pegawai p_kontak ON t.kontak = p_kontak.id_pegawai
            LEFT JOIN public.pegawai p_buat ON t.dibuat = p_buat.id_pegawai
            LEFT JOIN public.internal_order_detail iod ON t.nomor_io = iod.nomor_io
            LEFT JOIN public.barang b ON iod.id_barang = b.id_barang
            WHERE {where_str}
            ORDER BY t.tanggal DESC, t.nomor_io DESC, iod.urut ASC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = []
        for idx, r in enumerate(rows, start=1):
            row_dict = dict(r)
            code = (row_dict.pop("Status Kode", None) or "").strip()
            status_desc = io_status_map.get(code, code)
            qty_raw = row_dict.get("Qty")
            records.append({
                "No": idx,
                "Nomor IO": row_dict.get("Nomor IO", ""),
                "Tanggal": row_dict.get("Tanggal", ""),
                "Kantor": row_dict.get("Kantor", ""),
                "Gudang Asal": row_dict.get("Gudang Asal", ""),
                "Gudang Tujuan": row_dict.get("Gudang Tujuan", ""),
                "Dibuat oleh": row_dict.get("Dibuat oleh", ""),
                "Send": row_dict.get("Send", ""),
                "Check By DSM": row_dict.get("Check By DSM", ""),
                "Dicek ST": row_dict.get("Dicek ST", ""),
                "Dicek WHM": row_dict.get("Dicek WHM", ""),
                "Approve": row_dict.get("Approve", ""),
                "No. IP": row_dict.get("No. IP", ""),
                "Status": status_desc,
                "Nama Barang": row_dict.get("Nama Barang", ""),
                "Kode Barang": row_dict.get("Kode Barang", ""),
                "Qty": float(qty_raw) if qty_raw is not None else "",
                "Satuan": row_dict.get("Satuan", ""),
                "Keterangan": row_dict.get("Keterangan", ""),
            })
        df = pd.DataFrame(records)
        sheet_name = "Internal Order"
        filename_prefix = f"Internal_Order_{period_clean}"
    elif type_upper == "IT":
        it_status_map = {
            "D": "Draft",
            "S": "Send",
            "R": "Receipt",
            "C": "Receipt",
            "X": "Cancel",
        }
        sql = f"""
            SELECT 
                t.nomor AS "IT No",
                TO_CHAR(t.tanggal, 'DD-MM-YYYY') AS "Date",
                CASE 
                    WHEN t.create_date IS NOT NULL THEN TO_CHAR(t.create_date, 'Dy Mon DD HH24:MI:SS "WIB" YYYY')
                    ELSE ''
                END AS "Create Date",
                CASE 
                    WHEN t.tanggal_kirim IS NOT NULL THEN TO_CHAR(t.tanggal_kirim, 'DD-MM-YYYY')
                    ELSE ''
                END AS "Delivery Date",
                CASE 
                    WHEN t.tanggal_terima IS NOT NULL THEN TO_CHAR(t.tanggal_terima, 'DD-MM-YYYY')
                    ELSE ''
                END AS "Receive Date",
                COALESCE(ga.gudang, t.id_gudang_asal, '') AS "Gudang Asal",
                COALESCE(gt.gudang, t.id_gudang_tujuan, '') AS "Gudang Tujuan",
                COALESCE(t.nomor_io, '') AS "Nomor IO",
                CASE 
                    WHEN io.approve_tanggal IS NOT NULL THEN TO_CHAR(io.approve_tanggal, 'DD-MM-YYYY HH24:MI "WIB"')
                    ELSE ''
                END AS "Tgl. IO Approve",
                COALESCE(t.keterangan, '') AS "Receive Note",
                t.status AS "Status Kode",
                COALESCE(b.nama_barang, itd.id_barang, '') AS "Nama Barang",
                COALESCE(itd.id_barang, '') AS "Kode Barang",
                COALESCE(itd.qty, 0) AS "Qty",
                COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') AS "Satuan",
                '' AS "Ongkir",
                CONCAT_WS(' / ', NULLIF(itd.no_ibc, ''), NULLIF(itd.no_skid_tank, '')) AS "No IBC/No Skid Tank",
                '' AS "No Segel",
                COALESCE(itd.keterangan, itd.catatan, '') AS "Keterangan"
            FROM public.internal_transfer t
            LEFT JOIN public.internal_order io ON t.nomor_io = io.nomor_io
            LEFT JOIN public.gudang ga ON t.id_gudang_asal = ga.id_gudang
            LEFT JOIN public.gudang gt ON t.id_gudang_tujuan = gt.id_gudang
            LEFT JOIN public.internal_transfer_detail itd ON t.nomor = itd.nomor
            LEFT JOIN public.barang b ON itd.id_barang = b.id_barang
            WHERE {where_str}
            ORDER BY t.tanggal DESC, t.nomor DESC, itd.urut ASC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = []
        for idx, r in enumerate(rows, start=1):
            row_dict = dict(r)
            code = (row_dict.pop("Status Kode", None) or "").strip()
            status_desc = it_status_map.get(code, code)
            records.append({
                "No": idx,
                "IT No": row_dict.get("IT No", ""),
                "Date": row_dict.get("Date", ""),
                "Create Date": row_dict.get("Create Date", ""),
                "Delivery Date": row_dict.get("Delivery Date", ""),
                "Receive Date": row_dict.get("Receive Date", ""),
                "Gudang Asal": row_dict.get("Gudang Asal", ""),
                "Gudang Tujuan": row_dict.get("Gudang Tujuan", ""),
                "Nomor IO": row_dict.get("Nomor IO", ""),
                "Tgl. IO Approve": row_dict.get("Tgl. IO Approve", ""),
                "Receive Note": row_dict.get("Receive Note", ""),
                "Status": status_desc,
                "Nama Barang": row_dict.get("Nama Barang", ""),
                "Kode Barang": row_dict.get("Kode Barang", ""),
                "Qty": row_dict.get("Qty", 0),
                "Satuan": row_dict.get("Satuan", ""),
                "Ongkir": row_dict.get("Ongkir", ""),
                "No IBC/No Skid Tank": row_dict.get("No IBC/No Skid Tank", ""),
                "No Segel": row_dict.get("No Segel", ""),
                "Keterangan": row_dict.get("Keterangan", ""),
            })
        df = pd.DataFrame(records)
        sheet_name = "Internal Transfer"
        filename_prefix = f"Internal_Transfer_{period_clean}"
    else:  # DO
        do_where_str = where_str.replace("t.tanggal", "d.tanggal").replace("t.status", "d.status")
        sql = f"""
            SELECT 
                d.nomor AS "Nomor DO",
                d.tanggal AS "Tanggal DO",
                d.id_customer AS "ID Customer",
                COALESCE(c.customer, d.kepada) AS "Nama Customer",
                d.alamat AS "Alamat Kirim",
                COALESCE(g.gudang, d.id_gudang) AS "Gudang Asal",
                d.driver AS "Driver",
                d.lic_plate AS "Plat Nomor",
                d.tgl_keluar AS "Tanggal Kirim",
                d.received_date AS "Tanggal Sampai",
                CASE 
                    WHEN d.status = 'X' THEN 'Batal (Void)'
                    WHEN d.received_date IS NOT NULL THEN 'Delivered'
                    WHEN d.tgl_keluar IS NOT NULL THEN 'In Transit'
                    ELSE 'Draft / Pending'
                END AS "Status Pengiriman",
                d.keterangan AS "Keterangan"
            FROM public.do_tbl d
            LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
            LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
            WHERE {do_where_str}
            ORDER BY d.tanggal DESC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = [dict(r) for r in rows]
        df = pd.DataFrame(records)
        sheet_name = "Delivery Order"
        filename_prefix = f"Delivery_Order_{period_clean}"

    if df.empty:
        if type_upper == "IO":
            df = pd.DataFrame(columns=[
                "No", "Nomor IO", "Tanggal", "Kantor", "Gudang Asal", "Gudang Tujuan",
                "Dibuat oleh", "Send", "Check By DSM", "Dicek ST", "Dicek WHM",
                "Approve", "No. IP", "Status", "Nama Barang", "Kode Barang",
                "Qty", "Satuan", "Keterangan"
            ])
        elif type_upper == "IT":
            df = pd.DataFrame(columns=[
                "No", "IT No", "Date", "Create Date", "Delivery Date", "Receive Date",
                "Gudang Asal", "Gudang Tujuan", "Nomor IO", "Tgl. IO Approve",
                "Receive Note", "Status", "Nama Barang", "Kode Barang",
                "Qty", "Satuan", "Ongkir", "No IBC/No Skid Tank", "No Segel", "Keterangan"
            ])
        else:
            df = pd.DataFrame(columns=[
                "Nomor DO", "Tanggal DO", "ID Customer", "Nama Customer", "Alamat Kirim",
                "Gudang Asal", "Driver", "Plat Nomor", "Tanggal Kirim", "Tanggal Sampai",
                "Status Pengiriman", "Keterangan"
            ])

    df = df.fillna("")

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        ws = writer.sheets[sheet_name]

        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        header_font_default = Font(name="Calibri", size=10, bold=True, color="000000")
        header_fill_default = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        ws.row_dimensions[1].height = 24

        for col in ws.columns:
            header_cell = col[0]
            col_name = str(header_cell.value or "")

            header_cell.font = header_font_default
            header_cell.fill = header_fill_default
            header_cell.border = thin_border
            header_cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

            max_len = max(len(str(c.value or "")) for c in col)
            col_letter = header_cell.column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, len(col_name) + 3, 10)

            is_no_col = col_name == "No"
            is_qty_col = col_name == "Qty"
            is_center_col = col_name in [
                "Date", "Tanggal", "Delivery Date", "Receive Date", "Send",
                "Check By DSM", "Dicek ST", "Dicek WHM", "Approve", "Tgl. IO Approve",
                "Status", "No. IP", "Satuan"
            ]

            for data_cell in col[1:]:
                data_cell.border = thin_border
                data_cell.font = Font(name="Calibri", size=10, color="000000")
                if is_no_col or is_center_col:
                    data_cell.alignment = Alignment(horizontal="center", vertical="center")
                elif is_qty_col:
                    data_cell.alignment = Alignment(horizontal="right", vertical="center")
                else:
                    data_cell.alignment = Alignment(horizontal="left", vertical="center")

    output.seek(0)
    date_suffix = f"{date_from or ''}_sd_{date_to or ''}".replace("-", "")
    filename = f"{filename_prefix}_{date_suffix}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/delivery-order/receipt")
async def get_delivery_order_receipt(
    nomor: str = Query(..., description="Nomor Delivery Order (DO)"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan data lengkap Form Receipt Delivery Order beserta rincian barang dari cpa_existing."""
    header_sql = """
        SELECT 
            d.nomor AS no_do,
            d.tanggal AS tgl_do,
            COALESCE(d.no_pl, '') AS picking_list_no,
            COALESCE(d.id_customer, '') AS id_customer,
            COALESCE(c.customer, d.kepada, '') AS customer,
            COALESCE(s.referensi, '') AS po_no,
            COALESCE(d.id_gudang, '') AS id_gudang,
            COALESCE(g.gudang, d.id_gudang, '') AS gudang,
            COALESCE(d.kepada, '') AS contact_person,
            COALESCE(d.telpon, d.hp, c.telepon, '') AS telpon_no,
            COALESCE(d.received_name, '') AS nama_penerima,
            d.received_date AS receive_date,
            d.tgl_sampai AS tgl_sampai_tujuan,
            d.shippingcosts AS biaya_pengiriman,
            d.return_date,
            COALESCE(d.alamat, '') AS delivery_address,
            COALESCE(d.status, 'S') AS status,
            CASE 
                WHEN d.status = 'R' THEN 'Received'
                WHEN d.status = 'S' THEN 'Send'
                WHEN d.status = 'I' THEN 'Invoice'
                WHEN d.status = 'C' THEN 'Cancel'
                WHEN d.status = 'D' THEN 'Draft'
                ELSE COALESCE(d.status, 'Send')
            END AS status_label,
            COALESCE(d.driver, '') AS driver,
            COALESCE(d.lic_plate, '') AS lic_plate,
            COALESCE(d.transporter, '') AS transporter,
            d.tgl_keluar,
            COALESCE(d.keterangan, '') AS keterangan
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
        LEFT JOIN public.so s ON pl.no_so = s.nomor
        WHERE d.nomor = :nomor
        LIMIT 1
    """
    row = db.execute(text(header_sql), {"nomor": nomor}).mappings().first()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Surat Jalan (DO) tidak ditemukan")

    items_sql = """
        SELECT 
            dd.urut AS no,
            dd.id_barang AS kode_barang,
            COALESCE(b.nama_barang, dd.id_barang) AS nama_barang,
            COALESCE(dd.qty, 0) AS qty,
            COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') AS satuan,
            COALESCE(dd.packing_number, '') AS packing_number,
            COALESCE(dd.packing_type, '') AS packing_type,
            COALESCE(dd.qty_diterima, 0) AS qty_diterima,
            COALESCE(dd.keterangan, '') AS keterangan
        FROM public.do_detail dd
        LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
        WHERE dd.no_do = :nomor
        ORDER BY dd.urut ASC
    """
    item_rows = db.execute(text(items_sql), {"nomor": nomor}).mappings().all()

    header_dict = dict(row)
    if header_dict.get("tgl_do"):
        d = header_dict["tgl_do"]
        header_dict["tgl_do_str"] = f"{d.day:02d}-{d.month:02d}-{d.year}" if hasattr(d, "day") else str(d)
    else:
        header_dict["tgl_do_str"] = "—"

    if header_dict.get("receive_date"):
        d = header_dict["receive_date"]
        header_dict["receive_date_str"] = f"{d.day:02d}-{d.month:02d}-{d.year}" if hasattr(d, "day") else str(d)
    else:
        header_dict["receive_date_str"] = ""

    if header_dict.get("tgl_sampai_tujuan"):
        d = header_dict["tgl_sampai_tujuan"]
        header_dict["tgl_sampai_tujuan_str"] = f"{d.day:02d}-{d.month:02d}-{d.year}" if hasattr(d, "day") else str(d)
    else:
        header_dict["tgl_sampai_tujuan_str"] = ""

    if header_dict.get("return_date"):
        d = header_dict["return_date"]
        header_dict["return_date_str"] = f"{d.day:02d}-{d.month:02d}-{d.year}" if hasattr(d, "day") else str(d)
    else:
        header_dict["return_date_str"] = ""

    return {
        "header": header_dict,
        "items": [dict(r) for r in item_rows],
    }


@router.get("/receipt/{nomor:path}")
async def get_delivery_order_receipt_path(
    nomor: str,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan data lengkap Form Receipt Delivery Order via path parameter."""
    return await get_delivery_order_receipt(nomor=nomor, db=db, current_user=current_user)


@router.get("/{nomor:path}")
async def get_delivery_detail(
    nomor: str,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Detail satu Delivery Order (kompatibel dengan format lama dan form receipt)."""
    res = await get_delivery_order_receipt(nomor=nomor, db=db, current_user=current_user)
    return {
        "delivery": res["header"],
        "header": res["header"],
        "items": res["items"],
    }

