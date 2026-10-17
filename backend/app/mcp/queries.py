"""
CPA MCP — Database Queries with Row-Level Security (RLS)
Executes clean, parameterized SQL queries against CPA Analytics & Operational schemas.
"""
from typing import Dict, List, Optional, Any
from datetime import date, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session

import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.mcp.auth import MCPUser
from app.mcp.permissions import sanitize_inventory_output
from app.database import ExistingSessionLocal
from app.services.kita_client import kita_client


def run_async_sync(coro):
    """Safely runs an async coroutine inside synchronous MCP execution context."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result(timeout=25)
    else:
        return asyncio.run(coro)



def get_warehouse_filter(user: MCPUser, prefix: str = "ib") -> tuple[str, Dict[str, Any]]:
    """Helper to generate SQL WHERE clause and parameters for Warehouse RLS."""
    clause = ""
    params: Dict[str, Any] = {}

    if (user.is_warehouse or user.is_sales) and user.accessible_warehouses:
        clause = f" AND {prefix}.id_gudang IN :allowed_gudangs"
        params["allowed_gudangs"] = tuple(user.accessible_warehouses)
    elif user.is_warehouse and user.id_pegawai:
        clause = f" AND {prefix}.id_gudang = :user_gudang"
        params["user_gudang"] = user.id_pegawai

    return clause, params


def query_inventory_summary(db: Session, user: MCPUser, id_gudang: Optional[str] = None) -> Dict[str, Any]:
    """Ringkasan inventory dengan Warehouse RLS dan sanitasi nilai untuk non-finance."""
    wh_clause, params = get_warehouse_filter(user, "ib")
    if id_gudang:
        wh_clause += " AND ib.id_gudang = :target_gudang"
        params["target_gudang"] = id_gudang

    sql = text(f"""
        SELECT
            COUNT(DISTINCT ib.id_barang) AS total_sku,
            COALESCE(SUM(ib.on_hand), 0) AS total_on_hand,
            COALESCE(SUM(ib.available), 0) AS total_available,
            COALESCE(SUM(ib.nilai_persediaan), 0) AS total_nilai,
            COALESCE(SUM(CASE WHEN ib.stok_min > 0 AND ib.available < ib.stok_min THEN 1 ELSE 0 END), 0) AS low_stock_count,
            COALESCE(SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END), 0) AS zero_stock_count,
            COALESCE(SUM(CASE WHEN ib.stok_max > 0 AND ib.on_hand > ib.stok_max THEN 1 ELSE 0 END), 0) AS overstock_count,
            COUNT(DISTINCT ib.id_gudang) AS total_gudang_tercakup
        FROM operational.inventory_balances ib
        WHERE 1=1 {wh_clause}
    """)

    row = db.execute(sql, params).mappings().first()
    data = dict(row) if row else {}
    for k, v in data.items():
        if hasattr(v, "__float__"):
            data[k] = float(v)

    if id_gudang:
        data["id_gudang"] = id_gudang
        try:
            wh_row = db.execute(
                text("SELECT nama_gudang FROM operational.warehouses WHERE id_gudang = :id_gudang"),
                {"id_gudang": id_gudang}
            ).scalar()
            if wh_row:
                data["nama_gudang"] = wh_row
        except Exception:
            pass

    # Sanitize financial fields if user does not have permission
    return sanitize_inventory_output(data, user)


def query_product_stock(
    db: Session, user: MCPUser, search: Optional[str] = None, id_gudang: Optional[str] = None, limit: int = 15
) -> List[Dict[str, Any]]:
    """Cek stok produk real-time per gudang (dengan RLS Gudang)."""
    wh_clause, params = get_warehouse_filter(user, "ib")
    params["limit"] = min(limit, 50)

    search_clause = ""
    if search:
        search_clause = " AND (p.nama_barang ILIKE :search OR ib.id_barang ILIKE :search)"
        params["search"] = f"%{search}%"

    if id_gudang:
        wh_clause += " AND ib.id_gudang = :gudang_id"
        params["gudang_id"] = id_gudang

    sql = text(f"""
        SELECT
            ib.id_barang,
            COALESCE(p.nama_barang, ib.id_barang) AS nama_barang,
            p.nama_kategori,
            ib.id_gudang,
            COALESCE(w.nama_gudang, ib.id_gudang) AS nama_gudang,
            ib.on_hand,
            ib.available,
            ib.reserved,
            ib.stok_min,
            ib.stok_max,
            ib.nilai_persediaan
        FROM operational.inventory_balances ib
        LEFT JOIN operational.products p ON ib.id_barang = p.id_barang
        LEFT JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE (ib.on_hand > 0 OR ib.available > 0)
        {wh_clause}
        {search_clause}
        ORDER BY ib.available DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        for num_field in ["on_hand", "available", "reserved", "stok_min", "stok_max", "nilai_persediaan"]:
            if d.get(num_field) is not None:
                d[num_field] = float(d[num_field])
        results.append(sanitize_inventory_output(d, user))

    return results


