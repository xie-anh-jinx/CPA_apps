"""
Router — Distributions Monitoring (Single Source of Truth: cpa_existing)
DO tracking, Internal Order (IO), Internal Transfer (IT), dan Financial Flow DO.
Seluruh endpoint menggunakan 100% Real Data dari database produksi (cpa_existing)
tanpa duplikasi SQL atau fabrikasi nomor dokumen.
"""
import html
import re
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, Any, List, Set
from datetime import date

from app.database import get_existing_db
from app.routers.auth import CurrentUser
from app.utils.warehouse_master import get_warehouse_master

router = APIRouter()

# ==============================================================================
# SINGLE SOURCE OF TRUTH: STATUS MAPS & SQL HELPERS (cpa_existing)
# ==============================================================================

DO_STATUS_MAP: Dict[str, str] = {
    "D": "Draft",
    "S": "Send",
    "R": "Received",
    "I": "Invoice",
    "C": "Cancel",
}

IO_STATUS_MAP: Dict[str, str] = {
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

IT_STATUS_MAP: Dict[str, str] = {
    "D": "Draft",
    "S": "Send",
    "R": "Receipt",
    "C": "Receipt",
    "X": "Cancel",
}


def _clean_html_text(val: Optional[str]) -> str:
    """
    Membersihkan tag HTML (misalnya <p>, </p>, <br>, <strong>, dsb.) dan HTML entities
    (&nbsp;, &amp;, &gt;, dll.) dari teks agar format alamat dan keterangan bersih dan rapi di Excel.
    """
    if not val:
        return ""
    text_val = str(val).strip()
    if "<" not in text_val or ">" not in text_val:
        return html.unescape(text_val).replace("\xa0", " ").strip()

    # Ganti tag pembatas baris/paragraf dengan newline
    text_val = re.sub(r"</?(?:br|p|div|li|tr)[^>]*>", "\n", text_val, flags=re.IGNORECASE)
    # Hapus seluruh tag HTML lainnya
    text_val = re.sub(r"<[^>]+>", "", text_val)
    # Decode HTML entities seperti &nbsp;, &gt;, &amp;, &quot;, &#39;
    text_val = html.unescape(text_val)
    # Ganti non-breaking space dengan regular space
    text_val = text_val.replace("\xa0", " ")
    # Rapikan whitespace per baris dan hapus baris kosong berulang
    lines = [line.strip() for line in text_val.splitlines()]
    clean_lines = [line for line in lines if line]
    return "\n".join(clean_lines)

# CTE Single Source of Truth untuk resolusi kode user / id_pegawai ke nama & jabatan asli
_USER_LOOKUP_CTE = """
user_lookup AS (
    SELECT DISTINCT ON (key_code)
        key_code,
        nama,
        jabatan
    FROM (
        SELECT
            p.id_pegawai AS key_code,
            p.nama,
            j.jabatan,
            1 AS priority
        FROM public.pegawai p
        LEFT JOIN public.master_jabatan j ON p.id_jabatan = j.id_jabatan
        WHERE p.id_pegawai IS NOT NULL AND p.id_pegawai <> ''
        UNION ALL
        SELECT
            u.usernamenya AS key_code,
            p.nama,
            j.jabatan,
            2 AS priority
        FROM public.pengguna u
        JOIN public.pegawai p ON u.id_pegawai = p.id_pegawai
        LEFT JOIN public.master_jabatan j ON p.id_jabatan = j.id_jabatan
        WHERE u.usernamenya IS NOT NULL AND u.usernamenya <> ''
    ) sub
    ORDER BY key_code, priority ASC
)
"""

# Lateral join Single Source of Truth untuk faktur penjualan terkait DO via penjualando
_DO_INVOICE_LATERAL_SQL = """
LEFT JOIN LATERAL (
    SELECT
        p.tanggal AS tgl_invoice,
        p.no_penjualan AS no_invoice
    FROM public.penjualando pd
    JOIN public.penjualan p ON pd.no_penjualan = p.no_penjualan
    WHERE pd.no_do = d.nomor AND COALESCE(p.status, '') <> 'C'
    ORDER BY p.tanggal ASC
    LIMIT 1
) inv ON true
"""


def _apply_do_rls(
    conditions: List[str],
    params: Dict[str, Any],
    current_user: Optional[CurrentUser],
    alias: str = "d",
) -> None:
    """Single Source of Truth Row-Level Security untuk tabel DO / Gudang."""
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(",") if g.strip())
            conditions.append(f"{alias}.id_gudang IN :gudangs")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            conditions.append(f"{alias}.id_gudang = :user_gudang")
            params["user_gudang"] = current_user.id_pegawai


def _apply_io_it_rls(
    conditions: List[str],
    params: Dict[str, Any],
    current_user: Optional[CurrentUser],
    alias: str = "t",
    direction: Optional[str] = None,
) -> Set[str]:
    """Single Source of Truth Row-Level Security untuk tabel Internal Order & Internal Transfer."""
    user_gudangs: Set[str] = set()
    if current_user and current_user.role in ("warehouse", "warehouse_staff", "sales", "sales_rep"):
        if current_user.id_gudang_access:
            gudangs = tuple(g.strip() for g in current_user.id_gudang_access.split(",") if g.strip())
            user_gudangs = set(gudangs)
            if direction == "in":
                conditions.append(f"{alias}.id_gudang_tujuan IN :gudangs")
            elif direction == "out":
                conditions.append(f"{alias}.id_gudang_asal IN :gudangs")
            else:
                conditions.append(f"({alias}.id_gudang_asal IN :gudangs OR {alias}.id_gudang_tujuan IN :gudangs)")
            params["gudangs"] = gudangs
        elif current_user.id_pegawai:
            user_gudangs = {current_user.id_pegawai}
            if direction == "in":
                conditions.append(f"{alias}.id_gudang_tujuan = :user_gudang")
            elif direction == "out":
                conditions.append(f"{alias}.id_gudang_asal = :user_gudang")
            else:
                conditions.append(f"({alias}.id_gudang_asal = :user_gudang OR {alias}.id_gudang_tujuan = :user_gudang)")
            params["user_gudang"] = current_user.id_pegawai
    return user_gudangs


def _apply_do_status_filter(
    status: Optional[str],
    conditions: List[str],
    params: Dict[str, Any],
    alias: str = "d",
) -> None:
    """Single Source of Truth filter status DO (mendukung kode 1-huruf maupun label UI)."""
    if not status or status.lower() == "all":
        return
    status_items = [s.strip().lower() for s in status.split(",") if s.strip()]
    status_conds: List[str] = []
    status_map_filter = {
        "send": "S",
        "in_transit": "S",
        "s": "S",
        "invoice": "I",
        "i": "I",
        "cancel": "C",
        "cancelled": "C",
        "void": "C",
        "c": "C",
        "draft": "D",
        "d": "D",
    }
    target_codes: List[str] = []
    for s_item in status_items:
        if s_item in ("return", "returned", "frdo"):
            status_conds.append(f"({alias}.status = 'R' AND {alias}.return_date IS NOT NULL)")
        elif s_item in ("received", "delivered", "r"):
            status_conds.append(f"({alias}.status = 'R' AND {alias}.return_date IS NULL)")
        else:
            code = status_map_filter.get(s_item, s_item.upper())
            target_codes.append(code)
    if target_codes:
        code_params = [f":do_st_{idx}" for idx in range(len(target_codes))]
        for idx, c in enumerate(target_codes):
            params[f"do_st_{idx}"] = c
        status_conds.append(f"{alias}.status IN ({', '.join(code_params)})")
    if status_conds:
        conditions.append(f"({' OR '.join(status_conds)})")


def _apply_io_status_filter(
    status: Optional[str],
    conditions: List[str],
    params: Dict[str, Any],
    alias: str = "t",
) -> None:
    """Single Source of Truth filter status IO (mendukung label UI dan kode 1-huruf)."""
    if not status or status.lower() == "all":
        return
    key_map = {
        "draft": ["D"],
        "dsm": ["S"],
        "checked dsm": ["S"],
        "approve": ["A"],
        "approved": ["A"],
        "it_process": ["P"],
        "process it": ["P"],
        "it process": ["P"],
        "partial": ["Z"],
        "partial complete": ["Z"],
        "it_complete": ["C"],
        "it completed": ["C"],
        "it complete": ["C"],
        "cancel": ["X", "R", "K", "Y"],
        "cancelled": ["X", "R", "K", "Y"],
        "reject dsm": ["K"],
        "reject st": ["Y"],
    }
    target_codes: List[str] = []
    for raw in status.split(","):
        s_clean = raw.strip().lower()
        if not s_clean:
            continue
        if s_clean in key_map:
            target_codes.extend(key_map[s_clean])
        else:
            target_codes.append(raw.strip().upper())
    if target_codes:
        unique_codes = list(dict.fromkeys(target_codes))
        code_params = [f":io_st_{idx}" for idx in range(len(unique_codes))]
        for idx, c in enumerate(unique_codes):
            params[f"io_st_{idx}"] = c
        conditions.append(f"{alias}.status IN ({', '.join(code_params)})")


