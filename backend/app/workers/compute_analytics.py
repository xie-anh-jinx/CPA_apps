"""
Analytics Worker — Compute pre-aggregated analytics
"""
import structlog
from datetime import datetime, date, timedelta
from sqlalchemy import text

from app.workers.celery_app import celery_app
from app.database import AnalyticsSessionLocal
from app.workers.redis_publisher import publish_sync_event

log = structlog.get_logger()


@celery_app.task(name="app.workers.compute_analytics.run_compute", bind=True)
def run_compute(self):
    """Main analytics compute job — runs hourly."""
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("compute_analytics.start")
        _compute_daily_sales_summary(analytics_db)
        _compute_warehouse_performance(analytics_db)
        _update_inventory_availability(analytics_db)
        publish_sync_event("analytics_computed")
        log.info("compute_analytics.complete")
    except Exception as exc:
        log.error("compute_analytics.error", error=str(exc))
        analytics_db.rollback()
    finally:
        analytics_db.close()


@celery_app.task(name="app.workers.compute_analytics.daily_stock_snapshot", bind=True)
def daily_stock_snapshot(self):
    """Ambil snapshot stok harian — runs at 23:55."""
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("daily_stock_snapshot.start")
        today = date.today()
        analytics_db.execute(text("""
            INSERT INTO analytics.daily_stock_snapshot (
                snapshot_date, id_gudang, id_barang, nama_gudang, stok_available,
                stok_on_hand, nilai_persediaan, is_low_stock, is_overstock, is_zero_stock
            )
            SELECT
                :today,
                ib.id_gudang,
                ib.id_barang,
                w.nama_gudang,
                ib.available,
                ib.on_hand,
                ib.nilai_persediaan,
                (ib.available < ib.stok_min AND ib.stok_min > 0),
                (ib.stok_max > 0 AND ib.on_hand > ib.stok_max),
                (ib.available <= 0)
            FROM operational.inventory_balances ib
            LEFT JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
            ON CONFLICT (snapshot_date, id_gudang, id_barang) DO UPDATE
            SET stok_available = EXCLUDED.stok_available,
                stok_on_hand = EXCLUDED.stok_on_hand,
                nilai_persediaan = EXCLUDED.nilai_persediaan,
                is_low_stock = EXCLUDED.is_low_stock,
                is_overstock = EXCLUDED.is_overstock,
                is_zero_stock = EXCLUDED.is_zero_stock,
                computed_at = NOW()
        """), {"today": today})
        analytics_db.commit()
        log.info("daily_stock_snapshot.done", date=str(today))
    except Exception as exc:
        log.error("daily_stock_snapshot.error", error=str(exc))
        analytics_db.rollback()
    finally:
        analytics_db.close()


@celery_app.task(name="app.workers.compute_analytics.compute_customer_metrics", bind=True)
def compute_customer_metrics(self):
    """Hitung customer metrics untuk CRM segmentasi."""
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("compute_customer_metrics.start")
        analytics_db.execute(text("""
            INSERT INTO analytics.customer_metrics (
                id_kontak, nama_customer, total_orders, total_revenue,
                avg_order_value, last_purchase_date, first_purchase_date,
                days_since_last_purchase, segment, computed_at
            )
            SELECT
                c.id_kontak,
                c.nama_customer,
                COUNT(DISTINCT i.no_penjualan) AS total_orders,
                SUM(i.grandtotal) AS total_revenue,
                AVG(i.grandtotal) AS avg_order_value,
                MAX(i.tanggal) AS last_purchase_date,
                MIN(i.tanggal) AS first_purchase_date,
                CURRENT_DATE - MAX(i.tanggal) AS days_since_last_purchase,
                CASE
                    WHEN MAX(i.tanggal) >= CURRENT_DATE - 30 THEN 'active'
                    WHEN MAX(i.tanggal) >= CURRENT_DATE - 90 THEN 'dormant'
                    WHEN MAX(i.tanggal) >= CURRENT_DATE - 180 THEN 'at_risk'
                    ELSE 'churned'
                END AS segment,
                NOW() AS computed_at
            FROM operational.customers c
            LEFT JOIN operational.invoices i
                ON c.id_kontak = i.id_customer AND i.status != '2'
            GROUP BY c.id_kontak, c.nama_customer
            ON CONFLICT (id_kontak) DO UPDATE
            SET total_orders = EXCLUDED.total_orders,
                total_revenue = EXCLUDED.total_revenue,
                avg_order_value = EXCLUDED.avg_order_value,
                last_purchase_date = EXCLUDED.last_purchase_date,
                days_since_last_purchase = EXCLUDED.days_since_last_purchase,
                segment = EXCLUDED.segment,
                computed_at = EXCLUDED.computed_at
        """))
        analytics_db.commit()
        log.info("compute_customer_metrics.done")
    except Exception as exc:
        log.error("compute_customer_metrics.error", error=str(exc))
        analytics_db.rollback()
    finally:
        analytics_db.close()