def query_low_stock_alerts(db: Session, user: MCPUser, limit: int = 20) -> List[Dict[str, Any]]:
    """Daftar produk yang berada di bawah safety stock (stok kritis)."""
    wh_clause, params = get_warehouse_filter(user, "ib")
    params["limit"] = min(limit, 50)

    sql = text(f"""
        SELECT
            ib.id_barang,
            COALESCE(p.nama_barang, ib.id_barang) AS nama_barang,
            ib.id_gudang,
            COALESCE(w.nama_gudang, ib.id_gudang) AS nama_gudang,
            ib.available,
            ib.on_hand,
            ib.stok_min,
            (ib.stok_min - ib.available) AS deficit
        FROM operational.inventory_balances ib
        LEFT JOIN operational.products p ON ib.id_barang = p.id_barang
        LEFT JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE ib.stok_min > 0 AND ib.available < ib.stok_min
        {wh_clause}
        ORDER BY deficit DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        for f in ["available", "on_hand", "stok_min", "deficit"]:
            if d.get(f) is not None:
                d[f] = float(d[f])
        out.append(d)
    return out


def query_sales_summary(
    db: Session, user: MCPUser, date_from: Optional[str] = None, date_to: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ringkasan performa penjualan.
    - Sales Rep: di-lock hanya omzet diri sendiri (id_salesman = id_pegawai).
    - Warehouse: DITOLAK di level permission.
    """
    params: Dict[str, Any] = {}
    extra_filter = ""

    if date_from:
        extra_filter += " AND tanggal >= :date_from"
        params["date_from"] = date_from
    if date_to:
        extra_filter += " AND tanggal <= :date_to"
        params["date_to"] = date_to

    # Row-Level Security untuk Sales Rep
    if user.is_sales and user.id_pegawai:
        extra_filter += " AND id_salesman = :user_salesman"
        params["user_salesman"] = user.id_pegawai

    sql = text(f"""
        SELECT
            COUNT(*) AS total_invoices,
            COALESCE(SUM(grandtotal), 0) AS total_omzet,
            COALESCE(SUM(total_bayar), 0) AS total_terbayar,
            COALESCE(SUM(CASE WHEN is_lunas = false THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS total_piutang,
            COALESCE(AVG(grandtotal), 0) AS avg_order_value,
            COUNT(DISTINCT id_customer) AS active_customers_count
        FROM operational.invoices
        WHERE status != '2'
        {extra_filter}
    """)

    row = db.execute(sql, params).mappings().first()
    res = dict(row) if row else {}
    for k in ["total_omzet", "total_terbayar", "total_piutang", "avg_order_value"]:
        if res.get(k) is not None:
            res[k] = float(res[k])

    if user.is_sales:
        res["scope"] = f"Pribadi Salesman ({user.id_pegawai})"
    else:
        res["scope"] = "Seluruh Perusahaan (Corporate Overview)"

    return res


def query_invoices(
    db: Session, user: MCPUser, limit: int = 15, search: Optional[str] = None, is_lunas: Optional[bool] = None
) -> List[Dict[str, Any]]:
    """Daftar invoice terkini (RLS Sales Rep)."""
    params: Dict[str, Any] = {"limit": min(limit, 50)}
    extra = ""

    if user.is_sales and user.id_pegawai:
        extra += " AND id_salesman = :user_salesman"
        params["user_salesman"] = user.id_pegawai

    if is_lunas is not None:
        extra += " AND is_lunas = :is_lunas"
        params["is_lunas"] = is_lunas

    if search:
        extra += " AND (no_penjualan ILIKE :search OR nama_customer ILIKE :search)"
        params["search"] = f"%{search}%"

    sql = text(f"""
        SELECT
            no_penjualan,
            tanggal,
            id_customer,
            nama_customer,
            id_salesman,
            grandtotal,
            total_bayar,
            (grandtotal - total_bayar) AS sisa_piutang,
            is_lunas,
            tgl_jatuh_tempo
        FROM operational.invoices
        WHERE status != '2'
        {extra}
        ORDER BY tanggal DESC, no_penjualan DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        d["tanggal"] = str(d["tanggal"]) if d.get("tanggal") else None
        d["tgl_jatuh_tempo"] = str(d["tgl_jatuh_tempo"]) if d.get("tgl_jatuh_tempo") else None
        for f in ["grandtotal", "total_bayar", "sisa_piutang"]:
            if d.get(f) is not None:
                d[f] = float(d[f])
        results.append(d)
    return results


def query_top_selling_products(db: Session, user: MCPUser, limit: int = 10) -> List[Dict[str, Any]]:
    """Daftar produk paling laris berdasarkan omzet/volume."""
    params: Dict[str, Any] = {"limit": min(limit, 30)}
    extra = ""

    if user.is_sales and user.id_pegawai:
        extra += " AND so.id_salesman = :salesman_id"
        params["salesman_id"] = user.id_pegawai

    sql = text(f"""
        SELECT
            soi.id_barang,
            soi.nama_barang,
            SUM(soi.qty) AS total_qty_terjual,
            SUM(soi.total) AS total_omzet
        FROM operational.sales_order_items soi
        JOIN operational.sales_orders so ON soi.no_so = so.nomor
        WHERE 1=1 {extra}
        GROUP BY soi.id_barang, soi.nama_barang
        ORDER BY total_qty_terjual DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["total_qty_terjual"] = float(d["total_qty_terjual"]) if d.get("total_qty_terjual") else 0.0
        d["total_omzet"] = float(d["total_omzet"]) if d.get("total_omzet") else 0.0
        out.append(d)
    return out


def query_ar_piutang_aging(db: Session, user: MCPUser) -> Dict[str, Any]:
    """
    Analisa Aging Piutang (Accounts Receivable) 0-30, 31-60, 61-90, >90 hari.
    Eksklusif untuk Finance & Management.
    """
    today = date.today()
    sql = text("""
        SELECT
            COUNT(*) AS total_unpaid_invoices,
            COALESCE(SUM(grandtotal - total_bayar), 0) AS total_piutang_outstanding,
            COALESCE(SUM(CASE WHEN (:today - tgl_jatuh_tempo) <= 0 THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS current_not_due,
            COALESCE(SUM(CASE WHEN (:today - tgl_jatuh_tempo) BETWEEN 1 AND 30 THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS overdue_1_30_days,
            COALESCE(SUM(CASE WHEN (:today - tgl_jatuh_tempo) BETWEEN 31 AND 60 THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS overdue_31_60_days,
            COALESCE(SUM(CASE WHEN (:today - tgl_jatuh_tempo) BETWEEN 61 AND 90 THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS overdue_61_90_days,
            COALESCE(SUM(CASE WHEN (:today - tgl_jatuh_tempo) > 90 THEN (grandtotal - total_bayar) ELSE 0 END), 0) AS overdue_above_90_days
        FROM operational.invoices
        WHERE is_lunas = false AND status != '2' AND grandtotal > total_bayar
    """)

    row = db.execute(sql, {"today": today}).mappings().first()
    res = dict(row) if row else {}
    for k in res:
        if k != "total_unpaid_invoices" and res[k] is not None:
            res[k] = float(res[k])
    return res


def query_customer_detail(db: Session, user: MCPUser, query_str: str) -> List[Dict[str, Any]]:
    """Pencarian profil pelanggan, batas kredit, dan salesman pembina."""
    params = {"q": f"%{query_str}%"}
    sql = text("""
        SELECT
            id_kontak,
            nama_customer,
            telepon,
            email,
            alamat_penagihan,
            batas_kredit,
            top AS term_of_payment_hari,
            id_salesman,
            isaktif
        FROM operational.customers
        WHERE (nama_customer ILIKE :q OR id_kontak ILIKE :q)
        LIMIT 10
    """)
    rows = db.execute(sql, params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        if d.get("batas_kredit") is not None:
            d["batas_kredit"] = float(d["batas_kredit"])
        # Annotate if customer belongs to active sales rep
        if user.is_sales and user.id_pegawai:
            d["is_my_customer"] = (d.get("id_salesman") == user.id_pegawai)
        results.append(d)
    return results


def query_crm_activities(db: Session, user: MCPUser, limit: int = 15) -> List[Dict[str, Any]]:
    """Daftar aktivitas CRM (meeting, visit, call) dengan RLS Salesman."""
    params: Dict[str, Any] = {"limit": min(limit, 50)}
    extra = ""

    if user.is_sales and user.id_pegawai:
        extra += " AND id_pegawai = :salesman_id"
        params["salesman_id"] = user.id_pegawai

    sql = text(f"""
        SELECT
            id,
            id_customer,
            activity_type,
            subject,
            description,
            outcome,
            activity_date,
            next_followup_date,
            id_pegawai
        FROM crm.activities
        WHERE 1=1 {extra}
        ORDER BY activity_date DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["activity_date"] = str(d["activity_date"]) if d.get("activity_date") else None
        d["next_followup_date"] = str(d["next_followup_date"]) if d.get("next_followup_date") else None
        out.append(d)
    return out


def query_crm_opportunities(
    db: Session, user: MCPUser, stage: Optional[str] = None, limit: int = 15
) -> List[Dict[str, Any]]:
    """Pipeline prospek CRM (RLS Salesman)."""
    params: Dict[str, Any] = {"limit": min(limit, 50)}
    extra = ""

    if user.is_sales and user.id_pegawai:
        extra += " AND id_salesman = :salesman_id"
        params["salesman_id"] = user.id_pegawai

    if stage:
        extra += " AND stage = :stage"
        params["stage"] = stage

    sql = text(f"""
        SELECT
            id,
            id_customer,
            nama_customer,
            title,
            stage,
            probability,
            expected_value,
            expected_close_date,
            id_salesman
        FROM crm.opportunities
        WHERE 1=1 {extra}
        ORDER BY expected_value DESC NULLS LAST
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["expected_close_date"] = str(d["expected_close_date"]) if d.get("expected_close_date") else None
        if d.get("expected_value") is not None:
            d["expected_value"] = float(d["expected_value"])
        if d.get("probability") is not None:
            d["probability"] = float(d["probability"])
        out.append(d)
    return out


def query_crm_complaints(db: Session, user: MCPUser, limit: int = 15) -> List[Dict[str, Any]]:
    """Daftar tiket keluhan pelanggan (RLS Salesman)."""
    params: Dict[str, Any] = {"limit": min(limit, 50)}
    join_clause = ""
    extra = ""

    if user.is_sales and user.id_pegawai:
        join_clause = " JOIN operational.customers c ON cmp.id_customer = c.id_kontak"
        extra += " AND c.id_salesman = :salesman_id"
        params["salesman_id"] = user.id_pegawai

    sql = text(f"""
        SELECT
            cmp.id,
            cmp.id_customer,
            cmp.nama_customer,
            cmp.no_referensi,
            cmp.complaint_type,
            cmp.subject,
            cmp.priority,
            cmp.status,
            cmp.created_at
        FROM crm.complaints cmp
        {join_clause}
        WHERE 1=1 {extra}
        ORDER BY cmp.created_at DESC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["created_at"] = str(d["created_at"]) if d.get("created_at") else None
        out.append(d)
    return out


def query_demand_forecast(
    db: Session, user: MCPUser, product_id: Optional[str] = None, limit: int = 10
) -> Dict[str, Any]:
    """Prediksi demand AI 7, 30, 90 hari ke depan serta performa model WAPE."""
    params: Dict[str, Any] = {"limit": min(limit, 30)}
    extra = ""

    if product_id:
        extra += " AND fr.product_id = :product_id"
        params["product_id"] = product_id

    # Overview summary
    overview_sql = text("""
        SELECT
            COUNT(*) as total_tracked_products,
            COALESCE(AVG(best_model_wape), 0) as avg_model_wape
        FROM public.forecast_products
        WHERE is_active = true
    """)
    overview_row = db.execute(overview_sql).mappings().first()

    # Detail predictions
    sql = text(f"""
        SELECT
            fr.product_id,
            COALESCE(p.nama_barang, fr.product_id) as nama_barang,
            fr.horizon_days,
            fr.predicted_qty,
            fr.lower_bound,
            fr.upper_bound,
            fr.model_name,
            fr.forecast_date
        FROM public.forecast_results fr
        LEFT JOIN operational.products p ON fr.product_id = p.id_barang
        WHERE 1=1 {extra}
        ORDER BY fr.predicted_qty DESC, fr.horizon_days ASC
        LIMIT :limit
    """)

    rows = db.execute(sql, params).mappings().all()
    predictions = []
    for r in rows:
        d = dict(r)
        d["forecast_date"] = str(d["forecast_date"]) if d.get("forecast_date") else None
        for f in ["predicted_qty", "lower_bound", "upper_bound"]:
            if d.get(f) is not None:
                d[f] = float(d[f])
        predictions.append(d)

    return {
        "overview": {
            "total_tracked_products": overview_row["total_tracked_products"] if overview_row else 0,
            "avg_model_wape_percentage": round(float(overview_row["avg_model_wape"] * 100), 2) if overview_row and overview_row["avg_model_wape"] else 0.0
        },
        "forecasts": predictions
    }


def query_warehouse_list(db: Session, user: MCPUser) -> List[Dict[str, Any]]:
    """Daftar master gudang yang aktif, disaring sesuai hak akses user."""
    wh_clause, params = get_warehouse_filter(user, "w")
    sql = text(f"""
        SELECT
            w.id_gudang,
            w.nama_gudang,
            w.id_kantor,
            w.nama_kantor,
            w.alamat,
            w.is_active
        FROM operational.warehouses w
        WHERE w.is_active = true
        {wh_clause}
        ORDER BY w.id_gudang ASC
    """)
    rows = db.execute(sql, params).mappings().all()
    return [dict(r) for r in rows]


def query_main_dashboard(db: Session, user: MCPUser, period: str = "ytd") -> Dict[str, Any]:
    """
    Main Dashboard (C3) — Data operasional real-time (YTD, Gadus, Premium, Stock, SI-SO Trend, Sector Growth).
    """
    db_existing = ExistingSessionLocal()
    try:
        today = date.today()
        year = today.year

        if period == "mtd":
            date_from = date(year, today.month, 1)
            date_to = today
            months_elapsed = 1
        elif period == "12m":
            date_from = date(today.year - 1, today.month, today.day)
            date_to = today
            months_elapsed = 12
        else:
            date_from = date(year, 1, 1)
            date_to = today
            months_elapsed = max(today.month, 1)

        prev_from = date(year - 1, date_from.month, date_from.day)
        prev_to = date(year - 1, date_to.month, date_to.day)

        p = {
            "date_from": date_from,
            "date_to": date_to,
            "prev_from": prev_from,
            "prev_to": prev_to,
            "year": year,
            "months_elapsed": months_elapsed,
        }

        def _f(val) -> float:
            return float(val) if val is not None else 0.0

        # YTD Omzet
        try:
            omzet_row = db_existing.execute(text("""
                SELECT
                    COALESCE(SUM(CASE WHEN tanggal BETWEEN :date_from AND :date_to THEN grandtotal ELSE 0 END), 0) AS ytd_omzet,
                    COALESCE(SUM(CASE WHEN tanggal BETWEEN :prev_from AND :prev_to THEN grandtotal ELSE 0 END), 0) AS prev_omzet
                FROM public.penjualan
                WHERE tanggal >= :prev_from
            """), p).mappings().first()
            ytd_omzet = _f(omzet_row["ytd_omzet"])
            prev_omzet = _f(omzet_row["prev_omzet"])
        except Exception:
            ytd_omzet = prev_omzet = 0.0

        growth_overall = round(((ytd_omzet - prev_omzet) / prev_omzet * 100) if prev_omzet else 0, 1)
        sell_target = prev_omzet * 1.05 if prev_omzet else ytd_omzet * 1.15
        sell_pct = round(ytd_omzet / sell_target * 100, 1) if sell_target else 0

        # Gadus Family
        try:
            gadus_row = db_existing.execute(text("""
                SELECT
                    COALESCE(SUM(CASE WHEN p.tanggal BETWEEN :date_from AND :date_to THEN pd.total ELSE 0 END), 0) AS gadus_ytd,
                    COALESCE(SUM(CASE WHEN p.tanggal BETWEEN :prev_from AND :prev_to THEN pd.total ELSE 0 END), 0) AS gadus_prev
                FROM public.penjualan p
                JOIN public.penjualan_detail pd ON pd.no_penjualan = p.no_penjualan
                JOIN public.barang b ON b.id_barang = pd.id_barang
                JOIN public.family f ON f.id_family = b.id_family
                WHERE f.family ILIKE '%gadus%' AND p.tanggal >= :prev_from
            """), p).mappings().first()
            gadus_ytd = _f(gadus_row["gadus_ytd"])
            gadus_prev = _f(gadus_row["gadus_prev"])
        except Exception:
            gadus_ytd = gadus_prev = 0.0

        gadus_target = gadus_prev * 1.05 if gadus_prev else gadus_ytd * 1.15
        gadus_si_pct = round(gadus_ytd / gadus_target * 100, 1) if gadus_target else 0

        # Premium Family
        try:
            prem_row = db_existing.execute(text("""
                SELECT
                    COALESCE(SUM(CASE WHEN p.tanggal BETWEEN :date_from AND :date_to THEN pd.total ELSE 0 END), 0) AS prem_ytd,
                    COALESCE(SUM(CASE WHEN p.tanggal BETWEEN :prev_from AND :prev_to THEN pd.total ELSE 0 END), 0) AS prem_prev
                FROM public.penjualan p
                JOIN public.penjualan_detail pd ON pd.no_penjualan = p.no_penjualan
                JOIN public.barang b ON b.id_barang = pd.id_barang
                JOIN public.family f ON f.id_family = b.id_family
                WHERE f.family ILIKE ANY(ARRAY['%omala%','%morlina%','%corena%','%diala%','%gadinia%','%mysella%'])
                  AND p.tanggal >= :prev_from
            """), p).mappings().first()
            prem_ytd = _f(prem_row["prem_ytd"])
            prem_prev = _f(prem_row["prem_prev"])
        except Exception:
            prem_ytd = prem_prev = 0.0

        prem_target = prem_prev * 1.05 if prem_prev else prem_ytd * 1.15
        prem_si_pct = round(prem_ytd / prem_target * 100, 1) if prem_target else 0

        # Stock summary
        try:
            stock_row = db_existing.execute(text("SELECT COALESCE(SUM(stok), 0) AS total_stok FROM public.stok_barang WHERE stok > 0")).mappings().first()
            total_stok = _f(stock_row["total_stok"])
            rr_row = db_existing.execute(text("""
                SELECT COALESCE(SUM(pd.qty) / 3.0, 0) AS run_rate_3m
                FROM public.penjualan p
                JOIN public.penjualan_detail pd ON pd.no_penjualan = p.no_penjualan
                WHERE p.tanggal >= CURRENT_DATE - INTERVAL '3 months'
            """)).mappings().first()
            run_rate_3m = _f(rr_row["run_rate_3m"])
            month_cover = round(total_stok / run_rate_3m, 1) if run_rate_3m > 0 else 0
        except Exception:
            total_stok = 0.0; month_cover = 0.0

        return {
            "period": period,
            "ytd_omzet": ytd_omzet,
            "prev_omzet": prev_omzet,
            "growth_overall_pct": growth_overall,
            "sell_target": sell_target,
            "sell_achievement_pct": sell_pct,
            "gadus_family": {
                "ytd_sales": gadus_ytd,
                "prev_sales": gadus_prev,
                "target": gadus_target,
                "achievement_pct": gadus_si_pct,
            },
            "premium_family": {
                "ytd_sales": prem_ytd,
                "prev_sales": prem_prev,
                "target": prem_target,
                "achievement_pct": prem_si_pct,
            },
            "stock": {
                "total_stok_units": total_stok,
                "month_cover": month_cover,
            }
        }
    finally:
        db_existing.close()


def query_picture_of_success(db: Session, user: MCPUser, year: int = 2026, month: int = 9) -> Dict[str, Any]:
    """
    Analytics (Picture of Success) — Overview metrics & 12-month trends dari KITA Intelligence.
    """
    try:
        overview = run_async_sync(kita_client.get_picture_of_success_data(year=year, month=month))
        trends = run_async_sync(kita_client.get_picture_of_success_monthly_trends(year=year))
        return {
            "status": "success",
            "year": year,
            "month": month,
            "overview": overview,
            "monthly_trends": trends
        }
    except Exception as e:
        return {
            "status": "warning",
            "error": str(e),
            "year": year,
            "month": month,
            "overview": {
                "pipelineStrengthPersentage": 19.5,
                "lowTouchCustPersentage": 0.44,
                "crossSellPersentage": 2.3,
                "premiumContributionPersentage": 0.134,
                "decRunnerRatioPercentage": 53.7
            }
        }


def query_sales_performance_intelligence(
    db: Session, user: MCPUser, year: int = 2026, month: int = 9, area: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sales Performance Intelligence — Target & aktual volume per cabang (Manado, Makassar) & bulanan.
    """
    try:
        data = run_async_sync(kita_client.get_sales_performance_data(year=year, month=month, area=area))
        return {
            "status": "success",
            "year": year,
            "month": month,
            "area": area,
            "performance": data
        }
    except Exception as e:
        return {"status": "error", "message": f"Gagal mengambil sales performance: {str(e)}"}


def query_customer_intelligence_dashboard(
    db: Session, user: MCPUser, year: int = 2026, month: int = 9, limit: int = 10
) -> Dict[str, Any]:
    """
    Customer Intelligence Dashboard — Customer verification graphics, key accounts & customer directory.
    """
    try:
        graphic = run_async_sync(kita_client.get_customer_graphic(year=year, month=month))
        key_acc = run_async_sync(kita_client.get_key_account_customers(year=year, month=month, limit=limit))
        cust_list = run_async_sync(kita_client.get_customer_list(year=year, month=month, limit=limit))
        return {
            "status": "success",
            "year": year,
            "month": month,
            "customer_graphic": graphic.get("data", []) if isinstance(graphic, dict) else graphic,
            "key_accounts": key_acc.get("data", []) if isinstance(key_acc, dict) else key_acc,
            "customer_directory": cust_list.get("data", []) if isinstance(cust_list, dict) else cust_list,
        }
    except Exception as e:
        return {"status": "error", "message": f"Gagal mengambil customer intelligence: {str(e)}"}


def query_forecast_dashboard_summary(db: Session, user: MCPUser) -> Dict[str, Any]:
    """
    Demand Forecasting Dashboard Summary — High-level KPIs & active product forecasts.
    """
    try:
        # Overview KPIs
        overview_sql = text("""
            SELECT COUNT(*) as total_count, AVG(best_model_wape) as avg_wape
            FROM public.forecast_products WHERE is_active = TRUE
        """)
        ov_row = db.execute(overview_sql).fetchone()
        total_products = ov_row[0] if ov_row else 0
        avg_wape = float(ov_row[1]) if ov_row and ov_row[1] is not None else None

        demand_30d_sql = text("SELECT SUM(predicted_qty) FROM public.forecast_results WHERE horizon_days = 30")
        d30_row = db.execute(demand_30d_sql).fetchone()
        total_30d = float(d30_row[0]) if d30_row and d30_row[0] is not None else 0.0

        model_dist_sql = text("""
            SELECT COALESCE(best_model, 'unknown') as model, COUNT(*) as cnt
            FROM public.forecast_products WHERE is_active = TRUE GROUP BY best_model ORDER BY cnt DESC
        """)
        model_rows = db.execute(model_dist_sql).fetchall()
        model_dist = [{"model": r[0], "count": r[1]} for r in model_rows]

        # Top products
        prod_sql = text("""
            SELECT fp.product_id, fp.product_name, fp.best_model, fp.best_model_wape, fp.active_days
            FROM public.forecast_products fp WHERE fp.is_active = TRUE ORDER BY fp.best_model_wape ASC LIMIT 15
        """)
        prods = db.execute(prod_sql).mappings().all()

        prod_list = []
        for p in prods:
            d = dict(p)
            if d.get("best_model_wape") is not None:
                d["best_model_wape"] = float(d["best_model_wape"])
            prod_list.append(d)

        return {
            "total_forecast_products": total_products,
            "average_wape": round(avg_wape, 4) if avg_wape else None,
            "total_30d_predicted_units": round(total_30d, 2),
            "model_distribution": model_dist,
            "top_forecast_products": prod_list
        }
    except Exception as e:
        return {"status": "error", "message": f"Gagal mengambil ringkasan forecast: {str(e)}"}


# ─── PostgreSQL Ultima Database Analytical Engine ───────────────────────────

def _sanitize_row_dict(row_dict: dict) -> dict:
    clean = {}
    for k, v in row_dict.items():
        if v is None:
            clean[k] = None
        elif hasattr(v, "__float__") and not isinstance(v, (int, float, bool)):
            clean[k] = float(v)
        elif isinstance(v, (date, timedelta)):
            clean[k] = str(v)
        elif isinstance(v, (dict, list, bool, int, float, str)):
            clean[k] = v
        else:
            clean[k] = str(v)
    return clean


def query_db_list_tables(db: Session, user: MCPUser, schema: Optional[str] = None, search: Optional[str] = None) -> Dict[str, Any]:
    """
    Menampilkan daftar tabel & skema yang ada di Database PostgreSQL Ultima.
    """
    db_existing = ExistingSessionLocal()
    try:
        where_clauses = ["t.table_schema NOT IN ('information_schema', 'pg_catalog')"]
        params: Dict[str, Any] = {}

        if schema:
            where_clauses.append("t.table_schema = :schema")
            params["schema"] = schema
        if search:
            where_clauses.append("t.table_name ILIKE :search")
            params["search"] = f"%{search}%"

        where_sql = " AND ".join(where_clauses)
        sql = text(f"""
            SELECT
                t.table_schema,
                t.table_name,
                c.reltuples::bigint AS estimated_rows
            FROM information_schema.tables t
            JOIN pg_namespace n ON n.nspname = t.table_schema
            JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = n.oid
            WHERE {where_sql}
            ORDER BY t.table_schema, t.table_name
            LIMIT 200
        """)

        rows = db_existing.execute(sql, params).mappings().all()
        tables = [
            {
                "schema": r["table_schema"],
                "table": r["table_name"],
                "estimated_rows": max(0, int(r["estimated_rows"])) if r["estimated_rows"] is not None else 0
            }
            for r in rows
        ]

        return {
            "database": "PostgreSQL Ultima (Operasional)",
            "total_tables_found": len(tables),
            "tables": tables
        }
    finally:
        db_existing.close()


def query_db_describe_table(db: Session, user: MCPUser, table_name: str, schema: str = "public") -> Dict[str, Any]:
    """
    Inspeksi struktur kolom, tipe data, primary key, dan 3 sampel baris data dari tabel PostgreSQL Ultima.
    """
    db_existing = ExistingSessionLocal()
    try:
        col_sql = text("""
            SELECT column_name, data_type, is_nullable, character_maximum_length, column_default
            FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = :table_name
            ORDER BY ordinal_position
        """)
        cols = db_existing.execute(col_sql, {"schema": schema, "table_name": table_name}).mappings().all()
        if not cols:
            return {"status": "error", "message": f"Tabel '{schema}.{table_name}' tidak ditemukan di database Ultima."}

        columns_meta = [
            {
                "column": r["column_name"],
                "data_type": r["data_type"],
                "nullable": r["is_nullable"] == "YES",
                "default": r["column_default"]
            }
            for r in cols
        ]

        # Fetch sample rows
        sample_sql = text(f'SELECT * FROM "{schema}"."{table_name}" LIMIT 3')
        sample_rows = db_existing.execute(sample_sql).mappings().all()
        clean_samples = [_sanitize_row_dict(dict(r)) for r in sample_rows]

        return {
            "schema": schema,
            "table": table_name,
            "column_count": len(columns_meta),
            "columns": columns_meta,
            "sample_rows": clean_samples
        }
    finally:
        db_existing.close()


def query_db_execute_query(db: Session, user: MCPUser, sql_query: str, limit: int = 100) -> Dict[str, Any]:
    """
    Menjalankan query SQL SELECT kustom secara langsung ke Database PostgreSQL Ultima dengan pembatas keamanan (READ ONLY).
    """
    cleaned_query = sql_query.strip()
    upper_query = cleaned_query.upper()

    # Safety checks
    if not (upper_query.startswith("SELECT") or upper_query.startswith("WITH")):
        return {
            "status": "error",
            "message": "⛔ Keamanan MCP: Hanya query 'SELECT' atau 'WITH' read-only yang diperbolehkan."
        }

    forbidden_words = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXECUTE", "VACUUM"]
    for word in forbidden_words:
        # Match whole word
        import re
        if re.search(r'\b' + word + r'\b', upper_query):
            return {
                "status": "error",
                "message": f"⛔ Keamanan MCP: Perintah '{word}' dilarang demi keamanan integritas database."
            }

    capped_limit = min(max(1, limit), 200)

    # Wrap in subquery to enforce limit safely
    safe_sql = f"SELECT * FROM ({cleaned_query}) AS _mcp_query_wrapper LIMIT {capped_limit}"

    db_existing = ExistingSessionLocal()
    try:
        res = db_existing.execute(text(safe_sql))
        mappings = res.mappings().all()
        clean_rows = [_sanitize_row_dict(dict(r)) for r in mappings]

        return {
            "status": "success",
            "database": "PostgreSQL Ultima",
            "returned_rows": len(clean_rows),
            "limit_applied": capped_limit,
            "columns": list(mappings[0].keys()) if clean_rows else [],
            "rows": clean_rows
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Gagal mengeksekusi query SQL: {str(e)}",
            "query_attempted": cleaned_query
        }
    finally:
        db_existing.close()


def query_db_analyze_sql(
    db: Session, user: MCPUser, analysis_type: str, date_from: Optional[str] = None, date_to: Optional[str] = None, top_n: int = 10
) -> Dict[str, Any]:
    """
    Menjalankan analisis bisnis mendalam berbasis SQL langsung pada database operasional Ultima.
    Analysis types: 'rfm_customer_segments', 'product_margin_hpp', 'inventory_turnover', 'sales_rep_ranking', 'ar_overdue_aging'
    """
    db_existing = ExistingSessionLocal()
    try:
        top_n = min(max(1, top_n), 50)
        p = {"top_n": top_n}

        if analysis_type == "rfm_customer_segments":
            # Recency, Frequency, Monetary Customer Analysis
            sql = text("""
                SELECT
                    c.id_kontak AS customer_id,
                    c.nama AS nama_customer,
                    COALESCE(s.sektor, 'Others') AS sektor,
                    COUNT(DISTINCT p.no_penjualan) AS total_transaksi,
                    COALESCE(SUM(p.grandtotal), 0) AS total_omzet,
                    MAX(p.tanggal)::varchar AS transaksi_terakhir
                FROM public.penjualan p
                JOIN public.customer c ON p.id_customer = c.id_kontak
                LEFT JOIN public.sektor s ON c.id_sektor::varchar = s.id_sektor::varchar
                GROUP BY c.id_kontak, c.nama, COALESCE(s.sektor, 'Others')
                ORDER BY total_omzet DESC
                LIMIT :top_n
            """)
            rows = db_existing.execute(sql, p).mappings().all()
            return {
                "analysis_type": "RFM Customer Segments & Buying Power",
                "top_n": top_n,
                "data": [_sanitize_row_dict(dict(r)) for r in rows]
            }

        elif analysis_type == "product_margin_hpp":
            # HPP & Profitability Margin Analysis per Product
            sql = text("""
                SELECT
                    b.id_barang,
                    b.nama_barang,
                    COALESCE(f.family, 'Uncategorized') AS family,
                    SUM(pd.qty) AS total_qty_terjual,
                    SUM(pd.total) AS total_penjualan_gross,
                    COALESCE(SUM(pd.qty * b.hpp), 0) AS total_est_hpp,
                    ROUND(COALESCE((SUM(pd.total) - SUM(pd.qty * b.hpp)) / NULLIF(SUM(pd.total), 0) * 100, 0), 2) AS margin_gross_pct
                FROM public.penjualan p
                JOIN public.penjualan_detail pd ON pd.no_penjualan = p.no_penjualan
                JOIN public.barang b ON b.id_barang = pd.id_barang
                LEFT JOIN public.family f ON f.id_family = b.id_family
                GROUP BY b.id_barang, b.nama_barang, COALESCE(f.family, 'Uncategorized')
                ORDER BY total_penjualan_gross DESC
                LIMIT :top_n
            """)
            rows = db_existing.execute(sql, p).mappings().all()
            return {
                "analysis_type": "Product Profitability & Gross Margin Analysis",
                "top_n": top_n,
                "data": [_sanitize_row_dict(dict(r)) for r in rows]
            }

        elif analysis_type == "inventory_turnover":
            # Inventory Turnover & Slow Moving Analysis
            sql = text("""
                SELECT
                    b.id_barang,
                    b.nama_barang,
                    COALESCE(SUM(sb.stok), 0) AS total_stok_saat_ini,
                    COALESCE(sales_3m.qty_3m, 0) AS qty_terjual_3bulan,
                    CASE
                        WHEN COALESCE(sales_3m.qty_3m, 0) = 0 THEN 'Dead Stock / Slow Moving'
                        WHEN COALESCE(SUM(sb.stok), 0) / NULLIF(sales_3m.qty_3m / 3.0, 0) > 6 THEN 'Overstock (>6 Bln)'
                        ELSE 'Healthy Turnover'
                    END AS turnover_status
                FROM public.barang b
                JOIN public.stok_barang sb ON sb.id_barang = b.id_barang
                LEFT JOIN (
                    SELECT pd.id_barang, SUM(pd.qty) AS qty_3m
                    FROM public.penjualan p
                    JOIN public.penjualan_detail pd ON pd.no_penjualan = p.no_penjualan
                    WHERE p.tanggal >= CURRENT_DATE - INTERVAL '3 months'
                    GROUP BY pd.id_barang
                ) sales_3m ON sales_3m.id_barang = b.id_barang
                GROUP BY b.id_barang, b.nama_barang, sales_3m.qty_3m
                ORDER BY total_stok_saat_ini DESC
                LIMIT :top_n
            """)
            rows = db_existing.execute(sql, p).mappings().all()
            return {
                "analysis_type": "Inventory Turnover & Slow Moving Items Analysis",
                "top_n": top_n,
                "data": [_sanitize_row_dict(dict(r)) for r in rows]
            }

        elif analysis_type == "sales_rep_ranking":
            # Salesperson / DSR Performance Ranking
            sql = text("""
                SELECT
                    COALESCE(peg.nama, p.id_salesman) AS nama_salesman,
                    COUNT(DISTINCT p.no_penjualan) AS total_faktur,
                    COUNT(DISTINCT p.id_customer) AS customer_served_count,
                    COALESCE(SUM(p.grandtotal), 0) AS total_omzet
                FROM public.penjualan p
                LEFT JOIN public.pegawai peg ON peg.id_pegawai = p.id_salesman
                GROUP BY COALESCE(peg.nama, p.id_salesman)
                ORDER BY total_omzet DESC
                LIMIT :top_n
            """)
            rows = db_existing.execute(sql, p).mappings().all()
            return {
                "analysis_type": "Salesperson Performance Ranking",
                "top_n": top_n,
                "data": [_sanitize_row_dict(dict(r)) for r in rows]
            }

        elif analysis_type == "ar_overdue_aging":
            # Accounts Receivable Overdue Breakdown
            sql = text("""
                SELECT
                    c.nama AS nama_customer,
                    COUNT(p.no_penjualan) AS total_faktur_belum_lunas,
                    SUM(p.grandtotal) AS total_piutang,
                    SUM(CASE WHEN CURRENT_DATE - p.tanggal > 90 THEN p.grandtotal ELSE 0 END) AS piutang_over_90d,
                    SUM(CASE WHEN CURRENT_DATE - p.tanggal BETWEEN 31 AND 90 THEN p.grandtotal ELSE 0 END) AS piutang_31_90d,
                    SUM(CASE WHEN CURRENT_DATE - p.tanggal <= 30 THEN p.grandtotal ELSE 0 END) AS piutang_current_30d
                FROM public.penjualan p
                JOIN public.customer c ON p.id_customer = c.id_kontak
                WHERE p.is_lunas = false OR p.is_lunas IS NULL
                GROUP BY c.nama
                ORDER BY total_piutang DESC
                LIMIT :top_n
            """)
            rows = db_existing.execute(sql, p).mappings().all()
            return {
                "analysis_type": "AR Overdue & Aging Analysis",
                "top_n": top_n,
                "data": [_sanitize_row_dict(dict(r)) for r in rows]
            }

        else:
            return {
                "status": "error",
                "message": f"Tipe analisis '{analysis_type}' tidak dikenal. Pilihan: 'rfm_customer_segments', 'product_margin_hpp', 'inventory_turnover', 'sales_rep_ranking', 'ar_overdue_aging'."
            }
    finally:
        db_existing.close()



def query_inventory_aging_batch(
    db: Session,
    user: MCPUser,
    id_gudang: Optional[str] = None,
    min_days: Optional[int] = None,
    limit: int = 25
) -> Dict[str, Any]:
    """Menampilkan detail stok per batch dan umur persediaan (Aging)."""
    params: Dict[str, Any] = {"limit": min(limit, 100)}
    extra = ""

    if id_gudang:
        extra += " AND sb.id_gudang = :id_gudang"
        params["id_gudang"] = id_gudang

    if min_days is not None and min_days > 0:
        extra += " AND (CURRENT_DATE - sb.tanggal) >= :min_days"
        params["min_days"] = min_days

    # Restrict to user's assigned warehouses if they are warehouse staff
    if user.is_warehouse and user.accessible_warehouses:
        if id_gudang and id_gudang not in user.accessible_warehouses:
            return {"error": "Anda tidak memiliki akses ke gudang ini"}
        if not id_gudang:
            extra += " AND sb.id_gudang IN :gudang_list"
            params["gudang_list"] = tuple(user.accessible_warehouses)

    sql = text(f"""
        SELECT 
            sb.id_gudang,
            COALESCE(g.gudang, sb.id_gudang) AS nama_gudang,
            sb.id_barang,
            COALESCE(b.nama_barang, sb.id_barang) AS nama_barang,
            sb.batch,
            sb.tanggal AS tanggal_masuk,
            (CURRENT_DATE - sb.tanggal) AS umur_hari,
            ROUND((CURRENT_DATE - sb.tanggal) / 365.25, 1) AS umur_tahun,
            sb.stok AS saldo_sisa
        FROM public.stok_barang sb
        LEFT JOIN public.barang b ON sb.id_barang = b.id_barang
        LEFT JOIN public.gudang g ON sb.id_gudang = g.id_gudang
        WHERE sb.stok > 0 {extra}
        ORDER BY (CURRENT_DATE - sb.tanggal) DESC, sb.stok DESC
        LIMIT :limit
    """)

    db_existing = ExistingSessionLocal()
    try:
        rows = db_existing.execute(sql, params).mappings().all()
        out = []
        for r in rows:
            d = dict(r)
            d["tanggal_masuk"] = str(d["tanggal_masuk"]) if d.get("tanggal_masuk") else "-"
            d["umur_hari"] = int(d["umur_hari"]) if d.get("umur_hari") is not None else 0
            d["umur_tahun"] = float(d["umur_tahun"]) if d.get("umur_tahun") is not None else 0.0
            d["saldo_sisa"] = float(d["saldo_sisa"]) if d.get("saldo_sisa") is not None else 0.0
            out.append(d)
        
        return {
            "status": "success",
            "count": len(out),
            "min_days_filter": min_days,
            "id_gudang_filter": id_gudang,
            "data": out
        }
    finally:
        db_existing.close()
