"""
Sync Worker — Inventory
Incremental sync dari stok_barang dan mutasi ke analytics DB
"""
import structlog
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.workers.celery_app import celery_app
from app.database import ExistingSessionLocal, AnalyticsSessionLocal
from app.models.analytics.models import (
    InventoryBalance, StockMovement, SyncState, DailyStockSnapshot
)
from app.workers.redis_publisher import publish_sync_event

log = structlog.get_logger()


def _get_sync_state(analytics_db, table_name: str) -> datetime | None:
    """Ambil timestamp sync terakhir."""
    state = analytics_db.query(SyncState).filter_by(table_name=table_name).first()
    return state.last_sync_at if state else None


def _update_sync_state(analytics_db, table_name: str, synced_count: int, status: str = "completed"):
    """Update sync state setelah selesai."""
    state = analytics_db.query(SyncState).filter_by(table_name=table_name).first()
    if not state:
        state = SyncState(table_name=table_name)
        analytics_db.add(state)
    state.last_sync_at = datetime.now()
    state.total_synced = (state.total_synced or 0) + synced_count
    state.sync_status = status
    analytics_db.commit()
    publish_sync_event("inventory_balances")


@celery_app.task(name="app.workers.sync_inventory.run_sync", bind=True, max_retries=3)
def run_sync(self):
    """Sync stok_barang dan mutasi dari DB lama ke analytics DB."""
    existing_db = ExistingSessionLocal()
    analytics_db = AnalyticsSessionLocal()

    try:
        log.info("sync_inventory.start")
        _sync_inventory_balances(existing_db, analytics_db)
        _sync_stock_movements(existing_db, analytics_db)
        log.info("sync_inventory.complete")
    except Exception as exc:
        log.error("sync_inventory.error", error=str(exc))
        analytics_db.rollback()
        # Update sync state as failed
        try:
            _update_sync_state(analytics_db, "stok_barang", 0, "failed")
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=30)
    finally:
        existing_db.close()
        analytics_db.close()


def _sync_inventory_balances(existing_db, analytics_db):
    """
    Sync stok_barang → inventory_balances.
    Aggregasi stok per gudang per barang (sum semua batch).
    """
    last_sync = _get_sync_state(analytics_db, "stok_barang")

    # Query aggregated stock dari DB lama
    query = text("""
        SELECT
            sb.id_gudang,
            sb.id_barang,
            SUM(sb.stok) AS on_hand,
            AVG(sb.hpp) AS hpp,
            SUM(sb.stok * COALESCE(sb.hpp, 0)) AS nilai_persediaan,
            MAX(sb.batch) AS batch,
            MAX(sb.tanggal) AS last_date,
            bm.min AS stok_min,
            bm.max AS stok_max
        FROM public.stok_barang sb
        LEFT JOIN public.barang_minmax bm
            ON sb.id_barang = bm.id_barang AND sb.id_gudang = bm.id_gudang
        GROUP BY sb.id_gudang, sb.id_barang, bm.min, bm.max
    """)

    rows = existing_db.execute(query).mappings().all()

    synced = 0
    for row in rows:
        on_hand = float(row["on_hand"] or 0)
        stok_min = float(row["stok_min"] or 0)
        stok_max = float(row["stok_max"] or 0)

        # Upsert ke analytics DB
        stmt = insert(InventoryBalance).values(
            id_gudang=row["id_gudang"],
            id_barang=row["id_barang"],
            on_hand=on_hand,
            available=on_hand,  # simplified; reserved dihitung di compute_analytics
            hpp=row["hpp"],
            nilai_persediaan=row["nilai_persediaan"],
            batch=row["batch"],
            stok_min=stok_min,
            stok_max=stok_max,
            last_sync=datetime.now(),
        ).on_conflict_do_update(
            index_elements=["id_gudang", "id_barang"],
            set_={
                "on_hand": on_hand,
                "available": on_hand,
                "hpp": row["hpp"],
                "nilai_persediaan": row["nilai_persediaan"],
                "batch": row["batch"],
                "stok_min": stok_min,
                "stok_max": stok_max,
                "last_sync": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()
    _update_sync_state(analytics_db, "stok_barang", synced)
    log.info("sync_inventory_balances.done", synced=synced)


def _sync_stock_movements(existing_db, analytics_db):
    """Sync mutasi bulanan → stock_movements."""
    query = text("""
        SELECT tahun, bulan, id_barang, id_gudang,
               saldo_awal, masuk, keluar, saldo_akhir
        FROM public.mutasi
    """)

    rows = existing_db.execute(query).mappings().all()

    synced = 0
    for row in rows:
        stmt = insert(StockMovement).values(
            id_gudang=row["id_gudang"],
            id_barang=row["id_barang"],
            tahun=row["tahun"],
            bulan=row["bulan"],
            saldo_awal=row["saldo_awal"] or 0,
            masuk=row["masuk"] or 0,
            keluar=row["keluar"] or 0,
            saldo_akhir=row["saldo_akhir"] or 0,
        ).on_conflict_do_update(
            index_elements=["id_gudang", "id_barang", "tahun", "bulan"],
            set_={
                "saldo_awal": row["saldo_awal"] or 0,
                "masuk": row["masuk"] or 0,
                "keluar": row["keluar"] or 0,
                "saldo_akhir": row["saldo_akhir"] or 0,
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()
    _update_sync_state(analytics_db, "mutasi", synced)
    log.info("sync_stock_movements.done", synced=synced)