def _apply_do_warehouse_filter(
    id_gudang_param: Optional[str],
    conditions: List[str],
    params: Dict[str, Any],
    alias: str = "d",
    gudang_alias: str = "g",
) -> None:
    """Single Source of Truth filter gudang DO (mendukung 1 atau multi-gudang dipisah koma, ID maupun Nama Gudang)."""
    if not id_gudang_param or id_gudang_param.strip().upper() == "ALL":
        return
    items = [w.strip() for w in id_gudang_param.split(",") if w.strip() and w.strip().upper() != "ALL"]
    if not items:
        return
    if len(items) == 1:
        conditions.append(f"({alias}.id_gudang = :wh_single OR LOWER({gudang_alias}.gudang) = LOWER(:wh_single))")
        params["wh_single"] = items[0]
    else:
        clause_parts = []
        for i, val in enumerate(items):
            param_key = f"wh_item_{i}"
            param_lower_key = f"wh_lower_{i}"
            params[param_key] = val
            params[param_lower_key] = val.lower()
            clause_parts.append(f"({alias}.id_gudang = :{param_key} OR LOWER({gudang_alias}.gudang) = :{param_lower_key})")
        conditions.append(f"({' OR '.join(clause_parts)})")


def _apply_io_it_warehouse_filter(
    id_gudang_param: Optional[str],
    conditions: List[str],
    params: Dict[str, Any],
    alias: str = "t",
    ga_alias: str = "ga",
    gt_alias: str = "gt",
    mode: str = "any",
) -> None:
    """Single Source of Truth filter gudang IO / IT (mendukung 1 atau multi-gudang dipisah koma)."""
    if not id_gudang_param or id_gudang_param.strip().upper() == "ALL":
        return
    items = [w.strip() for w in id_gudang_param.split(",") if w.strip() and w.strip().upper() != "ALL"]
    if not items:
        return
    clause_parts = []
    for i, val in enumerate(items):
        k = f"wh_io_{mode}_{i}"
        kl = f"wh_io_l_{mode}_{i}"
        params[k] = val
        params[kl] = val.lower()
        if mode == "asal":
            clause_parts.append(f"({alias}.id_gudang_asal = :{k} OR LOWER({ga_alias}.gudang) = :{kl})")
        elif mode == "tujuan":
            clause_parts.append(f"({alias}.id_gudang_tujuan = :{k} OR LOWER({gt_alias}.gudang) = :{kl})")
        else:
            clause_parts.append(
                f"({alias}.id_gudang_asal = :{k} OR LOWER({ga_alias}.gudang) = :{kl} "
                f"OR {alias}.id_gudang_tujuan = :{k} OR LOWER({gt_alias}.gudang) = :{kl})"
            )
    conditions.append(f"({' OR '.join(clause_parts)})")


def _apply_it_status_filter(
    status: Optional[str],
    conditions: List[str],
    params: Dict[str, Any],
    alias: str = "it",
) -> None:
    """Single Source of Truth filter status IT (mendukung label UI dan kode 1-huruf)."""
    if not status or status.lower() == "all":
        return
    key_map = {
        "draft": ["D"],
        "send": ["S"],
        "receipt": ["R", "C"],
        "received": ["R", "C"],
        "cancel": ["X"],
        "cancelled": ["X"],
    }
    target_codes: List[str] = []
    for raw in status.split(","):
        s_clean = raw.strip().lower()
        if not s_clean:
            continue
        if s_clean in key_map:
            target_codes.extend(key_map[s_clean])
        else:
            target_codes.append(raw.strip().upper())
    if target_codes:
        unique_codes = list(dict.fromkeys(target_codes))
        code_params = [f":it_st_{idx}" for idx in range(len(unique_codes))]
        for idx, c in enumerate(unique_codes):
            params[f"it_st_{idx}"] = c
        conditions.append(f"{alias}.status IN ({', '.join(code_params)})")


# ==============================================================================
# 1. DELIVERY ORDER (DO) LIST, PENDING, IN-TRANSIT, SUMMARY, MAP
# ==============================================================================