def _compute_daily_sales_summary(analytics_db):
    """Hitung ringkasan penjualan per hari per gudang per salesman."""
    today = date.today()
    analytics_db.execute(text("""
        INSERT INTO analytics.daily_sales_summary (
            tanggal, id_gudang, nama_gudang, id_salesman,
            total_so, total_invoice, omzet, total_discount, total_ppn, net_revenue
        )
        SELECT
            i.tanggal,
            i.id_gudang,
            w.nama_gudang,
            i.id_salesman,
            COUNT(DISTINCT s.nomor) AS total_so,
            COUNT(DISTINCT i.no_penjualan) AS total_invoice,
            SUM(i.grandtotal) AS omzet,
            SUM(i.total_discount) AS total_discount,
            SUM(i.total_ppn) AS total_ppn,
            SUM(i.grandtotal - COALESCE(i.total_ppn, 0)) AS net_revenue
        FROM operational.invoices i
        LEFT JOIN operational.warehouses w ON i.id_gudang = w.id_gudang
        LEFT JOIN operational.sales_orders s ON i.no_do = s.nomor OR i.id_customer = s.id_customer
        WHERE i.status != '2'
        AND i.tanggal = :today
        GROUP BY i.tanggal, i.id_gudang, w.nama_gudang, i.id_salesman
        ON CONFLICT DO NOTHING
    """), {"today": today})
    analytics_db.commit()


def _compute_warehouse_performance(analytics_db):
    """Hitung performa gudang bulanan."""
    now = datetime.now()
    analytics_db.execute(text("""
        INSERT INTO analytics.warehouse_performance (
            period_year, period_month, id_gudang, nama_gudang,
            total_masuk, total_keluar, nilai_persediaan_akhir, jumlah_sku,
            sku_low_stock, sku_zero_stock
        )
        SELECT
            :year, :month,
            ib.id_gudang,
            w.nama_gudang,
            SUM(sm.masuk) AS total_masuk,
            SUM(sm.keluar) AS total_keluar,
            SUM(ib.nilai_persediaan) AS nilai_persediaan_akhir,
            COUNT(DISTINCT ib.id_barang) AS jumlah_sku,
            SUM(CASE WHEN ib.available < ib.stok_min AND ib.stok_min > 0 THEN 1 ELSE 0 END) AS sku_low_stock,
            SUM(CASE WHEN ib.available <= 0 THEN 1 ELSE 0 END) AS sku_zero_stock
        FROM operational.inventory_balances ib
        LEFT JOIN operational.warehouses w ON ib.id_gudang = w.id_gudang
        LEFT JOIN operational.stock_movements sm
            ON ib.id_gudang = sm.id_gudang AND ib.id_barang = sm.id_barang
            AND sm.tahun = :year AND sm.bulan = :month
        GROUP BY ib.id_gudang, w.nama_gudang
        ON CONFLICT DO NOTHING
    """), {"year": str(now.year), "month": str(now.month).zfill(2)})
    analytics_db.commit()


def _update_inventory_availability(analytics_db):
    """
    Update kolom available di inventory_balances berdasarkan SO yang belum di-DO.
    available = on_hand - reserved (qty SO yang belum diambil)
    """
    analytics_db.execute(text("""
        UPDATE operational.inventory_balances ib
        SET reserved = COALESCE(reserved_calc.reserved_qty, 0),
            available = ib.on_hand - COALESCE(reserved_calc.reserved_qty, 0)
        FROM (
            SELECT
                soi.id_barang,
                so.id_gudang,
                SUM(soi.sisa) AS reserved_qty
            FROM operational.sales_order_items soi
            JOIN operational.sales_orders so ON soi.no_so = so.nomor
            WHERE so.status NOT IN ('2', '5')  -- bukan void/completed
            AND soi.sisa > 0
            GROUP BY soi.id_barang, so.id_gudang
        ) AS reserved_calc
        WHERE ib.id_barang = reserved_calc.id_barang
        AND ib.id_gudang = reserved_calc.id_gudang
    """))
    analytics_db.commit()
