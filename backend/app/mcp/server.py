"""
CPA MCP — Standalone stdio Server
Official Model Context Protocol (MCP) stdio transport for:
- Claude Desktop
- Cursor
- Gemini CLI / Python SDK
- Antigravity IDE
- Local Automation & Agents
"""
import sys
import os
import json
import argparse
import logging
from typing import Optional

from app.database import AnalyticsSessionLocal
from app.mcp.auth import (
    MCPUser,
    authenticate_credentials,
    authenticate_jwt,
    create_role_user,
    get_user_from_db
)
from app.mcp.protocol import handle_jsonrpc_message

# MCP stdio servers MUST write logs to stderr only so stdout remains clean JSON-RPC
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="[CPA-MCP] %(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("cpa_mcp")


def resolve_stdio_user(args: argparse.Namespace, db) -> MCPUser:
    """Resolves the user context from CLI arguments or environment variables."""
    # 1. JWT Token
    token = args.token or os.environ.get("CPA_MCP_TOKEN")
    if token:
        success, user, msg = authenticate_jwt(token, db)
        if success and user:
            logger.info("Authenticated via JWT: %s (role: %s)", user.username, user.role)
            return user
        else:
            logger.warning("Token authentication failed: %s", msg)

    # 2. Username & Password
    username = args.user or os.environ.get("CPA_MCP_USER")
    password = args.password or os.environ.get("CPA_MCP_PASSWORD")
    if username and password:
        success, user, msg = authenticate_credentials(username, password, db)
        if success and user:
            logger.info("Authenticated user: %s (role: %s, id_pegawai: %s)", user.username, user.role, user.id_pegawai)
            return user
        else:
            logger.warning("User credential login failed for %s: %s", username, msg)

    # 3. Direct Role specification (for local agent testing / designated role mode)
    role = (args.role or os.environ.get("CPA_MCP_ROLE") or "viewer").lower()
    user_db = db.query(
        __import__("app.models.analytics.models", fromlist=["AppUser"]).AppUser
    ).filter_by(role=role, is_active=True).first()

    if user_db:
        logger.info("Mapped role '%s' to database user: %s", role, user_db.username)
        return MCPUser(
            username=user_db.username,
            role=user_db.role,
            email=user_db.email,
            id_pegawai=args.pegawai or user_db.id_pegawai,
            id_gudang_access=args.gudang or user_db.id_gudang_access,
            is_authenticated=True
        )

    logger.info("Using simulated role user: %s", role)
    return create_role_user(
        role=role,
        username=args.user or f"user_{role}",
        id_pegawai=args.pegawai,
        id_gudang_access=args.gudang
    )


def main():
    parser = argparse.ArgumentParser(description="CPA Platform Role-Based MCP Server (stdio transport)")
    parser.add_argument("--role", type=str, default=None, help="User role (admin, sales_rep, warehouse_staff, finance_manager, viewer)")
    parser.add_argument("--user", type=str, default=None, help="Username to login")
    parser.add_argument("--password", type=str, default=None, help="Password for user")
    parser.add_argument("--token", type=str, default=None, help="JWT Bearer token")
    parser.add_argument("--pegawai", type=str, default=None, help="ID Pegawai override for RLS (e.g. CPA-452)")
    parser.add_argument("--gudang", type=str, default=None, help="Comma-separated warehouse access override")
    args = parser.parse_args()

    db = AnalyticsSessionLocal()
    current_user = resolve_stdio_user(args, db)
    logger.info("CPA MCP Server ready on stdio. Active user: %s (Role: %s)", current_user.username, current_user.role)

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                request_json = json.loads(line)
            except json.JSONDecodeError as err:
                logger.error("JSON parse error: %s", err)
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": "Parse error"}
                }
                sys.stdout.write(json.dumps(error_response) + "\n")
                sys.stdout.flush()
                continue

            response, updated_user = handle_jsonrpc_message(request_json, current_user, db)
            if updated_user is not None and updated_user != current_user:
                current_user = updated_user
                logger.info("Session role updated to: %s (User: %s)", current_user.role, current_user.username)

            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()

    except KeyboardInterrupt:
        logger.info("Shutting down MCP Server.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
