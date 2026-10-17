"""
CPA MCP — FastAPI Router (Streamable HTTP + SSE Transports)
Supports:
  - MCP 2026-07-28 Stateless HTTP (ChatGPT, OpenAI)
  - MCP 2024-11-05 SSE (Cursor, Claude Desktop, LibreChat)
  - Direct JSON-RPC (/api/mcp/rpc)
  - GPT Actions OpenAPI schema
"""
import uuid
import json
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, Query, Request, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse, Response
from sqlalchemy.orm import Session

from app.database import get_analytics_db
from app.mcp.auth import MCPUser, authenticate_jwt, create_role_user, get_user_from_db
from app.mcp.protocol import handle_jsonrpc_message
from app.mcp.tools import list_tools_for_user, execute_tool
from app.mcp.session import extract_session_identifiers, get_user_for_session, save_user_session

router = APIRouter()

# Active SSE Sessions: sessionId -> {"user": MCPUser, "queue": asyncio.Queue}
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


def resolve_request_user(
    authorization: Optional[str] = Header(None),
    x_cpa_role: Optional[str] = Header(None, alias="X-CPA-Role"),
    token_param: Optional[str] = Query(None, alias="token"),
    role_param: Optional[str] = Query(None, alias="role"),
    db: Session = Depends(get_analytics_db)
) -> MCPUser:
    """
    Resolves the MCP user context from headers or query parameters:
    1. Bearer JWT token (header or query)
    2. Explicit role (header or query, e.g. for development / role testing)
    3. Default to guest viewer
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif token_param:
        token = token_param

    if token:
        success, user, _ = authenticate_jwt(token, db)
        if success and user:
            return user

    target_role = x_cpa_role or role_param
    if target_role:
        target_role = target_role.strip().lower()
        sample_user = db.query(
            __import__("app.models.analytics.models", fromlist=["AppUser"]).AppUser
        ).filter_by(role=target_role, is_active=True).first()

        if sample_user:
            return MCPUser(
                username=sample_user.username,
                role=sample_user.role,
                email=sample_user.email,
                id_pegawai=sample_user.id_pegawai,
                id_gudang_access=sample_user.id_gudang_access,
                is_authenticated=True
            )
        else:
            return create_role_user(role=target_role)

    # No token and no role header — return 401 so ChatGPT triggers OAuth popup
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Please sign in to continue.",
        headers={
            "WWW-Authenticate": 'Bearer resource_metadata="https://warehouse.pengajaran.com/.well-known/oauth-protected-resource"',
            "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
            "Access-Control-Allow-Origin": "*"
        }
    )



# ─── Shared JSON-RPC processor ────────────────────────────────────────────────
def process_jsonrpc(body: dict, user: MCPUser, db: Session) -> dict:
    """Process a single JSON-RPC message and return the response dict."""
    response, _ = handle_jsonrpc_message(body, user, db)
    return response or {"jsonrpc": "2.0", "id": body.get("id"), "result": {}}


def _resolve_user_from_request(request: Request, db: Session) -> MCPUser:
    """
    Resolve user from request.
    - JWT token (header/query) → authenticated user
    - X-CPA-Role header (Cursor/local dev) → role bypass
    - No credentials → guest_viewer (allowed, tools handle auth internally)
    """
    authorization = request.headers.get("authorization")
    x_cpa_role = request.headers.get("x-cpa-role")
    token_param = request.query_params.get("token")
    role_param = request.query_params.get("role")

    # 1. JWT Token (Bearer header or query param)
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif token_param:
        token = token_param

    if token:
        try:
            success, auth_user, _ = authenticate_jwt(token, db)
        except Exception:
            success, auth_user = False, None
        if success and auth_user:
            return auth_user
        # Invalid token → still allow as guest (don't block MCP creation)
        return MCPUser(username="guest_viewer", role="viewer", is_authenticated=False)

    # 2. Dev bypass via X-CPA-Role header (Cursor, local testing)
    target_role = x_cpa_role or role_param
    if target_role:
        target_role = target_role.strip().lower()
        try:
            AppUser = __import__("app.models.analytics.models", fromlist=["AppUser"]).AppUser
            sample_user = db.query(AppUser).filter_by(role=target_role, is_active=True).first()
        except Exception:
            sample_user = None
        if sample_user:
            return MCPUser(
                username=sample_user.username,
                role=sample_user.role,
                email=sample_user.email,
                id_pegawai=sample_user.id_pegawai,
                id_gudang_access=sample_user.id_gudang_access,
                is_authenticated=True
            )
        return create_role_user(role=target_role)

    # 3. No credentials → guest_viewer (MCP App creation will succeed)
    #    Users authenticate via cpa_authenticate tool after connecting
    return MCPUser(username="guest_viewer", role="viewer", is_authenticated=False)

async def _handle_streamable_http(request: Request, db: Session) -> JSONResponse:
    """
    Core handler for MCP Streamable HTTP Transport.
    Supports Mcp-Session-Id header, cookies, and OpenAI MCP client metadata
    (sessionId, openai/session, openai/subject) stored via Redis for multi-worker support.
    """
    raw_body = await request.body()

    # Empty body probe
    if not raw_body or not raw_body.strip():
        user = _resolve_user_from_request(request, db)
        print(f"👉 [MCP PROBE] Empty body probe from {request.client.host if request.client else 'unknown'} as {user.role}", flush=True)
        return JSONResponse(status_code=200, content={"jsonrpc": "2.0", "id": None, "result": {}})

    try:
        body = json.loads(raw_body)
    except Exception as e:
        print(f"❌ [MCP PARSE ERROR] raw_body={raw_body[:200]}: {e}", flush=True)
        return JSONResponse(
            status_code=200,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        )

    # Extract method from body for auth gating
    method = body.get("method", "") if isinstance(body, dict) else ""

    # Extract all possible session identifiers from headers, cookies, and body payload (OpenAI _meta)
    session_ids = extract_session_identifiers(dict(request.headers), dict(request.cookies), body)

    # Check if any candidate session ID is already authenticated in Redis/local session
    session_user = get_user_for_session(session_ids)
    if session_user and session_user.is_authenticated:
        user = session_user
        print(f"👉 [MCP AUTH] Found authenticated session user: {user.username} (role: {user.role}) for ids={session_ids[:2]}", flush=True)
    else:
        user = _resolve_user_from_request(request, db)

    # Methods that ALWAYS work without auth (like AIMS) — required for ChatGPT to connect
    PUBLIC_METHODS = {"initialize", "ping", "tools/list", "server/discover",
                      "prompts/list", "resources/list"}

    if not user.is_authenticated and method not in PUBLIC_METHODS:
        print(f"🔒 [MCP AUTH] Unauthenticated request for '{method}' — returning 200+JSON error", flush=True)
        msg_id = body.get("id") if isinstance(body, dict) else None
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32001,
                    "message": "Authentication required. Please sign in via Connected Accounts."
                }
            },
            headers={
                "WWW-Authenticate": 'Bearer resource_metadata="https://warehouse.pengajaran.com/.well-known/oauth-protected-resource"',
                "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )


    # Ensure we have at least one primary session ID to return to the client
    primary_session_id = session_ids[0] if session_ids else str(uuid.uuid4())
    if primary_session_id not in session_ids:
        session_ids.append(primary_session_id)

    # Base response headers for session tracking (MCP standard & browser cookies)
    resp_headers = {
        "Mcp-Session-Id": primary_session_id,
        "Set-Cookie": f"mcp_session_id={primary_session_id}; Path=/; HttpOnly; SameSite=None; Secure"
    }

    print(f"👉 [MCP REQUEST] session_ids={session_ids[:2]} user={user.username} method={body.get('method') if isinstance(body, dict) else 'batch'}", flush=True)

    # Handle batch requests
    if isinstance(body, list):
        responses = []
        for msg in body:
            try:
                resp, updated_user = handle_jsonrpc_message(msg, user, db)
                if updated_user and updated_user.is_authenticated:
                    user = updated_user
                    save_user_session(session_ids, user)
                    print(f"✅ [MCP SESSION] Saved authenticated user {user.username} to sessions {session_ids[:2]}", flush=True)
                if resp:
                    responses.append(resp)
            except Exception as e:
                responses.append({
                    "jsonrpc": "2.0",
                    "id": msg.get("id"),
                    "error": {"code": -32603, "message": str(e)}
                })
        return JSONResponse(status_code=200, content=responses, headers=resp_headers)

    # Single request
    try:
        response, updated_user = handle_jsonrpc_message(body, user, db)

        # Persist auth state: if cpa_authenticate succeeded, store in Redis session
        if updated_user and updated_user.is_authenticated:
            user = updated_user
            save_user_session(session_ids, user)
            print(f"✅ [MCP SESSION] Saved authenticated user {user.username} to sessions {session_ids[:2]}", flush=True)

        if response is None:
            print(f"👈 [MCP NOTIFICATION ACK] 204 for method={method}", flush=True)
            return Response(status_code=status.HTTP_204_NO_CONTENT, headers=resp_headers)

        if method == "initialize":
            print(f"🔑 [MCP SESSION] Initialized session {primary_session_id} for {user.username}", flush=True)
            if user.is_authenticated:
                save_user_session(session_ids, user)

        print(f"👈 [MCP RESPONSE] user={user.username} method={method}", flush=True)
        return JSONResponse(status_code=200, content=response, headers=resp_headers)
    except Exception as e:
        print(f"❌ [MCP ERROR] {e}", flush=True)
        return JSONResponse(
            status_code=200,
            content={"jsonrpc": "2.0", "id": body.get("id"), "error": {"code": -32603, "message": str(e)}},
            headers=resp_headers
        )




# ─── 1a. Streamable HTTP — Root endpoint /api/mcp & /mcp (ChatGPT App / MCP Inspector) ─
@router.post("")
@router.post("/")
async def mcp_streamable_http_root(request: Request, db: Session = Depends(get_analytics_db)):
    """
    MCP Streamable HTTP at /api/mcp or /mcp (no suffix).
    This is the standard production URL for ChatGPT Apps and MCP Inspector.
    """
    return await _handle_streamable_http(request, db)


@router.get("")
@router.get("/")
async def mcp_streamable_http_get(
    request: Request,
    user: MCPUser = Depends(resolve_request_user),
    db: Session = Depends(get_analytics_db)
):
    """
    GET request for MCP endpoint:
    - If Accept header includes 'text/event-stream', connects SSE.
    - Otherwise returns JSON status indicating server readiness and metadata.
    """
    accept_header = request.headers.get("accept", "")
    if "text/event-stream" in accept_header:
        return await mcp_sse_connect(request, user)

    return JSONResponse(
        status_code=200,
        content={
            "name": "cpa-analytics-mcp",
            "version": "1.0.0",
            "status": "ready",
            "transport": "streamable-http",
            "mcp_version": "2024-11-05",
            "endpoints": {
                "mcp": "/mcp",
                "api_mcp": "/api/mcp",
                "sse": "/api/mcp/sse"
            }
        },
        headers={"Cache-Control": "no-cache"}
    )


@router.options("")
@router.options("/")
@router.options("/sse")
async def mcp_options():
    """CORS preflight handler for MCP endpoints."""
    return JSONResponse(
        status_code=200,
        content={"status": "ok"},
        headers={
            "Allow": "GET, POST, OPTIONS",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )




# ─── 1. Streamable HTTP Endpoint (MCP 2026-07-28, used by ChatGPT) ────────────
# This is the PRIMARY endpoint. ChatGPT POSTs all JSON-RPC messages here directly.
# GET on this endpoint establishes an optional SSE stream for server push.
@router.post("/sse")
async def mcp_streamable_http(
    request: Request,
    db: Session = Depends(get_analytics_db)
):
    """
    MCP 2026-07-28 Streamable HTTP at /api/mcp/sse.
    Kept for backward compatibility with existing ChatGPT connectors.
    """
    return await _handle_streamable_http(request, db)


# ─── 2. SSE Stream Endpoint (MCP 2024-11-05, for Cursor / Claude Desktop) ─────
@router.get("/sse")
async def mcp_sse_connect(
    request: Request,
    user: MCPUser = Depends(resolve_request_user)
):
    """
    SSE transport endpoint for MCP clients (Cursor, Claude Desktop, remote agents).
    Establishes SSE stream and emits initial endpoint event with sessionId.
    """
    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    ACTIVE_SESSIONS[session_id] = {
        "user": user,
        "queue": queue
    }

    async def sse_event_generator():
        # Step 1: Send endpoint event as per MCP specification
        messages_url = f"/api/mcp/messages?sessionId={session_id}"
        yield f"event: endpoint\ndata: {messages_url}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Send queued messages
                    msg = queue.get_nowait()
                    yield f"event: message\ndata: {json.dumps(msg)}\n\n"
                except asyncio.QueueEmpty:
                    # Send ping every 15 seconds
                    yield ": ping\n\n"
                    await asyncio.sleep(15)
        except asyncio.CancelledError:
            pass
        finally:
            ACTIVE_SESSIONS.pop(session_id, None)

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# ─── 3. Messages Handler for SSE Sessions ─────────────────────────────────────
@router.post("/messages")
async def mcp_post_message(
    sessionId: str = Query(..., description="Active session ID from SSE endpoint event"),
    request: Request = None,
    db: Session = Depends(get_analytics_db)
):
    """
    Receives incoming JSON-RPC 2.0 messages from MCP client for an active SSE session.
    """
    session = ACTIVE_SESSIONS.get(sessionId)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{sessionId}' expired or not found. Please reconnect to /api/mcp/sse."
        )

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    user: MCPUser = session["user"]
    response, updated_user = handle_jsonrpc_message(body, user, db)

    if updated_user is not None:
        session["user"] = updated_user

    # If it's a request (not a notification), push response to the SSE stream queue
    if response is not None:
        await session["queue"].put(response)

    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"status": "accepted"})


# ─── 4. Direct JSON-RPC Endpoint (HTTP Post / Gemini / GPT Actions) ───────────
@router.post("/rpc")
async def mcp_direct_rpc(
    request: Request,
    user: MCPUser = Depends(resolve_request_user),
    db: Session = Depends(get_analytics_db)
):
    """
    Direct synchronous HTTP POST endpoint for single-turn JSON-RPC requests.
    Supports easy integration with custom OpenAI / Gemini Function Calling wrappers.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        )

    response, _ = handle_jsonrpc_message(body, user, db)
    return JSONResponse(content=response or {"jsonrpc": "2.0", "result": "ok"})


