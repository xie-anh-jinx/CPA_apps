"""
CPA Platform — Dual Database Setup
- existing_engine  : READ ONLY dari PostgreSQL lama
- analytics_engine : READ + WRITE untuk PostgreSQL analytics baru
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool
from app.config import settings


# ─── Existing DB (READ ONLY) ─────────────────────────────────────────────────
existing_engine = create_engine(
    settings.existing_db_url,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"options": "-c default_transaction_read_only=on"},
    echo=settings.debug,
)

ExistingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=existing_engine,
)


# ─── Analytics DB (READ + WRITE) ─────────────────────────────────────────────
analytics_engine = create_engine(
    settings.analytics_db_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.debug,
)

AnalyticsSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=analytics_engine,
)


# ─── Base Models ─────────────────────────────────────────────────────────────
class ExistingBase(DeclarativeBase):
    """Base untuk model read-only dari DB lama."""
    pass


class AnalyticsBase(DeclarativeBase):
    """Base untuk model analytics & CRM baru."""
    pass


# ─── Dependency Injections ───────────────────────────────────────────────────
def get_existing_db():
    """FastAPI dependency — session ke DB lama (read-only)."""
    db = ExistingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_analytics_db():
    """FastAPI dependency — session ke analytics DB."""
    db = AnalyticsSessionLocal()
    try:
        yield db
    finally:
        db.close()
