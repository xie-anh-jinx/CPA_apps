"""
Router — Warehouses Multi-Gudang Monitoring
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from datetime import datetime
import io

from app.database import get_analytics_db
from app.routers.auth import CurrentUser
from app.utils.warehouse_master import get_warehouse_code_area

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
            w.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area, w.alamat, w.inisial,
            w.parent, w.telpon, w.kontak_person, w.dsm,
            COUNT(DISTINCT ib.id_barang) AS jumlah_sku,
            SUM(ib.on_hand) AS total_on_hand,
            SUM(ib.available) AS total_available,
            SUM(ib.nilai_persediaan) AS total_nilai,
            SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS zero_stock_count
        FROM operational.warehouses w
        LEFT JOIN operational.inventory_balances ib ON w.id_gudang = ib.id_gudang
        {extra}
        GROUP BY w.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area, w.alamat, w.inisial, w.parent, w.telpon, w.kontak_person, w.dsm
        ORDER BY w.nama_gudang
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
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
            w.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area, w.alamat, w.telpon, w.kontak_person, w.dsm,
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
        GROUP BY w.id_gudang, w.nama_gudang, w.nama_kantor, w.code_area, w.alamat, w.telpon, w.kontak_person, w.dsm
        ORDER BY total_nilai DESC
    """), params).mappings().all()

    hide_financial = current_user and current_user.role in ("sales", "sales_rep", "warehouse", "warehouse_staff")
    res = []
    for r in rows:
        d = dict(r)
        if not d.get("code_area"):
            d["code_area"] = get_warehouse_code_area(d.get("id_gudang"), d.get("nama_gudang"), d.get("nama_kantor"))
        if hide_financial:
            d["total_nilai"] = None
        res.append(d)
    return res


@router.get("/export-excel")
async def export_warehouses_excel(
    code_area: Optional[str] = Query(None, description="Filter code area"),
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """
    Ekspor daftar multi-gudang ke format Excel (.xlsx) dengan kolom Code Area.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    warehouses = await list_warehouses(db=db, current_user=current_user)
    ca_val = str(code_area) if (code_area and not hasattr(code_area, "default")) else None
    if ca_val and ca_val.upper() != "ALL":
        ca_upper = ca_val.upper()
        warehouses = [w for w in warehouses if str(w.get("code_area", "")).upper() == ca_upper]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Multi Gudang"

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )

    ws.merge_cells("A1:K1")
    ws["A1"] = "PT. CAHAYA PENGAJARAN ABADI"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")

    ws.merge_cells("A2:K2")
    ws["A2"] = "LAPORAN MASTER DATA & MONITORING MULTI-GUDANG"
    ws["A2"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")

    now_str = datetime.now().strftime("%d-%b-%y %H:%M WIB")
    ws.merge_cells("A3:K3")
    ws["A3"] = f"Filter Area: {code_area or 'Semua Area'} | Waktu: {now_str} | Total: {len(warehouses)} Gudang"
    ws["A3"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    headers = [
        "ID Gudang", "Nama Gudang", "Kantor / Cabang", "Code Area",
        "Kontak Person", "DSM", "Telepon", "On Hand", "Available",
        "Low Stock", "Stok Kosong"
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

    font_regular = Font(name="Calibri", size=10, color="000000")
    font_code = Font(name="Consolas", size=9, bold=True, color="0F172A")

    for idx, w in enumerate(warehouses, 1):
        row_num = 5 + idx
        ws.row_dimensions[row_num].height = 19

        on_hand = float(w.get("total_on_hand") or 0)
        available = float(w.get("total_available") or 0)
        low_stk = int(w.get("low_stock_count") or 0)
        zero_stk = int(w.get("zero_stock_count") or 0)

        row_values = [
            (str(w.get("id_gudang") or "-"), Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(w.get("nama_gudang") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(w.get("nama_kantor") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(w.get("code_area") or "-"), Alignment(horizontal="center", vertical="center"), font_code, None),
            (str(w.get("kontak_person") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(w.get("dsm") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (str(w.get("telpon") or "-"), Alignment(horizontal="left", vertical="center"), font_regular, None),
            (on_hand, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (available, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (low_stk, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
            (zero_stk, Alignment(horizontal="right", vertical="center"), font_regular, "#,##0"),
        ]

        for col_idx, (val, align, fnt, num_fmt) in enumerate(row_values, 1):
            cell = ws.cell(row_num, col_idx, val)
            cell.alignment = align
            cell.font = fnt
            cell.border = thin_border
            if num_fmt:
                cell.number_format = num_fmt

    min_widths = {
        1: 12, # ID
        2: 32, # Nama Gudang
        3: 18, # Kantor
        4: 12, # Code Area
        5: 22, # PIC
        6: 22, # DSM
        7: 18, # Telp
        8: 14, # On Hand
        9: 14, # Available
        10: 12, # Low Stock
        11: 12, # Zero Stock
    }

    for col_idx in range(1, 12):
        col_letter = get_column_letter(col_idx)
        max_len = 0
        for r_idx in range(5, 5 + len(warehouses) + 1):
            val_s = str(ws.cell(r_idx, col_idx).value or "")
            if len(val_s) > max_len:
                max_len = len(val_s)
        base_min = min_widths.get(col_idx, 12)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, base_min), 45)

    ws.freeze_panes = "A6"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    now_tag = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Multi_Warehouse_CPA_{now_tag}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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