# ─── 5. GPT Actions OpenAPI Schema Exporter ──────────────────────────────────
@router.options("/openapi-actions.json")
def get_actions_openapi_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.get("/openapi-actions.json")
def get_actions_openapi(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_analytics_db)
):
    """
    Generates an OpenAPI 3.0.1 schema tailored for ChatGPT Custom GPT Actions.
    Publicly accessible so ChatGPT can import and validate the schema without credentials.
    """
    target_role = role or "admin"
    user = create_role_user(role=target_role)
    tools = list_tools_for_user(user)
    paths: Dict[str, Any] = {}

    for tool in tools:
        t_name = tool["name"]
        paths[f"/api/mcp/action/{t_name}"] = {
            "post": {
                "operationId": t_name,
                "summary": tool["description"][:100],
                "description": tool["description"],
                "requestBody": {
                    "required": False,
                    "content": {
                        "application/json": {
                            "schema": tool["inputSchema"]
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {}
                                }
                            }
                        }
                    }
                }
            }
        }

    return JSONResponse(
        content={
            "openapi": "3.0.1",
            "info": {
                "title": f"CPA Analytics Intelligence API ({target_role.upper()})",
                "version": "1.0.0",
                "description": f"Role-based API for LLMs. Role active: {target_role}"
            },
            "servers": [{"url": "https://warehouse.pengajaran.com"}],
            "paths": paths,
            "components": {
                "schemas": {},
                "securitySchemes": {
                    "OAuth2": {
                        "type": "oauth2",
                        "flows": {
                            "authorizationCode": {
                                "authorizationUrl": "https://warehouse.pengajaran.com/api/auth/authorize",
                                "tokenUrl": "https://warehouse.pengajaran.com/api/auth/token",
                                "scopes": {
                                    "read": "Read access",
                                    "write": "Write access"
                                }
                            }
                        }
                    }
                }
            },
            "security": [{"OAuth2": []}]
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/action/{tool_name}")
async def mcp_execute_action(
    tool_name: str,
    request: Request,
    user: MCPUser = Depends(resolve_request_user),
    db: Session = Depends(get_analytics_db)
):
    """
    Direct action endpoint for OpenAPI / GPT Actions execution.
    """
    try:
        arguments = await request.json()
    except Exception:
        arguments = {}

    tool_result, _ = execute_tool(tool_name, arguments or {}, user, db)
    if tool_result.get("isError"):
        error_msg = tool_result.get("content", [{}])[0].get("text", "Error executing tool")
        return JSONResponse(status_code=403 if "Akses Ditolak" in error_msg else 400, content={"error": error_msg})

    content_text = tool_result.get("content", [{}])[0].get("text", "{}")
    try:
        parsed_data = json.loads(content_text)
        return JSONResponse(content=parsed_data)
    except Exception:
        return JSONResponse(content={"result": content_text})


@router.get("/privacy")
def get_privacy_policy():
    """Privacy policy endpoint required for Custom GPT Actions."""
    return {
        "app": "CPA Inventory Intelligence & CRM Platform",
        "title": "Privacy Policy & Data Protection",
        "policy": "Data accessed through CPA Platform AI Actions is strictly protected under Role-Based Access Control and Row-Level Security. Internal enterprise data is never shared with third parties or used for public AI training without explicit consent.",
        "contact": "admin@cpa.local",
        "updated_at": "2026-09-24"
    }


@router.options("/action/{tool_name}")
async def mcp_execute_action_options(tool_name: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# ─── 6. Health Check ─────────────────────────────────────────────────────────
@router.get("/health")
def mcp_health():
    return {
        "status": "online",
        "service": "CPA MCP Role-Based Server",
        "mcp_version": "2024-11-05",
        "transport": "streamable-http",
        "active_sessions_count": len(ACTIVE_SESSIONS)
    }


# ─── 7. OpenAI Plugin Manifest (/.well-known/ai-plugin.json) ─────────────────
@router.get("/.well-known/ai-plugin.json")
def get_ai_plugin_manifest(
    role: Optional[str] = Query(None),
    auth_type: Optional[str] = Query("oauth", description="none, user_http, or oauth")
):
    """
    Official OpenAI Plugin Manifest (/.well-known/ai-plugin.json).
    Allows installing the CPA Platform directly as a Plugin in ChatGPT or compatible platforms.
    """
    openapi_url = "https://warehouse.pengajaran.com/api/mcp/openapi-actions.json"
    if role:
        openapi_url += f"?role={role}"

    auth_config = {
        "type": "oauth",
        "client_url": "https://warehouse.pengajaran.com/mcp/authorize",
        "scope": "openid profile email read write",
        "authorization_url": "https://warehouse.pengajaran.com/mcp/token",
        "authorization_content_type": "application/x-www-form-urlencoded",
        "verification_tokens": {
            "openai": "optional"
        }
    }
    if auth_type == "user_http":
        auth_config = {
            "type": "user_http",
            "authorization_type": "Bearer"
        }
    elif auth_type == "none":
        auth_config = {"type": "none"}

    return {
        "schema_version": "v1",
        "name_for_human": "CPA Intelligence Platform",
        "name_for_model": "cpa_intelligence",
        "description_for_human": "Pantau inventori, stok gudang, omzet penjualan, CRM, dan forecasting CPA Platform.",
        "description_for_model": "Plugin for CPA Inventory Intelligence & CRM Platform. Query real-time inventory balances, stock counts by warehouse, low-stock deficit alerts, sales order summaries, invoices, customer CRM activities and opportunities, and AI demand forecasting under strict Role-Based Access Control and Row-Level Security.",
        "auth": auth_config,
        "api": {
            "type": "openapi",
            "url": openapi_url
        },
        "logo_url": "https://warehouse.pengajaran.com/favicon.ico",
        "contact_email": "admin@cpa.local",
        "legal_info_url": "https://warehouse.pengajaran.com/api/mcp/privacy"
    }


# ─── 8. OAuth Endpoints under /mcp/ prefix (mirrors AIMS pattern) ────────────
# ChatGPT discovers these via /.well-known/oauth-authorization-server where
# authorization_servers = ["https://warehouse.pengajaran.com/api/mcp"] or
# ["https://warehouse.pengajaran.com/mcp"] and then constructs endpoints like
# /mcp/authorize, /mcp/token, /mcp/register from the issuer base.

from fastapi.responses import HTMLResponse as _HTMLResponse, RedirectResponse as _RedirectResponse

@router.get("/authorize", response_class=_HTMLResponse, include_in_schema=False)
async def mcp_authorize_ui(
    request: Request,
    client_id: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
    response_type: Optional[str] = "code",
    code_challenge: Optional[str] = None,
    code_challenge_method: Optional[str] = "S256",
    scope: Optional[str] = None,
):
    """OAuth authorization page mounted under /mcp/authorize (and /api/mcp/authorize)."""
    from app.routers.oauth2_ui import authorize_ui as _authorize_ui
    return await _authorize_ui(
        request=request,
        client_id=client_id,
        redirect_uri=redirect_uri,
        state=state,
        response_type=response_type,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        scope=scope,
    )


@router.post("/authorize", include_in_schema=False)
async def mcp_authorize_submit(
    request: Request,
    db: Session = Depends(get_analytics_db)
):
    """OAuth authorize POST handler — same as /api/auth/authorize."""
    from fastapi import Form as _Form
    from app.routers.oauth2_ui import authorize_post as _authorize_post
    from app.models.analytics.models import AppUser
    from app.routers.auth import verify_password
    from app.routers.oauth2_ui import save_auth_code, verify_pkce
    import uuid as _uuid
    from fastapi.responses import RedirectResponse, HTMLResponse
    from fastapi import status as _status

    form = await request.form()
    data = dict(form)
    username = data.get("username", "")
    password = data.get("password", "")
    client_id = data.get("client_id")
    redirect_uri = data.get("redirect_uri")
    state = data.get("state")
    code_challenge = data.get("code_challenge")
    code_challenge_method = data.get("code_challenge_method", "S256")

    user = db.query(AppUser).filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password) or not user.is_active:
        err_html = """<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
        <title>Autentikasi Gagal</title>
        <style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .box{background:#1e293b;padding:2rem;border-radius:12px;text-align:center;max-width:400px;border:1px solid #ef4444}
        h2{color:#f87171}a{color:#38bdf8;text-decoration:none;display:inline-block;margin-top:1rem}</style>
        </head><body><div class="box"><h2>❌ Autentikasi Gagal</h2>
        <p>Username atau password salah, atau akun nonaktif.</p>
        <a href="javascript:history.back()">← Coba Lagi</a></div></body></html>"""
        return HTMLResponse(content=err_html, status_code=401)

    code = str(_uuid.uuid4())
    save_auth_code(code, {
        "username": user.username,
        "role": user.role,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
    }, ttl_seconds=600)

    if not redirect_uri:
        return HTMLResponse(content="<h3>Autentikasi Berhasil.</h3>")

    base = "https://warehouse.pengajaran.com/mcp"
    if "/api/mcp" in str(request.url):
        base = "https://warehouse.pengajaran.com/api/mcp"

    import urllib.parse
    delimiter = "&" if "?" in redirect_uri else "?"
    redirect_url = f"{redirect_uri}{delimiter}code={code}"
    if state:
        redirect_url += f"&state={state}"
    encoded_iss = urllib.parse.quote(base, safe="")
    redirect_url += f"&iss={encoded_iss}"

    return RedirectResponse(url=redirect_url, status_code=_status.HTTP_302_FOUND)


@router.post("/token", include_in_schema=False)
async def mcp_token(request: Request, db: Session = Depends(get_analytics_db)):
    """Token exchange under /mcp/token (mirrors /api/auth/token)."""
    from app.routers.auth import login as _login
    return await _login(request, db)


@router.post("/register", include_in_schema=False)
async def mcp_register(request: Request):
    """Dynamic client registration under /mcp/register (RFC 7591)."""
    from app.routers.oauth2_ui import register_oauth_client as _register
    return await _register(request)


@router.get("/userinfo", include_in_schema=False)
async def mcp_userinfo(request: Request, db: Session = Depends(get_analytics_db)):
    """UserInfo endpoint under /mcp/userinfo (OIDC standard for Connected Accounts)."""
    authorization = request.headers.get("Authorization", "")
    if not authorization.lower().startswith("bearer "):
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=401, detail="Bearer token required")
    token = authorization[7:].strip()
    success, user, _ = authenticate_jwt(token, db)
    if not success or not user:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=401, detail="Invalid token")
    email = getattr(user, "email", "") or f"{user.username}@pengajaran.com"
    return JSONResponse(content={
        "sub": user.username,
        "name": getattr(user, "full_name", user.username) or user.username,
        "preferred_username": user.username,
        "email": email,
        "role": user.role
    }, headers={
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*"
    })


@router.get("/.well-known/oauth-authorization-server", include_in_schema=False)
@router.get("/.well-known/openid-configuration", include_in_schema=False)
async def mcp_oauth_server_metadata(request: Request):
    """OAuth authorization server metadata served from /mcp/.well-known/..."""
    base = "https://warehouse.pengajaran.com/mcp"
    # Detect whether this was called via /api/mcp or /mcp prefix
    if "/api/mcp" in str(request.url):
        base = "https://warehouse.pengajaran.com/api/mcp"
    return JSONResponse(content={
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
    }, headers={
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*"
    })


@router.get("/.well-known/oauth-protected-resource", include_in_schema=False)
async def mcp_protected_resource_metadata(request: Request):
    """Protected resource metadata served from /mcp/.well-known/..."""
    base = "https://warehouse.pengajaran.com/mcp"
    if "/api/mcp" in str(request.url):
        base = "https://warehouse.pengajaran.com/api/mcp"
    return JSONResponse(content={
        "resource": base,
        "authorization_servers": [base],
        "bearer_methods_supported": ["header"],
        "scopes_supported": ["openid", "profile", "email", "read", "write"],
    }, headers={
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*"
    })
