"""
Router — Finance & Akuntansi (Cost Intelligence & Accounts Receivable)
Single Source of Truth & 100% Real Data dari database produksi (cpa_existing)
serta tabel operasional pendamping (cpa_analytics).
"""
from datetime import date, datetime, timedelta
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import structlog

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_existing_db, get_analytics_db, analytics_engine
from app.models.analytics.models import ARCollectionConfirmation, ARCustomerIncentive

logger = structlog.get_logger()

router = APIRouter()
security = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_analytics_db),
):
    if not credentials:
        return None
    try:
        from jose import jwt
        from app.config import settings
        from app.models.analytics.models import AppUser
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        if not username:
            return None
        user = db.query(AppUser).filter_by(username=username, is_active=True).first()
        if user and user.role in ["warehouse", "warehouse_staff"]:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak: Akun dengan role gudang/inventori tidak diizinkan mengakses modul Finance."
            )
        return user
    except HTTPException:
        raise
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLE SOURCE OF TRUTH — SHARED SQL BUILDERS (AR & GOODS IN TRANSIT)
# ═══════════════════════════════════════════════════════════════════════════════

def _get_ar_cutoff_date(scope: str = "ACTIVE") -> str:
    """Filter horizon waktu piutang: ACTIVE (H2 2026), YTD_2026, ALL, atau AR_LEDGER."""
    s = (scope or "ACTIVE").upper()
    if s in ("ALL", "AR_LEDGER"):
        return "2014-01-01"
    if s == "YTD_2026":
        return "2026-01-01"
    return "2026-07-01"


def _get_ar_scope_note(scope: str = "ACTIVE") -> str:
    """Catatan transparansi sumber data AR pada database cpa_existing."""
    s = (scope or "ACTIVE").upper()
    if s == "AR_LEDGER":
        return (
            "Sumber Data: Buku Besar Piutang (public.acc_ar_faktur, sinkronisasi s/d 07 Feb 2024 — "
            "1.397 faktur belum lunas dengan saldo riil Rp 140,07 Miliar)."
        )
    return (
        "Sumber Data: Faktur Penjualan Operasional (public.penjualan LEFT JOIN public.acc_ar_faktur). "
        "Catatan: tabel akuntansi (acc_ar_faktur & pembayaran_piutang) di database cpa_existing tercatat s/d Februari 2024; "
        "gunakan filter 'Buku Besar AR (acc_ar_faktur)' untuk melihat 1.397 faktur belum lunas pada buku besar akuntansi."
    )


def _git_unbilled_where(alias: str = "d") -> str:
    """Single Source of Truth kriteria DO Goods In Transit (belum diterbitkan invoice penjualan)."""
    return (
        f"{alias}.status IN ('S', 'R', 'D') "
        f"AND NOT EXISTS (SELECT 1 FROM penjualando pd WHERE pd.no_do = {alias}.nomor) "
        f"AND NOT EXISTS (SELECT 1 FROM penjualan p WHERE p.no_do = {alias}.nomor AND p.status <> 'C')"
    )


def _ar_open_invoices_cte(
    scope: str = "ACTIVE",
    kantor_filter: str = "",
    extra_where: str = "",
) -> str:
    """
    Single Source of Truth CTE `inv` untuk seluruh perhitungan Open Accounts Receivable (AR).
    Menghasilkan kolom standar:
      no_penjualan, no_faktur, tanggal, invoice_date, id_customer, nama_customer, telepon,
      id_kantor, id_sales, nama_sales, batas_kredit, top_days, nominal_invoice, sudah_bayar,
      os, outstanding, due_date, dod, days_overdue
    """
    s = (scope or "ACTIVE").upper()
    if s == "AR_LEDGER":
        return f"""
            SELECT
                COALESCE(NULLIF(a.no_invoice, ''), a.ar_number) AS no_penjualan,
                COALESCE(NULLIF(p.faktur, ''), NULLIF(a.no_invoice, ''), a.ar_number) AS no_faktur,
                COALESCE(a.invoice_date, a.ar_date, p.tanggal) AS tanggal,
                COALESCE(a.invoice_date, a.ar_date, p.tanggal) AS invoice_date,
                COALESCE(a.customer_code, p.id_customer, 'UNKNOWN') AS id_customer,
                COALESCE(c.customer, p.kepada, a.customer_code, 'Pelanggan Umum') AS nama_customer,
                COALESCE(c.telepon, '-') AS telepon,
                COALESCE(c.id_kantor, 'HO') AS id_kantor,
                COALESCE(NULLIF(a.id_salesman, ''), NULLIF(p.id_salesman, ''), NULLIF(c.id_sales, ''), 'UNASSIGNED') AS id_sales,
                COALESCE(peg.nama, NULLIF(a.id_salesman, ''), NULLIF(p.id_salesman, ''), 'Account Manager') AS nama_sales,
                COALESCE(c.batas_kredit, 0) AS batas_kredit,
                COALESCE(NULLIF(a.top, 0), p.top, c.top, 30) AS top_days,
                COALESCE(NULLIF(a.total, 0), a.amount, p.grandtotal, 0) AS nominal_invoice,
                COALESCE(a.bayar, 0) AS sudah_bayar,
                (COALESCE(NULLIF(a.total, 0), a.amount, p.grandtotal, 0) - COALESCE(a.bayar, 0)) AS os,
                (COALESCE(NULLIF(a.total, 0), a.amount, p.grandtotal, 0) - COALESCE(a.bayar, 0)) AS outstanding,
                COALESCE(
                    a.due_date,
                    p.tgl_jatuh_tempo,
                    COALESCE(a.tgl_terimainvoice, a.invoice_date, a.ar_date) + (COALESCE(NULLIF(a.top, 0), p.top, c.top, 30) * interval '1 day')
                )::date AS due_date,
                (CURRENT_DATE - COALESCE(
                    a.due_date,
                    p.tgl_jatuh_tempo,
                    COALESCE(a.tgl_terimainvoice, a.invoice_date, a.ar_date) + (COALESCE(NULLIF(a.top, 0), p.top, c.top, 30) * interval '1 day')
                )::date) AS dod,
                (CURRENT_DATE - COALESCE(
                    a.due_date,
                    p.tgl_jatuh_tempo,
                    COALESCE(a.tgl_terimainvoice, a.invoice_date, a.ar_date) + (COALESCE(NULLIF(a.top, 0), p.top, c.top, 30) * interval '1 day')
                )::date) AS days_overdue
            FROM acc_ar_faktur a
            LEFT JOIN penjualan p ON p.no_penjualan = a.no_invoice
            LEFT JOIN customer c ON c.id_kontak = COALESCE(a.customer_code, p.id_customer)
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(NULLIF(a.id_salesman, ''), NULLIF(p.id_salesman, ''), c.id_sales)
            WHERE (COALESCE(NULLIF(a.total, 0), a.amount, p.grandtotal, 0) - COALESCE(a.bayar, 0)) > 100
              AND COALESCE(a.invoice_date, a.ar_date) >= CAST(:cutoff AS date)
              {kantor_filter}
              {extra_where}
        """
    return f"""
        SELECT
            p.no_penjualan,
            COALESCE(NULLIF(p.faktur, ''), p.no_penjualan) AS no_faktur,
            p.tanggal,
            p.tanggal AS invoice_date,
            p.id_customer,
            COALESCE(c.customer, p.kepada, 'Pelanggan Umum') AS nama_customer,
            COALESCE(c.telepon, '-') AS telepon,
            COALESCE(c.id_kantor, 'HO') AS id_kantor,
            COALESCE(NULLIF(p.id_salesman, ''), NULLIF(a.id_salesman, ''), NULLIF(c.id_sales, ''), 'UNASSIGNED') AS id_sales,
            COALESCE(peg.nama, NULLIF(p.id_salesman, ''), NULLIF(a.id_salesman, ''), 'Account Manager') AS nama_sales,
            COALESCE(c.batas_kredit, 0) AS batas_kredit,
            COALESCE(p.top, c.top, 30) AS top_days,
            p.grandtotal AS nominal_invoice,
            COALESCE(a.bayar, p.total_bayar, 0) AS sudah_bayar,
            (p.grandtotal - COALESCE(a.bayar, p.total_bayar, 0)) AS os,
            (p.grandtotal - COALESCE(a.bayar, p.total_bayar, 0)) AS outstanding,
            COALESCE(
                p.tgl_jatuh_tempo,
                a.due_date,
                p.tgl_terimainvoice + (COALESCE(p.top, c.top, 30) * interval '1 day'),
                p.tanggal + (COALESCE(p.top, c.top, 30) * interval '1 day')
            )::date AS due_date,
            (CURRENT_DATE - COALESCE(
                p.tgl_jatuh_tempo,
                a.due_date,
                p.tgl_terimainvoice + (COALESCE(p.top, c.top, 30) * interval '1 day'),
                p.tanggal + (COALESCE(p.top, c.top, 30) * interval '1 day')
            )::date) AS dod,
            (CURRENT_DATE - COALESCE(
                p.tgl_jatuh_tempo,
                a.due_date,
                p.tgl_terimainvoice + (COALESCE(p.top, c.top, 30) * interval '1 day'),
                p.tanggal + (COALESCE(p.top, c.top, 30) * interval '1 day')
            )::date) AS days_overdue
        FROM penjualan p
        LEFT JOIN customer c ON c.id_kontak = p.id_customer
        LEFT JOIN acc_ar_faktur a ON p.no_penjualan = a.no_invoice
        LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(NULLIF(p.id_salesman, ''), NULLIF(a.id_salesman, ''), c.id_sales)
        WHERE p.status IN ('P', 'A')
          AND (p.grandtotal - COALESCE(a.bayar, p.total_bayar, 0)) > 100
          AND p.tanggal >= CAST(:cutoff AS date)
          {kantor_filter}
          {extra_where}
    """


