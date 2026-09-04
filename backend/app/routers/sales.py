"""
Router — Sales Monitoring
SO pipeline, invoice, trend, per salesman/customer
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date, timedelta

from app.database import get_analytics_db, get_existing_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/summary")
async def get_sales_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    id_gudang: Optional[str] = None,
    id_salesman: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    db_existing: Session = Depends(get_existing_db),
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

    # Piutang Outstanding actual from ERP acc_ar_faktur
    try:
        ar_row = db_existing.execute(text("""
            SELECT 
                COALESCE(SUM(total - COALESCE(bayar, 0)), 0) AS total_outstanding,
                COUNT(*) AS total_ar_invoices,
                COALESCE(AVG(top), 0) AS avg_top
            FROM acc_ar_faktur
            WHERE (total - COALESCE(bayar, 0)) > 0
        """)).mappings().first()
        piutang_outstanding = float(ar_row["total_outstanding"]) if ar_row else 0.0
        avg_top = float(ar_row["avg_top"]) if ar_row else 0.0
        total_ar_invoices = int(ar_row["total_ar_invoices"]) if ar_row else 0
    except Exception:
        piutang_outstanding = float(inv["total_piutang"]) if inv and inv["total_piutang"] else 0.0
        avg_top = 0.0
        total_ar_invoices = 0

    inv_dict = dict(inv) if inv else {}
    omzet = float(inv_dict.get("total_omzet") or 0)
    total_inv = int(inv_dict.get("total_invoice") or 0)

    return {
        "period": {"from": str(date_from), "to": str(date_to)},
        "total_so": so_count or 0,
        "total_so_pending": so_count or 0,
        "total_omzet": omzet,
        "omzet_bulan_ini": omzet,
        "total_invoice": total_inv,
        "total_invoice_bulan_ini": total_inv,
        "total_piutang": piutang_outstanding,
        "piutang_outstanding": piutang_outstanding,
        "avg_top": avg_top,
        "total_ar_invoices": total_ar_invoices,
        **inv_dict,
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


@router.get("/ar-outstanding")
async def get_ar_outstanding(
    search: Optional[str] = None,
    top: Optional[int] = None,
    aging: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_by: str = Query("outstanding_amount", description="outstanding_amount|total_amount|invoice_date|due_date|top_days|customer_name"),
    sort_order: str = Query("desc", description="asc|desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Rincian data AR (Accounts Receivable) sebagai Piutang Outstanding
    lengkap dengan Time of Payment (TOP), jatuh tempo, dan aging.
    """
    import math

    conditions = ["(a.total - COALESCE(a.bayar, 0)) > 0"]
    params = {}

    if search:
        conditions.append("(a.ar_number ILIKE :search OR a.no_invoice ILIKE :search OR c.customer ILIKE :search OR a.customer_code ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    if top is not None:
        conditions.append("COALESCE(a.top, 0) = :top")
        params["top"] = top

    if date_from:
        conditions.append("a.invoice_date >= :date_from")
        params["date_from"] = date_from

    if date_to:
        conditions.append("a.invoice_date <= :date_to")
        params["date_to"] = date_to

    if aging:
        aging_clean = aging.lower().strip()
        if aging_clean == "lancar":
            conditions.append("a.due_date >= CURRENT_DATE")
        elif aging_clean == "overdue":
            conditions.append("a.due_date < CURRENT_DATE")
        elif aging_clean == "1-30":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 1 AND 30")
        elif aging_clean == "31-60":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 31 AND 60")
        elif aging_clean == "61-90":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 61 AND 90")
        elif aging_clean in [">90", "90+"]:
            conditions.append("(CURRENT_DATE - a.due_date) > 90")

    where_clause = " AND ".join(conditions)

    # Sort mapping
    sort_map = {
        "outstanding_amount": "(a.total - COALESCE(a.bayar, 0))",
        "total_amount": "a.total",
        "invoice_date": "a.invoice_date",
        "due_date": "a.due_date",
        "top_days": "COALESCE(a.top, 0)",
        "customer_name": "COALESCE(c.customer, a.customer_code)",
    }
    order_col = sort_map.get(sort_by, "(a.total - COALESCE(a.bayar, 0))")
    direction = "ASC" if sort_order.lower() == "asc" else "DESC"

    # 1. Total count & Summary stats for current filter
    summary_q = text(f"""
        SELECT 
            COUNT(*) AS total_items,
            COALESCE(SUM(a.total), 0) AS total_ar,
            COALESCE(SUM(a.bayar), 0) AS total_paid,
            COALESCE(SUM(a.total - COALESCE(a.bayar, 0)), 0) AS total_outstanding,
            COALESCE(AVG(a.top), 0) AS avg_top
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        WHERE {where_clause}
    """)
    summary_row = db.execute(summary_q, params).mappings().first()

    total_items = summary_row["total_items"] if summary_row else 0
    total_ar = float(summary_row["total_ar"]) if summary_row else 0.0
    total_paid = float(summary_row["total_paid"]) if summary_row else 0.0
    total_outstanding = float(summary_row["total_outstanding"]) if summary_row else 0.0
    avg_top = round(float(summary_row["avg_top"]), 1) if summary_row else 0.0

    # 2. TOP Buckets summary
    top_b_q = text(f"""
        SELECT 
            COALESCE(a.top, 0) AS top_days,
            COUNT(*) AS count,
            COALESCE(SUM(a.total - COALESCE(a.bayar, 0)), 0) AS total_outstanding
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        WHERE {where_clause}
        GROUP BY COALESCE(a.top, 0)
        ORDER BY count DESC
        LIMIT 8
    """)
    top_buckets = [
        {
            "top_days": int(r["top_days"]),
            "count": int(r["count"]),
            "total_outstanding": float(r["total_outstanding"]),
            "label": f"{int(r['top_days'])} Hari" if int(r['top_days']) > 0 else "Cash / COD (0 Hari)",
        }
        for r in db.execute(top_b_q, params).mappings().all()
    ]

    # 3. Paged item list
    offset = (page - 1) * limit
    list_params = {**params, "limit": limit, "offset": offset}
    list_q = text(f"""
        SELECT 
            a.ar_number,
            COALESCE(a.no_invoice, a.ar_number) AS no_invoice,
            a.customer_code,
            COALESCE(c.customer, 'Customer ' || a.customer_code) AS customer_name,
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
        WHERE {where_clause}
        ORDER BY {order_col} {direction}, a.invoice_date DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(list_q, list_params).mappings().all()

    items = []
    for r in rows:
        d_overdue = int(r["days_overdue"]) if r["days_overdue"] is not None else 0
        if d_overdue <= 0:
            status_text = "Lancar"
        else:
            status_text = f"Overdue {d_overdue} hari"

        items.append({
            "ar_number": r["ar_number"],
            "no_invoice": r["no_invoice"],
            "customer_code": r["customer_code"],
            "customer_name": r["customer_name"],
            "invoice_date": str(r["invoice_date"]) if r["invoice_date"] else None,
            "due_date": str(r["due_date"]) if r["due_date"] else None,
            "top_days": int(r["top_days"]),
            "total_amount": float(r["total_amount"] or 0),
            "paid_amount": float(r["paid_amount"] or 0),
            "outstanding_amount": float(r["outstanding_amount"] or 0),
            "days_overdue": d_overdue,
            "status_text": status_text,
        })

    total_pages = math.ceil(total_items / limit) if limit > 0 else 1

    return {
        "summary": {
            "total_outstanding": total_outstanding,
            "total_ar": total_ar,
            "total_paid": total_paid,
            "total_invoices": total_items,
            "avg_top": avg_top,
            "top_buckets": top_buckets,
        },
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        },
        "items": items,
    }


@router.get("/export-ar-excel")
async def export_ar_excel(
    search: Optional[str] = None,
    top: Optional[int] = None,
    aging: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Ekspor seluruh rincian Piutang Outstanding (AR) & TOP ke format Excel (.xlsx)."""
    import io
    import pandas as pd
    from datetime import datetime as dt_datetime
    from fastapi.responses import StreamingResponse

    conditions = ["(a.total - COALESCE(a.bayar, 0)) > 0"]
    params = {}

    if search:
        conditions.append("(a.ar_number ILIKE :search OR a.no_invoice ILIKE :search OR c.customer ILIKE :search OR a.customer_code ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    if top is not None:
        conditions.append("COALESCE(a.top, 0) = :top")
        params["top"] = top

    if date_from:
        conditions.append("a.invoice_date >= :date_from")
        params["date_from"] = date_from

    if date_to:
        conditions.append("a.invoice_date <= :date_to")
        params["date_to"] = date_to

    if aging:
        aging_clean = aging.lower().strip()
        if aging_clean == "lancar":
            conditions.append("a.due_date >= CURRENT_DATE")
        elif aging_clean == "overdue":
            conditions.append("a.due_date < CURRENT_DATE")
        elif aging_clean == "1-30":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 1 AND 30")
        elif aging_clean == "31-60":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 31 AND 60")
        elif aging_clean == "61-90":
            conditions.append("(CURRENT_DATE - a.due_date) BETWEEN 61 AND 90")
        elif aging_clean in [">90", "90+"]:
            conditions.append("(CURRENT_DATE - a.due_date) > 90")

    where_clause = " AND ".join(conditions)

    q = text(f"""
        SELECT 
            a.ar_number,
            COALESCE(a.no_invoice, a.ar_number) AS no_invoice,
            a.customer_code,
            COALESCE(c.customer, 'Customer ' || a.customer_code) AS customer_name,
            a.invoice_date,
            a.due_date,
            COALESCE(a.top, 0) AS top_days,
            a.total AS total_amount,
            COALESCE(a.bayar, 0) AS paid_amount,
            (a.total - COALESCE(a.bayar, 0)) AS outstanding_amount,
            (CURRENT_DATE - a.due_date) AS days_overdue
        FROM acc_ar_faktur a
        LEFT JOIN customer c ON c.id_kontak = a.customer_code
        WHERE {where_clause}
        ORDER BY (a.total - COALESCE(a.bayar, 0)) DESC, a.invoice_date DESC
    """)
    rows = db.execute(q, params).mappings().all()

    excel_data = []
    for idx, r in enumerate(rows, 1):
        d_overdue = int(r["days_overdue"]) if r["days_overdue"] is not None else 0
        top_val = int(r["top_days"])
        top_str = f"{top_val} Hari" if top_val > 0 else "Cash / COD"
        status_str = "Lancar" if d_overdue <= 0 else f"Overdue ({d_overdue} hari)"

        excel_data.append({
            "No": idx,
            "No. AR": r["ar_number"],
            "No. Invoice": r["no_invoice"],
            "Kode Customer": r["customer_code"],
            "Nama Customer": r["customer_name"],
            "Tgl. Faktur": str(r["invoice_date"]) if r["invoice_date"] else "-",
            "TOP (Time of Payment)": top_str,
            "Tgl. Jatuh Tempo": str(r["due_date"]) if r["due_date"] else "-",
            "Total Nilai AR": float(r["total_amount"] or 0),
            "Sudah Dibayar": float(r["paid_amount"] or 0),
            "Piutang Outstanding": float(r["outstanding_amount"] or 0),
            "Status Aging": status_str,
        })

    df = pd.DataFrame(excel_data)
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Piutang Outstanding AR", index=False, startrow=3)
        worksheet = writer.sheets["Piutang Outstanding AR"]

        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        # Title block
        worksheet["A1"] = "LAPORAN PIUTANG OUTSTANDING (ACCOUNTS RECEIVABLE) & TIME OF PAYMENT (TOP)"
        worksheet["A1"].font = Font(size=14, bold=True, color="1E3A8A")
        worksheet["A2"] = f"Total Data: {len(excel_data)} Faktur | Diekspor pada: {dt_datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        worksheet["A2"].font = Font(size=10, italic=True, color="64748B")

        # Table Header Styling
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=11)
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_idx in range(1, len(df.columns) + 1):
            cell = worksheet.cell(row=4, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_align

        # Data formatting
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        top_highlight = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

        for row_idx in range(5, len(excel_data) + 5):
            is_even = (row_idx % 2 == 0)
            for col_idx in range(1, len(df.columns) + 1):
                c = worksheet.cell(row=row_idx, column=col_idx)
                c.border = thin_border
                
                # Column 7 is TOP
                if col_idx == 7:
                    c.fill = top_highlight
                    c.alignment = Alignment(horizontal="center", vertical="center")
                    c.font = Font(bold=True, color="B45309")
                elif is_even:
                    c.fill = zebra_fill

                # Currency columns (9: Total, 10: Bayar, 11: Outstanding)
                if col_idx in [9, 10, 11]:
                    c.number_format = '"Rp" #,##0'
                    c.alignment = Alignment(horizontal="right", vertical="center")
                    if col_idx == 11:
                        c.font = Font(bold=True, color="991B1B")

                if col_idx in [1, 6, 8]:
                    c.alignment = Alignment(horizontal="center", vertical="center")

        # Auto-adjust column widths
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output.seek(0)
    filename = f"Piutang_Outstanding_AR_{dt_datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

