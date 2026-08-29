"""
Sync Worker — Customers
Sync customer dan customer_kontak dari DB lama ke analytics DB
"""
import structlog
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.workers.celery_app import celery_app
from app.database import ExistingSessionLocal, AnalyticsSessionLocal
from app.models.analytics.models import CustomerRecord, SyncState
from app.workers.redis_publisher import publish_sync_event

log = structlog.get_logger()


@celery_app.task(name="app.workers.sync_customers.run_sync", bind=True, max_retries=3)
def run_sync(self):
    existing_db = ExistingSessionLocal()
    analytics_db = AnalyticsSessionLocal()
    try:
        log.info("sync_customers.start")
        _sync_customers(existing_db, analytics_db)
        log.info("sync_customers.complete")
    except Exception as exc:
        log.error("sync_customers.error", error=str(exc))
        analytics_db.rollback()
        raise self.retry(exc=exc, countdown=30)
    finally:
        existing_db.close()
        analytics_db.close()


def _sync_customers(existing_db, analytics_db):
    query = text("""
        SELECT
            c.id_kontak, c.customer, c.telepon, c.email,
            c.alamat_penagihan, c.alamat_kirim,
            c.id_kategori_customer, kc.nm_kategori_customer AS nama_kategori,
            c.batas_kredit, c.kena_pajak, c.isaktif,
            c.id_kantor, c.id_sales, c.top
        FROM public.customer c
        LEFT JOIN public.kategori_customer kc ON c.id_kategori_customer = kc.id_kategori_customer
    """)

    rows = existing_db.execute(query).mappings().all()

    synced = 0
    for row in rows:
        stmt = insert(CustomerRecord).values(
            id_kontak=row["id_kontak"],
            nama_customer=row["customer"],
            telepon=row["telepon"],
            email=row["email"],
            alamat_penagihan=row["alamat_penagihan"],
            alamat_kirim=row["alamat_kirim"],
            id_kategori=row["id_kategori_customer"],
            nama_kategori=row["nama_kategori"],
            batas_kredit=row["batas_kredit"],
            kena_pajak=row["kena_pajak"],
            isaktif=row["isaktif"],
            id_kantor=row["id_kantor"],
            id_salesman=row["id_sales"],
            top=row["top"],
        ).on_conflict_do_update(
            index_elements=["id_kontak"],
            set_={
                "nama_customer": row["customer"],
                "telepon": row["telepon"],
                "email": row["email"],
                "isaktif": row["isaktif"],
                "synced_at": datetime.now(),
            }
        )
        analytics_db.execute(stmt)
        synced += 1

    analytics_db.commit()

    state = analytics_db.query(SyncState).filter_by(table_name="customer").first()
    if not state:
        state = SyncState(table_name="customer")
        analytics_db.add(state)
    state.last_sync_at = datetime.now()
    state.sync_status = "completed"
    analytics_db.commit()
    publish_sync_event("customers")
    log.info("sync_customers.done", synced=synced)
