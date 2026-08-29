"""
Alert Worker — Check thresholds dan kirim alert
"""
import structlog
from datetime import datetime
from sqlalchemy import text

from app.workers.celery_app import celery_app
from app.database import AnalyticsSessionLocal
from app.models.analytics.models import AlertHistory

log = structlog.get_logger()


@celery_app.task(name="app.workers.check_alerts.run_check", bind=True)
def run_check(self):
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("check_alerts.start")
        _check_low_stock_alerts(analytics_db)
        _check_overstock_alerts(analytics_db)
        _check_undelivered_orders(analytics_db)
        log.info("check_alerts.complete")
    except Exception as exc:
        log.error("check_alerts.error", error=str(exc))
        analytics_db.rollback()
    finally:
        analytics_db.close()


def _check_low_stock_alerts(analytics_db):
    """Buat alert untuk barang yang stok di bawah minimum."""
    rows = analytics_db.execute(text("""
        SELECT ib.id_gudang, ib.id_barang, p.nama_barang,
               w.nama_gudang, ib.available, ib.stok_min
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE ib.stok_min > 0 AND ib.available < ib.stok_min
        AND NOT EXISTS (
            SELECT 1 FROM analytics.alert_history ah
            WHERE ah.id_gudang = ib.id_gudang
            AND ah.id_barang = ib.id_barang
            AND ah.alert_type = 'low_stock'
            AND ah.is_resolved = false
        )
    """)).mappings().all()

    for row in rows:
        severity = "critical" if row["available"] <= 0 else "warning"
        alert = AlertHistory(
            alert_type="low_stock",
            id_gudang=row["id_gudang"],
            id_barang=row["id_barang"],
            message=(
                f"Stok {row['nama_barang']} di {row['nama_gudang']} "
                f"= {row['available']} (min: {row['stok_min']})"
            ),
            severity=severity,
        )
        analytics_db.add(alert)

    analytics_db.commit()
    log.info("check_low_stock.done", alerts_created=len(rows))


def _check_overstock_alerts(analytics_db):
    """Alert untuk barang yang melebihi batas maksimum."""
    rows = analytics_db.execute(text("""
        SELECT ib.id_gudang, ib.id_barang, p.nama_barang,
               w.nama_gudang, ib.on_hand, ib.stok_max
        FROM operational.inventory_balances ib
        JOIN operational.products p ON ib.id_barang = p.id_barang
        JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        WHERE ib.stok_max > 0 AND ib.on_hand > ib.stok_max
        AND NOT EXISTS (
            SELECT 1 FROM analytics.alert_history ah
            WHERE ah.id_gudang = ib.id_gudang
            AND ah.id_barang = ib.id_barang
            AND ah.alert_type = 'overstock'
            AND ah.is_resolved = false
        )
    """)).mappings().all()

    for row in rows:
        alert = AlertHistory(
            alert_type="overstock",
            id_gudang=row["id_gudang"],
            id_barang=row["id_barang"],
            message=(
                f"Overstock {row['nama_barang']} di {row['nama_gudang']} "
                f"= {row['on_hand']} (max: {row['stok_max']})"
            ),
            severity="warning",
        )
        analytics_db.add(alert)

    analytics_db.commit()
    log.info("check_overstock.done", alerts_created=len(rows))


def _check_undelivered_orders(analytics_db):
    """Alert SO yang sudah > 7 hari belum ada DO-nya."""
    rows = analytics_db.execute(text("""
        SELECT so.nomor, so.id_customer, so.nama_customer,
               so.tanggal, so.grandtotal,
               CURRENT_DATE - so.tanggal AS days_pending
        FROM operational.sales_orders so
        WHERE so.status NOT IN ('2', '5')
        AND so.tanggal < CURRENT_DATE - 7
        AND NOT EXISTS (
            SELECT 1 FROM operational.deliveries d
            WHERE d.nomor = so.nomor OR d.id_customer = so.id_customer
        )
        AND NOT EXISTS (
            SELECT 1 FROM analytics.alert_history ah
            WHERE ah.alert_type = 'undelivered_so'
            AND ah.message LIKE '%' || so.nomor || '%'
            AND ah.is_resolved = false
        )
        LIMIT 50
    """)).mappings().all()

    for row in rows:
        alert = AlertHistory(
            alert_type="undelivered_so",
            id_gudang=None,
            id_barang=None,
            message=(
                f"SO {row['nomor']} untuk {row['nama_customer']} "
                f"sudah {row['days_pending']} hari belum dikirim"
            ),
            severity="warning" if row["days_pending"] < 14 else "critical",
        )
        analytics_db.add(alert)

    analytics_db.commit()
    log.info("check_undelivered.done", alerts_created=len(rows))