@router.get("/")
async def list_deliveries(
    status: Optional[str] = Query(None, description="all|send|received|return|invoice|cancel|draft|S|R|I|C|D or comma-separated"),
    q: Optional[str] = Query(None, description="Search query across DO, Customer, Driver, Plate, PO, Invoice, etc."),
    nomor: Optional[str] = Query(None, description="Filter specific DO number(s), comma-separated"),
    id_customer: Optional[str] = None,
    id_gudang: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search_all_dates: bool = Query(False, description="Bypass date filters when searching specific DO or query"),
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar Delivery Order (DO) langsung dari database produksi cpa_existing."""
    conditions = ["1=1"]
    params: Dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}

    if hasattr(status, 'default') or not isinstance(status, str):
        status = None
    if hasattr(q, 'default') or not isinstance(q, str):
        q = None
    if hasattr(nomor, 'default') or not isinstance(nomor, str):
        nomor = None
    if hasattr(search_all_dates, 'default') or not isinstance(search_all_dates, bool):
        search_all_dates = False

    _apply_do_status_filter(status, conditions, params, alias="d")

    # Filter specific DO number(s) (mendukung 1 atau beberapa nomor DO sekaligus)
    if nomor and nomor.strip():
        no_list = [n.strip() for n in nomor.split(",") if n.strip()]
        if len(no_list) == 1:
            conditions.append("d.nomor = :no_single")
            params["no_single"] = no_list[0]
        elif len(no_list) > 1:
            conditions.append("d.nomor IN :no_list")
            params["no_list"] = tuple(no_list)

    if q and q.strip():
        q_clean = f"%{q.strip().lower()}%"
        conditions.append("""(
            LOWER(d.nomor) LIKE :q_clean
            OR LOWER(COALESCE(c.customer, d.kepada, '')) LIKE :q_clean
            OR LOWER(COALESCE(d.driver, '')) LIKE :q_clean
            OR LOWER(COALESCE(d.lic_plate, '')) LIKE :q_clean
            OR LOWER(COALESCE(d.transporter, '')) LIKE :q_clean
            OR LOWER(COALESCE(s.referensi, '')) LIKE :q_clean
            OR LOWER(COALESCE(inv.no_invoice, '')) LIKE :q_clean
            OR LOWER(COALESCE(d.destination, '')) LIKE :q_clean
            OR LOWER(COALESCE(g.gudang, '')) LIKE :q_clean
        )""")
        params["q_clean"] = q_clean

    if id_customer:
        conditions.append("d.id_customer = :id_customer")
        params["id_customer"] = id_customer
    _apply_do_warehouse_filter(id_gudang, conditions, params, alias="d", gudang_alias="g")

    # Jika user mencari nomor DO spesifik atau search_all_dates=True dengan query q,
    # bypass filter tanggal agar pencarian data masa lalu (misal 2025 ke bawah) tidak terkunci di tahun berjalan!
    should_apply_date = not ((nomor and nomor.strip()) or (search_all_dates and q and q.strip()))
    if should_apply_date:
        if date_from:
            conditions.append("d.tanggal >= :date_from")
            params["date_from"] = date_from
        if date_to:
            conditions.append("d.tanggal <= :date_to")
            params["date_to"] = date_to

    _apply_do_rls(conditions, params, current_user, alias="d")
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
            CASE
                WHEN d.return_date IS NOT NULL AND d.received_date IS NOT NULL
                THEN (d.return_date - d.received_date)
                ELSE NULL
            END AS selisih_hari,
            CASE
                WHEN d.received_date IS NOT NULL AND d.tanggal IS NOT NULL
                THEN (d.received_date - d.tanggal)
                ELSE NULL
            END AS durasi_terima_hari,
            inv.tgl_invoice,
            inv.no_invoice,
            CASE
                WHEN inv.tgl_invoice IS NOT NULL AND d.tanggal IS NOT NULL
                THEN (inv.tgl_invoice - d.tanggal)
                ELSE NULL
            END AS durasi_invoice_hari,
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
            END AS days_in_transit,
            COALESCE(vol.total_volume_liter, 0)::FLOAT AS total_volume_liter,
            COALESCE(vol.total_qty, 0)::FLOAT AS total_qty
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
        LEFT JOIN public.so s ON pl.no_so = s.nomor
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(dd.qty * COALESCE(b.isi_satuan, 1)), 0) AS total_volume_liter,
                COALESCE(SUM(dd.qty), 0) AS total_qty
            FROM public.do_detail dd
            LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
            WHERE dd.no_do = d.nomor
        ) vol ON true
        {_DO_INVOICE_LATERAL_SQL}
        WHERE {where_clause}
        ORDER BY d.tanggal DESC, d.nomor DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
        LEFT JOIN public.so s ON pl.no_so = s.nomor
        {_DO_INVOICE_LATERAL_SQL}
        WHERE {where_clause}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    hide_financial = current_user and current_user.role in ("warehouse", "warehouse_staff")
    data = []
    for r in rows:
        d = dict(r)
        if hide_financial:
            d["shippingcosts"] = None
        wh_meta = get_warehouse_master(d.get("id_gudang"), d.get("nama_gudang"))
        d["code_area"] = wh_meta.get("code_area")
        d["actual_area"] = wh_meta.get("actual_area")
        d["type_wh"] = wh_meta.get("type_wh")
        data.append(d)

    return {
        "data": data,
        "pagination": {"page": page, "limit": limit, "total": total},
    }


@router.get("/pending")
async def get_pending_deliveries(
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Pesanan DO yang menunggu pengiriman (status Draft / belum keluar) dari cpa_existing."""
    where_clauses = ["d.status = 'D'", "d.tgl_keluar IS NULL"]
    params: Dict[str, Any] = {}
    _apply_do_rls(where_clauses, params, current_user, alias="d")

    where_str = " AND ".join(where_clauses)
    rows = db.execute(text(f"""
        SELECT
            d.nomor,
            d.tanggal,
            d.id_customer,
            COALESCE(c.customer, d.kepada, '') AS nama_customer,
            d.id_gudang,
            COALESCE(g.gudang, d.id_gudang, '') AS nama_gudang,
            d.alamat,
            'draft' AS status_label,
            CURRENT_DATE - d.tanggal AS days_waiting
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        WHERE {where_str}
        ORDER BY d.tanggal ASC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/in-transit")
async def get_in_transit(
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Pengiriman DO yang sedang dalam perjalanan (status Send / 'S') dari cpa_existing."""
    where_clauses = ["d.status = 'S'"]
    params: Dict[str, Any] = {}
    _apply_do_rls(where_clauses, params, current_user, alias="d")

    where_str = " AND ".join(where_clauses)
    rows = db.execute(text(f"""
        SELECT
            d.nomor,
            d.tanggal,
            d.tgl_keluar,
            d.id_customer,
            COALESCE(c.customer, d.kepada, '') AS nama_customer,
            d.origin,
            d.destination,
            d.driver,
            d.lic_plate,
            d.transporter,
            d.tgl_sampai,
            CASE
                WHEN d.tgl_keluar IS NOT NULL THEN CURRENT_DATE - d.tgl_keluar
                ELSE CURRENT_DATE - d.tanggal
            END AS days_in_transit,
            CASE
                WHEN d.tgl_sampai IS NOT NULL AND d.tgl_sampai < CURRENT_DATE THEN 'overdue'
                WHEN d.tgl_sampai = CURRENT_DATE THEN 'due_today'
                ELSE 'on_time'
            END AS delivery_status
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        WHERE {where_str}
        ORDER BY COALESCE(d.tgl_keluar, d.tanggal) ASC
        LIMIT 200
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/summary")
async def get_distribution_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Ringkasan distribusi DO: status, volume, biaya, dan on-time rate dari cpa_existing."""
    if not date_from:
        date_from = date(2017, 1, 1)
    if not date_to:
        date_to = date.today()

    conditions = ["d.tanggal BETWEEN :date_from AND :date_to"]
    params: Dict[str, Any] = {"date_from": date_from, "date_to": date_to}
    _apply_do_warehouse_filter(id_gudang, conditions, params, alias="d", gudang_alias="g")

    _apply_do_rls(conditions, params, current_user, alias="d")
    where_clause = " AND ".join(conditions)

    result = db.execute(text(f"""
        WITH do_agg AS (
            SELECT
                d.nomor,
                d.status,
                d.shippingcosts,
                d.received_date,
                d.return_date,
                d.tgl_keluar,
                d.tgl_sampai,
                COALESCE(SUM(dd.qty), 0) AS do_qty,
                COALESCE(SUM(dd.qty * COALESCE(b.isi_satuan, 1)), 0) AS do_volume_liter
            FROM public.do_tbl d
            LEFT JOIN public.do_detail dd ON d.nomor = dd.no_do
            LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
            LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
            WHERE {where_clause}
            GROUP BY d.nomor, d.status, d.shippingcosts, d.received_date, d.return_date, d.tgl_keluar, d.tgl_sampai
        )
        SELECT
            COUNT(*) AS total_do,
            COALESCE(SUM(do_volume_liter), 0)::FLOAT AS total_volume,
            COALESCE(SUM(do_qty), 0)::FLOAT AS total_qty,

            SUM(CASE WHEN status = 'S' THEN 1 ELSE 0 END) AS send,
            COALESCE(SUM(CASE WHEN status = 'S' THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS send_volume,
            COALESCE(SUM(CASE WHEN status = 'S' THEN do_qty ELSE 0 END), 0)::FLOAT AS send_qty,

            -- DO Received (diterima customer, surat jalan fisik/FRDO belum kembali)
            SUM(CASE WHEN status = 'R' AND return_date IS NULL THEN 1 ELSE 0 END) AS received,
            COALESCE(SUM(CASE WHEN status = 'R' AND return_date IS NULL THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS received_volume,
            COALESCE(SUM(CASE WHEN status = 'R' AND return_date IS NULL THEN do_qty ELSE 0 END), 0)::FLOAT AS received_qty,

            -- DO Return (surat jalan fisik/FRDO sudah kembali)
            SUM(CASE WHEN status = 'R' AND return_date IS NOT NULL THEN 1 ELSE 0 END) AS return_do,
            COALESCE(SUM(CASE WHEN status = 'R' AND return_date IS NOT NULL THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS return_volume,
            COALESCE(SUM(CASE WHEN status = 'R' AND return_date IS NOT NULL THEN do_qty ELSE 0 END), 0)::FLOAT AS return_qty,

            SUM(CASE WHEN status = 'I' THEN 1 ELSE 0 END) AS invoice,
            COALESCE(SUM(CASE WHEN status = 'I' THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS invoice_volume,
            COALESCE(SUM(CASE WHEN status = 'I' THEN do_qty ELSE 0 END), 0)::FLOAT AS invoice_qty,

            SUM(CASE WHEN status = 'C' THEN 1 ELSE 0 END) AS cancel,
            COALESCE(SUM(CASE WHEN status = 'C' THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS cancel_volume,
            COALESCE(SUM(CASE WHEN status = 'C' THEN do_qty ELSE 0 END), 0)::FLOAT AS cancel_qty,

            SUM(CASE WHEN status = 'D' THEN 1 ELSE 0 END) AS draft,
            COALESCE(SUM(CASE WHEN status = 'D' THEN do_volume_liter ELSE 0 END), 0)::FLOAT AS draft_volume,
            COALESCE(SUM(CASE WHEN status = 'D' THEN do_qty ELSE 0 END), 0)::FLOAT AS draft_qty,

            -- compatibility aliases
            SUM(CASE WHEN status = 'S' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN status = 'R' AND return_date IS NULL THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'R' AND return_date IS NOT NULL THEN 1 ELSE 0 END) AS returned,
            SUM(CASE WHEN status = 'D' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'C' THEN 1 ELSE 0 END) AS void_count,
            SUM(shippingcosts) AS total_shipping_cost,
            AVG(CASE WHEN received_date IS NOT NULL AND tgl_keluar IS NOT NULL
                THEN received_date - tgl_keluar
                ELSE NULL
            END)::FLOAT AS avg_delivery_days,
            ROUND(
                100.0 * SUM(CASE
                    WHEN received_date IS NOT NULL AND tgl_sampai IS NOT NULL
                    AND received_date <= tgl_sampai THEN 1 ELSE 0
                END) / NULLIF(SUM(CASE WHEN received_date IS NOT NULL THEN 1 ELSE 0 END), 0),
                2
            ) AS on_time_rate_pct
        FROM do_agg
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
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Data untuk peta distribusi (origin-destination) dari database cpa_existing."""
    conditions = ["d.origin IS NOT NULL", "d.destination IS NOT NULL"]
    params: Dict[str, Any] = {}
    _apply_do_warehouse_filter(id_gudang, conditions, params, alias="d", gudang_alias="g")

    if hasattr(status, 'default') or not isinstance(status, str):
        status = None

    _apply_do_status_filter(status, conditions, params, alias="d")

    if date_from:
        conditions.append("d.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("d.tanggal <= :date_to")
        params["date_to"] = date_to

    _apply_do_rls(conditions, params, current_user, alias="d")

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
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
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


# ==============================================================================
# 2. INTERNAL ORDER (IO) & INTERNAL TRANSFER (IT)
# ==============================================================================

@router.get("/internal-orders")
async def get_internal_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    id_gudang_asal: Optional[str] = None,
    id_gudang_tujuan: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 10000,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar Internal Order (IO) dari cpa_existing."""
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {"limit": limit}

    if date_from:
        where_clauses.append("t.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("t.tanggal <= :date_to")
        params["date_to"] = date_to

    _apply_io_status_filter(status, where_clauses, params, alias="t")
    _apply_io_it_warehouse_filter(id_gudang_asal, where_clauses, params, alias="t", ga_alias="ga", gt_alias="gt", mode="asal")
    _apply_io_it_warehouse_filter(id_gudang_tujuan, where_clauses, params, alias="t", ga_alias="ga", gt_alias="gt", mode="tujuan")

    if q and q.strip():
        q_clean = f"%{q.strip().lower()}%"
        where_clauses.append("""(
            LOWER(t.nomor_io) LIKE :q_clean
            OR LOWER(COALESCE(u_kontak.nama, u_buat.nama, t.kontak, t.dibuat, '')) LIKE :q_clean
            OR LOWER(COALESCE(ga.gudang, t.id_gudang_asal, '')) LIKE :q_clean
            OR LOWER(COALESCE(gt.gudang, t.id_gudang_tujuan, '')) LIKE :q_clean
            OR LOWER(COALESCE(ikc_code.nama, ikc_id.nama, '')) LIKE :q_clean
            OR LOWER(COALESCE(iod.keterangan, '')) LIKE :q_clean
        )""")
        params["q_clean"] = q_clean

    _apply_io_it_rls(where_clauses, params, current_user, alias="t")
    where_str = " AND ".join(where_clauses)

    query = f"""
        WITH {_USER_LOOKUP_CTE}
        SELECT
            t.nomor_io,
            TO_CHAR(t.tanggal, 'DD-MM-YYYY') AS tanggal,
            COALESCE(ikc_code.nama, ikc_id.nama, 'HO - Balikpapan') AS nama_kantor,
            t.id_gudang_asal,
            t.id_gudang_tujuan,
            COALESCE(ga.gudang, t.id_gudang_asal, '') AS gudang_asal,
            COALESCE(gt.gudang, t.id_gudang_tujuan, '') AS gudang_tujuan,
            COALESCE(u_kontak.nama, u_buat.nama, t.kontak, t.dibuat, '') AS dibuat_oleh,
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
        LEFT JOIN user_lookup u_kontak ON t.kontak = u_kontak.key_code
        LEFT JOIN user_lookup u_buat ON t.dibuat = u_buat.key_code
        LEFT JOIN public.internal_order_detail iod ON t.nomor_io = iod.nomor_io
        LEFT JOIN public.barang b ON iod.id_barang = b.id_barang
        WHERE {where_str}
        ORDER BY t.tanggal DESC, t.nomor_io DESC, iod.urut ASC LIMIT :limit
    """

    result = db.execute(text(query), params).mappings().all()

    formatted_rows = []
    for r in result:
        row = dict(r)
        code = (row.get("status_code") or "").strip()
        row["status"] = IO_STATUS_MAP.get(code, code)
        formatted_rows.append(row)

    return {"data": formatted_rows}


@router.get("/internal-orders/items")
async def get_internal_order_items(
    nomor_io: str = Query(..., description="Nomor Internal Order"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan header + rincian daftar barang untuk Internal Order tertentu (100% Real Data dari cpa_existing)."""
    header_query = f"""
        WITH {_USER_LOOKUP_CTE}
        SELECT
            io.nomor_io,
            io.tanggal,
            io.id_gudang_asal,
            io.id_gudang_tujuan,
            COALESCE(ga.gudang, io.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, io.id_gudang_tujuan) AS gudang_tujuan,
            io.id_ip,
            io.status,
            COALESCE(u_kontak.nama, u_buat.nama, NULLIF(io.kontak, ''), NULLIF(io.dibuat, ''), '—') AS dibuat_nama,
            COALESCE(u_kontak.jabatan, u_buat.jabatan, '—') AS dibuat_jabatan,
            COALESCE(io.modified_date, io.create_date) AS dibuat_tanggal,
            COALESCE(u_send.nama, NULLIF(io.send_by, ''), '—') AS dsm_nama,
            COALESCE(u_send.jabatan, '—') AS dsm_jabatan,
            io.send_by_date,
            io.check_dsm_date,
            COALESCE(u_st.nama, NULLIF(io.st, ''), '—') AS st_nama,
            COALESCE(u_st.jabatan, '—') AS st_jabatan,
            COALESCE(io.check_st_date, io.st_date) AS st_date,
            COALESCE(u_whm.nama, NULLIF(io.whm, ''), '—') AS whm_nama,
            COALESCE(u_whm.jabatan, '—') AS whm_jabatan,
            COALESCE(io.check_whm_date, io.whm_date) AS whm_date,
            COALESCE(u_app.nama, NULLIF(io.approve, ''), '—') AS approve_nama,
            COALESCE(u_app.jabatan, '—') AS approve_jabatan,
            io.approve_tanggal,
            COALESCE(io.it_nomor, it.nomor) AS it_nomor,
            COALESCE(io.it_tanggal, it.tanggal) AS it_tanggal,
            io.it_complete
        FROM public.internal_order io
        LEFT JOIN public.gudang ga ON io.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON io.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN user_lookup u_kontak ON io.kontak = u_kontak.key_code
        LEFT JOIN user_lookup u_buat ON io.dibuat = u_buat.key_code
        LEFT JOIN user_lookup u_send ON io.send_by = u_send.key_code
        LEFT JOIN user_lookup u_st ON io.st = u_st.key_code
        LEFT JOIN user_lookup u_whm ON io.whm = u_whm.key_code
        LEFT JOIN user_lookup u_app ON io.approve = u_app.key_code
        LEFT JOIN public.internal_transfer it ON io.nomor_io = it.nomor_io
        WHERE io.nomor_io = :nomor_io
        LIMIT 1
    """
    header_row = db.execute(text(header_query), {"nomor_io": nomor_io}).mappings().first()

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
                "title": header_row["dibuat_jabatan"] or "—",
                "date": str(dibuat_tgl) if dibuat_tgl else None,
                "checked": bool(header_row["dibuat_nama"] and header_row["dibuat_nama"] != "—"),
            },
            {
                "stage": "Dicek oleh 1 (DSM)",
                "name": header_row["dsm_nama"] or "—",
                "title": header_row["dsm_jabatan"] or "—",
                "date": str(dsm_tgl) if dsm_tgl else None,
                "checked": bool(dsm_tgl),
            },
            {
                "stage": "Dicek oleh 2 (ST)",
                "name": header_row["st_nama"] or "—",
                "title": header_row["st_jabatan"] or "—",
                "date": str(st_tgl) if st_tgl else None,
                "checked": bool(st_tgl),
            },
            {
                "stage": "Disetujui oleh",
                "name": header_row["approve_nama"] or "—",
                "title": header_row["approve_jabatan"] or "—",
                "date": str(app_tgl) if app_tgl else None,
                "checked": bool(app_tgl),
            },
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
            "approvals": approvals,
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
        ],
    }


@router.get("/transfer-orders/items")
async def get_transfer_order_items(
    nomor: str = Query(..., description="Nomor Internal Transfer"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan header + rincian daftar barang untuk Internal Transfer tertentu."""
    header_query = f"""
        WITH {_USER_LOOKUP_CTE}
        SELECT
            it.nomor,
            it.nomor_io,
            it.tanggal,
            it.tanggal_kirim,
            it.jam_kirim,
            it.id_gudang_asal,
            it.id_gudang_tujuan,
            COALESCE(ga.gudang, it.id_gudang_asal) AS gudang_asal,
            COALESCE(gt.gudang, it.id_gudang_tujuan) AS gudang_tujuan,
            COALESCE(u_penerima.nama, u_pengirim.nama, it.pengirim) AS contact_person,
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
        LEFT JOIN user_lookup u_pengirim ON it.pengirim = u_pengirim.key_code
        LEFT JOIN user_lookup u_penerima ON it.penerima = u_penerima.key_code
        WHERE it.nomor = :nomor
        LIMIT 1
    """
    header_row = db.execute(text(header_query), {"nomor": nomor}).mappings().first()

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
        ],
    }


@router.get("/transfer-orders")
async def get_transfer_orders(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,  # 'in' (Receipt IT In), 'out' (IT Out)
    id_gudang_asal: Optional[str] = None,
    id_gudang_tujuan: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 5000,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan daftar Transfer Order (IT) dari cpa_existing dengan tracking IT In / IT Out."""
    conditions = ["1=1"]
    params: Dict[str, Any] = {"limit": limit}

    if date_from:
        conditions.append("it.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("it.tanggal <= :date_to")
        params["date_to"] = date_to

    _apply_it_status_filter(status, conditions, params, alias="it")
    _apply_io_it_warehouse_filter(id_gudang_asal, conditions, params, alias="it", ga_alias="ga", gt_alias="gt", mode="asal")
    _apply_io_it_warehouse_filter(id_gudang_tujuan, conditions, params, alias="it", ga_alias="ga", gt_alias="gt", mode="tujuan")

    if q and q.strip():
        q_clean = f"%{q.strip().lower()}%"
        conditions.append("""(
            LOWER(it.nomor) LIKE :q_clean
            OR LOWER(COALESCE(it.nomor_io, '')) LIKE :q_clean
            OR LOWER(COALESCE(ga.gudang, it.id_gudang_asal, '')) LIKE :q_clean
            OR LOWER(COALESCE(gt.gudang, it.id_gudang_tujuan, '')) LIKE :q_clean
            OR LOWER(COALESCE(it.keterangan, '')) LIKE :q_clean
        )""")
        params["q_clean"] = q_clean

    user_gudangs = _apply_io_it_rls(conditions, params, current_user, alias="it", direction=direction)
    where_str = " AND ".join(conditions)

    query = f"""
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
        WHERE {where_str}
        ORDER BY it.tanggal DESC, it.nomor DESC LIMIT :limit
    """

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


# ==============================================================================
# 3. EXPORT EXCEL (DO, IO, IT) — SINGLE SOURCE OF TRUTH
# ==============================================================================

@router.get("/export-excel")
async def export_distribution_excel(
    export_type: str = Query(..., alias="type", description="IO (Internal Order), IT (Internal Transfer), atau DO (Delivery Order)"),
    period: Optional[str] = Query(None, description="1_day, 7_days, 1_month, 3_months, 6_months, 1_year, all, or custom"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    id_gudang: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Export data DO, IO, atau IT dari cpa_existing ke format Excel (.xlsx)."""
    import io
    import pandas as pd
    from datetime import date as dt_date, timedelta
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
        "1_year": 365, "1y": 365,
    }

    if not date_from and period_clean in days_map:
        date_from = anchor - timedelta(days=days_map[period_clean])

    params: Dict[str, Any] = {}
    where_clauses = ["1=1"]
    if date_from:
        where_clauses.append("t.tanggal >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("t.tanggal <= :date_to")
        params["date_to"] = date_to

    if type_upper == "IO":
        _apply_io_status_filter(status, where_clauses, params, alias="t")
    elif type_upper == "IT":
        _apply_it_status_filter(status, where_clauses, params, alias="t")
    else:
        _apply_do_status_filter(status, where_clauses, params, alias="t")

    if type_upper in ["IO", "IT"]:
        _apply_io_it_warehouse_filter(id_gudang, where_clauses, params, alias="t", ga_alias="ga", gt_alias="gt", mode="any")
    else:
        _apply_do_warehouse_filter(id_gudang, where_clauses, params, alias="d", gudang_alias="g")

    if type_upper in ["IO", "IT"]:
        _apply_io_it_rls(where_clauses, params, current_user, alias="t")
    else:
        _apply_do_rls(where_clauses, params, current_user, alias="t")

    where_str = " AND ".join(where_clauses)

    if type_upper == "IO":
        sql = f"""
            WITH {_USER_LOOKUP_CTE}
            SELECT
                t.nomor_io AS "Nomor IO",
                TO_CHAR(t.tanggal, 'DD-MM-YYYY') AS "Tanggal",
                COALESCE(ikc_code.nama, ikc_id.nama, 'HO - Balikpapan') AS "Kantor",
                COALESCE(ga.gudang, t.id_gudang_asal, '') AS "Gudang Asal",
                COALESCE(gt.gudang, t.id_gudang_tujuan, '') AS "Gudang Tujuan",
                COALESCE(u_kontak.nama, u_buat.nama, t.kontak, t.dibuat, '') AS "Dibuat oleh",
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
            LEFT JOIN user_lookup u_kontak ON t.kontak = u_kontak.key_code
            LEFT JOIN user_lookup u_buat ON t.dibuat = u_buat.key_code
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
            status_desc = IO_STATUS_MAP.get(code, code)
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
                "Keterangan": _clean_html_text(row_dict.get("Keterangan", "")),
            })
        df = pd.DataFrame(records)
        sheet_name = "Internal Order"
        filename_prefix = f"Internal_Order_{period_clean}"
    elif type_upper == "IT":
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
            status_desc = IT_STATUS_MAP.get(code, code)
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
                "Receive Note": _clean_html_text(row_dict.get("Receive Note", "")),
                "Status": status_desc,
                "Nama Barang": row_dict.get("Nama Barang", ""),
                "Kode Barang": row_dict.get("Kode Barang", ""),
                "Qty": row_dict.get("Qty", 0),
                "Satuan": row_dict.get("Satuan", ""),
                "Ongkir": row_dict.get("Ongkir", ""),
                "No IBC/No Skid Tank": row_dict.get("No IBC/No Skid Tank", ""),
                "No Segel": row_dict.get("No Segel", ""),
                "Keterangan": _clean_html_text(row_dict.get("Keterangan", "")),
            })
        df = pd.DataFrame(records)
        sheet_name = "Internal Transfer"
        filename_prefix = f"Internal_Transfer_{period_clean}"
    else:  # DO
        do_where_str = (
            where_str.replace("t.tanggal", "d.tanggal")
            .replace("t.status", "d.status")
            .replace("t.return_date", "d.return_date")
            .replace("t.id_gudang", "d.id_gudang")
        )
        sql = f"""
            SELECT
                CASE
                    WHEN g.id_kantor IN ('02', '03', '05') THEN 'CPA02'
                    WHEN g.id_kantor IN ('04', '08') THEN 'CPA01'
                    WHEN g.id_kantor IN ('06', '07') THEN 'CPA03'
                    ELSE 'HO'
                END AS "Area",
                d.nomor AS "Nomor DO",
                CASE
                    WHEN d.tanggal IS NOT NULL THEN TO_CHAR(d.tanggal, 'DD-Mon-YY')
                    ELSE ''
                END AS "Tanggal DO",
                CASE
                    WHEN d.tanggal IS NOT NULL THEN TO_CHAR(d.tanggal, 'Mon-YY')
                    ELSE ''
                END AS "Month Period",
                d.id_customer AS "ID Customer",
                COALESCE(c.customer, d.kepada, '') AS "Nama Customer",
                COALESCE(d.alamat, '') AS "Alamat Kirim",
                d.id_gudang,
                COALESCE(g.gudang, d.id_gudang, '') AS "Gudang Asal",
                COALESCE(d.driver, '') AS "Driver",
                COALESCE(d.lic_plate, '') AS "Plat Nomor",
                COALESCE(vol.total_volume_liter, 0)::FLOAT AS "Volume (Liter)",
                COALESCE(vol.total_qty, 0)::FLOAT AS "Qty Kemasan",
                CASE
                    WHEN d.tgl_keluar IS NOT NULL THEN TO_CHAR(d.tgl_keluar, 'DD-Mon-YY')
                    ELSE ''
                END AS "Tanggal Kirim",
                CASE
                    WHEN d.received_date IS NOT NULL THEN TO_CHAR(d.received_date, 'DD-Mon-YY')
                    ELSE ''
                END AS "Receive Date",
                CASE
                    WHEN d.received_date IS NOT NULL AND d.tanggal IS NOT NULL
                    THEN (d.received_date - d.tanggal)
                    ELSE NULL
                END AS "Durasi DO ke Receive (Hari)",
                CASE
                    WHEN d.return_date IS NOT NULL THEN TO_CHAR(d.return_date, 'DD-Mon-YY')
                    ELSE ''
                END AS "Return Date",
                CASE
                    WHEN d.return_date IS NOT NULL AND d.received_date IS NOT NULL
                    THEN (d.return_date - d.received_date)
                    ELSE NULL
                END AS "Selisih Hari (Return - Receive)",
                COALESCE(inv.no_invoice, '') AS "Nomor Invoice",
                CASE
                    WHEN inv.tgl_invoice IS NOT NULL THEN TO_CHAR(inv.tgl_invoice, 'DD-Mon-YY')
                    ELSE ''
                END AS "Tanggal Invoice",
                CASE
                    WHEN inv.tgl_invoice IS NOT NULL AND d.tanggal IS NOT NULL
                    THEN (inv.tgl_invoice - d.tanggal)
                    ELSE NULL
                END AS "Durasi DO ke Invoice (Hari)",
                CASE
                    WHEN d.status = 'C' OR d.status = 'X' THEN 'Cancel (Batal)'
                    WHEN d.status = 'I' OR inv.tgl_invoice IS NOT NULL THEN 'Invoice'
                    WHEN d.status = 'R' AND d.return_date IS NOT NULL THEN 'Return'
                    WHEN d.status = 'R' THEN 'Received'
                    WHEN d.status = 'S' THEN 'Send (Kirim)'
                    WHEN d.status = 'D' THEN 'Draft'
                    ELSE COALESCE(d.status, 'Draft')
                END AS "Status",
                COALESCE(d.keterangan, '') AS "Keterangan",
                CASE
                    WHEN d.status = 'C' OR d.status = 'X' THEN 'Void/Cancel'
                    WHEN inv.tgl_invoice IS NOT NULL OR d.status = 'I' THEN 'Menunggu Payment'
                    WHEN (d.status = 'R' OR d.received_date IS NOT NULL) AND d.return_date IS NOT NULL THEN 'Menunggu Invoice'
                    WHEN d.status = 'R' OR d.received_date IS NOT NULL THEN 'Menunggu DO Return'
                    WHEN d.status = 'S' THEN 'Menunggu Receiving'
                    WHEN d.status = 'D' THEN 'Draft'
                    ELSE 'Menunggu Receiving'
                END AS "Latest Status"
            FROM public.do_tbl d
            LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
            LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
            LEFT JOIN public.internal_kantor_cabang ikc ON g.id_kantor = ikc.id_kantor_cabang
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(dd.qty * COALESCE(b.isi_satuan, 1)), 0) AS total_volume_liter,
                    COALESCE(SUM(dd.qty), 0) AS total_qty
                FROM public.do_detail dd
                LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
                WHERE dd.no_do = d.nomor
            ) vol ON true
            {_DO_INVOICE_LATERAL_SQL}
            WHERE {do_where_str}
            ORDER BY d.tanggal DESC
        """
        rows = db.execute(text(sql), params).mappings().all()
        records = []
        for r in rows:
            row_dict = dict(r)
            wh_meta = get_warehouse_master(row_dict.get("id_gudang"), row_dict.get("Gudang Asal"))
            row_dict["Code Area"] = wh_meta.get("code_area", "")
            row_dict["Actual Area Penjualan"] = wh_meta.get("actual_area", "")
            row_dict["Type WH"] = wh_meta.get("type_wh", "")
            for date_col in ["Tanggal DO", "Month Period", "Tanggal Kirim", "Receive Date", "Return Date", "Tanggal Invoice"]:
                val = row_dict.get(date_col)
                row_dict[date_col] = str(val) if val is not None else ""
            if "Alamat Kirim" in row_dict:
                row_dict["Alamat Kirim"] = _clean_html_text(row_dict.get("Alamat Kirim"))
            if "Keterangan" in row_dict:
                row_dict["Keterangan"] = _clean_html_text(row_dict.get("Keterangan"))
            records.append(row_dict)
        df = pd.DataFrame(records)
        do_columns = [
            "Area", "Nomor DO", "Tanggal DO", "Month Period",
            "ID Customer", "Nama Customer", "Alamat Kirim", "Gudang Asal",
            "Volume (Liter)", "Qty Kemasan",
            "Code Area", "Actual Area Penjualan", "Type WH",
            "Driver", "Plat Nomor",
            "Tanggal Kirim", "Receive Date", "Durasi DO ke Receive (Hari)",
            "Return Date", "Selisih Hari (Return - Receive)",
            "Nomor Invoice", "Tanggal Invoice", "Durasi DO ke Invoice (Hari)",
            "Status", "Keterangan", "Latest Status",
        ]
        for col in do_columns:
            if col not in df.columns:
                df[col] = ""
        df = df[do_columns]
        sheet_name = "Delivery Order"
        filename_prefix = f"Delivery_Order_{period_clean}"

    if df.empty:
        if type_upper == "IO":
            df = pd.DataFrame(columns=[
                "No", "Nomor IO", "Tanggal", "Kantor", "Gudang Asal", "Gudang Tujuan",
                "Dibuat oleh", "Send", "Check By DSM", "Dicek ST", "Dicek WHM",
                "Approve", "No. IP", "Status", "Nama Barang", "Kode Barang",
                "Qty", "Satuan", "Keterangan",
            ])
        elif type_upper == "IT":
            df = pd.DataFrame(columns=[
                "No", "IT No", "Date", "Create Date", "Delivery Date", "Receive Date",
                "Gudang Asal", "Gudang Tujuan", "Nomor IO", "Tgl. IO Approve",
                "Receive Note", "Status", "Nama Barang", "Kode Barang",
                "Qty", "Satuan", "Ongkir", "No IBC/No Skid Tank", "No Segel", "Keterangan",
            ])
        else:
            df = pd.DataFrame(columns=[
                "Area", "Nomor DO", "Tanggal DO", "Month Period",
                "ID Customer", "Nama Customer", "Alamat Kirim", "Gudang Asal",
                "Driver", "Plat Nomor", "Volume (Liter)", "Qty Kemasan",
                "Tanggal Kirim", "Receive Date", "Durasi DO ke Receive (Hari)",
                "Return Date", "Selisih Hari (Return - Receive)",
                "Nomor Invoice", "Tanggal Invoice", "Durasi DO ke Invoice (Hari)",
                "Status", "Keterangan", "Latest Status",
            ])

    df = df.fillna("")

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        ws = writer.sheets[sheet_name]

        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        if type_upper == "DO":
            header_fill_color = "1E3A5F"
        elif type_upper == "IO":
            header_fill_color = "1F5C2E"
        else:
            header_fill_color = "5C2E1F"

        header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color=header_fill_color, end_color=header_fill_color, fill_type="solid")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        ws.row_dimensions[1].height = 28
        ws.freeze_panes = "A2"

        do_numeric_cols = {
            "Volume (Liter)", "Qty Kemasan",
            "Durasi DO ke Receive (Hari)",
            "Selisih Hari (Return - Receive)",
            "Durasi DO ke Invoice (Hari)",
        }
        do_center_cols = {
            "Area", "Tanggal DO", "Month Period", "Tanggal Kirim",
            "Receive Date", "Return Date", "Tanggal Invoice",
            "Status", "Latest Status",
        }

        for col in ws.columns:
            header_cell = col[0]
            col_name = str(header_cell.value or "")
            header_cell.font = header_font
            header_cell.fill = header_fill
            header_cell.border = thin_border
            header_cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

            col_letter = header_cell.column_letter
            if col_name in ["Alamat Kirim", "Keterangan", "Receive Note"]:
                max_line_len = 0
                for c in col:
                    lines = str(c.value or "").splitlines()
                    for l in lines:
                        if len(l) > max_line_len:
                            max_line_len = len(l)
                ws.column_dimensions[col_letter].width = min(max(max_line_len + 3, len(col_name) + 3, 15), 55)
            else:
                max_len = max(len(str(c.value or "")) for c in col)
                ws.column_dimensions[col_letter].width = min(max(max_len + 3, len(col_name) + 3, 10), 45)

            is_no_col = col_name == "No"
            is_qty_col = col_name in ["Qty"] or (type_upper == "DO" and col_name in do_numeric_cols)
            is_center_col = col_name in [
                "Date", "Tanggal", "Delivery Date", "Receive Date", "Send",
                "Check By DSM", "Dicek ST", "Dicek WHM", "Approve", "Tgl. IO Approve",
                "Status", "No. IP", "Satuan",
            ] or (type_upper == "DO" and col_name in do_center_cols)

            for data_cell in col[1:]:
                data_cell.border = thin_border
                data_cell.font = Font(name="Calibri", size=10, color="000000")
                if is_no_col or is_center_col:
                    data_cell.alignment = Alignment(horizontal="center", vertical="center")
                elif is_qty_col:
                    data_cell.alignment = Alignment(horizontal="right", vertical="center")
                elif col_name in ["Alamat Kirim", "Keterangan", "Receive Note"]:
                    data_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                else:
                    data_cell.alignment = Alignment(horizontal="left", vertical="center")

    output.seek(0)
    df_str = str(date_from).replace("-", "") if date_from else "all"
    dt_str = str(date_to).replace("-", "") if date_to else "all"
    filename = f"{filename_prefix}_{df_str}_sd_{dt_str}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==============================================================================
# 4. DO RECEIPT DETAIL & WAREHOUSE LIST
# ==============================================================================

@router.get("/delivery-order/receipt")
async def get_delivery_order_receipt(
    nomor: str = Query(..., description="Nomor Delivery Order (DO)"),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Mendapatkan data lengkap Form Receipt Delivery Order beserta rincian barang dari cpa_existing."""
    header_sql = f"""
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
            COALESCE(d.telpon, d.hp, c.telepon, g.telpon, '') AS telpon_no,
            COALESCE(g.alamat, '') AS gudang_alamat,
            COALESCE(d.received_name, '') AS nama_penerima,
            d.received_date AS receive_date,
            d.tgl_sampai AS tgl_sampai_tujuan,
            d.shippingcosts AS biaya_pengiriman,
            d.return_date,
            CASE
                WHEN d.return_date IS NOT NULL AND d.received_date IS NOT NULL
                THEN (d.return_date - d.received_date)
                ELSE NULL
            END AS selisih_hari,
            CASE
                WHEN d.received_date IS NOT NULL AND d.tanggal IS NOT NULL
                THEN (d.received_date - d.tanggal)
                ELSE NULL
            END AS durasi_terima_hari,
            inv.tgl_invoice,
            inv.no_invoice,
            CASE
                WHEN inv.tgl_invoice IS NOT NULL AND d.tanggal IS NOT NULL
                THEN (inv.tgl_invoice - d.tanggal)
                ELSE NULL
            END AS durasi_invoice_hari,
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
            COALESCE(d.keterangan, '') AS keterangan,
            COALESCE(vol.total_volume_liter, 0)::FLOAT AS total_volume_liter,
            COALESCE(vol.total_qty, 0)::FLOAT AS total_qty,
            COALESCE(vol.total_volume_diterima_liter, 0)::FLOAT AS total_volume_diterima_liter,
            COALESCE(vol.total_qty_diterima, 0)::FLOAT AS total_qty_diterima
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
        LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
        LEFT JOIN public.so s ON pl.no_so = s.nomor
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(dd.qty * COALESCE(b.isi_satuan, 1)), 0) AS total_volume_liter,
                COALESCE(SUM(dd.qty), 0) AS total_qty,
                COALESCE(SUM(dd.qty_diterima * COALESCE(b.isi_satuan, 1)), 0) AS total_volume_diterima_liter,
                COALESCE(SUM(dd.qty_diterima), 0) AS total_qty_diterima
            FROM public.do_detail dd
            LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
            WHERE dd.no_do = d.nomor
        ) vol ON true
        {_DO_INVOICE_LATERAL_SQL}
        WHERE d.nomor = :nomor
        LIMIT 1
    """
    row = db.execute(text(header_sql), {"nomor": nomor}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Surat Jalan (DO) tidak ditemukan")

    items_sql = """
        SELECT
            dd.urut AS no,
            dd.id_barang AS kode_barang,
            COALESCE(b.nama_barang, dd.id_barang) AS nama_barang,
            COALESCE(dd.qty, 0)::FLOAT AS qty,
            COALESCE(b.id_satuan_besar, b.id_satuan_kecil, 'Drum') AS satuan,
            COALESCE(b.isi_satuan, 1)::FLOAT AS isi_satuan,
            COALESCE(dd.qty * COALESCE(b.isi_satuan, 1), 0)::FLOAT AS volume_liter,
            COALESCE(dd.packing_number, '') AS packing_number,
            COALESCE(dd.packing_type, '') AS packing_type,
            COALESCE(dd.qty_diterima, 0)::FLOAT AS qty_diterima,
            COALESCE(dd.qty_diterima * COALESCE(b.isi_satuan, 1), 0)::FLOAT AS volume_diterima_liter,
            COALESCE(dd.keterangan, '') AS keterangan
        FROM public.do_detail dd
        LEFT JOIN public.barang b ON dd.id_barang = b.id_barang
        WHERE dd.no_do = :nomor
        ORDER BY dd.urut ASC
    """
    item_rows = db.execute(text(items_sql), {"nomor": nomor}).mappings().all()

    header_dict = dict(row)
    if current_user and current_user.role in ("warehouse", "warehouse_staff"):
        header_dict["biaya_pengiriman"] = None

    for field, str_field, default_val in [
        ("tgl_do", "tgl_do_str", "—"),
        ("receive_date", "receive_date_str", ""),
        ("tgl_sampai_tujuan", "tgl_sampai_tujuan_str", ""),
        ("return_date", "return_date_str", ""),
    ]:
        val = header_dict.get(field)
        if val:
            header_dict[str_field] = f"{val.day:02d}-{val.month:02d}-{val.year}" if hasattr(val, "day") else str(val)
        else:
            header_dict[str_field] = default_val

    return {
        "header": header_dict,
        "items": [dict(r) for r in item_rows],
    }


@router.get("/warehouses")
async def list_distribution_warehouses(
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """Daftar seluruh gudang master untuk filter distribusi (DO, IO, IT, Financial Flow)."""
    conditions: List[str] = ["1=1"]
    params: Dict[str, Any] = {}
    _apply_do_rls(conditions, params, current_user, alias="g")
    where_str = " AND ".join(conditions)

    rows = db.execute(text(f"""
        SELECT
            g.id_gudang,
            COALESCE(g.gudang, g.id_gudang) AS nama_gudang,
            COALESCE(ikc.nama, 'HO - Balikpapan') AS nama_kantor,
            g.telpon,
            g.alamat
        FROM public.gudang g
        LEFT JOIN public.internal_kantor_cabang ikc ON g.id_kantor = ikc.id_kantor_cabang
        WHERE {where_str}
        ORDER BY g.id_gudang ASC
    """), params).mappings().all()
    return [dict(r) for r in rows]


# ==============================================================================
# 5. FINANCIAL FLOW DO — 100% REAL DATA FROM cpa_existing (ZERO FABRICATION)
# ==============================================================================

@router.get("/financial-flow")
async def get_financial_flow(
    status: Optional[str] = Query(None, description="ALL|COMPLETE|OUTSTANDING|NEED_REVIEW"),
    search: Optional[str] = None,
    id_gudang: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_existing_db),
    current_user: CurrentUser = None,
):
    """
    Monitoring alur dokumen keuangan DO dari live database cpa_existing (100% Real Data):
    1. Permintaan Dana / Picking List (do_tbl.shippingcosts & packinglist.nomor)
    2. Travel Request / Penugasan Ekspedisi (do_tbl.sipb, transporter, driver, tgl_keluar)
    3. Delivery Order (do_tbl.nomor, tanggal, received_date)
    4. Form Receipt DO / FRDO Kembali (do_tbl.return_date & received_name)
    5. Faktur Penjualan / Tagihan DO (penjualando + penjualan: no_penjualan, tanggal, biayalain, grandtotal)
    6. Pelunasan / Bukti Pembayaran (pembayaran_piutang_detail + pembayaran_piutang: no_pembayaran_piutang, tanggal, jumlah_bayar)
    """
    if current_user and current_user.role in ("warehouse", "warehouse_staff"):
        raise HTTPException(
            status_code=403,
            detail="Akses ditolak: Akun role gudang/inventori tidak diizinkan mengakses Financial Flow.",
        )

    base_conditions = ["COALESCE(d.shippingcosts, 0) > 0", "COALESCE(d.status, '') <> 'C'"]
    params: Dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}

    if search and search.strip():
        base_conditions.append("""(
            d.nomor ILIKE :search
            OR COALESCE(c.customer, d.kepada, '') ILIKE :search
            OR COALESCE(d.destination, '') ILIKE :search
            OR COALESCE(g.gudang, d.id_gudang, '') ILIKE :search
            OR COALESCE(d.no_pl, '') ILIKE :search
            OR COALESCE(inv.no_penjualan, '') ILIKE :search
            OR COALESCE(pay.no_pembayaran_piutang, '') ILIKE :search
        )""")
        params["search"] = f"%{search.strip()}%"

    if id_gudang and id_gudang.upper() != "ALL":
        base_conditions.append("(d.id_gudang = :id_gudang OR LOWER(g.gudang) = LOWER(:id_gudang))")
        params["id_gudang"] = id_gudang

    _apply_do_rls(base_conditions, params, current_user, alias="d")
    base_where_clause = " AND ".join(base_conditions)

    flow_cte_sql = f"""
        WITH {_USER_LOOKUP_CTE},
        inv_per_do AS (
            SELECT DISTINCT ON (pd.no_do)
                pd.no_do,
                p.no_penjualan,
                p.tanggal AS tgl_invoice,
                COALESCE(p.grandtotal, p.total, 0) AS nilai_invoice,
                COALESCE(p.biayalain, 0) AS inv_biayalain,
                COALESCE(p.total_bayar, 0) AS total_bayar,
                p.is_lunas,
                p.tgl_bayar,
                p.kode_user AS inv_user
            FROM public.penjualando pd
            JOIN public.penjualan p ON pd.no_penjualan = p.no_penjualan
            WHERE COALESCE(p.status, '') <> 'C'
            ORDER BY pd.no_do, p.tanggal DESC
        ),
        pay_per_inv AS (
            SELECT
                ppd.no_invoice,
                MAX(pp.no_pembayaran_piutang) AS no_pembayaran_piutang,
                MAX(pp.tanggal) AS pay_tanggal,
                SUM(COALESCE(ppd.jumlah_bayar, 0)) AS jumlah_bayar,
                MAX(pp.kode_user) AS pay_user
            FROM public.pembayaran_piutang_detail ppd
            JOIN public.pembayaran_piutang pp ON pp.no_pembayaran_piutang = ppd.nomor
            WHERE COALESCE(pp.status, '') <> 'C'
            GROUP BY ppd.no_invoice
        ),
        base AS (
            SELECT
                d.nomor AS no_do,
                d.tanggal AS tgl_do,
                d.id_gudang,
                COALESCE(g.gudang, d.id_gudang, '') AS nama_gudang,
                COALESCE(c.customer, d.kepada, '—') AS customer,
                COALESCE(NULLIF(d.destination, ''), '—') AS rute,
                COALESCE(NULLIF(d.transporter, ''), '—') AS transporter,
                COALESCE(NULLIF(d.driver, ''), '—') AS driver,
                COALESCE(NULLIF(d.lic_plate, ''), '') AS lic_plate,
                COALESCE(d.istransporter, FALSE) AS istransporter,
                COALESCE(NULLIF(d.sipb, ''), '') AS sipb,
                COALESCE(NULLIF(d.no_pl, ''), '') AS no_pl,
                pl.tanggal AS tgl_pl,
                COALESCE(NULLIF(pl.no_so, ''), '') AS no_so,
                COALESCE(d.shippingcosts, 0)::FLOAT AS shippingcosts,
                d.status AS status_do,
                d.tgl_keluar,
                d.tgl_transporter,
                d.received_date,
                d.received_name,
                d.return_date,
                COALESCE(u_do.nama, NULLIF(d.kode_user, ''), NULLIF(d.id_pegawai_log, ''), '—') AS pic_do,
                inv.no_penjualan AS no_invoice,
                inv.tgl_invoice,
                COALESCE(inv.nilai_invoice, 0)::FLOAT AS nilai_invoice,
                COALESCE(inv.inv_biayalain, 0)::FLOAT AS inv_biayalain,
                inv.is_lunas,
                inv.tgl_bayar,
                COALESCE(u_inv.nama, NULLIF(inv.inv_user, ''), 'Finance AR') AS pic_inv,
                pay.no_pembayaran_piutang,
                pay.pay_tanggal,
                COALESCE(pay.jumlah_bayar, 0)::FLOAT AS jumlah_bayar,
                COALESCE(u_pay.nama, NULLIF(pay.pay_user, ''), 'Finance Treasury') AS pic_pay,
                CASE
                    WHEN inv.no_penjualan IS NOT NULL
                         AND COALESCE(inv.inv_biayalain, 0) > 0
                         AND COALESCE(inv.inv_biayalain, 0) <> COALESCE(d.shippingcosts, 0)
                        THEN 'NEED_REVIEW'
                    WHEN inv.no_penjualan IS NOT NULL
                         AND (
                             pay.no_pembayaran_piutang IS NOT NULL
                             OR inv.tgl_bayar IS NOT NULL
                             OR UPPER(COALESCE(inv.is_lunas, '')) IN ('Y', '1', 'T', 'TRUE')
                         )
                        THEN 'COMPLETE'
                    ELSE 'OUTSTANDING'
                END AS flow_status
            FROM public.do_tbl d
            LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
            LEFT JOIN public.gudang g ON d.id_gudang = g.id_gudang
            LEFT JOIN public.packinglist pl ON d.no_pl = pl.nomor
            LEFT JOIN inv_per_do inv ON inv.no_do = d.nomor
            LEFT JOIN pay_per_inv pay ON pay.no_invoice = inv.no_penjualan
            LEFT JOIN user_lookup u_do ON COALESCE(NULLIF(d.kode_user, ''), d.id_pegawai_log) = u_do.key_code
            LEFT JOIN user_lookup u_inv ON inv.inv_user = u_inv.key_code
            LEFT JOIN user_lookup u_pay ON pay.pay_user = u_pay.key_code
            WHERE {base_where_clause}
        )
    """

    kpi_params = {k: v for k, v in params.items() if k not in ["limit", "offset"]}
    kpi_row = db.execute(text(f"""
        {flow_cte_sql}
        SELECT
            COUNT(*) AS total_do,
            COALESCE(SUM(shippingcosts), 0)::FLOAT AS total_permintaan_dana,
            COUNT(*) FILTER (WHERE return_date IS NOT NULL) AS total_frdo,
            COALESCE(SUM(
                CASE
                    WHEN no_invoice IS NOT NULL THEN (CASE WHEN inv_biayalain > 0 THEN inv_biayalain ELSE shippingcosts END)
                    ELSE 0
                END
            ), 0)::FLOAT AS total_invoice,
            COALESCE(SUM(CASE WHEN flow_status = 'COMPLETE' THEN shippingcosts ELSE 0 END), 0)::FLOAT AS total_transfer,
            COUNT(*) FILTER (WHERE flow_status = 'COMPLETE') AS complete_count,
            COUNT(*) FILTER (WHERE flow_status = 'OUTSTANDING') AS outstanding_count,
            COALESCE(SUM(CASE WHEN flow_status <> 'COMPLETE' THEN shippingcosts ELSE 0 END), 0)::FLOAT AS outstanding_amount,
            COUNT(*) FILTER (WHERE flow_status = 'NEED_REVIEW') AS need_review_count
        FROM base
    """), kpi_params).mappings().first()

    status_filter_sql = "1=1"
    if status and status.upper().strip() in ("COMPLETE", "OUTSTANDING", "NEED_REVIEW"):
        params["flow_status"] = status.upper().strip()
        status_filter_sql = "flow_status = :flow_status"

    total_count = db.execute(text(f"""
        {flow_cte_sql}
        SELECT COUNT(*) FROM base WHERE {status_filter_sql}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar() or 0

    rows = db.execute(text(f"""
        {flow_cte_sql}
        SELECT *
        FROM base
        WHERE {status_filter_sql}
        ORDER BY tgl_do DESC, no_do DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    items = []
    for r in rows:
        shipping = float(r["shippingcosts"] or 0)
        flow_status = r["flow_status"]
        has_pl = bool(r["no_pl"])
        has_transport = bool(
            r["tgl_keluar"]
            or r["tgl_transporter"]
            or (r["transporter"] and r["transporter"] != "—")
            or (r["driver"] and r["driver"] != "—")
            or r["sipb"]
        )
        has_frdo = bool(r["return_date"])
        has_invoice = bool(r["no_invoice"])
        has_transfer = bool(
            r["no_pembayaran_piutang"]
            or r["tgl_bayar"]
            or str(r["is_lunas"] or "").upper() in ("Y", "1", "T", "TRUE")
        )

        inv_biayalain = float(r["inv_biayalain"] or 0)
        if has_invoice:
            inv_nom = inv_biayalain if inv_biayalain > 0 else shipping
        else:
            inv_nom = None

        if flow_status == "NEED_REVIEW" and inv_nom is not None and shipping > 0:
            variance_nom = round(shipping - inv_nom, 2)
            variance_pct = round(abs(variance_nom) / shipping * 100.0, 1)
            status_label = "Need Review"
            waiting_reason = "Selisih Biaya DO vs Faktur"
        elif flow_status == "COMPLETE":
            variance_nom = 0.0
            variance_pct = 0.0
            status_label = "Complete"
            waiting_reason = None
        else:
            variance_nom = 0.0
            variance_pct = 0.0
            status_label = "Outstanding"
            if not has_frdo and not has_invoice:
                waiting_reason = "Waiting FRDO"
            elif not has_invoice:
                waiting_reason = "Waiting Invoice"
            else:
                waiting_reason = "Waiting Payment"

        # Stage 2 real document reference (SIPB or Picking List)
        tr_doc_no = r["sipb"] if r["sipb"] else (r["no_pl"] if has_transport and has_pl else None)
        tr_date = str(r["tgl_transporter"] or r["tgl_keluar"] or r["tgl_do"]) if has_transport else None
        tr_pic = r["driver"] if r["driver"] != "—" else (r["transporter"] if r["transporter"] != "—" else None)
        if tr_pic and r["lic_plate"]:
            tr_pic = f"{tr_pic} ({r['lic_plate']})"

        items.append({
            "id": r["no_do"],
            "no_do": r["no_do"],
            "tanggal": str(r["tgl_do"]) if r["tgl_do"] else "—",
            "id_gudang": r["id_gudang"] or "",
            "nama_gudang": r["nama_gudang"] or "",
            "customer": r["customer"],
            "rute": r["rute"],
            "transporter": r["transporter"],
            "driver": r["driver"],
            "permintaan_dana": {
                "stage": "PERMINTAAN_DANA",
                "stage_label": "Biaya Pengiriman DO / Picking List",
                "nomor_dokumen": r["no_pl"] or r["no_do"],
                "tanggal": str(r["tgl_pl"] or r["tgl_do"]),
                "nominal": shipping,
                "pic": r["pic_do"],
                "status": "TERCATAT DI DO",
                "is_available": shipping > 0,
                "notes": f"No. PL: {r['no_pl'] or '—'} | No. SO: {r['no_so'] or '—'} (Tabel public.permintaan_dana kosong di ERP; biaya diambil dari do_tbl.shippingcosts).",
            },
            "travel_request": {
                "stage": "TRAVEL_REQUEST",
                "stage_label": "Penugasan Ekspedisi / SIPB",
                "nomor_dokumen": tr_doc_no,
                "tanggal": tr_date,
                "nominal": shipping if has_transport else None,
                "pic": tr_pic,
                "status": "EXTERNAL TRANSPORTER" if r["istransporter"] else ("INTERNAL ARMADA" if has_transport else None),
                "is_available": has_transport,
                "notes": f"Transporter: {r['transporter']} | Driver: {r['driver']} | Nopol: {r['lic_plate'] or '—'}",
            },
            "delivery_order": {
                "stage": "DELIVERY_ORDER",
                "stage_label": "Delivery Order (DO)",
                "nomor_dokumen": r["no_do"],
                "tanggal": str(r["tgl_do"]),
                "nominal": shipping,
                "pic": r["pic_do"],
                "status": DO_STATUS_MAP.get((r["status_do"] or "").strip(), r["status_do"] or "Send").upper(),
                "is_available": True,
                "notes": f"Diterima: {r['received_date'] or 'Belum'} oleh {r['received_name'] or '—'} | Tujuan: {r['rute']}",
            },
            "frdo": {
                "stage": "FRDO",
                "stage_label": "Form Receipt DO (Return Date)",
                "nomor_dokumen": r["no_do"] if has_frdo else None,
                "tanggal": str(r["return_date"]) if has_frdo else None,
                "nominal": shipping if has_frdo else None,
                "pic": r["received_name"] or None if has_frdo else None,
                "status": "RETURNED" if has_frdo else None,
                "is_available": has_frdo,
                "notes": (
                    f"Dokumen DO kembali tanggal {r['return_date']} (diterima customer: {r['received_date'] or '—'})."
                    if has_frdo
                    else f"Barang diterima tanggal {r['received_date'] or '—'}, menunggu tanggal kembali fisik DO (do_tbl.return_date)."
                ),
            },
            "invoice": {
                "stage": "INVOICE",
                "stage_label": "Faktur Penjualan (penjualando)",
                "nomor_dokumen": r["no_invoice"] if has_invoice else None,
                "tanggal": str(r["tgl_invoice"]) if r["tgl_invoice"] else None,
                "nominal": inv_nom,
                "pic": r["pic_inv"] if has_invoice else None,
                "status": "VARIANCE BIAYA" if flow_status == "NEED_REVIEW" else ("TERBIT" if has_invoice else None),
                "is_available": has_invoice,
                "notes": (
                    f"Selisih biaya pengiriman DO (Rp {shipping:,.0f}) vs Biaya Lain Faktur (Rp {inv_biayalain:,.0f}). Nilai Faktur: Rp {float(r['nilai_invoice'] or 0):,.0f}."
                    if flow_status == "NEED_REVIEW"
                    else (
                        f"No. Faktur: {r['no_invoice']} | Grand Total Faktur: Rp {float(r['nilai_invoice'] or 0):,.0f}"
                        if has_invoice
                        else None
                    )
                ),
            },
            "transfer": {
                "stage": "TRANSFER",
                "stage_label": "Bukti Pelunasan (pembayaran_piutang)",
                "nomor_dokumen": (r["no_pembayaran_piutang"] or r["no_invoice"]) if has_transfer else None,
                "tanggal": str(r["pay_tanggal"] or r["tgl_bayar"] or r["tgl_invoice"]) if has_transfer else None,
                "nominal": shipping if has_transfer else None,
                "pic": r["pic_pay"] if has_transfer else None,
                "status": "SETTLED" if has_transfer else None,
                "is_available": has_transfer,
                "notes": (
                    f"No. Pembayaran: {r['no_pembayaran_piutang'] or 'Lunas di Faktur'} | Jumlah Bayar Faktur: Rp {float(r['jumlah_bayar'] or 0):,.0f}"
                    if has_transfer
                    else ("Menunggu rekonsiliasi selisih biaya DO vs Faktur" if flow_status == "NEED_REVIEW" else None)
                ),
            },
            "variance_nominal": variance_nom,
            "variance_pct": variance_pct,
            "status": flow_status,
            "status_label": status_label,
            "waiting_reason": waiting_reason,
        })

    return {
        "kpi": {
            "total_do": int(kpi_row["total_do"]) if kpi_row else 0,
            "total_permintaan_dana": float(kpi_row["total_permintaan_dana"]) if kpi_row else 0.0,
            "total_frdo": int(kpi_row["total_frdo"]) if kpi_row else 0,
            "total_invoice": float(kpi_row["total_invoice"]) if kpi_row else 0.0,
            "total_transfer": float(kpi_row["total_transfer"]) if kpi_row else 0.0,
            "complete_count": int(kpi_row["complete_count"]) if kpi_row else 0,
            "outstanding_count": int(kpi_row["outstanding_count"]) if kpi_row else 0,
            "outstanding_amount": float(kpi_row["outstanding_amount"]) if kpi_row else 0.0,
            "need_review_count": int(kpi_row["need_review_count"]) if kpi_row else 0,
        },
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1,
        },
        "data_note": (
            "100% Real Data (cpa_existing): Biaya pengiriman diambil dari public.do_tbl.shippingcosts & public.packinglist (no_pl); "
            "FRDO kembali dari public.do_tbl.return_date; Faktur dari public.penjualando + public.penjualan; "
            "dan Pelunasan dari public.pembayaran_piutang_detail + public.pembayaran_piutang. "
            "Status Need Review dihitung dari selisih nyata antara do_tbl.shippingcosts dan penjualan.biayalain."
        ),
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
