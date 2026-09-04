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


@router.get("/internal-orders")
async def get_internal_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan daftar Internal Order dari cpa_existing."""
    query = """
        SELECT 
            io.nomor_io, 
            io.tanggal,
            COALESCE(ikc.nama, io.id_kantor) AS nama_kantor,
            COALESCE(ga.gudang, io.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, io.id_gudang_tujuan) AS gudang_tujuan,
            COALESCE(p_buat.nama, io.dibuat, io.kontak, '—') AS dibuat_oleh,
            COALESCE(p_send.nama, io.send_by, '—') AS send_oleh,
            io.send_by_date,
            COALESCE(p_app.nama, io.approve, '—') AS approve_oleh,
            io.approve_tanggal,
            io.id_ip,
            io.status,
            io.order_status
        FROM public.internal_order io
        LEFT JOIN public.internal_kantor_cabang ikc ON io.id_kantor = ikc.id_kantor_cabang
        LEFT JOIN public.gudang ga ON io.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON io.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN public.pegawai p_buat ON COALESCE(io.dibuat, io.kontak) = p_buat.id_pegawai
        LEFT JOIN public.pegawai p_send ON io.send_by = p_send.id_pegawai
        LEFT JOIN public.pegawai p_app ON io.approve = p_app.id_pegawai
        WHERE 1=1
    """
    params = {"limit": limit}

    if date_from:
        query += " AND io.tanggal >= :date_from"
        params["date_from"] = date_from
    if date_to:
        query += " AND io.tanggal <= :date_to"
        params["date_to"] = date_to
    if status:
        query += " AND io.status = :status"
        params["status"] = status

    query += " ORDER BY io.tanggal DESC LIMIT :limit"

    result = db.execute(text(query), params).mappings().all()
    return {"data": [dict(r) for r in result]}


@router.get("/transfer-orders")
async def get_transfer_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan daftar Transfer Order dari cpa_existing."""
    query = """
        SELECT 
            it.nomor,
            it.tanggal,
            it.create_date,
            it.tanggal_kirim,
            it.tanggal_terima,
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

    query += " ORDER BY it.tanggal DESC LIMIT :limit"

    result = db.execute(text(query), params).mappings().all()
    return {"data": [dict(r) for r in result]}


@router.get("/export-excel")
async def export_distribution_excel(
    export_type: str = Query(..., alias="type", description="IO (Internal Order) atau IT (Internal Transfer)"),
    period: Optional[str] = Query(None, description="1_day, 7_days, 1_month, 3_months, 6_months, 1_year, all, or custom"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_existing_db),
):
    """Export data Internal Order (IO) atau Internal Transfer (IT) ke format file Excel (.xlsx)."""
    import io
    import pandas as pd
    from datetime import date as dt_date, timedelta
    from fastapi import HTTPException
    from fastapi.responses import StreamingResponse

    type_upper = export_type.upper().strip()
    if type_upper not in ["IO", "IT"]:
        raise HTTPException(status_code=400, detail="Tipe export harus 'IO' atau 'IT'")

    target_table = "public.internal_order" if type_upper == "IO" else "public.internal_transfer"

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

    where_str = " AND ".join(where_clauses)

    if type_upper == "IO":
        io_status_map = {
            "D": "Draft",
            "S": "Send IO",
            "K": "Reject by send_by",
            "Y": "Reject by ST controller",
            "A": "Approve",
            "R": "Reject",
            "X": "Cancel",
            "P": "IT Proses",
            "Z": "IT partial",
            "C": "IT Completed",
        }
        sql = f"""
            SELECT 
                t.nomor_io AS "Nomor IO",
                t.tanggal AS "Tanggal",
                COALESCE(ikc.nama, t.id_kantor) AS "Kantor",
                COALESCE(ga.gudang, t.id_gudang_asal) AS "Gudang Asal",
                COALESCE(gt.gudang, t.id_gudang_tujuan) AS "Gudang Tujuan",
                COALESCE(p_buat.nama, t.dibuat, t.kontak, '—') AS "Dibuat Oleh",
                COALESCE(p_send.nama, t.send_by, '—') AS "Send Oleh",
                t.send_by_date AS "Send Date",
                CASE 
                    WHEN t.status IN ('A', 'P', 'Z', 'C', 'Y', 'X', 'R') THEN '✓'
                    WHEN t.status = 'K' THEN 'Reject'
                    ELSE '—'
                END AS "Check DSM",
                CASE 
                    WHEN t.status IN ('A', 'P', 'Z', 'C', 'X', 'R') THEN '✓'
                    WHEN t.status = 'Y' THEN 'Reject ST'
                    ELSE '—'
                END AS "Dicek ST",
                CASE 
                    WHEN t.status IN ('A', 'P', 'Z', 'C') THEN '✓'
                    WHEN t.status = 'X' THEN 'Cancel WHM'
                    ELSE '—'
                END AS "Dicek WHM",
                COALESCE(p_app.nama, t.approve, '—') AS "Approve Oleh",
                t.approve_tanggal AS "Approve Tanggal",
                t.id_ip AS "No IP",
                t.status AS "Status Kode"
            FROM public.internal_order t
            LEFT JOIN public.internal_kantor_cabang ikc ON t.id_kantor = ikc.id_kantor_cabang
            LEFT JOIN public.gudang ga ON t.id_gudang_asal = ga.id_gudang
            LEFT JOIN public.gudang gt ON t.id_gudang_tujuan = gt.id_gudang
            LEFT JOIN public.pegawai p_buat ON COALESCE(t.dibuat, t.kontak) = p_buat.id_pegawai
            LEFT JOIN public.pegawai p_send ON t.send_by = p_send.id_pegawai
            LEFT JOIN public.pegawai p_app ON t.approve = p_app.id_pegawai
            WHERE {where_str}
            ORDER BY t.tanggal DESC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = [dict(r) for r in rows]
        for r in records:
            code = (r.get("Status Kode") or "").strip()
            r["Keterangan Status"] = io_status_map.get(code, code)

        df = pd.DataFrame(records)
        sheet_name = "Internal Order"
        filename_prefix = f"Internal_Order_{period_clean}"
    else:
        it_status_map = {
            "D": "Draft (Revisi)",
            "S": "Send (Barang Keluar)",
            "R": "Receipt (Barang Diterima)",
            "X": "Cancel (Batal / Kembali)",
        }
        sql = f"""
            SELECT 
                t.nomor AS "IT No",
                t.tanggal AS "Date",
                t.create_date AS "Create Date",
                t.tanggal_kirim AS "Delivery Date",
                t.tanggal_terima AS "Receive Date",
                COALESCE(ga.gudang, t.id_gudang_asal) AS "Gudang Asal",
                COALESCE(gt.gudang, t.id_gudang_tujuan) AS "Gudang Tujuan",
                t.nomor_io AS "Nomor IO",
                io.approve_tanggal AS "Tgl IO Approve",
                t.keterangan AS "Receive Note",
                t.status AS "Status Kode"
            FROM public.internal_transfer t
            LEFT JOIN public.internal_order io ON t.nomor_io = io.nomor_io
            LEFT JOIN public.gudang ga ON t.id_gudang_asal = ga.id_gudang
            LEFT JOIN public.gudang gt ON t.id_gudang_tujuan = gt.id_gudang
            WHERE {where_str}
            ORDER BY t.tanggal DESC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = [dict(r) for r in rows]
        for r in records:
            code = (r.get("Status Kode") or "").strip()
            r["Keterangan Status"] = it_status_map.get(code, code)

        df = pd.DataFrame(records)
        sheet_name = "Internal Transfer"
        filename_prefix = f"Internal_Transfer_{period_clean}"

    if df.empty:
        if type_upper == "IO":
            df = pd.DataFrame(columns=[
                "Nomor IO", "Tanggal", "Kantor", "Gudang Asal", "Gudang Tujuan",
                "Dibuat Oleh", "Send Oleh", "Send Date", "Check DSM", "Dicek ST",
                "Dicek WHM", "Approve Oleh", "Approve Tanggal", "No IP", "Status Kode", "Keterangan Status"
            ])
        else:
            df = pd.DataFrame(columns=[
                "IT No", "Date", "Create Date", "Delivery Date", "Receive Date",
                "Gudang Asal", "Gudang Tujuan", "Nomor IO", "Tgl IO Approve",
                "Receive Note", "Status Kode", "Keterangan Status"
            ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        ws = writer.sheets[sheet_name]

        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        for col in ws.columns:
            cell = col[0]
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

            max_len = max(len(str(c.value or "")) for c in col)
            col_letter = cell.column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

            for data_cell in col[1:]:
                data_cell.border = thin_border

    output.seek(0)
    date_suffix = f"{date_from or ''}_sd_{date_to or ''}".replace("-", "")
    filename = f"{filename_prefix}_{date_suffix}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/simulation-data")
async def get_simulation_data(
    scenario: str = "sulawesi",
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mengembalikan data frame time-series untuk visualisasi Supply Chain Simulation."""
    import datetime
    import math

    total_days = 60
    start_date = datetime.date(2023, 1, 1)

    if scenario == "kalimantan":
        nodes = [
            {"id": "N0", "name": "Balikpapan Central", "role": "Central Plant / Warehouse", "x": 80, "y": 280, "max_inv": 100000},
            {"id": "N1", "name": "Hub Sampit", "role": "Regional Hub 1", "x": 300, "y": 140, "max_inv": 350},
            {"id": "N2", "name": "Hub Banjarmasin", "role": "Regional Hub 2", "x": 300, "y": 420, "max_inv": 350},
            {"id": "N3", "name": "Depot Samarinda", "role": "Cross-dock Transit", "x": 520, "y": 280, "max_inv": 350},
            {"id": "N4", "name": "Site MMS Martabe", "role": "Konsinyasi Outlet 1", "x": 740, "y": 140, "max_inv": 150},
            {"id": "N5", "name": "Site Borneo Prima", "role": "Konsinyasi Outlet 2", "x": 740, "y": 420, "max_inv": 150},
        ]
        demands = [
            {"id": "D1", "name": "Demand Kaltim", "connected_node": "N4", "x": 840, "y": 140},
            {"id": "D2", "name": "Demand Sampit", "connected_node": "N5", "x": 840, "y": 420},
        ]
    else:
        nodes = [
            {"id": "N0", "name": "Central Bitung HO", "role": "Central Plant / Warehouse", "x": 80, "y": 280, "max_inv": 100000},
            {"id": "N1", "name": "Hub Kendari", "role": "Regional Hub 1", "x": 300, "y": 140, "max_inv": 350},
            {"id": "N2", "name": "Hub Palu", "role": "Regional Hub 2", "x": 300, "y": 420, "max_inv": 350},
            {"id": "N3", "name": "Makassar Transit", "role": "Cross-dock Transit", "x": 520, "y": 280, "max_inv": 350},
            {"id": "N4", "name": "Konsinyasi Morowali", "role": "Konsinyasi Outlet 1", "x": 740, "y": 140, "max_inv": 150},
            {"id": "N5", "name": "Konsinyasi Weda", "role": "Konsinyasi Outlet 2", "x": 740, "y": 420, "max_inv": 150},
        ]
        demands = [
            {"id": "D1", "name": "Demand Morowali", "connected_node": "N4", "x": 840, "y": 140},
            {"id": "D2", "name": "Demand Weda", "connected_node": "N5", "x": 840, "y": 420},
        ]

    links = [
        {"from": "N0", "to": "N1", "type": "material"},
        {"from": "N0", "to": "N2", "type": "material"},
        {"from": "N1", "to": "N3", "type": "material"},
        {"from": "N2", "to": "N3", "type": "material"},
        {"from": "N3", "to": "N4", "type": "material"},
        {"from": "N3", "to": "N5", "type": "material"},
        {"from": "N3", "to": "N1", "type": "order"},
        {"from": "N3", "to": "N2", "type": "order"},
        {"from": "N4", "to": "N3", "type": "order"},
        {"from": "N5", "to": "N3", "type": "order"},
        {"from": "N4", "to": "D1", "type": "demand"},
        {"from": "N5", "to": "D2", "type": "demand"},
    ]

    days_data = []
    inv = {"N0": 100000, "N1": 150, "N2": 150, "N3": 80, "N4": 60, "N5": 60}
    node_hist = {k: [] for k in inv}
    demand_hist = {"D1": [], "D2": []}

    for day in range(1, total_days + 1):
        cur_date = start_date + datetime.timedelta(days=day - 1)
        cur_date_str = cur_date.isoformat()

        if day == 42:
            inv = {"N0": 99301, "N1": 0, "N2": 0, "N3": 0, "N4": 0, "N5": 134}
            trucks = [
                {"id": "T-01", "from": "N0", "to": "N1", "payload": 349, "progress": 0.72},
                {"id": "T-02", "from": "N0", "to": "N2", "payload": 350, "progress": 0.48},
            ]
            orders = [
                {"id": "O-01", "from": "N3", "to": "N1", "qty": 170, "progress": 0.60},
                {"id": "O-02", "from": "N3", "to": "N2", "qty": 170, "progress": 0.55},
                {"id": "O-03", "from": "N4", "to": "N3", "qty": 126, "progress": 0.75},
            ]
            d1_served, d1_missed = 0, 8
            d2_served, d2_missed = 5, 2
        elif day < 42:
            factor = (42 - day) / 42.0
            t_inv0 = int(99301 + factor * 699)
            inv["N0"] = t_inv0

            if day < 15:
                inv["N1"] = max(0, int(180 - day * 10))
                inv["N2"] = max(0, int(160 - day * 9))
                inv["N3"] = max(0, int(50 - day * 3))
                inv["N4"] = max(0, int(40 - day * 2))
                inv["N5"] = max(0, int(30 - day * 2))
            elif day < 30:
                inv["N1"] = 0
                inv["N2"] = 0
                inv["N3"] = 0
                inv["N4"] = max(0, int(20 - (day - 15)))
                inv["N5"] = max(0, int(25 - (day - 15)))
            else:
                inv["N1"] = 0
                inv["N2"] = 0
                inv["N3"] = 0
                inv["N4"] = 0
                inv["N5"] = int(min(134, (day - 35) * 20)) if day >= 35 else 0

            trucks = []
            orders = []
            p1 = (day * 0.17) % 1.0
            p2 = (day * 0.14) % 1.0
            if p1 < 0.85:
                trucks.append({"id": "T-01", "from": "N0", "to": "N1", "payload": 300 + (day * 7) % 100, "progress": round(p1, 2)})
            if p2 < 0.85:
                trucks.append({"id": "T-02", "from": "N0", "to": "N2", "payload": 280 + (day * 9) % 120, "progress": round(p2, 2)})
            if day % 3 == 0:
                trucks.append({"id": "T-03", "from": "N1", "to": "N3", "payload": 120, "progress": round((day * 0.2) % 1.0, 2)})
            if day % 4 == 0:
                trucks.append({"id": "T-04", "from": "N3", "to": "N5", "payload": 140, "progress": round((day * 0.25) % 1.0, 2)})

            orders.append({"id": "O-01", "from": "N3", "to": "N1", "qty": 150 + (day * 5) % 50, "progress": round((day * 0.22) % 1.0, 2)})
            orders.append({"id": "O-02", "from": "N3", "to": "N2", "qty": 160 + (day * 3) % 40, "progress": round((day * 0.19) % 1.0, 2)})
            orders.append({"id": "O-03", "from": "N4", "to": "N3", "qty": 100 + (day * 4) % 60, "progress": round((day * 0.26) % 1.0, 2)})

            d1_served = max(0, int(5 + 3 * math.sin(day * 0.5))) if inv["N4"] > 0 else 0
            d1_missed = 0 if inv["N4"] > 0 else int(4 + 4 * math.sin(day * 0.7))
            d2_served = max(0, int(6 + 2 * math.cos(day * 0.6))) if inv["N5"] > 0 else 0
            d2_missed = 0 if inv["N5"] > 0 else int(3 + 3 * math.cos(day * 0.5))
        else:
            offset = day - 42
            inv["N0"] = max(90000, 99301 - offset * 180)
            inv["N1"] = min(300, offset * 18)
            inv["N2"] = min(250, offset * 15)
            inv["N3"] = min(150, max(0, (offset - 3) * 12))
            inv["N4"] = min(120, max(0, (offset - 6) * 10))
            inv["N5"] = max(134, 134 + offset * 5)

            trucks = [
                {"id": "T-01", "from": "N0", "to": "N1", "payload": 320, "progress": round((offset * 0.2) % 1.0, 2)},
                {"id": "T-02", "from": "N0", "to": "N2", "payload": 310, "progress": round((offset * 0.18) % 1.0, 2)},
                {"id": "T-03", "from": "N1", "to": "N3", "payload": 150, "progress": round((offset * 0.25) % 1.0, 2)},
                {"id": "T-04", "from": "N3", "to": "N4", "payload": 110, "progress": round((offset * 0.3) % 1.0, 2)},
            ]
            orders = [
                {"id": "O-01", "from": "N3", "to": "N1", "qty": 140, "progress": round((offset * 0.22) % 1.0, 2)},
                {"id": "O-02", "from": "N4", "to": "N3", "qty": 90, "progress": round((offset * 0.27) % 1.0, 2)},
            ]
            d1_served = min(15, offset * 2)
            d1_missed = max(0, 10 - offset * 2)
            d2_served = 8
            d2_missed = 0

        for k in inv:
            node_hist[k].append({"day": day, "date": cur_date_str, "val": inv[k]})
        demand_hist["D1"].append({"day": day, "date": cur_date_str, "served": d1_served, "missed": d1_missed})
        demand_hist["D2"].append({"day": day, "date": cur_date_str, "served": d2_served, "missed": d2_missed})

        days_data.append({
            "day": day,
            "date": cur_date_str,
            "inventory": {k: inv[k] for k in inv},
            "trucks": trucks,
            "orders": orders,
            "demand": {
                "D1": {"served": d1_served, "missed": d1_missed},
                "D2": {"served": d2_served, "missed": d2_missed},
            },
            "node_histories": {k: list(node_hist[k]) for k in node_hist},
            "demand_histories": {
                "D1": list(demand_hist["D1"]),
                "D2": list(demand_hist["D2"]),
            },
        })

    return {
        "scenario": scenario,
        "nodes": nodes,
        "demands": demands,
        "links": links,
        "total_days": total_days,
        "days": days_data,
    }


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
