"""
Router — Analytics KPI & Executive Dashboard
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
from typing import Optional

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/kpi")
async def get_kpi_dashboard(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """KPI utama untuk executive dashboard."""
    today = date.today()
    if not date_from:
        # Default to Jan 1, 2024 to accommodate historical db dump testing
        date_from = date(2024, 1, 1)
    if not date_to:
        date_to = today

    params = {"date_from": date_from, "date_to": date_to}

    # Sales KPI bulan ini
    sales = db.execute(text("""
        SELECT
            COUNT(*) AS total_invoice_bulan_ini,
            COALESCE(SUM(grandtotal), 0) AS omzet_bulan_ini,
            COALESCE(SUM(CASE WHEN is_lunas = false THEN grandtotal - COALESCE(total_bayar, 0) ELSE 0 END), 0) AS piutang
        FROM operational.invoices
        WHERE tanggal >= :date_from AND tanggal <= :date_to AND status != '2'
    """), params).mappings().first()

    # Inventory KPI
    inv = db.execute(text("""
        SELECT
            COUNT(DISTINCT id_barang) AS total_sku,
            COALESCE(SUM(nilai_persediaan), 0) AS total_nilai_persediaan,
            COALESCE(SUM(CASE WHEN stok_min > 0 AND available < stok_min THEN 1 ELSE 0 END), 0) AS low_stock_count,
            COALESCE(SUM(CASE WHEN available <= 0 THEN 1 ELSE 0 END), 0) AS zero_stock_count,
            COALESCE(SUM(CASE WHEN stok_max > 0 AND on_hand > stok_max THEN 1 ELSE 0 END), 0) AS overstock_count
        FROM operational.inventory_balances
    """)).mappings().first()

    # Distribusi KPI bulan ini
    dist = db.execute(text("""
        SELECT
            COUNT(*) AS total_do,
            COALESCE(SUM(CASE WHEN status_label = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered,
            COALESCE(SUM(CASE WHEN status_label = 'in_transit' THEN 1 ELSE 0 END), 0) AS in_transit,
            COALESCE(SUM(CASE WHEN status_label = 'draft' THEN 1 ELSE 0 END), 0) AS pending
        FROM operational.deliveries
        WHERE tanggal >= :date_from AND tanggal <= :date_to
    """), params).mappings().first()

    # Alert summary
    alerts = db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0) AS critical,
            COALESCE(SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END), 0) AS warning,
            COUNT(*) AS total
        FROM analytics.alert_history
        WHERE is_resolved = false
    """)).mappings().first()

    # Customer summary
    customers = db.execute(text("""
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN segment = 'active' THEN 1 ELSE 0 END), 0) AS active,
            COALESCE(SUM(CASE WHEN segment = 'at_risk' THEN 1 ELSE 0 END), 0) AS at_risk,
            COALESCE(SUM(CASE WHEN segment = 'churned' THEN 1 ELSE 0 END), 0) AS churned
        FROM analytics.customer_metrics
    """)).mappings().first()

    # Sync status
    sync_states = db.execute(text("""
        SELECT table_name, last_sync_at, sync_status, total_synced
        FROM analytics.sync_state
        ORDER BY last_sync_at DESC
    """)).mappings().all()

    return {
        "period": {"date_from": str(date_from), "date_to": str(date_to)},
        "sales": dict(sales) if sales else {},
        "inventory": dict(inv) if inv else {},
        "distribution": dict(dist) if dist else {},
        "alerts": dict(alerts) if alerts else {},
        "customers": dict(customers) if customers else {},
        "sync_status": [dict(s) for s in sync_states],
    }


@router.get("/sync-status")
async def get_sync_status(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Status sinkronisasi semua worker."""
    rows = db.execute(text("""
        SELECT * FROM analytics.sync_state ORDER BY table_name
    """)).mappings().all()
    return [dict(r) for r in rows]
