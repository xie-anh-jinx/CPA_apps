"""
CPA Platform — FastAPI Main Application
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.routers import (
    auth, inventory, warehouses, sales,
    distributions, customers, crm, alerts, analytics, ws, export
)

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup dan shutdown events."""
    log.info("cpa_platform.startup", version=settings.app_version, env=settings.environment)
    yield
    log.info("cpa_platform.shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
## CPA Inventory Intelligence & CRM Platform

Platform monitoring dan analisis yang membaca dari PostgreSQL existing secara read-only,
kemudian menyajikan data melalui analytics layer yang sudah dibersihkan dan diagregasi.

### Modules
- **Inventory** — Stok real-time per gudang, aging, low-stock, overstock
- **Warehouses** — Multi-warehouse monitoring dan perbandingan
- **Sales** — Pipeline SO → Invoice, trend, per salesman/customer
- **Distributions** — DO tracking, status pengiriman, peta distribusi
- **CRM** — Customer 360, aktivitas, opportunities, complaints
- **Alerts** — Notifikasi stok, overdue, distribusi
- **Analytics** — KPI dashboard dan laporan
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middlewares ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Prometheus Metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(inventory.router, prefix=f"{API_PREFIX}/inventory", tags=["Inventory"])
app.include_router(warehouses.router, prefix=f"{API_PREFIX}/warehouses", tags=["Warehouses"])
app.include_router(sales.router, prefix=f"{API_PREFIX}/sales", tags=["Sales"])
app.include_router(distributions.router, prefix=f"{API_PREFIX}/distributions", tags=["Distributions"])
app.include_router(customers.router, prefix=f"{API_PREFIX}/customers", tags=["Customers"])
app.include_router(crm.router, prefix=f"{API_PREFIX}/crm", tags=["CRM"])
app.include_router(alerts.router, prefix=f"{API_PREFIX}/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix=f"{API_PREFIX}/analytics", tags=["Analytics"])
app.include_router(export.router, prefix=f"{API_PREFIX}/export", tags=["Export"])
app.include_router(ws.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "timestamp": __import__("datetime").datetime.now().isoformat()}