# ─── 0. Metadata (Cabang & Periode Real) ─────────────────────────────────────
@router.get("/meta")
async def get_finance_metadata(
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    Metadata filter master data real dari database cpa_existing:
    - Cabang dari internal_kantor_cabang
    - Gudang utama dari gudang
    - Periode tanggal riil berdasarkan data transaksi
    """
    try:
        branches_rows = db.execute(text("""
            SELECT id_kantor_cabang as id, nama, numbercode 
            FROM internal_kantor_cabang 
            WHERE aktif = true 
            ORDER BY id_kantor_cabang
        """)).fetchall()

        branches = [
            {"id": "ALL", "label": "Semua Cabang & Gudang", "code": "ALL"}
        ]
        for r in branches_rows:
            branches.append({
                "id": str(r.id),
                "label": f"Cabang {r.nama}",
                "code": str(r.numbercode or r.id),
            })

        warehouses_rows = db.execute(text("""
            SELECT id_gudang, gudang 
            FROM gudang 
            WHERE id_gudang IN ('001', '005', '007', '009', '010', '011', '012', '013', '014', '098')
            ORDER BY gudang
        """)).fetchall()

        for w in warehouses_rows:
            branches.append({
                "id": f"GDG-{w.id_gudang}",
                "label": f"Gudang {w.gudang}",
                "code": str(w.id_gudang),
            })

        periods = [
            {"id": "CURRENT_MONTH", "label": "Bulan Berjalan"},
            {"id": "PREV_MONTH", "label": "Bulan Sebelumnya"},
            {"id": "Q4_2026", "label": "Kuartal 4 2026 (Okt - Des)"},
            {"id": "Q3_2026", "label": "Kuartal 3 2026 (Jul - Sep)"},
            {"id": "YTD_2026", "label": "Tahun Berjalan (YTD 2026)"},
            {"id": "AR_LEDGER", "label": "Buku Besar AR (acc_ar_faktur)"},
            {"id": "ALL", "label": "Semua Periode Transaksi"},
        ]

        return {
            "branches": branches,
            "periods": periods,
        }
    except Exception as e:
        logger.error("finance.meta.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat metadata finance: {str(e)}")


# ─── 1. Executive Dashboard ──────────────────────────────────────────────────
@router.get("/executive")
async def get_executive_finance_dashboard(
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    Ringkasan Executive Finance & Logistics 100% Real Data dari cpa_existing:
    - Total DO, Shipping Cost, Transport Cost (Ekspedisi vs Internal), Lead Time riil dari public.do_tbl
    - Total Pengajuan Kas/Budget dari public.acc_kas
    - Top Customer, Sales, Vendor berdasarkan realisasi biaya pengiriman (do_tbl.shippingcosts)
    - Trend bulanan 12 bulan terakhir tanpa faktor pengali sintetis
    """
    try:
        # 1. Aggregat DO & Shipping Cost riil dari public.do_tbl
        do_agg = db.execute(text("""
            SELECT 
                COUNT(*) AS total_do,
                COALESCE(SUM(shippingcosts), 0) AS total_shipping_cost,
                COALESCE(SUM(CASE 
                    WHEN istransporter = true OR NULLIF(TRIM(transporter), '') IS NOT NULL 
                    THEN shippingcosts ELSE 0 
                END), 0) AS total_transport_cost,
                ROUND(AVG(CASE 
                    WHEN leadtime > 0 THEN leadtime 
                    WHEN received_date IS NOT NULL AND COALESCE(tgl_keluar, tanggal) IS NOT NULL 
                         AND (received_date - COALESCE(tgl_keluar, tanggal)) >= 0
                    THEN (received_date - COALESCE(tgl_keluar, tanggal))
                    ELSE NULL 
                END)::numeric, 1) AS avg_leadtime,
                COUNT(DISTINCT NULLIF(TRIM(transporter), '')) AS active_transporters
            FROM do_tbl
            WHERE shippingcosts > 0
        """)).fetchone()

        total_do = int(do_agg.total_do or 0) if do_agg else 0
        total_shipping_cost = float(do_agg.total_shipping_cost or 0.0) if do_agg else 0.0
        total_transport_cost = float(do_agg.total_transport_cost or 0.0) if do_agg else 0.0
        avg_leadtime = float(do_agg.avg_leadtime or 0.0) if do_agg and do_agg.avg_leadtime is not None else 0.0

        # 2. Aggregat Pengajuan Kas / Budget Request riil dari public.acc_kas
        kas_agg = db.execute(text("""
            SELECT 
                COALESCE(SUM(total), 0) AS total_budget,
                COALESCE(SUM(CASE WHEN status = 'D' THEN total ELSE 0 END), 0) AS approved_budget,
                COUNT(*) FILTER (WHERE status = 'P') AS pending_kas_count
            FROM acc_kas
        """)).fetchone()

        total_budget_request = float(kas_agg.total_budget or 0.0) if kas_agg else 0.0
        pending_kas_count = int(kas_agg.pending_kas_count or 0) if kas_agg else 0

        # 3. Pending DO verification: DO unbilled (Single Source of Truth _git_unbilled_where)
        pending_do_res = db.execute(text(f"""
            SELECT COUNT(*) 
            FROM do_tbl d
            WHERE {_git_unbilled_where('d')}
        """)).scalar()
        pending_do_count = int(pending_do_res or 0)
        total_pending_verification = pending_do_count + pending_kas_count

        # 4. Top Customer berdasarkan realisasi ongkos kirim di do_tbl
        top_cust_row = db.execute(text("""
            SELECT 
                COALESCE(c.customer, NULLIF(TRIM(d.kepada), ''), 'Pelanggan Umum') AS name,
                SUM(d.shippingcosts) AS total_cost,
                COUNT(*) AS do_count
            FROM do_tbl d
            LEFT JOIN customer c ON d.id_customer = c.id_kontak
            WHERE d.shippingcosts > 0
            GROUP BY 1
            ORDER BY total_cost DESC
            LIMIT 1
        """)).fetchone()

        top_customer = {
            "name": top_cust_row.name if top_cust_row else "-",
            "total_cost": float(top_cust_row.total_cost or 0.0) if top_cust_row else 0.0,
            "do_count": int(top_cust_row.do_count or 0) if top_cust_row else 0,
        }

        # 5. Top Sales berdasarkan realisasi ongkos kirim di do_tbl
        top_sales_row = db.execute(text("""
            SELECT 
                COALESCE(peg.nama, d.id_salesman) AS name,
                SUM(d.shippingcosts) AS total_cost,
                COUNT(*) AS do_count
            FROM do_tbl d
            LEFT JOIN pegawai peg ON d.id_salesman = peg.id_pegawai
            WHERE d.shippingcosts > 0 AND NULLIF(TRIM(d.id_salesman), '') IS NOT NULL
            GROUP BY 1
            ORDER BY total_cost DESC
            LIMIT 1
        """)).fetchone()

        top_sales = {
            "name": top_sales_row.name if top_sales_row else "-",
            "total_cost": float(top_sales_row.total_cost or 0.0) if top_sales_row else 0.0,
            "do_count": int(top_sales_row.do_count or 0) if top_sales_row else 0,
            "variance_pct": None,
        }

        # 6. Top Vendor Transporter beserta On-Time Rate riil (leadtime <= 3 hari SLA)
        top_vendor_row = db.execute(text("""
            SELECT 
                TRIM(transporter) AS name,
                COUNT(*) AS shipment_count,
                SUM(shippingcosts) AS total_cost,
                ROUND(AVG(CASE WHEN leadtime > 0 THEN leadtime ELSE NULL END)::numeric, 1) AS avg_lt,
                ROUND(
                    COUNT(*) FILTER (WHERE COALESCE(leadtime, 0) <= 3)::numeric
                    / NULLIF(COUNT(*), 0) * 100,
                    1
                ) AS on_time_rate
            FROM do_tbl
            WHERE NULLIF(TRIM(transporter), '') IS NOT NULL AND shippingcosts > 0
            GROUP BY TRIM(transporter)
            ORDER BY shipment_count DESC
            LIMIT 1
        """)).fetchone()

        top_vendor = {
            "name": top_vendor_row.name if top_vendor_row else "-",
            "shipment_count": int(top_vendor_row.shipment_count or 0) if top_vendor_row else 0,
            "total_cost": float(top_vendor_row.total_cost or 0.0) if top_vendor_row else 0.0,
            "on_time_rate": float(top_vendor_row.on_time_rate or 0.0) if top_vendor_row else 0.0,
        }

        # 7. Monthly Trends (12 bulan terakhir dari do_tbl dan acc_kas tanpa pengali sintetis)
        trend_rows = db.execute(text("""
            WITH do_m AS (
                SELECT 
                    DATE_TRUNC('month', tanggal)::date AS m_date,
                    TO_CHAR(DATE_TRUNC('month', tanggal), 'Mon YYYY') AS period,
                    COALESCE(SUM(shippingcosts), 0) AS actual_cost,
                    COALESCE(SUM(CASE 
                        WHEN istransporter = true OR NULLIF(TRIM(transporter), '') IS NOT NULL 
                        THEN shippingcosts ELSE 0 
                    END), 0) AS transporter_cost,
                    COUNT(*) AS shipment_count
                FROM do_tbl
                WHERE shippingcosts > 0 AND tanggal IS NOT NULL
                GROUP BY 1, 2
                ORDER BY m_date DESC
                LIMIT 12
            ),
            kas_m AS (
                SELECT 
                    DATE_TRUNC('month', tanggal)::date AS m_date,
                    COALESCE(SUM(total), 0) AS kas_total
                FROM acc_kas
                WHERE tanggal IS NOT NULL
                GROUP BY 1
            )
            SELECT 
                d.m_date,
                d.period,
                d.actual_cost,
                d.transporter_cost,
                d.shipment_count,
                COALESCE(k.kas_total, 0) AS budget_request
            FROM do_m d
            LEFT JOIN kas_m k ON k.m_date = d.m_date
            ORDER BY d.m_date ASC
        """)).fetchall()

        shipping_cost_trend = []
        variance_trend = []

        for row in trend_rows:
            actual = float(row.actual_cost or 0.0)
            trans_cost = float(row.transporter_cost or 0.0)
            br = float(row.budget_request or 0.0)
            internal_cost = round(actual - trans_cost, 2)
            internal_pct = round((internal_cost / actual) * 100, 2) if actual > 0 else 0.0

            shipping_cost_trend.append({
                "period": row.period,
                "budget_request": br,
                "actual_cost": actual,
                "estimasi_sales": trans_cost,
            })
            variance_trend.append({
                "period": row.period,
                "variance_nominal": internal_cost,
                "variance_pct": internal_pct,
            })

        # 8. Top 5 Customers (Realisasi Shipping Cost & Jumlah DO)
        top_customers_rows = db.execute(text("""
            SELECT 
                COALESCE(c.customer, NULLIF(TRIM(d.kepada), ''), 'Pelanggan Umum') AS name,
                SUM(d.shippingcosts) AS shipping_cost,
                SUM(CASE 
                    WHEN d.istransporter = false AND NULLIF(TRIM(d.transporter), '') IS NULL 
                    THEN d.shippingcosts ELSE 0 
                END) AS internal_shipping_cost,
                COUNT(*) AS shipments
            FROM do_tbl d
            LEFT JOIN customer c ON d.id_customer = c.id_kontak
            WHERE d.shippingcosts > 0
            GROUP BY 1
            ORDER BY shipping_cost DESC
            LIMIT 5
        """)).fetchall()

        top_customers = [
            {
                "name": r.name,
                "shipping_cost": float(r.shipping_cost or 0.0),
                "variance": float(r.internal_shipping_cost or 0.0),
                "shipments": int(r.shipments or 0),
            }
            for r in top_customers_rows
        ]

        # 9. Top 5 Sales Reps (Realisasi Shipping Cost Ekspedisi vs Total)
        top_sales_rows = db.execute(text("""
            SELECT 
                COALESCE(peg.nama, d.id_salesman) AS name,
                SUM(d.shippingcosts) AS realisasi,
                SUM(CASE 
                    WHEN d.istransporter = true OR NULLIF(TRIM(d.transporter), '') IS NOT NULL 
                    THEN d.shippingcosts ELSE 0 
                END) AS transporter_cost,
                COUNT(*) AS shipments
            FROM do_tbl d
            LEFT JOIN pegawai peg ON d.id_salesman = peg.id_pegawai
            WHERE d.shippingcosts > 0 AND NULLIF(TRIM(d.id_salesman), '') IS NOT NULL
            GROUP BY 1
            ORDER BY realisasi DESC
            LIMIT 5
        """)).fetchall()

        top_sales_list = [
            {
                "name": r.name,
                "estimasi": float(r.transporter_cost or 0.0),
                "realisasi": float(r.realisasi or 0.0),
                "variance_pct": round(
                    ((float(r.realisasi or 0.0) - float(r.transporter_cost or 0.0)) / float(r.realisasi or 1.0)) * 100,
                    1,
                ),
            }
            for r in top_sales_rows
        ]

        # 10. Top 5 Vendors (100% Real On-Time Rate & Lead Time)
        top_vendors_rows = db.execute(text("""
            SELECT 
                TRIM(transporter) AS name,
                COUNT(*) AS shipment_count,
                SUM(shippingcosts) AS total_cost,
                COALESCE(ROUND(AVG(CASE WHEN leadtime > 0 THEN leadtime ELSE NULL END)::numeric, 1), 0.0) AS avg_lt,
                ROUND(
                    COUNT(*) FILTER (WHERE COALESCE(leadtime, 0) <= 3)::numeric
                    / NULLIF(COUNT(*), 0) * 100,
                    1
                ) AS on_time_rate
            FROM do_tbl
            WHERE NULLIF(TRIM(transporter), '') IS NOT NULL AND shippingcosts > 0
            GROUP BY TRIM(transporter)
            ORDER BY shipment_count DESC
            LIMIT 5
        """)).fetchall()

        top_vendors = [
            {
                "name": r.name,
                "shipment_count": int(r.shipment_count or 0),
                "total_cost": float(r.total_cost or 0.0),
                "avg_lead_time": float(r.avg_lt or 0.0),
                "on_time_rate": float(r.on_time_rate or 0.0),
            }
            for r in top_vendors_rows
        ]

        internal_fleet_cost = round(total_shipping_cost - total_transport_cost, 2)
        internal_fleet_pct = round((internal_fleet_cost / total_shipping_cost) * 100, 2) if total_shipping_cost > 0 else 0.0

        kpi_data = {
            "total_delivery_order": total_do,
            "total_shipping_cost": total_shipping_cost,
            "total_transport_cost": total_transport_cost,
            "total_budget_request": total_budget_request,
            "total_actual_cost": total_shipping_cost,
            "total_variance": internal_fleet_cost,
            "total_variance_pct": internal_fleet_pct,
            "pending_verification": total_pending_verification,
            "pending_do_unbilled": pending_do_count,
            "pending_kas_verification": pending_kas_count,
            "average_lead_time_days": avg_leadtime,
            "top_customer": top_customer,
            "top_sales": top_sales,
            "top_vendor": top_vendor,
        }

        # 11. Shipment per Month (On-Time <= 3 hari vs Delayed > 3 hari, tanpa max(1, ...))
        shipment_month_rows = db.execute(text("""
            SELECT 
                TO_CHAR(DATE_TRUNC('month', tanggal), 'Mon YY') AS month,
                DATE_TRUNC('month', tanggal) AS m_date,
                COUNT(*) AS total_shipment,
                COUNT(*) FILTER (WHERE COALESCE(leadtime, 0) <= 3) AS on_time,
                COUNT(*) FILTER (WHERE COALESCE(leadtime, 0) > 3) AS delayed
            FROM do_tbl
            WHERE shippingcosts > 0 AND tanggal IS NOT NULL
            GROUP BY DATE_TRUNC('month', tanggal)
            ORDER BY m_date DESC
            LIMIT 12
        """)).fetchall()

        shipment_per_month = [
            {
                "month": r.month,
                "total_shipment": int(r.total_shipment or 0),
                "on_time": int(r.on_time or 0),
                "delayed": int(r.delayed or 0),
            }
            for r in reversed(shipment_month_rows)
        ]

        # 12. Average Lead Time vs SLA Target (3.0 hari)
        lead_time_rows = db.execute(text("""
            SELECT 
                TO_CHAR(DATE_TRUNC('month', tanggal), 'Mon YY') AS period,
                DATE_TRUNC('month', tanggal) AS m_date,
                COALESCE(ROUND(AVG(CASE WHEN leadtime > 0 THEN leadtime ELSE NULL END)::numeric, 1), 0.0) AS avg_lt
            FROM do_tbl
            WHERE shippingcosts > 0 AND tanggal IS NOT NULL
            GROUP BY DATE_TRUNC('month', tanggal)
            ORDER BY m_date DESC
            LIMIT 12
        """)).fetchall()

        average_lead_time = [
            {
                "period": r.period,
                "lead_time_days": float(r.avg_lt or 0.0),
                "target_sla_days": 3.0,
            }
            for r in reversed(lead_time_rows)
        ]

        charts_data = {
            "shipping_cost_trend": shipping_cost_trend,
            "variance_trend": variance_trend,
            "top_customers": top_customers,
            "top_sales": top_sales_list,
            "top_vendors": top_vendors,
            "shipment_per_month": shipment_per_month,
            "average_lead_time": average_lead_time,
        }

        return {
            "kpi": kpi_data,
            "charts": charts_data,
            "data_note": (
                "100% Real Data dari public.do_tbl (49.990 DO s/d Nov 2026) dan public.acc_kas (22.635 voucher kas s/d Feb 2024). "
                "Kolom estimasi ongkir sales tidak tersedia di skema SO/DO cpa_existing, sehingga selisih menampilkan porsi "
                "Biaya Pengiriman Ekspedisi Pihak Ketiga vs Armada Internal."
            ),
        }

    except Exception as e:
        logger.error("finance.executive.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat data executive finance: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# AR EXECUTIVE SUMMARY & 9 SUB-MENUS (FINANCE & AKUNTANSI)
# ═══════════════════════════════════════════════════════════════════════════════

_AR_TABLES_INITIALIZED = False


def _ensure_ar_analytics_tables(db_analytics: Session, db_existing: Session):
    """
    Pastikan tabel operasional ARCollectionConfirmation & ARCustomerIncentive tersedia di cpa_analytics.
    Sesuai prinsip Real Data First: TIDAK ADA seeding data sintetis/dummy.
    """
    global _AR_TABLES_INITIALIZED
    if _AR_TABLES_INITIALIZED:
        return
    try:
        ARCollectionConfirmation.__table__.create(bind=analytics_engine, checkfirst=True)
        ARCustomerIncentive.__table__.create(bind=analytics_engine, checkfirst=True)
        _AR_TABLES_INITIALIZED = True
    except Exception as e:
        db_analytics.rollback()
        logger.warning("finance.ar_tables.init_warn", error=str(e))


# ─── 10. AR EXECUTIVE SUMMARY ────────────────────────────────────────────────
@router.get("/ar-summary")
async def get_ar_executive_summary(
    scope: str = Query("ACTIVE", description="ACTIVE (Jul-Nov 2026) | YTD_2026 | AR_LEDGER | ALL"),
    id_kantor: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    db_analytics: Session = Depends(get_analytics_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    AR Executive Summary (Single Source of Truth via _ar_open_invoices_cte):
    Gambaran posisi piutang perusahaan secara keseluruhan (Total OS x OS Overdue),
    Aging Breakdown, Top 8 Overdue Customers, dan ringkasan ke-9 sub-menu AR.
    """
    try:
        _ensure_ar_analytics_tables(db_analytics, db)
        cutoff = _get_ar_cutoff_date(scope)
        params: Dict[str, Any] = {"cutoff": cutoff}
        kantor_filter = ""
        if id_kantor and id_kantor != "ALL":
            kantor_filter = "AND COALESCE(c.id_kantor, 'HO') = :id_kantor"
            params["id_kantor"] = id_kantor

        inv_cte = _ar_open_invoices_cte(scope=scope, kantor_filter=kantor_filter)

        sql = f"""
            WITH inv AS (
                {inv_cte}
            )
            SELECT 
                COUNT(*) AS total_open_invoices,
                COUNT(DISTINCT id_customer) AS total_customers_with_ar,
                COALESCE(SUM(os), 0) AS total_os,
                COALESCE(SUM(CASE WHEN dod <= 0 THEN os ELSE 0 END), 0) AS current_os,
                COALESCE(SUM(CASE WHEN dod > 0 THEN os ELSE 0 END), 0) AS overdue_os,
                COUNT(CASE WHEN dod <= 0 THEN 1 END) AS current_invoices,
                COUNT(CASE WHEN dod > 0 THEN 1 END) AS overdue_invoices,
                COUNT(CASE WHEN dod BETWEEN -7 AND -1 THEN 1 END) AS upcoming_7d_count,
                COALESCE(SUM(CASE WHEN dod BETWEEN -7 AND -1 THEN os ELSE 0 END), 0) AS upcoming_7d_os,
                COUNT(CASE WHEN dod = 0 THEN 1 END) AS due_today_count,
                COALESCE(SUM(CASE WHEN dod = 0 THEN os ELSE 0 END), 0) AS due_today_os,
                COALESCE(SUM(CASE WHEN dod < -7 THEN os ELSE 0 END), 0) AS b_current_gt_7d,
                COUNT(CASE WHEN dod < -7 THEN 1 END) AS cnt_current_gt_7d,
                COALESCE(SUM(CASE WHEN dod BETWEEN 1 AND 30 THEN os ELSE 0 END), 0) AS b_od_1_30,
                COUNT(CASE WHEN dod BETWEEN 1 AND 30 THEN 1 END) AS cnt_od_1_30,
                COALESCE(SUM(CASE WHEN dod BETWEEN 31 AND 60 THEN os ELSE 0 END), 0) AS b_od_31_60,
                COUNT(CASE WHEN dod BETWEEN 31 AND 60 THEN 1 END) AS cnt_od_31_60,
                COALESCE(SUM(CASE WHEN dod BETWEEN 61 AND 90 THEN os ELSE 0 END), 0) AS b_od_61_90,
                COUNT(CASE WHEN dod BETWEEN 61 AND 90 THEN 1 END) AS cnt_od_61_90,
                COALESCE(SUM(CASE WHEN dod > 90 THEN os ELSE 0 END), 0) AS b_od_gt_90,
                COUNT(CASE WHEN dod > 90 THEN 1 END) AS cnt_od_gt_90
            FROM inv
        """
        agg = db.execute(text(sql), params).mappings().first()

        total_os = float(agg["total_os"] or 0)
        current_os = float(agg["current_os"] or 0)
        overdue_os = float(agg["overdue_os"] or 0)
        overdue_ratio_pct = round((overdue_os / total_os) * 100, 1) if total_os > 0 else 0.0
        current_ratio_pct = round((current_os / total_os) * 100, 1) if total_os > 0 else 0.0

        aging_buckets = [
            {
                "bucket": "Current (> 7 Hari)",
                "short_label": "Current",
                "amount": float(agg["b_current_gt_7d"] or 0),
                "invoice_count": int(agg["cnt_current_gt_7d"] or 0),
                "color": "#10B981",
                "status": "CURRENT",
            },
            {
                "bucket": "Upcoming Due (1-7 Hari)",
                "short_label": "H-7 Due",
                "amount": float(agg["upcoming_7d_os"] or 0),
                "invoice_count": int(agg["upcoming_7d_count"] or 0),
                "color": "#0EA5E9",
                "status": "UPCOMING",
            },
            {
                "bucket": "Jatuh Tempo Hari Ini",
                "short_label": "Due Today",
                "amount": float(agg["due_today_os"] or 0),
                "invoice_count": int(agg["due_today_count"] or 0),
                "color": "#F59E0B",
                "status": "DUE_TODAY",
            },
            {
                "bucket": "Overdue 1 - 30 Hari",
                "short_label": "OD 1-30",
                "amount": float(agg["b_od_1_30"] or 0),
                "invoice_count": int(agg["cnt_od_1_30"] or 0),
                "color": "#FB923C",
                "status": "OD_1_30",
            },
            {
                "bucket": "Overdue 31 - 60 Hari",
                "short_label": "OD 31-60",
                "amount": float(agg["b_od_31_60"] or 0),
                "invoice_count": int(agg["cnt_od_31_60"] or 0),
                "color": "#F97316",
                "status": "OD_31_60",
            },
            {
                "bucket": "Overdue 61 - 90 Hari",
                "short_label": "OD 61-90",
                "amount": float(agg["b_od_61_90"] or 0),
                "invoice_count": int(agg["cnt_od_61_90"] or 0),
                "color": "#EF4444",
                "status": "OD_61_90",
            },
            {
                "bucket": "Overdue > 90 Hari (Kritis)",
                "short_label": "OD > 90",
                "amount": float(agg["b_od_gt_90"] or 0),
                "invoice_count": int(agg["cnt_od_gt_90"] or 0),
                "color": "#DC2626",
                "status": "OD_GT_90",
            },
        ]
        for b in aging_buckets:
            b["percentage"] = round((b["amount"] / total_os) * 100, 1) if total_os > 0 else 0.0

        # Trend Total OS vs OS Overdue per bulan (8 bulan terakhir dari CTE yang sama)
        trend_sql = f"""
            WITH inv AS (
                {inv_cte}
            ),
            monthly AS (
                SELECT 
                    DATE_TRUNC('month', tanggal)::date AS m_date,
                    TO_CHAR(DATE_TRUNC('month', tanggal), 'Mon YYYY') AS period,
                    SUM(os) AS total_os,
                    SUM(CASE WHEN dod <= 0 THEN os ELSE 0 END) AS current_os,
                    SUM(CASE WHEN dod > 0 THEN os ELSE 0 END) AS overdue_os,
                    COUNT(*) AS invoice_count
                FROM inv
                WHERE tanggal IS NOT NULL
                GROUP BY 1, 2
                ORDER BY m_date DESC
                LIMIT 8
            )
            SELECT * FROM monthly ORDER BY m_date ASC
        """
        trend_rows = db.execute(text(trend_sql), params).mappings().all()
        os_vs_overdue_trend = [
            {
                "period": r["period"],
                "total_os": float(r["total_os"] or 0),
                "current_os": float(r["current_os"] or 0),
                "overdue_os": float(r["overdue_os"] or 0),
                "overdue_pct": round((float(r["overdue_os"] or 0) / float(r["total_os"] or 1)) * 100, 1),
                "invoice_count": int(r["invoice_count"] or 0),
            }
            for r in trend_rows
        ]

        # Top 8 Customer Total OS x Overdue dari CTE yang sama
        top_cust_sql = f"""
            WITH inv AS (
                {inv_cte}
            )
            SELECT 
                id_customer,
                MAX(nama_customer) AS nama_customer,
                SUM(os) AS total_os,
                SUM(CASE WHEN dod <= 0 THEN os ELSE 0 END) AS current_os,
                SUM(CASE WHEN dod > 0 THEN os ELSE 0 END) AS overdue_os,
                MAX(CASE WHEN dod > 0 THEN dod ELSE 0 END) AS max_days_overdue,
                COUNT(*) AS open_invoices
            FROM inv
            GROUP BY id_customer
            ORDER BY total_os DESC
            LIMIT 8
        """
        top_cust_rows = db.execute(text(top_cust_sql), params).mappings().all()
        top_os_vs_overdue = [
            {
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "total_os": float(r["total_os"] or 0),
                "current_os": float(r["current_os"] or 0),
                "overdue_os": float(r["overdue_os"] or 0),
                "overdue_ratio_pct": round((float(r["overdue_os"] or 0) / float(r["total_os"] or 1)) * 100, 1),
                "max_days_overdue": int(r["max_days_overdue"] or 0),
                "open_invoices": int(r["open_invoices"] or 0),
            }
            for r in top_cust_rows
        ]

        # Goods in Transit quick count menggunakan Single Source of Truth _git_unbilled_where
        git_row = db.execute(text(f"""
            SELECT COUNT(*) AS git_count
            FROM do_tbl d
            WHERE {_git_unbilled_where('d')}
        """)).mappings().first()
        git_count = int(git_row["git_count"] or 0) if git_row else 0

        # Pending ICU count dari cpa_existing.public.icu + cpa_analytics.analytics.ar_customer_incentives
        existing_icu_pending = int(db.execute(text("""
            SELECT COUNT(*) FROM icu WHERE status NOT IN ('C', 'R', 'P')
        """)).scalar() or 0)
        analytics_icu_pending = (
            db_analytics.query(ARCustomerIncentive)
            .filter(ARCustomerIncentive.status_approval.in_(["PENDING_MANAGER", "PENDING_FINANCE", "PENDING_DIREKSI"]))
            .count()
        )
        pending_icu_cnt = existing_icu_pending + analytics_icu_pending

        return {
            "kpi": {
                "total_os": total_os,
                "current_os": current_os,
                "overdue_os": overdue_os,
                "overdue_ratio_pct": overdue_ratio_pct,
                "current_ratio_pct": current_ratio_pct,
                "total_open_invoices": int(agg["total_open_invoices"] or 0),
                "current_invoices": int(agg["current_invoices"] or 0),
                "overdue_invoices": int(agg["overdue_invoices"] or 0),
                "total_customers_with_ar": int(agg["total_customers_with_ar"] or 0),
                "upcoming_7d_count": int(agg["upcoming_7d_count"] or 0),
                "upcoming_7d_os": float(agg["upcoming_7d_os"] or 0),
                "due_today_count": int(agg["due_today_count"] or 0),
                "due_today_os": float(agg["due_today_os"] or 0),
                "critical_od_gt_90_os": float(agg["b_od_gt_90"] or 0),
                "critical_od_gt_90_count": int(agg["cnt_od_gt_90"] or 0),
                "git_unbilled_count": git_count,
                "pending_icu_count": pending_icu_cnt,
            },
            "aging_buckets": aging_buckets,
            "os_vs_overdue_trend": os_vs_overdue_trend,
            "top_os_vs_overdue": top_os_vs_overdue,
            "data_note": _get_ar_scope_note(scope),
        }
    except Exception as e:
        logger.error("finance.ar_summary.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat AR Executive Summary: {str(e)}")


# ─── 11. TOP 20 AR ───────────────────────────────────────────────────────────
@router.get("/ar/top-20")
async def get_top_20_ar(
    scope: str = Query("ACTIVE", description="ACTIVE | YTD_2026 | AR_LEDGER | ALL"),
    category: Optional[str] = Query(None, description="ALL | TOP_PERFORMANCE | CRITICAL | WATCHLIST"),
    search: Optional[str] = None,
    limit: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    TOP 20 AR (Single Source of Truth via _ar_open_invoices_cte):
    Total piutang customer current & overdue dengan Total AR terbesar,
    dikategorikan ke dalam TOP_PERFORMANCE (lancar/overdue rendah) atau CRITICAL berdasarkan overduenya.
    """
    try:
        cutoff = _get_ar_cutoff_date(scope)
        params: Dict[str, Any] = {"cutoff": cutoff}
        search_cond = ""
        if search:
            search_cond = "AND (c.customer ILIKE :search OR COALESCE(p.id_customer, a.customer_code) ILIKE :search OR peg.nama ILIKE :search)"
            params["search"] = f"%{search.strip()}%"

        inv_cte = _ar_open_invoices_cte(scope=scope, extra_where=search_cond)

        sql = f"""
            WITH inv AS (
                {inv_cte}
            )
            SELECT 
                id_customer,
                MAX(nama_customer) AS nama_customer,
                MAX(id_kantor) AS id_kantor,
                MAX(id_sales) AS id_sales,
                MAX(nama_sales) AS nama_sales,
                MAX(batas_kredit) AS batas_kredit,
                MAX(top_days) AS top_days,
                COUNT(*) AS open_invoices,
                SUM(os) AS total_ar,
                SUM(CASE WHEN dod <= 0 THEN os ELSE 0 END) AS current_ar,
                SUM(CASE WHEN dod > 0 THEN os ELSE 0 END) AS overdue_ar,
                SUM(CASE WHEN dod BETWEEN 1 AND 30 THEN os ELSE 0 END) AS od_1_30,
                SUM(CASE WHEN dod BETWEEN 31 AND 60 THEN os ELSE 0 END) AS od_31_60,
                SUM(CASE WHEN dod > 60 THEN os ELSE 0 END) AS od_gt_60,
                COUNT(CASE WHEN dod > 0 THEN 1 END) AS overdue_invoices,
                MAX(CASE WHEN dod > 0 THEN dod ELSE 0 END) AS max_days_overdue
            FROM inv
            GROUP BY id_customer
            ORDER BY total_ar DESC
            LIMIT 80
        """
        rows = db.execute(text(sql), params).mappings().all()

        items = []
        sum_total_ar = 0.0
        sum_current_ar = 0.0
        sum_overdue_ar = 0.0

        for r in rows:
            total_ar = float(r["total_ar"] or 0)
            current_ar = float(r["current_ar"] or 0)
            overdue_ar = float(r["overdue_ar"] or 0)
            max_od = int(r["max_days_overdue"] or 0)
            od_ratio = round((overdue_ar / total_ar) * 100, 1) if total_ar > 0 else 0.0
            cur_ratio = round((current_ar / total_ar) * 100, 1) if total_ar > 0 else 0.0

            if max_od <= 15 and od_ratio <= 25.0:
                cat_code = "TOP_PERFORMANCE"
                cat_label = "Top Performance (Current Dominan)"
                action = "Pertahankan fasilitas TOP & prioritaskan alokasi stok"
            elif max_od > 60 or od_ratio >= 60.0:
                cat_code = "CRITICAL"
                cat_label = "Critical Overdue (Perlu Eskalasi)"
                action = "Tahan rilis DO baru & jadwalkan penagihan intensif bersama AM"
            else:
                cat_code = "WATCHLIST"
                cat_label = "Watchlist (Overdue Moderasi)"
                action = "Follow-up pembayaran jatuh tempo sebelum rilis PO berikutnya"

            if category and category.upper() not in ("ALL", "") and cat_code != category.upper():
                continue

            item = {
                "rank": len(items) + 1,
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "id_kantor": r["id_kantor"],
                "id_sales": r["id_sales"],
                "nama_sales": r["nama_sales"],
                "batas_kredit": float(r["batas_kredit"] or 0),
                "top_days": int(r["top_days"] or 30),
                "open_invoices": int(r["open_invoices"] or 0),
                "overdue_invoices": int(r["overdue_invoices"] or 0),
                "total_ar": total_ar,
                "current_ar": current_ar,
                "overdue_ar": overdue_ar,
                "od_1_30": float(r["od_1_30"] or 0),
                "od_31_60": float(r["od_31_60"] or 0),
                "od_gt_60": float(r["od_gt_60"] or 0),
                "current_ratio_pct": cur_ratio,
                "overdue_ratio_pct": od_ratio,
                "max_days_overdue": max_od,
                "category": cat_code,
                "category_label": cat_label,
                "recommended_action": action,
            }
            items.append(item)
            if len(items) >= limit:
                break

        for it in items:
            sum_total_ar += it["total_ar"]
            sum_current_ar += it["current_ar"]
            sum_overdue_ar += it["overdue_ar"]

        return {
            "summary": {
                "top20_total_ar": sum_total_ar,
                "top20_current_ar": sum_current_ar,
                "top20_overdue_ar": sum_overdue_ar,
                "top_performance_count": sum(1 for x in items if x["category"] == "TOP_PERFORMANCE"),
                "critical_count": sum(1 for x in items if x["category"] == "CRITICAL"),
                "watchlist_count": sum(1 for x in items if x["category"] == "WATCHLIST"),
            },
            "items": items,
            "data_note": _get_ar_scope_note(scope),
        }
    except Exception as e:
        logger.error("finance.top20_ar.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Top 20 AR: {str(e)}")


# ─── 12. COLLECTION ALERT ────────────────────────────────────────────────────
@router.get("/ar/collection-alert")
async def get_collection_alerts(
    bucket: str = Query("ALL", description="ALL | UPCOMING_7D | DUE_TODAY | OD_1_30 | OD_31_60 | OD_61_90 | OD_GT_90"),
    scope: str = Query("ACTIVE", description="ACTIVE | YTD_2026 | AR_LEDGER | ALL"),
    search: Optional[str] = None,
    limit: int = Query(150, ge=10, le=500),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    COLLECTION ALERT (Single Source of Truth via _ar_open_invoices_cte):
    Daftar invoice yang memerlukan tindakan segera:
    Upcoming overdue (7 hari ke depan), Due Today, OD 1-30, OD 31-60, OD 61-90, dan OD > 90 hari.
    """
    try:
        cutoff = _get_ar_cutoff_date(scope)
        params: Dict[str, Any] = {"cutoff": cutoff, "limit": limit}
        search_cond = ""
        if search:
            search_cond = (
                "AND (c.customer ILIKE :search "
                "OR COALESCE(p.no_penjualan, a.no_invoice, a.ar_number) ILIKE :search "
                "OR COALESCE(p.faktur, '') ILIKE :search "
                "OR peg.nama ILIKE :search)"
            )
            params["search"] = f"%{search.strip()}%"

        inv_cte = _ar_open_invoices_cte(scope=scope, extra_where=search_cond)

        sql = f"""
            WITH inv AS (
                {inv_cte}
            )
            SELECT *
            FROM inv
            WHERE days_overdue >= -7
            ORDER BY 
                CASE 
                    WHEN days_overdue = 0 THEN 1
                    WHEN days_overdue BETWEEN -7 AND -1 THEN 2
                    WHEN days_overdue BETWEEN 1 AND 30 THEN 3
                    WHEN days_overdue BETWEEN 31 AND 60 THEN 4
                    WHEN days_overdue BETWEEN 61 AND 90 THEN 5
                    ELSE 6
                END ASC,
                outstanding DESC
        """
        all_rows = db.execute(text(sql), params).mappings().all()

        bucket_summary = {
            "UPCOMING_7D": {"count": 0, "amount": 0.0, "label": "Upcoming Overdue (H-7 s/d H-1)"},
            "DUE_TODAY": {"count": 0, "amount": 0.0, "label": "Due Today (Jatuh Tempo Hari Ini)"},
            "OD_1_30": {"count": 0, "amount": 0.0, "label": "Overdue 1 - 30 Hari"},
            "OD_31_60": {"count": 0, "amount": 0.0, "label": "Overdue 31 - 60 Hari"},
            "OD_61_90": {"count": 0, "amount": 0.0, "label": "Overdue 61 - 90 Hari"},
            "OD_GT_90": {"count": 0, "amount": 0.0, "label": "Overdue > 90 Hari"},
        }

        filtered_items = []
        for r in all_rows:
            dod = int(r["days_overdue"] or 0)
            os_amt = float(r["outstanding"] or 0)

            if dod < 0:
                b_code = "UPCOMING_7D"
                b_label = f"Upcoming ({abs(dod)} hr lagi)"
                urgency = "REMINDER"
                tindakan = "Kirim pengingat jatuh tempo (H-7) & pastikan faktur pajak/TTI lengkap"
            elif dod == 0:
                b_code = "DUE_TODAY"
                b_label = "Due Today (Hari Ini)"
                urgency = "HIGH"
                tindakan = "Konfirmasi transfer hari ini ke bagian Finance/AP Customer"
            elif dod <= 30:
                b_code = "OD_1_30"
                b_label = f"OD 1-30 ({dod} hr)"
                urgency = "WARNING"
                tindakan = "Follow-up telepon & minta tanggal kepastian bayar (Promise to Pay)"
            elif dod <= 60:
                b_code = "OD_31_60"
                b_label = f"OD 31-60 ({dod} hr)"
                urgency = "HIGH"
                tindakan = "Kirim Surat Peringatan 1 (SP-1) & koordinasi kunjungan Account Manager"
            elif dod <= 90:
                b_code = "OD_61_90"
                b_label = f"OD 61-90 ({dod} hr)"
                urgency = "CRITICAL"
                tindakan = "Credit Review wajib, blokir sementara DO baru & eskalasi ke Sales Manager"
            else:
                b_code = "OD_GT_90"
                b_label = f"OD >90 ({dod} hr)"
                urgency = "CRITICAL"
                tindakan = "Credit Hold penuh, rapat penyelesaian piutang macet & somasi"

            bucket_summary[b_code]["count"] += 1
            bucket_summary[b_code]["amount"] += os_amt

            if bucket and bucket.upper() not in ("ALL", "") and b_code != bucket.upper():
                continue

            if len(filtered_items) < limit:
                filtered_items.append({
                    "no_penjualan": r["no_penjualan"],
                    "no_faktur": r["no_faktur"],
                    "invoice_date": str(r["invoice_date"]) if r["invoice_date"] else "-",
                    "due_date": str(r["due_date"]) if r["due_date"] else "-",
                    "id_customer": r["id_customer"],
                    "nama_customer": r["nama_customer"],
                    "telepon": r["telepon"],
                    "id_kantor": r["id_kantor"],
                    "id_sales": r["id_sales"],
                    "nama_sales": r["nama_sales"],
                    "top_days": int(r["top_days"] or 30),
                    "nominal_invoice": float(r["nominal_invoice"] or 0),
                    "sudah_bayar": float(r["sudah_bayar"] or 0),
                    "outstanding": os_amt,
                    "days_overdue": dod,
                    "bucket_code": b_code,
                    "bucket_label": b_label,
                    "urgency": urgency,
                    "recommended_action": tindakan,
                })

        return {
            "bucket_summary": bucket_summary,
            "total_alerts": sum(v["count"] for v in bucket_summary.values()),
            "total_alert_amount": sum(v["amount"] for v in bucket_summary.values()),
            "items": filtered_items,
            "data_note": _get_ar_scope_note(scope),
        }
    except Exception as e:
        logger.error("finance.collection_alert.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Collection Alert: {str(e)}")


# ─── 13. WEEKLY COLLECTION ACHIEVEMENT ───────────────────────────────────────
@router.get("/ar/weekly-collection")
async def get_weekly_collection_achievement(
    weeks: int = Query(12, ge=4, le=24),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    WEEKLY COLLECTION ACHIEVEMENT (100% Real Data dari pembayaran_piutang & acc_ar_faktur):
    - Actual Collection: SUM(pembayaran_piutang_detail.jumlah_bayar) per minggu
    - Target Collection: SUM(acc_ar_faktur.total) yang jatuh tempo (due_date) pada minggu tersebut
      (atau nilai tagihan jatuh tempo yang diselesaikan pada minggu tersebut bila due_date kosong)
    - Daily Postings: daftar pembayaran harian riil dari pembayaran_piutang
    """
    try:
        weekly_sql = """
            WITH wk_pay AS (
                SELECT 
                    DATE_TRUNC('week', h.tanggal)::date AS week_start,
                    (DATE_TRUNC('week', h.tanggal)::date + interval '6 days')::date AS week_end,
                    COUNT(DISTINCT h.no_pembayaran_piutang) AS voucher_count,
                    COUNT(DISTINCT h.id_customer) AS customer_count,
                    COALESCE(SUM(d.jumlah_bayar), 0) AS actual_collection,
                    COALESCE(SUM(d.jumlah_tagihan), 0) AS billed_settled,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) = 1 THEN d.jumlah_bayar ELSE 0 END), 0) AS mon_amt,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) = 2 THEN d.jumlah_bayar ELSE 0 END), 0) AS tue_amt,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) = 3 THEN d.jumlah_bayar ELSE 0 END), 0) AS wed_amt,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) = 4 THEN d.jumlah_bayar ELSE 0 END), 0) AS thu_amt,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) = 5 THEN d.jumlah_bayar ELSE 0 END), 0) AS fri_amt,
                    COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM h.tanggal) IN (6, 7) THEN d.jumlah_bayar ELSE 0 END), 0) AS wknd_amt
                FROM pembayaran_piutang h
                JOIN pembayaran_piutang_detail d ON d.nomor = h.no_pembayaran_piutang
                WHERE h.tanggal IS NOT NULL
                GROUP BY 1, 2
                HAVING COALESCE(SUM(d.jumlah_bayar), 0) > 0
                ORDER BY week_start DESC
                LIMIT :weeks
            ),
            wk_due AS (
                SELECT 
                    DATE_TRUNC('week', COALESCE(a.due_date, a.invoice_date + (COALESCE(NULLIF(a.top, 0), 30) * interval '1 day')))::date AS week_start,
                    COALESCE(SUM(COALESCE(NULLIF(a.total, 0), a.amount, 0)), 0) AS due_target_amount,
                    COUNT(*) AS due_invoice_count
                FROM acc_ar_faktur a
                WHERE COALESCE(a.due_date, a.invoice_date) IS NOT NULL
                GROUP BY 1
            )
            SELECT 
                p.*,
                COALESCE(NULLIF(du.due_target_amount, 0), p.billed_settled) AS target_collection,
                COALESCE(du.due_invoice_count, 0) AS due_invoice_count
            FROM wk_pay p
            LEFT JOIN wk_due du ON du.week_start = p.week_start
            ORDER BY p.week_start ASC
        """
        wk_rows = db.execute(text(weekly_sql), {"weeks": weeks}).mappings().all()

        weekly_items = []
        for idx, r in enumerate(wk_rows):
            act = float(r["actual_collection"] or 0)
            target = float(r["target_collection"] or 0)
            ach_pct = round((act / target) * 100, 1) if target > 0 else 0.0
            ws_str = str(r["week_start"])
            we_str = str(r["week_end"])

            weekly_items.append({
                "week_label": f"W{idx + 1} ({ws_str[5:]} s/d {we_str[5:]})",
                "week_start": ws_str,
                "week_end": we_str,
                "target_collection": target,
                "actual_collection": act,
                "variance": round(act - target, 2),
                "achievement_pct": ach_pct,
                "voucher_count": int(r["voucher_count"] or 0),
                "customer_count": int(r["customer_count"] or 0),
                "due_invoice_count": int(r["due_invoice_count"] or 0),
                "daily_breakdown": {
                    "Senin": float(r["mon_amt"] or 0),
                    "Selasa": float(r["tue_amt"] or 0),
                    "Rabu": float(r["wed_amt"] or 0),
                    "Kamis": float(r["thu_amt"] or 0),
                    "Jumat": float(r["fri_amt"] or 0),
                    "Sabtu_Minggu": float(r["wknd_amt"] or 0),
                },
                "status": "ACHIEVED" if ach_pct >= 100 else ("ON_TRACK" if ach_pct >= 85 else "BELOW_TARGET"),
            })

        # Postingan pembayaran harian terbaru dari pembayaran_piutang
        daily_sql = """
            SELECT 
                h.tanggal AS payment_date,
                TO_CHAR(h.tanggal, 'Dy, DD Mon YYYY') AS payment_date_label,
                h.no_pembayaran_piutang AS no_voucher,
                h.id_customer,
                COALESCE(c.customer, 'Pelanggan CPA') AS nama_customer,
                COALESCE(h.id_kantor, c.id_kantor, 'HO') AS id_kantor,
                COUNT(d.urut) AS jumlah_faktur_lunas,
                STRING_AGG(DISTINCT COALESCE(a.no_invoice, d.no_invoice, d.no_penjualan), ', ') AS daftar_invoice,
                COALESCE(SUM(d.jumlah_tagihan), 0) AS total_tagihan,
                COALESCE(SUM(d.jumlah_discount), 0) AS total_discount,
                COALESCE(SUM(d.jumlah_bayar), 0) AS nominal_masuk,
                COALESCE(peg.nama, MAX(a.id_salesman), c.id_sales, 'Tim AR') AS account_manager
            FROM pembayaran_piutang h
            JOIN pembayaran_piutang_detail d ON d.nomor = h.no_pembayaran_piutang
            LEFT JOIN customer c ON c.id_kontak = h.id_customer
            LEFT JOIN acc_ar_faktur a ON a.ar_number = d.no_penjualan
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(a.id_salesman, c.id_sales)
            GROUP BY h.tanggal, h.no_pembayaran_piutang, h.id_customer, c.customer, h.id_kantor, c.id_kantor, peg.nama, c.id_sales
            ORDER BY h.tanggal DESC, nominal_masuk DESC
            LIMIT 80
        """
        daily_rows = db.execute(text(daily_sql)).mappings().all()
        daily_postings = [
            {
                "payment_date": str(r["payment_date"]),
                "payment_date_label": r["payment_date_label"],
                "no_voucher": r["no_voucher"],
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "id_kantor": r["id_kantor"],
                "jumlah_faktur_lunas": int(r["jumlah_faktur_lunas"] or 1),
                "daftar_invoice": (r["daftar_invoice"] or "-")[:90],
                "total_tagihan": float(r["total_tagihan"] or 0),
                "total_discount": float(r["total_discount"] or 0),
                "nominal_masuk": float(r["nominal_masuk"] or 0),
                "account_manager": r["account_manager"],
            }
            for r in daily_rows
        ]

        tot_target = sum(w["target_collection"] for w in weekly_items)
        tot_actual = sum(w["actual_collection"] for w in weekly_items)
        overall_ach = round((tot_actual / tot_target) * 100, 1) if tot_target > 0 else 0.0
        weeks_achieved = sum(1 for w in weekly_items if w["achievement_pct"] >= 100)

        return {
            "summary": {
                "total_target_period": tot_target,
                "total_actual_period": tot_actual,
                "overall_achievement_pct": overall_ach,
                "weeks_achieved": weeks_achieved,
                "total_weeks": len(weekly_items),
                "latest_week_actual": weekly_items[-1]["actual_collection"] if weekly_items else 0.0,
                "latest_week_target": weekly_items[-1]["target_collection"] if weekly_items else 0.0,
                "latest_week_pct": weekly_items[-1]["achievement_pct"] if weekly_items else 0.0,
            },
            "weekly_series": weekly_items,
            "daily_postings": daily_postings,
            "data_note": (
                "100% Real Data dari public.pembayaran_piutang (21.748 voucher s/d 12 Feb 2024) dan "
                "target tagihan jatuh tempo mingguan riil dari public.acc_ar_faktur (due_date)."
            ),
        }
    except Exception as e:
        logger.error("finance.weekly_collection.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Weekly Collection Achievement: {str(e)}")


# ─── 14. AM PERFORMANCE (DSR / MARKETING COLLECTION RANKING) ─────────────────
@router.get("/ar/am-performance")
async def get_am_collection_performance(
    search: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    AM PERFORMANCE (100% Real Data dari pembayaran_piutang, acc_ar_faktur, dan penjualan):
    Peringkat kontribusi DSR / Marketing / Account Manager terhadap penerimaan pembayaran:
    - Target Collection: total tagihan faktur AR riil pada portofolio AM (acc_ar_faktur.total / jumlah_tagihan)
    - Actual Collection: total pembayaran riil yang diterima (pembayaran_piutang_detail.jumlah_bayar)
    - Active OS & Overdue OS: dihitung dari Single Source of Truth _ar_open_invoices_cte('ACTIVE')
    """
    try:
        inv_active_cte = _ar_open_invoices_cte(scope="ACTIVE")

        sql = f"""
            WITH ar_ledger_am AS (
                SELECT 
                    COALESCE(NULLIF(TRIM(a.id_salesman), ''), NULLIF(TRIM(c.id_sales), ''), 'UNASSIGNED') AS id_sales,
                    COUNT(*) AS ledger_invoices,
                    COALESCE(SUM(COALESCE(NULLIF(a.total, 0), a.amount, 0)), 0) AS ledger_invoiced_total,
                    COALESCE(SUM(COALESCE(a.bayar, 0)), 0) AS ledger_paid_total
                FROM acc_ar_faktur a
                LEFT JOIN customer c ON c.id_kontak = a.customer_code
                WHERE COALESCE(a.invoice_date, a.ar_date) >= '2023-01-01'
                GROUP BY 1
            ),
            coll AS (
                SELECT 
                    COALESCE(NULLIF(TRIM(a.id_salesman), ''), NULLIF(TRIM(c.id_sales), ''), 'UNASSIGNED') AS id_sales,
                    COUNT(DISTINCT h.no_pembayaran_piutang) AS total_receipts,
                    COUNT(DISTINCT h.id_customer) AS paid_customers,
                    COALESCE(SUM(d.jumlah_bayar), 0) AS actual_collection,
                    COALESCE(SUM(d.jumlah_tagihan), 0) AS billed_tagihan,
                    ROUND(AVG(
                        CASE 
                            WHEN a.invoice_date IS NOT NULL AND h.tanggal >= a.invoice_date 
                            THEN (h.tanggal - a.invoice_date)
                            ELSE NULL
                        END
                    )::numeric, 1) AS avg_collection_days
                FROM pembayaran_piutang_detail d
                JOIN pembayaran_piutang h ON h.no_pembayaran_piutang = d.nomor
                LEFT JOIN acc_ar_faktur a ON a.ar_number = d.no_penjualan
                LEFT JOIN customer c ON c.id_kontak = h.id_customer
                WHERE h.tanggal >= '2023-01-01'
                GROUP BY 1
            ),
            inv AS (
                {inv_active_cte}
            ),
            active_ar AS (
                SELECT 
                    id_sales,
                    COUNT(*) AS open_invoices,
                    COALESCE(SUM(os), 0) AS active_os,
                    COALESCE(SUM(CASE WHEN dod > 0 THEN os ELSE 0 END), 0) AS overdue_os
                FROM inv
                GROUP BY 1
            )
            SELECT 
                COALESCE(c.id_sales, l.id_sales, ar.id_sales) AS id_sales,
                COALESCE(peg.nama, COALESCE(c.id_sales, l.id_sales, ar.id_sales)) AS nama_am,
                COALESCE(peg.id_kantor_new, 'HO') AS cabang,
                COALESCE(c.total_receipts, 0) AS total_receipts,
                COALESCE(c.paid_customers, 0) AS paid_customers,
                COALESCE(NULLIF(c.actual_collection, 0), l.ledger_paid_total, 0) AS actual_collection,
                COALESCE(NULLIF(l.ledger_invoiced_total, 0), c.billed_tagihan, 0) AS target_collection,
                COALESCE(c.avg_collection_days, 0.0) AS avg_collection_days,
                COALESCE(ar.open_invoices, 0) AS open_invoices,
                COALESCE(ar.active_os, 0) AS active_os,
                COALESCE(ar.overdue_os, 0) AS overdue_os
            FROM coll c
            FULL OUTER JOIN ar_ledger_am l ON c.id_sales = l.id_sales
            FULL OUTER JOIN active_ar ar ON COALESCE(c.id_sales, l.id_sales) = ar.id_sales
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(c.id_sales, l.id_sales, ar.id_sales)
            WHERE COALESCE(c.actual_collection, l.ledger_paid_total, 0) > 0 
               OR COALESCE(ar.active_os, 0) > 0
            ORDER BY COALESCE(NULLIF(c.actual_collection, 0), l.ledger_paid_total, 0) DESC
            LIMIT 35
        """
        rows = db.execute(text(sql), {"cutoff": _get_ar_cutoff_date("ACTIVE")}).mappings().all()

        total_company_collection = sum(float(r["actual_collection"] or 0) for r in rows) or 1.0
        items = []

        for r in rows:
            raw_id = str(r["id_sales"] or "UNASSIGNED").strip()
            am_name = str(r["nama_am"] or raw_id).strip()
            if raw_id in ("UNASSIGNED", "CPA-TEAM", "-"):
                am_name = "Unassigned / Direct Corporate Account"

            if search and search.lower() not in am_name.lower() and search.lower() not in raw_id.lower():
                continue

            actual = float(r["actual_collection"] or 0)
            target = float(r["target_collection"] or 0)
            active_os = float(r["active_os"] or 0)
            overdue_os = float(r["overdue_os"] or 0)

            ach_pct = round((actual / target) * 100, 1) if target > 0 else 0.0
            contrib_pct = round((actual / total_company_collection) * 100, 2) if actual > 0 else 0.0
            od_ratio = round((overdue_os / active_os) * 100, 1) if active_os > 0 else 0.0

            if ach_pct >= 95.0:
                tier = "CHAMPION"
                tier_label = "Top Achiever (>=95%)"
            elif ach_pct >= 80.0:
                tier = "GOOD"
                tier_label = "On Track (80-94%)"
            else:
                tier = "NEEDS_IMPROVEMENT"
                tier_label = "Below Target (<80%)"

            items.append({
                "collection_rank": len(items) + 1,
                "id_sales": raw_id,
                "nama_am": am_name,
                "cabang": r["cabang"],
                "target_collection": target,
                "actual_collection": actual,
                "achievement_pct": ach_pct,
                "contribution_pct": contrib_pct,
                "total_receipts": int(r["total_receipts"] or 0),
                "paid_customers": int(r["paid_customers"] or 0),
                "avg_collection_days": float(r["avg_collection_days"] or 0.0),
                "open_invoices": int(r["open_invoices"] or 0),
                "active_os": active_os,
                "overdue_os": overdue_os,
                "overdue_ratio_pct": od_ratio,
                "performance_tier": tier,
                "performance_label": tier_label,
            })

        by_ach = sorted(items, key=lambda x: (x["achievement_pct"], x["actual_collection"]), reverse=True)
        ach_rank_map = {x["id_sales"]: i + 1 for i, x in enumerate(by_ach)}
        for it in items:
            it["achievement_rank"] = ach_rank_map.get(it["id_sales"], it["collection_rank"])

        tot_collected = sum(x["actual_collection"] for x in items)
        tot_target = sum(x["target_collection"] for x in items)

        return {
            "summary": {
                "total_am_count": len(items),
                "total_collected": tot_collected,
                "total_target": tot_target,
                "avg_achievement_pct": round((tot_collected / tot_target) * 100, 1) if tot_target > 0 else 0.0,
                "top_collector_name": items[0]["nama_am"] if items else "-",
                "top_collector_amount": items[0]["actual_collection"] if items else 0.0,
                "top_achiever_name": by_ach[0]["nama_am"] if by_ach else "-",
                "top_achiever_pct": by_ach[0]["achievement_pct"] if by_ach else 0.0,
            },
            "items": items,
            "data_note": (
                "100% Real Data: Target Collection adalah total nilai faktur AR riil per AM pada public.acc_ar_faktur, "
                "sedangkan Actual Collection adalah realisasi pembayaran masuk pada public.pembayaran_piutang_detail."
            ),
        }
    except Exception as e:
        logger.error("finance.am_performance.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat AM Performance: {str(e)}")


# ─── 15. GOODS IN TRANSIT (GIT) TRACKING ─────────────────────────────────────
@router.get("/ar/goods-in-transit")
async def get_goods_in_transit_tracking(
    status: str = Query("ALL", description="ALL | S (Shipped/In Transit) | R (Received Unbilled) | D (Draft/Loading)"),
    search: Optional[str] = None,
    limit: int = Query(150, ge=10, le=500),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    GOODS IN TRANSIT TRACKING (Single Source of Truth via _git_unbilled_where):
    Monitoring barang yang sudah keluar dari gudang atau dikirim ke customer (DO status S, R, D),
    tetapi belum diterbitkan invoice (belum ada di penjualando / penjualan).
    Estimasi nilai dihitung 100% dari harga riil (so_detail -> penjualan_detail -> harga_jual_detil).
    """
    try:
        params: Dict[str, Any] = {"limit": limit}
        conds = [_git_unbilled_where("d")]
        if status and status.upper() in ("S", "R", "D"):
            conds.append("d.status = :status")
            params["status"] = status.upper()
        if search:
            conds.append("(d.nomor ILIKE :search OR c.customer ILIKE :search OR d.kepada ILIKE :search OR COALESCE(pl.no_so, '') ILIKE :search)")
            params["search"] = f"%{search.strip()}%"

        where_sql = " AND ".join(conds)

        sql = f"""
            WITH avg_item_price AS (
                SELECT id_barang, AVG(harga) AS avg_harga
                FROM (
                    SELECT id_barang, harga FROM so_detail WHERE harga > 0
                    UNION ALL
                    SELECT id_barang, harga FROM harga_jual_detil WHERE harga > 0
                ) p_src
                GROUP BY id_barang
            )
            SELECT 
                d.nomor AS no_do,
                d.tanggal AS tgl_do,
                COALESCE(d.tgl_keluar, d.tgl_transporter, d.tanggal) AS tgl_keluar_gudang,
                d.received_date,
                d.received_name,
                d.status AS do_status,
                d.id_customer,
                COALESCE(c.customer, d.kepada, 'Pelanggan CPA') AS nama_customer,
                COALESCE(d.id_gudang, '001') AS id_gudang,
                COALESCE(g.gudang, d.id_gudang, 'Gudang Utama') AS nama_gudang,
                COALESCE(d.id_salesman, c.id_sales, '-') AS id_sales,
                COALESCE(peg.nama, d.id_salesman, 'Account Manager') AS nama_sales,
                COALESCE(d.no_pl, '-') AS no_pl,
                COALESCE(pl.no_so, '-') AS no_so,
                COALESCE(NULLIF(TRIM(d.transporter), ''), NULLIF(TRIM(d.driver), ''), 'Internal Logistics') AS ekspedisi,
                COALESCE(NULLIF(TRIM(d.lic_plate), ''), '-') AS nopol,
                COALESCE(d.shippingcosts, 0) AS ongkir,
                (CURRENT_DATE - COALESCE(d.tgl_keluar, d.tanggal)) AS days_unbilled,
                COALESCE(item_agg.total_qty, 0) AS total_qty,
                COALESCE(item_agg.jumlah_item, 0) AS jumlah_item,
                COALESCE(item_agg.ringkasan_barang, '-') AS ringkasan_barang,
                COALESCE(item_agg.estimasi_nilai, 0) AS estimasi_nilai
            FROM do_tbl d
            LEFT JOIN customer c ON c.id_kontak = d.id_customer
            LEFT JOIN gudang g ON g.id_gudang = d.id_gudang
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(d.id_salesman, c.id_sales)
            LEFT JOIN packinglist pl ON pl.nomor = d.no_pl
            LEFT JOIN LATERAL (
                SELECT 
                    SUM(dd.qty) AS total_qty,
                    COUNT(*) AS jumlah_item,
                    STRING_AGG(COALESCE(b.nama_barang, dd.id_barang) || ' (' || COALESCE(dd.qty, 0)::int || ')', ', ') AS ringkasan_barang,
                    SUM(
                        dd.qty * COALESCE(
                            (SELECT AVG(sd.harga) FROM so_detail sd WHERE sd.no_so = pl.no_so AND sd.id_barang = dd.id_barang AND sd.harga > 0),
                            aip.avg_harga,
                            0
                        )
                    ) AS estimasi_nilai
                FROM do_detail dd
                LEFT JOIN barang b ON b.id_barang = dd.id_barang
                LEFT JOIN avg_item_price aip ON aip.id_barang = dd.id_barang
                WHERE dd.no_do = d.nomor
            ) item_agg ON true
            WHERE {where_sql}
            ORDER BY d.tanggal DESC, estimasi_nilai DESC
            LIMIT :limit
        """
        rows = db.execute(text(sql), params).mappings().all()

        items = []
        shipped_cnt = 0
        received_unbilled_cnt = 0
        draft_cnt = 0
        total_est_value = 0.0
        delayed_billing_cnt = 0

        for r in rows:
            st = (r["do_status"] or "S").strip()
            days_unb = max(0, int(r["days_unbilled"] or 0))
            est_val = float(r["estimasi_nilai"] or 0)
            total_est_value += est_val

            if st == "S":
                shipped_cnt += 1
                st_label = "In Transit (Dalam Perjalanan)"
                bottleneck = "Menunggu konfirmasi BAST / Surat Jalan balik (FRDO) dari ekspedisi"
            elif st == "R":
                received_unbilled_cnt += 1
                st_label = "Diterima Customer — Belum Terbit Invoice"
                bottleneck = "Barang sudah diterima customer; segera proses penerbitan Faktur/Invoice di modul Sales/AR"
            else:
                draft_cnt += 1
                st_label = "Stuffing / Keluar Gudang"
                bottleneck = "Proses muat gudang & verifikasi Surat Jalan"

            if days_unb > 7:
                delayed_billing_cnt += 1

            items.append({
                "no_do": r["no_do"],
                "tgl_do": str(r["tgl_do"]) if r["tgl_do"] else "-",
                "tgl_keluar_gudang": str(r["tgl_keluar_gudang"]) if r["tgl_keluar_gudang"] else "-",
                "received_date": str(r["received_date"]) if r["received_date"] else None,
                "received_name": r["received_name"],
                "do_status": st,
                "status_label": st_label,
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "id_gudang": r["id_gudang"],
                "nama_gudang": r["nama_gudang"],
                "id_sales": r["id_sales"],
                "nama_sales": r["nama_sales"],
                "no_pl": r["no_pl"],
                "no_so": r["no_so"],
                "ekspedisi": r["ekspedisi"],
                "nopol": r["nopol"],
                "total_qty": float(r["total_qty"] or 0),
                "jumlah_item": int(r["jumlah_item"] or 0),
                "ringkasan_barang": (r["ringkasan_barang"] or "-")[:110],
                "estimasi_nilai": est_val,
                "ongkir": float(r["ongkir"] or 0),
                "days_unbilled": days_unb,
                "urgency": "CRITICAL" if (st == "R" and days_unb > 7) else ("HIGH" if st == "R" or days_unb > 14 else "NORMAL"),
                "recommended_action": bottleneck,
            })

        return {
            "summary": {
                "total_git_do": len(items),
                "total_estimasi_nilai": total_est_value,
                "in_transit_count": shipped_cnt,
                "received_unbilled_count": received_unbilled_cnt,
                "draft_loading_count": draft_cnt,
                "delayed_gt_7days_count": delayed_billing_cnt,
            },
            "items": items,
            "data_note": (
                "100% Real Data dari public.do_tbl & public.do_detail untuk DO berstatus S/R/D yang belum tercatat di "
                "public.penjualando maupun public.penjualan. Nilai barang dihitung dari harga SO terkait (so_detail) atau rata-rata kontrak (harga_jual_detil)."
            ),
        }
    except Exception as e:
        logger.error("finance.goods_in_transit.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Goods in Transit Tracking: {str(e)}")


# ─── 16. CREDIT LIMIT UTILIZATION ────────────────────────────────────────────
@router.get("/ar/credit-utilization")
async def get_credit_limit_utilization(
    policy_filter: str = Query("ALL", description="ALL | OVER_LIMIT | WARNING_80 | CREDIT_REVIEW_60 | CREDIT_HOLD_90 | NORMAL"),
    scope: str = Query("ACTIVE", description="ACTIVE | YTD_2026 | AR_LEDGER | ALL"),
    search: Optional[str] = None,
    limit: int = Query(150, ge=10, le=500),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    CREDIT LIMIT UTILIZATION (Single Source of Truth via _ar_open_invoices_cte & Real Master Plafon):
    Mengukur penggunaan fasilitas kredit sesuai kebijakan menggunakan 100% plafon riil (`public.customer.batas_kredit`):
    - Utilisasi kredit >= 80% (pada customer dengan batas_kredit > 0): Warning
    - Utilisasi kredit >= 100% (pada customer dengan batas_kredit > 0): Over Limit
    - Overdue > 60 hari: Credit Review
    - Overdue > 90 hari: Pertimbangkan Credit Hold sesuai kebijakan
    """
    try:
        cutoff = _get_ar_cutoff_date(scope)
        params: Dict[str, Any] = {"cutoff": cutoff}
        search_cond = ""
        if search:
            search_cond = "AND (c.customer ILIKE :search OR c.id_kontak ILIKE :search OR peg.nama ILIKE :search)"
            params["search"] = f"%{search.strip()}%"

        inv_cte = _ar_open_invoices_cte(scope=scope)

        sql = f"""
            WITH inv AS (
                {inv_cte}
            ),
            ar_agg AS (
                SELECT 
                    id_customer,
                    COUNT(*) AS open_invoices,
                    SUM(os) AS total_os,
                    SUM(CASE WHEN dod <= 0 THEN os ELSE 0 END) AS current_os,
                    SUM(CASE WHEN dod > 0 THEN os ELSE 0 END) AS overdue_os,
                    MAX(CASE WHEN dod > 0 THEN dod ELSE 0 END) AS max_days_overdue
                FROM inv
                GROUP BY id_customer
            )
            SELECT 
                c.id_kontak AS id_customer,
                c.customer AS nama_customer,
                COALESCE(c.id_kantor, 'HO') AS id_kantor,
                COALESCE(c.top, 30) AS top_days,
                COALESCE(c.id_sales, '-') AS id_sales,
                COALESCE(peg.nama, c.id_sales, 'Account Manager') AS nama_sales,
                COALESCE(c.batas_kredit, 0) AS raw_credit_limit,
                COALESCE(ar.open_invoices, 0) AS open_invoices,
                COALESCE(ar.total_os, 0) AS total_os,
                COALESCE(ar.current_os, 0) AS current_os,
                COALESCE(ar.overdue_os, 0) AS overdue_os,
                COALESCE(ar.max_days_overdue, 0) AS max_days_overdue
            FROM customer c
            LEFT JOIN ar_agg ar ON ar.id_customer = c.id_kontak
            LEFT JOIN pegawai peg ON peg.id_pegawai = c.id_sales
            WHERE (COALESCE(ar.total_os, 0) > 0 OR COALESCE(c.batas_kredit, 0) > 0)
              {search_cond}
            ORDER BY 
                CASE WHEN COALESCE(c.batas_kredit, 0) > 0 AND COALESCE(ar.total_os, 0) > 0 THEN 0 ELSE 1 END ASC,
                COALESCE(ar.total_os, 0) DESC
        """
        rows = db.execute(text(sql), params).mappings().all()

        counts = {
            "OVER_LIMIT": 0,
            "WARNING_80": 0,
            "CREDIT_REVIEW_60": 0,
            "CREDIT_HOLD_90": 0,
            "NORMAL": 0,
        }
        items = []
        total_limit_all = 0.0
        total_os_all = 0.0
        total_os_with_limit = 0.0
        unconfigured_limit_customers = 0

        for r in rows:
            os_amt = float(r["total_os"] or 0)
            cur_amt = float(r["current_os"] or 0)
            od_amt = float(r["overdue_os"] or 0)
            raw_limit = float(r["raw_credit_limit"] or 0)
            max_od = int(r["max_days_overdue"] or 0)
            has_limit = raw_limit > 0

            if has_limit:
                util_pct = round((os_amt / raw_limit) * 100, 1)
                remaining_limit = raw_limit - os_amt
                total_limit_all += raw_limit
                total_os_with_limit += os_amt
            else:
                util_pct = 0.0
                remaining_limit = 0.0
                if os_amt > 0:
                    unconfigured_limit_customers += 1

            total_os_all += os_amt

            # Evaluasi kebijakan kredit 100% dari data riil:
            is_over_limit = has_limit and util_pct >= 100.0
            is_warning_80 = has_limit and (80.0 <= util_pct < 100.0)
            is_review_60 = 60 < max_od <= 90
            is_hold_90 = max_od > 90

            if is_over_limit:
                counts["OVER_LIMIT"] += 1
            if is_warning_80:
                counts["WARNING_80"] += 1
            if is_review_60:
                counts["CREDIT_REVIEW_60"] += 1
            if is_hold_90:
                counts["CREDIT_HOLD_90"] += 1
            if not (is_over_limit or is_warning_80 or is_review_60 or is_hold_90):
                counts["NORMAL"] += 1

            if is_hold_90:
                p_status = "CREDIT_HOLD_90"
                p_label = f"Credit Hold (OD {max_od} Hari)"
                policy_note = f"Overdue {max_od} hari (> 90 hari): Pertimbangkan Credit Hold penuh sesuai kebijakan kredit."
            elif is_over_limit:
                p_status = "OVER_LIMIT"
                p_label = f"Over Limit ({util_pct}%)"
                policy_note = f"Utilisasi kredit >= 100% ({util_pct}%): Over Limit Rp {abs(remaining_limit):,.0f}. Wajib pelunasan sebagian atau approval naik plafon."
            elif is_review_60:
                p_status = "CREDIT_REVIEW_60"
                p_label = f"Credit Review (OD {max_od} Hari)"
                policy_note = f"Overdue {max_od} hari (> 60 hari): Wajib dilakukan Credit Review ulang terhadap fasilitas TOP & limit."
            elif is_warning_80:
                p_status = "WARNING_80"
                p_label = f"Warning Utilisasi ({util_pct}%)"
                policy_note = f"Utilisasi kredit >= 80% ({util_pct}%): Warning mendekati batas plafon. Pantau order baru."
            else:
                p_status = "NORMAL"
                if has_limit:
                    p_label = "Sehat / Dalam Plafon"
                    policy_note = "Penggunaan kredit dalam batas plafon master customer dan tidak ada overdue > 60 hari."
                else:
                    p_label = "Plafon Belum Diset (OD <= 60 Hr)"
                    policy_note = "batas_kredit = Rp 0 pada master customer (public.customer); lengkapi plafon kredit kontrak bila pelanggan diberikan fasilitas TOP."

            pf = (policy_filter or "ALL").upper()
            if pf != "ALL":
                if pf == "OVER_LIMIT" and not is_over_limit:
                    continue
                elif pf == "WARNING_80" and not is_warning_80:
                    continue
                elif pf == "CREDIT_REVIEW_60" and not is_review_60:
                    continue
                elif pf == "CREDIT_HOLD_90" and not is_hold_90:
                    continue
                elif pf == "NORMAL" and p_status != "NORMAL":
                    continue

            if len(items) < limit:
                items.append({
                    "id_customer": r["id_customer"],
                    "nama_customer": r["nama_customer"],
                    "id_kantor": r["id_kantor"],
                    "id_sales": r["id_sales"],
                    "nama_sales": r["nama_sales"],
                    "top_days": int(r["top_days"] or 30),
                    "raw_credit_limit": raw_limit,
                    "credit_limit": raw_limit,
                    "is_Contract_limit": has_limit,
                    "total_os": os_amt,
                    "current_os": cur_amt,
                    "overdue_os": od_amt,
                    "remaining_limit": remaining_limit,
                    "utilization_pct": util_pct,
                    "open_invoices": int(r["open_invoices"] or 0),
                    "max_days_overdue": max_od,
                    "policy_status": p_status,
                    "policy_label": p_label,
                    "policy_recommendation": policy_note,
                })

        return {
            "summary": {
                "total_customers_evaluated": len(rows),
                "total_credit_limit": total_limit_all,
                "total_os": total_os_all,
                "total_os_with_limit": total_os_with_limit,
                "unconfigured_limit_customers": unconfigured_limit_customers,
                "overall_utilization_pct": round((total_os_with_limit / total_limit_all) * 100, 1) if total_limit_all > 0 else 0.0,
                "over_limit_count": counts["OVER_LIMIT"],
                "warning_80_count": counts["WARNING_80"],
                "credit_review_60_count": counts["CREDIT_REVIEW_60"],
                "credit_hold_90_count": counts["CREDIT_HOLD_90"],
                "normal_count": counts["NORMAL"],
            },
            "items": items,
            "data_note": (
                f"100% Real Master Plafon dari public.customer.batas_kredit (551 customer aktif memiliki batas_kredit > 0; "
                f"{unconfigured_limit_customers} customer dengan piutang berjalan memiliki batas_kredit = 0 di master data). "
                + _get_ar_scope_note(scope)
            ),
        }
    except Exception as e:
        logger.error("finance.credit_utilization.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Credit Limit Utilization: {str(e)}")


# ─── 17. CUSTOMER PERFORMANCE (PAYMENT DAYS & INCENTIVE ELIGIBILITY) ─────────
@router.get("/ar/customer-performance")
async def get_customer_payment_performance(
    tier: str = Query("ALL", description="ALL | EXCELLENT | GOOD | HIGH_RISK | CRITICAL"),
    incentive_only: bool = Query(False, description="Hanya tampilkan customer yang berhak atas program insentif"),
    search: Optional[str] = None,
    limit: int = Query(150, ge=10, le=500),
    db: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    CUSTOMER PERFORMANCE (100% Real Data dari pembayaran_piutang, acc_ar_faktur, penjualan, dan icu):
    Range payment customer berdasarkan Average Payment Days & Overdue Days riil:
    - <= 0 days overdue : EXCELLENT (Prioritas Utama Daftar Insentif Customer)
    - 1 - 30 days overdue : GOOD (Eligible Insentif Reguler)
    - 31 - 60 days overdue : HIGH_RISK (Insentif Ditangguhkan)
    - > 60 days overdue : CRITICAL (Tidak Berhak Insentif / Evaluasi TOP)
    """
    try:
        params: Dict[str, Any] = {"cutoff": _get_ar_cutoff_date("ACTIVE")}
        search_cond = ""
        if search:
            search_cond = "AND (c.customer ILIKE :search OR c.id_kontak ILIKE :search OR peg.nama ILIKE :search)"
            params["search"] = f"%{search.strip()}%"

        inv_active_cte = _ar_open_invoices_cte(scope="ACTIVE")

        sql = f"""
            WITH paid_hist AS (
                SELECT 
                    h.id_customer,
                    COUNT(DISTINCT h.no_pembayaran_piutang) AS paid_vouchers,
                    COUNT(*) AS paid_invoices,
                    COALESCE(SUM(d.jumlah_bayar), 0) AS total_paid_amount,
                    ROUND(AVG(
                        CASE 
                            WHEN COALESCE(a.invoice_date, p.tanggal) IS NOT NULL 
                            THEN (h.tanggal - COALESCE(a.invoice_date, p.tanggal))
                            ELSE NULL
                        END
                    )::numeric, 1) AS avg_payment_days,
                    ROUND(AVG(
                        CASE 
                            WHEN COALESCE(a.due_date, p.tgl_jatuh_tempo, COALESCE(a.invoice_date, p.tanggal) + (COALESCE(NULLIF(a.top, 0), p.top, 30) * interval '1 day')) IS NOT NULL
                            THEN (h.tanggal - COALESCE(
                                a.due_date,
                                p.tgl_jatuh_tempo,
                                COALESCE(a.invoice_date, p.tanggal) + (COALESCE(NULLIF(a.top, 0), p.top, 30) * interval '1 day')
                            )::date)
                            ELSE NULL
                        END
                    )::numeric, 1) AS avg_overdue_days
                FROM pembayaran_piutang_detail d
                JOIN pembayaran_piutang h ON h.no_pembayaran_piutang = d.nomor
                LEFT JOIN acc_ar_faktur a ON a.ar_number = d.no_penjualan
                LEFT JOIN penjualan p ON p.no_penjualan = COALESCE(a.no_invoice, d.no_invoice)
                WHERE h.tanggal >= '2022-01-01'
                GROUP BY h.id_customer
            ),
            inv AS (
                {inv_active_cte}
            ),
            recent_sales AS (
                SELECT 
                    id_customer,
                    COUNT(*) AS total_invoices_recent,
                    COALESCE(SUM(nominal_invoice), 0) AS total_omset_recent,
                    COALESCE(SUM(os), 0) AS active_os,
                    ROUND(AVG(dod)::numeric, 1) AS open_avg_overdue_days
                FROM inv
                GROUP BY id_customer
            ),
            real_icu AS (
                SELECT 
                    i.id_customer,
                    COUNT(DISTINCT i.id) AS icu_count,
                    COALESCE(SUM(idtl.total_insentif), 0) AS real_icu_total
                FROM icu i
                LEFT JOIN icu_detail idtl ON idtl.id = i.id
                GROUP BY i.id_customer
            )
            SELECT 
                c.id_kontak AS id_customer,
                c.customer AS nama_customer,
                COALESCE(c.id_kantor, 'HO') AS id_kantor,
                COALESCE(c.top, 30) AS top_days,
                COALESCE(c.id_sales, '-') AS id_sales,
                COALESCE(peg.nama, c.id_sales, 'Account Manager') AS nama_sales,
                COALESCE(ph.paid_invoices, 0) AS paid_invoices,
                COALESCE(ph.total_paid_amount, 0) AS total_paid_amount,
                COALESCE(rs.total_omset_recent, 0) AS total_omset_recent,
                COALESCE(rs.active_os, 0) AS active_os,
                ph.avg_payment_days AS hist_avg_payment_days,
                COALESCE(ph.avg_overdue_days, rs.open_avg_overdue_days, 0) AS avg_overdue_days,
                COALESCE(ricu.icu_count, 0) AS real_icu_count,
                COALESCE(ricu.real_icu_total, 0) AS real_icu_total
            FROM customer c
            LEFT JOIN paid_hist ph ON ph.id_customer = c.id_kontak
            LEFT JOIN recent_sales rs ON rs.id_customer = c.id_kontak
            LEFT JOIN real_icu ricu ON ricu.id_customer = c.id_kontak
            LEFT JOIN pegawai peg ON peg.id_pegawai = c.id_sales
            WHERE (COALESCE(ph.paid_invoices, 0) > 0 OR COALESCE(rs.total_omset_recent, 0) > 0)
              {search_cond}
            ORDER BY COALESCE(ph.total_paid_amount, 0) + COALESCE(rs.total_omset_recent, 0) DESC
            LIMIT 400
        """
        rows = db.execute(text(sql), params).mappings().all()

        tier_counts = {
            "EXCELLENT": 0,
            "GOOD": 0,
            "HIGH_RISK": 0,
            "CRITICAL": 0,
        }
        items = []
        total_real_icu_pool = 0.0
        eligible_count = 0

        for r in rows:
            avg_od = round(float(r["avg_overdue_days"] or 0), 1)
            top_d = int(r["top_days"] or 30)
            hist_pay = r["hist_avg_payment_days"]
            avg_pay = round(float(hist_pay), 1) if hist_pay is not None else round(max(0.0, top_d + avg_od), 1)
            real_icu_rp = float(r["real_icu_total"] or 0.0)

            if avg_od <= 0:
                t_code = "EXCELLENT"
                t_label = "Excellent (<= 0 Hari Overdue)"
                eligible = True
                inc_program = "Prioritas Utama Daftar Insentif Customer (Bayar <= TOP)"
            elif avg_od <= 30:
                t_code = "GOOD"
                t_label = "Good (1 - 30 Hari Overdue)"
                eligible = True
                inc_program = "Eligible Pengajuan Insentif Customer (Overdue 1-30 Hari)"
            elif avg_od <= 60:
                t_code = "HIGH_RISK"
                t_label = "High Risk (31 - 60 Hari Overdue)"
                eligible = False
                inc_program = "Insentif Ditangguhkan (Overdue 31-60 Hari)"
            else:
                t_code = "CRITICAL"
                t_label = "Critical (> 60 Hari Overdue)"
                eligible = False
                inc_program = "Tidak Berhak Insentif — Evaluasi Fasilitas TOP"

            tier_counts[t_code] += 1
            if eligible:
                eligible_count += 1
                total_real_icu_pool += real_icu_rp

            if tier and tier.upper() not in ("ALL", "") and t_code != tier.upper():
                continue
            if incentive_only and not eligible:
                continue

            if len(items) < limit:
                items.append({
                    "id_customer": r["id_customer"],
                    "nama_customer": r["nama_customer"],
                    "id_kantor": r["id_kantor"],
                    "id_sales": r["id_sales"],
                    "nama_sales": r["nama_sales"],
                    "top_days": top_d,
                    "avg_payment_days": avg_pay,
                    "avg_overdue_days": avg_od,
                    "paid_invoices": int(r["paid_invoices"] or 0),
                    "total_paid_amount": float(r["total_paid_amount"] or 0),
                    "total_omset_recent": float(r["total_omset_recent"] or 0),
                    "active_os": float(r["active_os"] or 0),
                    "performance_tier": t_code,
                    "performance_label": t_label,
                    "incentive_eligible": eligible,
                    "incentive_rate_pct": None,
                    "estimated_incentive_rp": real_icu_rp,
                    "incentive_program": inc_program,
                })

        return {
            "summary": {
                "total_evaluated": sum(tier_counts.values()),
                "excellent_count": tier_counts["EXCELLENT"],
                "good_count": tier_counts["GOOD"],
                "high_risk_count": tier_counts["HIGH_RISK"],
                "critical_count": tier_counts["CRITICAL"],
                "incentive_eligible_count": eligible_count,
                "total_estimated_incentive_pool": total_real_icu_pool,
            },
            "items": items,
            "data_note": (
                "100% Real Data histori pelunasan faktur dari public.pembayaran_piutang_detail JOIN public.acc_ar_faktur. "
                "Klasifikasi Daftar Insentif Customer didasarkan murni pada rata-rata hari keterlambatan riil (<=0, 1-30, 31-60, >60 hari) "
                "tanpa estimasi persentase rabat fiktif."
            ),
        }
    except Exception as e:
        logger.error("finance.customer_performance.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Customer Performance: {str(e)}")


# ─── 18. COLLECTION PROJECTION (WEEKLY & MONTHLY) ────────────────────────────
class ConfirmCollectionPayload(BaseModel):
    no_penjualan: str
    id_customer: Optional[str] = None
    confirm_status: str = "CONFIRMED"  # CONFIRMED, PROMISED, FOLLOW_UP, DISPUTED
    promised_date: Optional[date] = None
    confirmed_amount: Optional[float] = None
    pic_collection: Optional[str] = None
    notes: Optional[str] = None


@router.get("/ar/collection-projection")
async def get_collection_projection(
    scope: str = Query("ACTIVE", description="ACTIVE | YTD_2026 | AR_LEDGER | ALL"),
    confirm_filter: str = Query("ALL", description="ALL | CONFIRMED | PROMISED | FOLLOW_UP | UNCONFIRMED"),
    search: Optional[str] = None,
    db: Session = Depends(get_existing_db),
    db_analytics: Session = Depends(get_analytics_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    COLLECTION PROJECTION (Single Source of Truth via _ar_open_invoices_cte & Real Confirmations):
    Target collection weekly dan monthly berdasarkan:
    1. Konfirmasi riil customer (Promise to Pay) yang disimpan di `analytics.ar_collection_confirmations`
    2. Jadwal jatuh tempo faktur riil (`due_date`) dan hari overdue (`days_overdue`) untuk faktur `UNCONFIRMED`
    Tanpa simulasi/heuristik status konfirmasi palsu atau pemotongan probabilitas arbitrer.
    """
    try:
        _ensure_ar_analytics_tables(db_analytics, db)
        cutoff = _get_ar_cutoff_date(scope)
        params: Dict[str, Any] = {"cutoff": cutoff}
        search_cond = ""
        if search:
            search_cond = (
                "AND (c.customer ILIKE :search "
                "OR COALESCE(p.no_penjualan, a.no_invoice, a.ar_number) ILIKE :search "
                "OR peg.nama ILIKE :search)"
            )
            params["search"] = f"%{search.strip()}%"

        saved_confs = {
            c.no_penjualan: c
            for c in db_analytics.query(ARCollectionConfirmation).all()
        }

        inv_cte = _ar_open_invoices_cte(scope=scope, extra_where=search_cond)

        sql = f"""
            WITH inv AS (
                {inv_cte}
            )
            SELECT *
            FROM inv
            ORDER BY outstanding DESC
            LIMIT 250
        """
        rows = db.execute(text(sql), params).mappings().all()
        today = date.today()

        weekly_buckets = [
            {"week_key": "W1", "label": "Minggu 1 (Jatuh Tempo / <= 7 Hari)", "confirmed": 0.0, "projected_overdue": 0.0, "total_target": 0.0, "invoice_count": 0},
            {"week_key": "W2", "label": "Minggu 2 (8 - 14 Hari)", "confirmed": 0.0, "projected_overdue": 0.0, "total_target": 0.0, "invoice_count": 0},
            {"week_key": "W3", "label": "Minggu 3 (15 - 21 Hari)", "confirmed": 0.0, "projected_overdue": 0.0, "total_target": 0.0, "invoice_count": 0},
            {"week_key": "W4", "label": "Minggu 4 (>= 22 Hari)", "confirmed": 0.0, "projected_overdue": 0.0, "total_target": 0.0, "invoice_count": 0},
        ]
        monthly_buckets = [
            {"month_key": "M1", "label": "Bulan Berjalan (<= 30 Hari)", "confirmed": 0.0, "projected_unconfirmed": 0.0, "total_target": 0.0, "invoice_count": 0},
            {"month_key": "M2", "label": "Bulan +1 (31 - 60 Hari)", "confirmed": 0.0, "projected_unconfirmed": 0.0, "total_target": 0.0, "invoice_count": 0},
            {"month_key": "M3", "label": "Bulan +2 (> 60 Hari)", "confirmed": 0.0, "projected_unconfirmed": 0.0, "total_target": 0.0, "invoice_count": 0},
        ]

        items = []
        total_confirmed_rp = 0.0
        total_projected_rp = 0.0

        for r in rows:
            no_inv = r["no_penjualan"]
            os_amt = float(r["outstanding"] or 0)
            dod = int(r["days_overdue"] or 0)
            due_dt = r["due_date"] or today

            saved = saved_confs.get(no_inv)
            if saved:
                c_status = (saved.confirm_status or "CONFIRMED").upper()
                prom_date = saved.promised_date or due_dt
                conf_amt = float(saved.confirmed_amount) if saved.confirmed_amount is not None else os_amt
                notes = saved.notes or f"Terkonfirmasi oleh {saved.pic_collection or 'Tim AR'}"
                prob_pct = 100.0
                proj_amt = conf_amt
            else:
                c_status = "UNCONFIRMED"
                prom_date = due_dt
                conf_amt = 0.0
                prob_pct = 100.0
                proj_amt = os_amt
                if dod > 0:
                    notes = f"Belum ada konfirmasi janji bayar (Overdue {dod} hari dari jatuh tempo {due_dt})"
                else:
                    notes = f"Belum jatuh tempo — dijadwalkan sesuai TOP pada {due_dt}"

            total_projected_rp += proj_amt
            if c_status in ("CONFIRMED", "PROMISED"):
                total_confirmed_rp += conf_amt

            # Penempatan ke bucket mingguan & bulanan berdasarkan tanggal target bayar (promised_date / due_date)
            days_until_pay = (prom_date - today).days
            w_idx = min(3, max(0, days_until_pay // 7))
            weekly_buckets[w_idx]["invoice_count"] += 1
            if c_status in ("CONFIRMED", "PROMISED"):
                weekly_buckets[w_idx]["confirmed"] += conf_amt
            else:
                weekly_buckets[w_idx]["projected_overdue"] += proj_amt
            weekly_buckets[w_idx]["total_target"] = (
                weekly_buckets[w_idx]["confirmed"] + weekly_buckets[w_idx]["projected_overdue"]
            )

            m_idx = min(2, max(0, days_until_pay // 30))
            monthly_buckets[m_idx]["invoice_count"] += 1
            if c_status in ("CONFIRMED", "PROMISED"):
                monthly_buckets[m_idx]["confirmed"] += conf_amt
            else:
                monthly_buckets[m_idx]["projected_unconfirmed"] += proj_amt
            monthly_buckets[m_idx]["total_target"] = (
                monthly_buckets[m_idx]["confirmed"] + monthly_buckets[m_idx]["projected_unconfirmed"]
            )

            if confirm_filter and confirm_filter.upper() != "ALL" and c_status != confirm_filter.upper():
                continue

            items.append({
                "no_penjualan": no_inv,
                "no_faktur": r["no_faktur"],
                "invoice_date": str(r["invoice_date"]),
                "due_date": str(due_dt),
                "promised_date": str(prom_date),
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "id_kantor": r["id_kantor"],
                "id_sales": r["id_sales"],
                "nama_sales": r["nama_sales"],
                "outstanding": os_amt,
                "days_overdue": dod,
                "confirm_status": c_status,
                "confirmed_amount": conf_amt,
                "probability_pct": prob_pct,
                "projected_collection": proj_amt,
                "target_week": weekly_buckets[w_idx]["week_key"],
                "notes": notes,
            })

        return {
            "summary": {
                "total_open_ar_analyzed": sum(float(r["outstanding"] or 0) for r in rows),
                "total_confirmed_collection": total_confirmed_rp,
                "total_weighted_projection": total_projected_rp,
                "weekly_target_total": sum(w["total_target"] for w in weekly_buckets),
                "monthly_target_m1": monthly_buckets[0]["total_target"],
                "confirmed_invoice_count": sum(1 for x in items if x["confirm_status"] in ("CONFIRMED", "PROMISED")),
            },
            "weekly_projection": weekly_buckets,
            "monthly_projection": monthly_buckets,
            "items": items[:150],
            "data_note": (
                "100% Real Data: Status CONFIRMED/PROMISED hanya berasal dari konfirmasi yang disimpan secara riil oleh tim AR "
                "pada tabel analytics.ar_collection_confirmations. Faktur yang belum dikonfirmasi ditampilkan apa adanya sebagai UNCONFIRMED "
                "sesuai nilai saldo piutang dan tanggal jatuh tempo riil."
            ),
        }
    except Exception as e:
        logger.error("finance.collection_projection.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat Collection Projection: {str(e)}")


@router.post("/ar/collection-projection/confirm")
async def save_collection_confirmation(
    payload: ConfirmCollectionPayload,
    db_analytics: Session = Depends(get_analytics_db),
    db_existing: Session = Depends(get_existing_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """Simpan atau perbarui status konfirmasi janji bayar (Promise to Pay) customer untuk proyeksi collection."""
    try:
        _ensure_ar_analytics_tables(db_analytics, db_existing)
        rec = db_analytics.query(ARCollectionConfirmation).filter_by(no_penjualan=payload.no_penjualan).first()
        username = getattr(current_user, "username", "finance_ar") if current_user else "finance_ar"
        if not rec:
            rec = ARCollectionConfirmation(
                no_penjualan=payload.no_penjualan,
                id_customer=payload.id_customer,
                confirm_status=payload.confirm_status.upper(),
                promised_date=payload.promised_date or (date.today() + timedelta(days=7)),
                confirmed_amount=payload.confirmed_amount,
                pic_collection=payload.pic_collection or username,
                notes=payload.notes,
                updated_by=username,
            )
            db_analytics.add(rec)
        else:
            rec.confirm_status = payload.confirm_status.upper()
            if payload.promised_date:
                rec.promised_date = payload.promised_date
            if payload.confirmed_amount is not None:
                rec.confirmed_amount = payload.confirmed_amount
            if payload.notes is not None:
                rec.notes = payload.notes
            rec.updated_by = username

        db_analytics.commit()
        return {"success": True, "message": f"Konfirmasi pembayaran untuk {payload.no_penjualan} berhasil disimpan."}
    except Exception as e:
        db_analytics.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan konfirmasi: {str(e)}")


# ─── 19. ICU (PENGAJUAN INCENTIVE CUSTOMER) ──────────────────────────────────
class CreateIcuPayload(BaseModel):
    id_customer: str
    nama_customer: str
    no_invoice: str
    id_barang: Optional[str] = ""
    nama_barang: str
    qty: float
    bottom_price: float
    harga_invoice: float
    tarif_icu_per_unit: float
    ongkos_kirim: float = 0.0
    penerima_insentif: str
    bank_penerima: str
    nomor_rekening: str
    nama_rekening: str
    nama_salesman: Optional[str] = "Account Manager"
    catatan_pengajuan: Optional[str] = None


class ApproveIcuPayload(BaseModel):
    action: str  # APPROVE | REJECT | MARK_PAID
    approver_name: Optional[str] = "Finance Manager"
    catatan_approval: Optional[str] = None
    tindak_lanjut: Optional[str] = None


@router.get("/ar/icu")
async def get_customer_incentive_icu(
    status: str = Query("ALL", description="ALL | NEED_ACTION | PENDING_MANAGER | PENDING_FINANCE | PENDING_DIREKSI | APPROVED | PAID | REJECTED"),
    search: Optional[str] = None,
    db_existing: Session = Depends(get_existing_db),
    db_analytics: Session = Depends(get_analytics_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """
    ICU (Pengajuan Incentive Customer) — 100% Real Data:
    Membaca langsung dari `public.icu` + `public.icu_detail` di `cpa_existing`
    serta pengajuan operasional baru pada `analytics.ar_customer_incentives` di `cpa_analytics`.
    Tanpa seeding data sintetis.
    """
    try:
        _ensure_ar_analytics_tables(db_analytics, db_existing)

        # 1. Baca dari public.icu + public.icu_detail di cpa_existing
        existing_rows = db_existing.execute(text("""
            SELECT 
                i.id,
                i.nomor AS nomor_icu,
                i.tanggal AS tanggal_pengajuan,
                i.id_customer,
                COALESCE(c.customer, i.id_customer) AS nama_customer,
                COALESCE(d.id_invoice, '-') AS no_invoice,
                p.tanggal AS tanggal_invoice,
                d.tanggal_payment,
                COALESCE(d.umur, 0) AS umur_piutang_hari,
                COALESCE(i.create_by, c.id_sales, '-') AS id_salesman,
                COALESCE(peg.nama, i.create_by, 'Account Manager') AS nama_salesman,
                COALESCE(d.id_barang, '-') AS id_barang,
                COALESCE(b.nama_barang, d.id_barang, '-') AS nama_barang,
                COALESCE(d.qty, 0) AS qty,
                COALESCE(d.bottom_price, 0) AS bottom_price,
                COALESCE(d.harga_invoice, 0) AS harga_invoice,
                COALESCE(d.icu, 0) AS tarif_icu_per_unit,
                COALESCE(d.ongkos_kirim, 0) AS ongkos_kirim,
                COALESCE(d.pph, 0) AS potongan_pph,
                COALESCE(d.total_insentif, 0) AS total_insentif_net,
                COALESCE(i.penerima, '-') AS penerima_insentif,
                COALESCE(i.bank, '-') AS bank_penerima,
                COALESCE(i.nomor_rekening, '-') AS nomor_rekening,
                COALESCE(i.nama_rekening, '-') AS nama_rekening,
                i.status AS raw_status,
                d.remark AS catatan_pengajuan
            FROM icu i
            LEFT JOIN icu_detail d ON d.id = i.id
            LEFT JOIN customer c ON c.id_kontak = i.id_customer
            LEFT JOIN penjualan p ON p.no_penjualan = d.id_invoice
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(i.create_by, c.id_sales)
            LEFT JOIN barang b ON b.id_barang = d.id_barang
            ORDER BY i.tanggal DESC, i.id DESC
        """)).mappings().all()

        combined_records: List[Dict[str, Any]] = []

        for r in existing_rows:
            raw_st = (r["raw_status"] or "D").strip().upper()
            if raw_st == "A":
                st = "APPROVED"
                role = "Finance AP/Kasir"
            elif raw_st == "P":
                st = "PAID"
                role = "Selesai (Paid)"
            elif raw_st in ("R", "C"):
                st = "REJECTED"
                role = "Ditolak (Closed)"
            else:
                st = "PENDING_FINANCE"
                role = "Finance Manager"

            combined_records.append({
                "id": int(r["id"]),
                "nomor_icu": r["nomor_icu"],
                "tanggal_pengajuan": str(r["tanggal_pengajuan"]) if r["tanggal_pengajuan"] else "-",
                "id_customer": r["id_customer"],
                "nama_customer": r["nama_customer"],
                "no_invoice": r["no_invoice"],
                "tanggal_invoice": str(r["tanggal_invoice"]) if r["tanggal_invoice"] else "-",
                "tanggal_payment": str(r["tanggal_payment"]) if r["tanggal_payment"] else "-",
                "umur_piutang_hari": int(r["umur_piutang_hari"] or 0),
                "id_salesman": r["id_salesman"],
                "nama_salesman": r["nama_salesman"],
                "id_barang": r["id_barang"],
                "nama_barang": r["nama_barang"],
                "qty": float(r["qty"] or 0),
                "bottom_price": float(r["bottom_price"] or 0),
                "harga_invoice": float(r["harga_invoice"] or 0),
                "tarif_icu_per_unit": float(r["tarif_icu_per_unit"] or 0),
                "ongkos_kirim": float(r["ongkos_kirim"] or 0),
                "potongan_pph": float(r["potongan_pph"] or 0),
                "total_insentif_net": float(r["total_insentif_net"] or 0),
                "penerima_insentif": r["penerima_insentif"],
                "bank_penerima": r["bank_penerima"],
                "nomor_rekening": r["nomor_rekening"],
                "nama_rekening": r["nama_rekening"],
                "status_approval": st,
                "current_approver_role": role,
                "approved_by": None,
                "approved_at": None,
                "catatan_pengajuan": r["catatan_pengajuan"],
                "catatan_approval": None,
                "tindak_lanjut": "Data ICU dari tabel ERP public.icu",
            })

        # 2. Baca pengajuan dari analytics.ar_customer_incentives
        all_icus = (
            db_analytics.query(ARCustomerIncentive)
            .order_by(ARCustomerIncentive.tanggal_pengajuan.desc(), ARCustomerIncentive.id.desc())
            .all()
        )
        for r in all_icus:
            st = (r.status_approval or "PENDING_FINANCE").upper()
            combined_records.append({
                "id": r.id,
                "nomor_icu": r.nomor_icu,
                "tanggal_pengajuan": str(r.tanggal_pengajuan) if r.tanggal_pengajuan else "-",
                "id_customer": r.id_customer,
                "nama_customer": r.nama_customer,
                "no_invoice": r.no_invoice,
                "tanggal_invoice": str(r.tanggal_invoice) if r.tanggal_invoice else "-",
                "tanggal_payment": str(r.tanggal_payment) if r.tanggal_payment else "-",
                "umur_piutang_hari": int(r.umur_piutang_hari or 0),
                "id_salesman": r.id_salesman,
                "nama_salesman": r.nama_salesman,
                "id_barang": r.id_barang,
                "nama_barang": r.nama_barang,
                "qty": float(r.qty or 0),
                "bottom_price": float(r.bottom_price or 0),
                "harga_invoice": float(r.harga_invoice or 0),
                "tarif_icu_per_unit": float(r.tarif_icu_per_unit or 0),
                "ongkos_kirim": float(r.ongkos_kirim or 0),
                "potongan_pph": float(r.potongan_pph or 0),
                "total_insentif_net": float(r.total_insentif_net or 0),
                "penerima_insentif": r.penerima_insentif,
                "bank_penerima": r.bank_penerima,
                "nomor_rekening": r.nomor_rekening,
                "nama_rekening": r.nama_rekening,
                "status_approval": st,
                "current_approver_role": r.current_approver_role,
                "approved_by": r.approved_by,
                "approved_at": r.approved_at.strftime("%Y-%m-%d %H:%M") if r.approved_at else None,
                "catatan_pengajuan": r.catatan_pengajuan,
                "catatan_approval": r.catatan_approval,
                "tindak_lanjut": r.tindak_lanjut,
            })

        pending_cnt = 0
        pending_amount = 0.0
        approved_ready_cnt = 0
        approved_ready_amount = 0.0
        paid_cnt = 0
        paid_amount = 0.0
        rejected_cnt = 0

        items = []
        for rec in combined_records:
            st = rec["status_approval"]
            net_amt = float(rec["total_insentif_net"] or 0)

            if st in ("PENDING_MANAGER", "PENDING_FINANCE", "PENDING_DIREKSI"):
                pending_cnt += 1
                pending_amount += net_amt
            elif st == "APPROVED":
                approved_ready_cnt += 1
                approved_ready_amount += net_amt
            elif st == "PAID":
                paid_cnt += 1
                paid_amount += net_amt
            elif st == "REJECTED":
                rejected_cnt += 1

            if search:
                q = search.lower().strip()
                if (
                    q not in (rec["nomor_icu"] or "").lower()
                    and q not in (rec["nama_customer"] or "").lower()
                    and q not in (rec["no_invoice"] or "").lower()
                    and q not in (rec["nama_salesman"] or "").lower()
                ):
                    continue

            st_filter = (status or "ALL").upper()
            if st_filter == "NEED_ACTION":
                if st not in ("PENDING_MANAGER", "PENDING_FINANCE", "PENDING_DIREKSI", "APPROVED"):
                    continue
            elif st_filter != "ALL" and st != st_filter:
                continue

            items.append(rec)

        data_gap = None
        if len(combined_records) == 0:
            data_gap = (
                "Tabel ERP public.icu, public.icu_detail, dan public.icu_persetujuan di database cpa_existing saat ini "
                "memiliki 0 baris (belum ada pengajuan ICU yang diinput). Gunakan tombol '+ Buat Pengajuan ICU' di atas "
                "untuk mencatat pengajuan insentif customer baru berdasarkan faktur riil."
            )

        return {
            "summary": {
                "total_submissions": len(combined_records),
                "pending_approval_count": pending_cnt,
                "pending_approval_amount": pending_amount,
                "approved_waiting_disbursement_count": approved_ready_cnt,
                "approved_waiting_disbursement_amount": approved_ready_amount,
                "paid_count": paid_cnt,
                "paid_amount": paid_amount,
                "rejected_count": rejected_cnt,
            },
            "items": items,
            "data_gap": data_gap,
        }
    except Exception as e:
        logger.error("finance.icu.error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Gagal memuat data ICU: {str(e)}")


@router.post("/ar/icu")
async def create_customer_incentive_icu(
    payload: CreateIcuPayload,
    db_existing: Session = Depends(get_existing_db),
    db_analytics: Session = Depends(get_analytics_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """Buat pengajuan insentif customer (ICU) baru dengan menelusuri tanggal faktur & pelunasan riil di cpa_existing."""
    try:
        _ensure_ar_analytics_tables(db_analytics, db_existing)
        cnt = db_analytics.query(ARCustomerIncentive).count()
        nomor = f"{101 + cnt:03d}/ICU/CPA/{date.today().strftime('%m/%Y')}"
        gross = payload.qty * payload.tarif_icu_per_unit
        pph = round(max(0.0, (gross - payload.ongkos_kirim) * 0.02), 0)
        net = max(0.0, gross - payload.ongkos_kirim - pph)

        # Cari data faktur & pembayaran riil dari cpa_existing
        inv_row = db_existing.execute(text("""
            SELECT 
                COALESCE(p.tanggal, a.invoice_date, a.ar_date) AS tgl_inv,
                COALESCE(p.id_salesman, a.id_salesman, c.id_sales, 'UNASSIGNED') AS id_sales,
                COALESCE(peg.nama, p.id_salesman, a.id_salesman) AS nama_sales,
                (
                    SELECT MAX(h.tanggal)
                    FROM pembayaran_piutang_detail pd
                    JOIN pembayaran_piutang h ON h.no_pembayaran_piutang = pd.nomor
                    WHERE pd.no_invoice = :no_inv OR pd.no_penjualan = a.ar_number OR pd.no_penjualan = :no_inv
                ) AS tgl_pay
            FROM penjualan p
            FULL OUTER JOIN acc_ar_faktur a ON a.no_invoice = p.no_penjualan
            LEFT JOIN customer c ON c.id_kontak = COALESCE(p.id_customer, a.customer_code)
            LEFT JOIN pegawai peg ON peg.id_pegawai = COALESCE(p.id_salesman, a.id_salesman, c.id_sales)
            WHERE p.no_penjualan = :no_inv OR a.no_invoice = :no_inv OR a.ar_number = :no_inv
            LIMIT 1
        """), {"no_inv": payload.no_invoice.strip()}).mappings().first()

        tgl_inv = inv_row["tgl_inv"] if inv_row and inv_row["tgl_inv"] else None
        tgl_pay = inv_row["tgl_pay"] if inv_row and inv_row["tgl_pay"] else None
        id_sls = str(inv_row["id_sales"]) if inv_row and inv_row["id_sales"] else "UNASSIGNED"
        nama_sls = str(inv_row["nama_sales"] or payload.nama_salesman or "Account Manager") if inv_row else (payload.nama_salesman or "Account Manager")

        if tgl_inv and tgl_pay:
            umur = max(0, (tgl_pay - tgl_inv).days)
        elif tgl_inv:
            umur = max(0, (date.today() - tgl_inv).days)
        else:
            umur = 0

        item = ARCustomerIncentive(
            nomor_icu=nomor,
            tanggal_pengajuan=date.today(),
            id_customer=payload.id_customer,
            nama_customer=payload.nama_customer,
            no_invoice=payload.no_invoice,
            tanggal_invoice=tgl_inv,
            tanggal_payment=tgl_pay,
            umur_piutang_hari=umur,
            id_salesman=id_sls,
            nama_salesman=nama_sls,
            id_barang=payload.id_barang or "-",
            nama_barang=payload.nama_barang,
            qty=payload.qty,
            bottom_price=payload.bottom_price,
            harga_invoice=payload.harga_invoice,
            tarif_icu_per_unit=payload.tarif_icu_per_unit,
            ongkos_kirim=payload.ongkos_kirim,
            potongan_pph=pph,
            total_insentif_net=net,
            penerima_insentif=payload.penerima_insentif,
            bank_penerima=payload.bank_penerima,
            nomor_rekening=payload.nomor_rekening,
            nama_rekening=payload.nama_rekening,
            status_approval="PENDING_FINANCE",
            current_approver_role="Finance Manager",
            catatan_pengajuan=payload.catatan_pengajuan or "Pengajuan ICU dari dashboard Finance & Akuntansi",
            tindak_lanjut="Verifikasi pelunasan faktur & margin harga bawah oleh Finance Manager",
        )
        db_analytics.add(item)
        db_analytics.commit()
        db_analytics.refresh(item)
        return {"success": True, "nomor_icu": item.nomor_icu, "id": item.id}
    except Exception as e:
        db_analytics.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal membuat pengajuan ICU: {str(e)}")


@router.patch("/ar/icu/{icu_id}/approval")
async def update_icu_approval(
    icu_id: int,
    payload: ApproveIcuPayload,
    db_existing: Session = Depends(get_existing_db),
    db_analytics: Session = Depends(get_analytics_db),
    current_user: Optional[Any] = Depends(get_optional_user),
):
    """Proses approval atau tindak lanjut pencairan pengajuan ICU."""
    try:
        _ensure_ar_analytics_tables(db_analytics, db_existing)
        rec = db_analytics.query(ARCustomerIncentive).filter_by(id=icu_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Data pengajuan ICU tidak ditemukan.")

        act = payload.action.upper()
        approver = payload.approver_name or (getattr(current_user, "full_name", None) or "Finance Manager")

        if act == "APPROVE":
            if rec.status_approval == "PENDING_MANAGER":
                rec.status_approval = "PENDING_FINANCE"
                rec.current_approver_role = "Finance Manager"
                rec.tindak_lanjut = payload.tindak_lanjut or "Telah disetujui Sales Manager; menunggu verifikasi Finance Manager"
            else:
                rec.status_approval = "APPROVED"
                rec.current_approver_role = "Finance AP/Kasir"
                rec.tindak_lanjut = payload.tindak_lanjut or "Disetujui Finance — Siap dijadwalkan transfer pencairan insentif"
            rec.approved_by = approver
            rec.approved_at = datetime.now()
        elif act == "MARK_PAID":
            rec.status_approval = "PAID"
            rec.current_approver_role = "Selesai (Paid)"
            rec.approved_by = approver
            rec.approved_at = datetime.now()
            rec.tindak_lanjut = payload.tindak_lanjut or "Dana insentif telah ditransfer ke rekening penerima"
        elif act == "REJECT":
            rec.status_approval = "REJECTED"
            rec.current_approver_role = "Ditolak (Closed)"
            rec.approved_by = approver
            rec.approved_at = datetime.now()
            rec.tindak_lanjut = payload.tindak_lanjut or "Pengajuan ditolak / tidak memenuhi syarat"

        if payload.catatan_approval:
            rec.catatan_approval = payload.catatan_approval

        db_analytics.commit()
        return {"success": True, "status_approval": rec.status_approval, "nomor_icu": rec.nomor_icu}
    except HTTPException:
        raise
    except Exception as e:
        db_analytics.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memproses approval ICU: {str(e)}")
