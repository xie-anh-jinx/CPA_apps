"""
CPA Platform — Celery Application
Worker queues: sync, analytics, alerts
"""
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "cpa_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.sync_inventory",
        "app.workers.sync_sales",
        "app.workers.sync_customers",
        "app.workers.sync_distributions",
        "app.workers.compute_analytics",
        "app.workers.check_alerts",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Makassar",
    enable_utc=False,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Task routing
    task_routes={
        "app.workers.sync_inventory.*": {"queue": "sync"},
        "app.workers.sync_sales.*": {"queue": "sync"},
        "app.workers.sync_customers.*": {"queue": "sync"},
        "app.workers.sync_distributions.*": {"queue": "sync"},
        "app.workers.compute_analytics.*": {"queue": "analytics"},
        "app.workers.check_alerts.*": {"queue": "alerts"},
    },
    # Beat schedule — periodic tasks
    beat_schedule={
        # Sync inventory setiap 15 detik
        "sync-inventory": {
            "task": "app.workers.sync_inventory.run_sync",
            "schedule": settings.sync_inventory_interval,
            "options": {"queue": "sync"},
        },
        # Sync sales setiap 30 detik
        "sync-sales": {
            "task": "app.workers.sync_sales.run_sync",
            "schedule": settings.sync_sales_interval,
            "options": {"queue": "sync"},
        },
        # Sync customers setiap 5 menit
        "sync-customers": {
            "task": "app.workers.sync_customers.run_sync",
            "schedule": settings.sync_customers_interval,
            "options": {"queue": "sync"},
        },
        # Sync distribusi setiap 1 menit
        "sync-distributions": {
            "task": "app.workers.sync_distributions.run_sync",
            "schedule": settings.sync_distributions_interval,
            "options": {"queue": "sync"},
        },
        # Compute analytics setiap jam
        "compute-analytics": {
            "task": "app.workers.compute_analytics.run_compute",
            "schedule": settings.compute_analytics_interval,
            "options": {"queue": "analytics"},
        },
        # Check alerts setiap 5 menit
        "check-alerts": {
            "task": "app.workers.check_alerts.run_check",
            "schedule": settings.check_alerts_interval,
            "options": {"queue": "alerts"},
        },
        # Snapshot stok harian (jam 23:55 setiap hari)
        "daily-stock-snapshot": {
            "task": "app.workers.compute_analytics.daily_stock_snapshot",
            "schedule": crontab(hour=23, minute=55),
            "options": {"queue": "analytics"},
        },
        # Customer metrics harian (jam 01:00)
        "daily-customer-metrics": {
            "task": "app.workers.compute_analytics.compute_customer_metrics",
            "schedule": crontab(hour=1, minute=0),
            "options": {"queue": "analytics"},
        },
    },
)
