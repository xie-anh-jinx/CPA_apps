import os
import json
import uuid
import base64
import hashlib
import logging
from typing import Optional
from fastapi import APIRouter, Request, Form, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_analytics_db
from app.models.analytics.models import AppUser
from app.routers.auth import verify_password
from app.mcp.session import get_redis_client

logger = logging.getLogger("cpa.oauth2")
router = APIRouter()

# Local memory fallback in case Redis is temporarily unreachable
_LOCAL_AUTH_CODES = {}


def save_auth_code(code: str, data: dict, ttl_seconds: int = 600):
    r = get_redis_client()
    serialized = json.dumps(data)
    if r is not None:
        try:
            r.set(f"cpa:oauth:code:{code}", serialized, ex=ttl_seconds)
        except Exception as e:
            logger.warning(f"Failed to save auth code to Redis: {e}")
    _LOCAL_AUTH_CODES[code] = serialized


def get_and_consume_auth_code(code: str) -> Optional[dict]:
    r = get_redis_client()
    data = None
    if r is not None:
        try:
            key = f"cpa:oauth:code:{code}"
            data = r.get(key)
            if data:
                r.delete(key)
        except Exception as e:
            logger.warning(f"Failed to get auth code from Redis: {e}")

    if not data:
        data = _LOCAL_AUTH_CODES.pop(code, None)

    if data:
        try:
            return json.loads(data)
        except Exception:
            return None
    return None


def verify_pkce(code_verifier: str, code_challenge: str) -> bool:
    if not code_challenge:
        return True
    try:
        # S256 verification
        digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
        computed = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
        return computed == code_challenge
    except Exception as e:
        logger.error(f"PKCE verification error: {e}")
        return False


# ─── 1. User-Facing Login Page for OAuth2 Flow ───────────────────────────────
@router.get("/authorize", response_class=HTMLResponse)
async def authorize_ui(
    request: Request,
    client_id: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
    response_type: Optional[str] = "code",
    code_challenge: Optional[str] = None,
    code_challenge_method: Optional[str] = "S256",
    scope: Optional[str] = None,
):
    """
    Renders the official CPA Analytics OAuth2 login screen.
    Redirected to by ChatGPT when connecting with OAuth.
    """
    safe_redirect = redirect_uri or ""
    safe_state = state or ""
    safe_client_id = client_id or ""
    safe_challenge = code_challenge or ""
    safe_method = code_challenge_method or "S256"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login & Autorisasi - CPA Analytics</title>
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #f8fafc;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
            }}
            .card {{
                background: rgba(30, 41, 59, 0.85);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 2.5rem;
                width: 100%;
                max-width: 420px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }}
            .brand {{
                text-align: center;
                margin-bottom: 2rem;
            }}
            .brand h1 {{
                font-size: 1.75rem;
                font-weight: 700;
                color: #38bdf8;
                letter-spacing: -0.025em;
                margin-bottom: 0.5rem;
            }}
            .brand p {{
                font-size: 0.875rem;
                color: #94a3b8;
            }}
            .notice {{
                background: rgba(56, 189, 248, 0.1);
                border-left: 4px solid #38bdf8;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-size: 0.8125rem;
                color: #bae6fd;
                margin-bottom: 1.5rem;
                line-height: 1.4;
            }}
            .form-group {{
                margin-bottom: 1.25rem;
            }}
            label {{
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #cbd5e1;
                margin-bottom: 0.5rem;
            }}
            input[type="text"], input[type="password"] {{
                width: 100%;
                padding: 0.75rem 1rem;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 8px;
                color: #f8fafc;
                font-size: 0.95rem;
                transition: border-color 0.2s, box-shadow 0.2s;
            }}
            input[type="text"]:focus, input[type="password"]:focus {{
                outline: none;
                border-color: #38bdf8;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
            }}
            .btn-submit {{
                width: 100%;
                padding: 0.875rem;
                background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s, transform 0.1s;
                margin-top: 0.5rem;
            }}
            .btn-submit:hover {{
                opacity: 0.95;
            }}
            .btn-submit:active {{
                transform: scale(0.99);
            }}
            .footer {{
                text-align: center;
                margin-top: 1.5rem;
                font-size: 0.75rem;
                color: #64748b;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand">
                <h1>CPA Analytics</h1>
                <p>Otentikasi & Akses Berbasis Role</p>
            </div>
            
            <div class="notice">
                🔒 Masukkan akun CPA Analytics Anda. ChatGPT akan mengakses data dengan batasan role dan row-level security akun Anda.
            </div>

            <form action="/api/auth/authorize" method="POST">
                <input type="hidden" name="client_id" value="{safe_client_id}">
                <input type="hidden" name="redirect_uri" value="{safe_redirect}">
                <input type="hidden" name="state" value="{safe_state}">
                <input type="hidden" name="code_challenge" value="{safe_challenge}">
                <input type="hidden" name="code_challenge_method" value="{safe_method}">

                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Masukkan username" required autofocus autocomplete="username">
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Masukkan password" required autocomplete="current-password">
                </div>

                <button type="submit" class="btn-submit">Sign In & Otorisasikan</button>
            </form>

            <div class="footer">
                Platform Intelijen Inventori & CRM CPA © 2026
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# ─── 2. Handle Login Submission & Generate Authorization Code ─────────────────
@router.post("/authorize")
async def authorize_post(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    client_id: Optional[str] = Form(None),
    redirect_uri: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    code_challenge: Optional[str] = Form(None),
    code_challenge_method: Optional[str] = Form(None),
    db: Session = Depends(get_analytics_db)
):
    """
    Validates user credentials, creates an authorization code,
    and redirects the user back to ChatGPT's redirect_uri.
    """
    user = db.query(AppUser).filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password) or not user.is_active:
        err_html = """
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Autentikasi Gagal</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .box { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px; border: 1px solid #ef4444; }
                h2 { color: #f87171; margin-bottom: 1rem; }
                a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>❌ Autentikasi Gagal</h2>
                <p>Username atau password yang Anda masukkan salah, atau akun sedang nonaktif.</p>
                <a href="javascript:history.back()">← Coba Lagi</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=err_html, status_code=401)

    code = str(uuid.uuid4())
    code_data = {
        "username": user.username,
        "role": user.role,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method
    }
    save_auth_code(code, code_data, ttl_seconds=600)
    logger.info(f"Generated OAuth code for user '{user.username}' (role: {user.role})")

    if not redirect_uri:
        return HTMLResponse(content="<h3>Autentikasi Berhasil. (Tidak ada redirect_uri yang diberikan)</h3>")

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

    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


# ─── 3. Dynamic Client Registration (RFC 7591) for ChatGPT MCP ───────────────
@router.options("/register")
async def register_oauth_client_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.post("/register")
async def register_oauth_client(request: Request):
    """
    Dynamic Client Registration endpoint (RFC 7591).
    Used by ChatGPT / MCP clients to register dynamically.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    import time
    client_id = f"cpa_{uuid.uuid4().hex[:12]}"
    client_secret = uuid.uuid4().hex
    client_name = body.get("client_name", "ChatGPT MCP Client")
    redirect_uris = body.get("redirect_uris", [])
    issued_at = int(time.time())

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "client_id": client_id,
            "client_secret": client_secret,
            "client_id_issued_at": issued_at,
            "client_secret_expires_at": 0,
            "client_name": client_name,
            "redirect_uris": redirect_uris,
            "grant_types": ["authorization_code"],
            "response_types": ["code"],
            "token_endpoint_auth_method": "none"
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )
