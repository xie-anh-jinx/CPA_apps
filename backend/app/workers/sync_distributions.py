"""
Sync Worker — Distributions
Sync do_tbl dan do_detail ke analytics DB
"""
import structlog
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.workers.celery_app import celery_app
from app.database import ExistingSessionLocal, AnalyticsSessionLocal
from app.models.analytics.models import (
    Delivery, SyncState, WarehouseTransfer
)
from app.workers.redis_publisher import publish_sync_event

log = structlog.get_logger()

DO_STATUS_MAP = {
    "1": "delivered",
    "2": "void",
    "3": "draft",
    "4": "in_transit",
    "5": "partial",
}

TRANSFER_STATUS_MAP = {
    "1": "posted",
    "2": "void",
    "3": "draft",
}


@celery_app.task(name="app.workers.sync_distributions.run_sync", bind=True, max_retries=3)
def run_sync(self):
    existing_db = ExistingSessionLocal()
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("sync_distributions.start")
        _sync_deliveries(existing_db, analytics_db)
        _sync_warehouse_transfers(existing_db, analytics_db)
        log.info("sync_distributions.complete")
    except Exception as exc:
        log.error("sync_distributions.error", error=str(exc))
        analytics_db.rollback()
        raise self.retry(exc=exc, countdown=30)
    finally:
        existing_db.close()
        analytics_db.close()


def _sync_deliveries(existing_db, analytics_db):
    """Sync do_tbl → deliveries."""
    state = analytics_db.query(SyncState).filter_by(table_name="do_tbl").first()
    last_sync = state.last_sync_at if state else datetime(2000, 1, 1)

    query = text("""
        SELECT
            d.nomor, d.tanggal, d.id_customer,
            c.customer AS nama_customer,
            d.id_salesman, d.id_gudang, d.alamat,
            d.tgl_keluar, d.driver, d.lic_plate, d.transporter,
            d.shippingcosts, d.received_date, d.received_name,
            d.tgl_sampai, d.origin, d.destination, d.leadtime,
            d.status, d.create_date, d.modified_date, d.kode_user
        FROM public.do_tbl d
        LEFT JOIN public.customer c ON d.id_customer = c.id_kontak
        WHERE COALESCE(d.modified_date, d.create_date, '1970-01-01'::timestamp) >= :last_sync
        ORDER BY COALESCE(d.modified_date, d.create_date, '1970-01-01'::timestamp)
        LIMIT 50000
    """)

    rows = existing_db.execute(query, {"last_sync": last_sync}).mappings().all()

    synced = 0
    for row in rows:
        status_code = (row["status"] or "").strip()
        # Determine status label
        if row["received_date"]:
            status_label = "delivered"
        elif row["tgl_keluar"]:
            status_label = "in_transit"
        else:
            status_label = DO_STATUS_MAP.get(status_code, "draft")

        stmt = insert(Delivery).values(
            nomor=row["nomor"],
            tanggal=row["tanggal"],
            id_customer=row["id_customer"],
            nama_customer=row["nama_customer"],
            id_salesman=row["id_salesman"],
            id_gudang=row["id_gudang"],
            alamat=row["alamat"],
            tgl_keluar=row["tgl_keluar"],
            driver=row["driver"],
            lic_plate=row["lic_plate"],
            transporter=row["transporter"],
            shippingcosts=row["shippingcosts"],
            received_date=row["received_date"],
            received_name=row["received_name"],
            tgl_sampai=row["tgl_sampai"],
            origin=row["origin"],
            destination=row["destination"],
            leadtime=row["leadtime"],
            status=status_code,
            status_label=status_label,
            create_date=row["create_date"],
            modified_date=row["modified_date"],
        ).on_conflict_do_update(
            index_elements=["nomor"],
            set_={
                "received_date": row["received_date"],
                "received_name": row["received_name"],
                "tgl_sampai": row["tgl_sampai"],
                "status": status_code,
                "status_label": status_label,
                "modified_date": row["modified_date"],
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()

    state = analytics_db.query(SyncState).filter_by(table_name="do_tbl").first()
    if not state:
        state = SyncState(table_name="do_tbl")
        analytics_db.add(state)
    state.last_sync_at = datetime.now()
    state.sync_status = "completed"
    analytics_db.commit()
    publish_sync_event("deliveries")
    log.info("sync_deliveries.done", synced=synced)


def _sync_warehouse_transfers(existing_db, analytics_db):
    """Sync transfer_barang → warehouse_transfers."""
    query = text("""
        SELECT
            tb.id_transfer, tb.id_gudang_asal,
            ga.gudang AS nama_gudang_asal,
            tb.id_gudang_tujuan,
            gt.gudang AS nama_gudang_tujuan,
            tb.tanggal, tb.uraian, tb.status,
            COUNT(tbd.id_tranfer_detil) AS total_item
        FROM public.transfer_barang tb
        LEFT JOIN public.gudang ga ON tb.id_gudang_asal = ga.id_gudang
        LEFT JOIN public.gudang gt ON tb.id_gudang_tujuan = gt.id_gudang
        LEFT JOIN public.transfer_barang_detil tbd ON tb.id_transfer = tbd.id_transfer
        GROUP BY tb.id_transfer, tb.id_gudang_asal, ga.gudang,
                 tb.id_gudang_tujuan, gt.gudang, tb.tanggal, tb.uraian, tb.status
    """)

    rows = existing_db.execute(query).mappings().all()

    synced = 0
    for row in rows:
        status_code = (row["status"] or "").strip()
        stmt = insert(WarehouseTransfer).values(
            id_transfer=row["id_transfer"],
            id_gudang_asal=row["id_gudang_asal"],
            nama_gudang_asal=row["nama_gudang_asal"],
            id_gudang_tujuan=row["id_gudang_tujuan"],
            nama_gudang_tujuan=row["nama_gudang_tujuan"],
            tanggal=row["tanggal"],
            uraian=row["uraian"],
            status=status_code,
            status_label=TRANSFER_STATUS_MAP.get(status_code, "unknown"),
            total_item=row["total_item"] or 0,
        ).on_conflict_do_update(
            index_elements=["id_transfer"],
            set_={
                "status": status_code,
                "status_label": TRANSFER_STATUS_MAP.get(status_code, "unknown"),
                "total_item": row["total_item"] or 0,
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()
    log.info("sync_warehouse_transfers.done", synced=synced)
