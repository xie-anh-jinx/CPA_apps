"""
CPA Platform — FastAPI Main Application
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from typing import Optional
from fastapi import Query

from app.config import settings
from app.routers import (
    auth, inventory, warehouses, sales,
    distributions, customers, crm, alerts, analytics, ws, export, reports, forecast,
    kita_analytics, oauth2_ui, schema, ai_chat
)
from app.mcp import router as mcp_router

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
    allow_origins=[
        "https://warehouse.pengajaran.com",
        "https://chatgpt.com",
        "https://chat.openai.com",
        "https://oaistatic.com",
        "https://claude.ai",
        "https://anthropic.com",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "WWW-Authenticate", "Mcp-Session-Id", "Authorization", "Content-Type"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Prometheus Metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(oauth2_ui.router, prefix=f"{API_PREFIX}/auth", tags=["OAuthUI"])
app.include_router(inventory.router, prefix=f"{API_PREFIX}/inventory", tags=["Inventory"])
app.include_router(warehouses.router, prefix=f"{API_PREFIX}/warehouses", tags=["Warehouses"])
app.include_router(sales.router, prefix=f"{API_PREFIX}/sales", tags=["Sales"])
app.include_router(distributions.router, prefix=f"{API_PREFIX}/distributions", tags=["Distributions"])
app.include_router(customers.router, prefix=f"{API_PREFIX}/customers", tags=["Customers"])
app.include_router(crm.router, prefix=f"{API_PREFIX}/crm", tags=["CRM"])
app.include_router(alerts.router, prefix=f"{API_PREFIX}/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix=f"{API_PREFIX}/analytics", tags=["Analytics"])
app.include_router(kita_analytics.router)
app.include_router(export.router, prefix=f"{API_PREFIX}/export", tags=["Export"])
app.include_router(reports.router, prefix=f"{API_PREFIX}/reports", tags=["Reports"])
app.include_router(forecast.router, prefix=f"{API_PREFIX}/forecast", tags=["Forecast"])
app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["Forecast"])
app.include_router(schema.router, prefix=f"{API_PREFIX}/schema", tags=["Schema"])
app.include_router(mcp_router, prefix=f"{API_PREFIX}/mcp", tags=["MCP"])
app.include_router(mcp_router, prefix="/mcp", tags=["MCP Root"])
app.include_router(ai_chat.router, prefix=f"{API_PREFIX}/ai", tags=["AI Chat & MCP"])
app.include_router(ai_chat.router, prefix="/api/v1/ai", tags=["AI Chat & MCP v1"])
app.include_router(ws.router)


# ─── OAuth & Well-Known Discovery Endpoints (RFC 9728 & RFC 8414 for MCP / OpenAI) ───
@app.options("/.well-known/oauth-protected-resource")
@app.options("/.well-known/oauth-protected-resource/mcp")
@app.options("/.well-known/oauth-protected-resource/api/mcp")
@app.options("/mcp/.well-known/oauth-protected-resource")
@app.options("/api/mcp/.well-known/oauth-protected-resource")
async def oauth_protected_resource_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/.well-known/oauth-protected-resource", tags=["Well-Known"])
@app.get("/.well-known/oauth-protected-resource/mcp", tags=["Well-Known"])
@app.get("/.well-known/oauth-protected-resource/api/mcp", tags=["Well-Known"])
@app.get("/mcp/.well-known/oauth-protected-resource", tags=["Well-Known"])
@app.get("/api/mcp/.well-known/oauth-protected-resource", tags=["Well-Known"])
async def oauth_protected_resource(request: Request):
    base = "https://warehouse.pengajaran.com/mcp"
    if "/api/mcp" in str(request.url):
        base = "https://warehouse.pengajaran.com/api/mcp"
    return JSONResponse(
        content={
            "resource": base,
            "authorization_servers": [base],
            "bearer_methods_supported": ["header"],
            "scopes_supported": ["openid", "profile", "email", "read", "write"],
            "resource_documentation": f"{base}/privacy",
        },
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )


@app.options("/.well-known/oauth-authorization-server")
@app.options("/.well-known/oauth-authorization-server/mcp")
@app.options("/.well-known/oauth-authorization-server/api/mcp")
@app.options("/mcp/.well-known/oauth-authorization-server")
@app.options("/api/mcp/.well-known/oauth-authorization-server")
@app.options("/.well-known/openid-configuration")
@app.options("/.well-known/openid-configuration/mcp")
@app.options("/.well-known/openid-configuration/api/mcp")
@app.options("/mcp/.well-known/openid-configuration")
@app.options("/api/mcp/.well-known/openid-configuration")
async def oauth_authorization_server_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/.well-known/oauth-authorization-server", tags=["Well-Known"])
@app.get("/.well-known/oauth-authorization-server/mcp", tags=["Well-Known"])
@app.get("/.well-known/oauth-authorization-server/api/mcp", tags=["Well-Known"])
@app.get("/mcp/.well-known/oauth-authorization-server", tags=["Well-Known"])
@app.get("/api/mcp/.well-known/oauth-authorization-server", tags=["Well-Known"])
@app.get("/.well-known/openid-configuration", tags=["Well-Known"])
@app.get("/.well-known/openid-configuration/mcp", tags=["Well-Known"])
@app.get("/.well-known/openid-configuration/api/mcp", tags=["Well-Known"])
@app.get("/mcp/.well-known/openid-configuration", tags=["Well-Known"])
@app.get("/api/mcp/.well-known/openid-configuration", tags=["Well-Known"])
async def oauth_authorization_server(request: Request):
    base = "https://warehouse.pengajaran.com/mcp"
    if "/api/mcp" in str(request.url):
        base = "https://warehouse.pengajaran.com/api/mcp"
    return JSONResponse(
        content={
            "issuer": base,
            "authorization_endpoint": f"{base}/authorize",
            "token_endpoint": f"{base}/token",
            "registration_endpoint": f"{base}/register",
            "userinfo_endpoint": f"{base}/userinfo",
            "revocation_endpoint": f"{base}/revoke",
            "scopes_supported": ["openid", "profile", "email", "read", "write"],
            "response_types_supported": ["code"],
            "grant_types_supported": ["authorization_code"],
            "code_challenge_methods_supported": ["S256"],
            "token_endpoint_auth_methods_supported": ["none", "client_secret_post", "client_secret_basic"],
            "authorization_response_iss_parameter_supported": True,
            "subject_types_supported": ["public"]
        },
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )


# Standard OAuth shortcut routes at root (for MCP clients that construct endpoints from base URL)
@app.get("/authorize", response_class=RedirectResponse, tags=["OAuth"])
@app.get("/oauth/authorize", response_class=RedirectResponse, tags=["OAuth"])
async def root_authorize(request: Request):
    """Redirect standard /authorize to the real OAuth authorize endpoint"""
    qs = request.url.query
    redirect_target = f"https://warehouse.pengajaran.com/api/auth/authorize"
    if qs:
        redirect_target += f"?{qs}"
    from fastapi.responses import RedirectResponse as RR
    return RR(url=redirect_target, status_code=302)

@app.post("/token", tags=["OAuth"])
@app.post("/oauth/token", tags=["OAuth"])
async def root_token(request: Request):
    """Proxy /token -> /api/auth/token"""
    from app.routers.auth import login
    from app.database import AnalyticsSessionLocal
    db = AnalyticsSessionLocal()
    try:
        return await login(request, db)
    finally:
        db.close()

@app.get("/userinfo", tags=["OAuth"])
@app.get("/oauth/userinfo", tags=["OAuth"])
async def root_userinfo(request: Request):
    """Return basic userinfo from Bearer token"""
    authorization = request.headers.get("Authorization", "")
    if not authorization.lower().startswith("bearer "):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization[7:].strip()
    from app.mcp.auth import authenticate_jwt
    from app.database import AnalyticsSessionLocal
    db = AnalyticsSessionLocal()
    try:
        success, user, _ = authenticate_jwt(token, db)
        if not success or not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid token")
        return JSONResponse(content={
            "sub": user.username,
            "name": getattr(user, "full_name", user.username),
            "email": getattr(user, "email", ""),
            "role": user.role
        })
    finally:
        db.close()


# Dedicated OAuth dynamic client registration (RFC 7591) — separate from user /register
# This is what ChatGPT hits first to get a client_id before starting OAuth flow
@app.options("/api/oauth/register")
@app.options("/register")
async def oauth_client_register_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/api/oauth/register", tags=["OAuth"])
@app.post("/register", tags=["OAuth"])
async def oauth_client_register(request: Request):
    from app.routers.oauth2_ui import register_oauth_client
    return await register_oauth_client(request)

@app.get("/.well-known/ai-plugin.json")
def get_ai_plugin_manifest_root(
    role: Optional[str] = Query(None),
    auth_type: Optional[str] = Query("oauth", description="none, user_http, or oauth")
):
    """
    Wrapper exposing the same manifest as /api/mcp/.well-known/ai-plugin.json
    but at the root path so ChatGPT can discover the plugin.
    """
    from app.mcp.router import get_ai_plugin_manifest as mcp_manifest
    return mcp_manifest(role=role, auth_type=auth_type)


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
