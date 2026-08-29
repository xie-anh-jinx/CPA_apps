"""
Sync Worker — Sales
Sync SO, penjualan, dan penawaran dari DB lama ke analytics DB
"""
import structlog
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.workers.celery_app import celery_app
from app.database import ExistingSessionLocal, AnalyticsSessionLocal
from app.models.analytics.models import (
    SalesOrder, Invoice, SalesOrderItem, SyncState
)
from app.workers.redis_publisher import publish_sync_event

log = structlog.get_logger()

STATUS_SO_MAP = {
    "1": "approved",
    "2": "void",
    "3": "draft",
    "4": "partial",
    "5": "completed",
}

STATUS_INVOICE_MAP = {
    "1": "posted",
    "2": "void",
    "3": "draft",
}


@celery_app.task(name="app.workers.sync_sales.run_sync", bind=True, max_retries=3)
def run_sync(self):
    existing_db = ExistingSessionLocal()
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("sync_sales.start")
        _sync_sales_orders(existing_db, analytics_db)
        _sync_invoices(existing_db, analytics_db)
        log.info("sync_sales.complete")
    except Exception as exc:
        log.error("sync_sales.error", error=str(exc))
        analytics_db.rollback()
        raise self.retry(exc=exc, countdown=30)
    finally:
        existing_db.close()
        analytics_db.close()


def _sync_sales_orders(existing_db, analytics_db):
    """Sync so + so_detail → sales_orders + sales_order_items."""
    # Get last sync timestamp
    state = analytics_db.query(SyncState).filter_by(table_name="so").first()
    last_sync = state.last_sync_at if state else datetime(2000, 1, 1)

    # Incremental: ambil SO yang dibuat/dimodifikasi setelah last_sync
    so_query = text("""
        SELECT
            s.nomor, s.tanggal, s.id_customer,
            c.customer AS nama_customer,
            s.id_salesman, s.id_gudang,
            s.total, s.total_discount, s.total_ppn, s.grandtotal,
            s.status, s.referensi, s.create_date, s.modified_date
        FROM public.so s
        LEFT JOIN public.customer c ON s.id_customer = c.id_kontak
        WHERE COALESCE(s.modified_date, s.create_date, '1970-01-01'::timestamp) >= :last_sync
        ORDER BY COALESCE(s.modified_date, s.create_date, '1970-01-01'::timestamp)
        LIMIT 50000
    """)

    rows = existing_db.execute(so_query, {"last_sync": last_sync}).mappings().all()

    synced = 0
    for row in rows:
        status_code = (row["status"] or "").strip()
        stmt = insert(SalesOrder).values(
            nomor=row["nomor"],
            tanggal=row["tanggal"],
            id_customer=row["id_customer"],
            nama_customer=row["nama_customer"],
            id_salesman=row["id_salesman"],
            id_gudang=row["id_gudang"],
            total=row["total"] or 0,
            total_discount=row["total_discount"] or 0,
            total_ppn=row["total_ppn"] or 0,
            grandtotal=row["grandtotal"] or 0,
            status=status_code,
            status_label=STATUS_SO_MAP.get(status_code, "unknown"),
            referensi=row["referensi"],
            create_date=row["create_date"],
            modified_date=row["modified_date"],
        ).on_conflict_do_update(
            index_elements=["nomor"],
            set_={
                "total": row["total"] or 0,
                "grandtotal": row["grandtotal"] or 0,
                "status": status_code,
                "status_label": STATUS_SO_MAP.get(status_code, "unknown"),
                "modified_date": row["modified_date"],
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

        # Sync items
        items_query = text("""
            SELECT sd.*, b.nama_barang
            FROM public.so_detail sd
            LEFT JOIN public.barang b ON sd.id_barang = b.id_barang
            WHERE sd.no_so = :nomor
        """)
        items = existing_db.execute(items_query, {"nomor": row["nomor"]}).mappings().all()
        for item in items:
            item_stmt = insert(SalesOrderItem).values(
                no_so=row["nomor"],
                urut=item["urut"],
                id_barang=item["id_barang"],
                nama_barang=item["nama_barang"],
                qty=item["qty"] or 0,
                harga=item["harga"] or 0,
                diskon=item["diskon"] or 0,
                total=item["total"] or 0,
                diambil=item["diambil"] or 0,
                sisa=(item["qty"] or 0) - (item["diambil"] or 0),
            ).on_conflict_do_update(
                index_elements=["no_so", "urut"],
                set_={
                    "qty": item["qty"] or 0,
                    "diambil": item["diambil"] or 0,
                    "sisa": (item["qty"] or 0) - (item["diambil"] or 0),
                    "synced_at": datetime.now(),
                }
            )
            analytics_db.execute(item_stmt)

    analytics_db.commit()

    # Update sync state
    state = analytics_db.query(SyncState).filter_by(table_name="so").first()
    if not state:
        state = SyncState(table_name="so")
        analytics_db.add(state)
        
    if synced > 0 and rows:
        last_row = rows[-1]
        state.last_sync_at = last_row["modified_date"] or last_row["create_date"]
    else:
        state.last_sync_at = datetime.now()
        
    state.sync_status = "completed"
    analytics_db.commit()
    publish_sync_event("sales_orders")
    log.info("sync_sales_orders.done", synced=synced)


def _sync_invoices(existing_db, analytics_db):
    """Sync penjualan → invoices."""
    state = analytics_db.query(SyncState).filter_by(table_name="penjualan").first()
    last_sync = state.last_sync_at if state else datetime(2000, 1, 1)

    query = text("""
        SELECT
            p.no_penjualan, p.tanggal, p.id_customer,
            c.customer AS nama_customer,
            p.id_salesman, p.id_gudang, p.no_do,
            p.total, p.total_discount, p.total_ppn, p.grandtotal,
            p.total_bayar, p.is_lunas, p.tgl_jatuh_tempo, p.tgl_bayar,
            p.status, p.faktur, p.create_date, p.modified_date
        FROM public.penjualan p
        LEFT JOIN public.customer c ON p.id_customer = c.id_kontak
        WHERE COALESCE(p.modified_date, p.create_date, '1970-01-01'::timestamp) >= :last_sync
        ORDER BY COALESCE(p.modified_date, p.create_date, '1970-01-01'::timestamp)
        LIMIT 50000
    """)

    rows = existing_db.execute(query, {"last_sync": last_sync}).mappings().all()

    synced = 0
    for row in rows:
        status_code = (row["status"] or "").strip()
        # is_lunas bisa '1' atau boolean
        is_lunas_val = row["is_lunas"]
        if isinstance(is_lunas_val, str):
            is_lunas = is_lunas_val.strip() == "1"
        else:
            is_lunas = bool(is_lunas_val)

        stmt = insert(Invoice).values(
            no_penjualan=row["no_penjualan"],
            tanggal=row["tanggal"],
            id_customer=row["id_customer"],
            nama_customer=row["nama_customer"],
            id_salesman=row["id_salesman"],
            id_gudang=row["id_gudang"],
            no_do=row["no_do"],
            total=row["total"] or 0,
            total_discount=row["total_discount"] or 0,
            total_ppn=row["total_ppn"] or 0,
            grandtotal=row["grandtotal"] or 0,
            total_bayar=row["total_bayar"] or 0,
            is_lunas=is_lunas,
            tgl_jatuh_tempo=row["tgl_jatuh_tempo"],
            tgl_bayar=row["tgl_bayar"],
            status=status_code,
            status_label=STATUS_INVOICE_MAP.get(status_code, "unknown"),
            faktur=row["faktur"],
            create_date=row["create_date"],
        ).on_conflict_do_update(
            index_elements=["no_penjualan"],
            set_={
                "total_bayar": row["total_bayar"] or 0,
                "is_lunas": is_lunas,
                "tgl_bayar": row["tgl_bayar"],
                "status": status_code,
                "status_label": STATUS_INVOICE_MAP.get(status_code, "unknown"),
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()

    state = analytics_db.query(SyncState).filter_by(table_name="penjualan").first()
    if not state:
        state = SyncState(table_name="penjualan")
        analytics_db.add(state)
        
    if synced > 0 and rows:
        last_row = rows[-1]
        state.last_sync_at = last_row["modified_date"] or last_row["create_date"]
    else:
        state.last_sync_at = datetime.now()
        
    state.sync_status = "completed"
    analytics_db.commit()
    publish_sync_event("invoices")
    log.info("sync_invoices.done", synced=synced)
