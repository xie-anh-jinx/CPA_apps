"""
CPA MCP — Distributed Session Management for Multi-Worker Uvicorn & ChatGPT MCP App
Persists user authentication state across requests using Redis (with local in-memory fallback).
Supports Mcp-Session-Id header, cookies, and OpenAI MCP client metadata (sessionId, openai/session, openai/subject).
"""
import os
import json
import logging
from typing import Optional, List, Any
import redis

from app.mcp.auth import MCPUser

logger = logging.getLogger("cpa.mcp.session")

REDIS_HOST = os.getenv("REDIS_HOST", "cpa_redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redis_cpa_2024")
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
SESSION_TTL_SECONDS = int(os.getenv("MCP_SESSION_TTL", "86400"))  # 24 hours

_redis_client: Optional[redis.Redis] = None
_LOCAL_FALLBACK_SESSIONS: dict = {}


def get_redis_client() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                db=REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0
            )
            _redis_client.ping()
        except Exception as e:
            logger.warning(f"Failed to connect to Redis for MCP sessions: {e}. Using local in-memory fallback.")
            _redis_client = None
    return _redis_client


def serialize_user(user: MCPUser) -> str:
    return json.dumps({
        "username": user.username,
        "role": user.role,
        "email": user.email,
        "id_pegawai": user.id_pegawai,
        "id_gudang_access": user.id_gudang_access,
        "is_authenticated": user.is_authenticated
    })


def deserialize_user(data_str: str) -> Optional[MCPUser]:
    try:
        d = json.loads(data_str)
        return MCPUser(
            username=d.get("username", "guest_viewer"),
            role=d.get("role", "viewer"),
            email=d.get("email"),
            id_pegawai=d.get("id_pegawai"),
            id_gudang_access=d.get("id_gudang_access"),
            is_authenticated=bool(d.get("is_authenticated", False))
        )
    except Exception as e:
        logger.error(f"Error deserializing MCP user: {e}")
        return None


def extract_session_identifiers(headers: dict, cookies: dict, body_data: Any) -> List[str]:
    """
    Extracts all candidate session identifiers from:
    1. HTTP headers (mcp-session-id, x-session-id)
    2. Cookies (mcp_session_id, session_id)
    3. OpenAI MCP _meta payload (sessionId, openai/session, openai/subject)
    """
    candidates = []

    # 1. Header checks (case-insensitive dictionary)
    for k, v in headers.items():
        if k.lower() in ("mcp-session-id", "x-session-id", "openai-session-id") and v:
            candidates.append(str(v).strip())

    # 2. Cookie checks
    for k, v in cookies.items():
        if k.lower() in ("mcp_session_id", "session_id") and v:
            candidates.append(str(v).strip())

    # 3. Payload inspection
    items = body_data if isinstance(body_data, list) else [body_data]
    for item in items:
        if not isinstance(item, dict):
            continue

        # Direct keys
        for key in ("sessionId", "session_id", "sessionId"):
            val = item.get(key)
            if val and isinstance(val, str):
                candidates.append(val.strip())

        # Check inside params._meta (standard for OpenAI MCP client)
        params = item.get("params")
        if isinstance(params, dict):
            meta = params.get("_meta")
            if isinstance(meta, dict):
                for meta_key in ("sessionId", "openai/session", "openai/subject", "openai/request_id"):
                    val = meta.get(meta_key)
                    if val and isinstance(val, str):
                        candidates.append(val.strip())

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            deduped.append(c)

    return deduped


def get_user_for_session(session_ids: List[str]) -> Optional[MCPUser]:
    """
    Given a list of candidate session IDs, looks up the authenticated user in Redis or local cache.
    Returns the first authenticated MCPUser found, or None.
    """
    if not session_ids:
        return None

    r = get_redis_client()

    for sid in session_ids:
        key = f"cpa:mcp:session:{sid}"
        data = None

        if r is not None:
            try:
                data = r.get(key)
            except Exception as e:
                logger.warning(f"Redis get error for {key}: {e}")

        if not data:
            data = _LOCAL_FALLBACK_SESSIONS.get(sid)

        if data:
            user = deserialize_user(data)
            if user:
                return user

    return None


def save_user_session(session_ids: List[str], user: MCPUser, ttl: int = SESSION_TTL_SECONDS) -> None:
    """
    Saves the user authentication state under all provided session IDs in Redis and local memory.
    """
    if not session_ids or not user:
        return

    serialized = serialize_user(user)
    r = get_redis_client()

    for sid in session_ids:
        key = f"cpa:mcp:session:{sid}"
        if r is not None:
            try:
                r.set(key, serialized, ex=ttl)
            except Exception as e:
                logger.warning(f"Redis set error for {key}: {e}")

        _LOCAL_FALLBACK_SESSIONS[sid] = serialized
