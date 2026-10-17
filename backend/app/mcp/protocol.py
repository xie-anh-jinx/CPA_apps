"""
CPA MCP — Protocol Handler (JSON-RPC 2.0 / MCP Specification & OpenAI Plugins)
Processes protocol requests for stdio, SSE, and Streamable HTTP transports.
"""
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.mcp.auth import MCPUser
from app.mcp.tools import list_tools_for_user, execute_tool
from app.mcp.prompts import list_prompts_for_user, get_prompt_content
from app.mcp.resources import list_resources_for_user, read_resource_content
from app.mcp.skills import list_skills, get_skill, read_skill_resource

PROTOCOL_VERSION = "2024-11-05"
PROTOCOL_VERSION_STATELESS = "2026-07-28"
SERVER_NAME = "cpa-analytics-mcp"
SERVER_VERSION = "1.0.0"

SERVER_INSTRUCTIONS = (
    "CPA Intelligence Platform MCP Server. "
    "Active session provides live inventory tracking, multi-warehouse stock visibility, "
    "sales order monitoring, and customer analytics. "
    "Before querying product stock or sales, discover valid warehouses with get_warehouse_list. "
    "Use get_product_stock for real-time SKU availability and get_low_stock_alerts for reorder monitoring."
)


def handle_jsonrpc_message(
    msg: Dict[str, Any], user: MCPUser, db: Session
) -> Tuple[Optional[Dict[str, Any]], MCPUser]:
    """
    Handles a single MCP JSON-RPC 2.0 request or notification.
    Returns (response_dict, updated_user).
    If notification (no 'id'), response_dict is None.
    """
    msg_id = msg.get("id")
    method = msg.get("method")
    params = msg.get("params", {}) or {}

    # Detect client protocol version from _meta or params
    client_version = (
        params.get("_meta", {}).get("io.modelcontextprotocol/protocolVersion")
        or params.get("protocolVersion")
        or PROTOCOL_VERSION
    )

    # Notification check (no response required by JSON-RPC specification)
    if msg_id is None and method not in ("server/discover", "ping"):
        if method == "notifications/initialized":
            pass
        return None, user

    def make_response(result: Any = None, error: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        resp = {"jsonrpc": "2.0", "id": msg_id}
        if error:
            resp["error"] = error
        else:
            resp["result"] = result if result is not None else {}
        return resp

    # 0. Server Discover (MCP 2026-07-28 stateless — ChatGPT, OpenAI)
    if method == "server/discover":
        return make_response(result={
            "supportedVersions": ["2026-07-28", "2024-11-05"],
            "protocolVersion": client_version or "2026-07-28",
            "serverInfo": {
                "name": SERVER_NAME,
                "version": SERVER_VERSION
            },
            "instructions": SERVER_INSTRUCTIONS,
            "capabilities": {
                "tools": {"listChanged": False},
                "prompts": {"listChanged": False},
                "resources": {"subscribe": False, "listChanged": False},
                "extensions": {
                    "io.modelcontextprotocol/skills": {},
                    "io.modelcontextprotocol/ui": {
                        "mimeTypes": ["text/html;profile=mcp-app"]
                    }
                }
            },
            "ttlMs": 300000,
            "cacheScope": "private",
            "_meta": {
                "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                "io.modelcontextprotocol/serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION
                }
            }
        }), user


    # 1. Initialize (MCP Handshake for ChatGPT Apps, Cursor, Claude Desktop)
    if method == "initialize":
        agreed_version = client_version if client_version else PROTOCOL_VERSION
        result = {
            "protocolVersion": agreed_version,
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": False, "listChanged": True},
                "prompts": {"listChanged": True},
                "extensions": {
                    "io.modelcontextprotocol/skills": {}
                }
            },
            "serverInfo": {
                "name": SERVER_NAME,
                "version": SERVER_VERSION
            },
            "instructions": SERVER_INSTRUCTIONS
        }
        return make_response(result=result), user

    # 2. Ping
    if method == "ping":
        return make_response(result={}), user

    # 3. Tools List
    if method == "tools/list":
        tools = list_tools_for_user(user)
        return make_response(result={
            "tools": tools,
            "_meta": {
                "io.modelcontextprotocol/protocolVersion": client_version or "2026-07-28"
            }
        }), user


    # 4. Tools Call
    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {}) or {}

        if not tool_name:
            return make_response(error={"code": -32602, "message": "Missing 'name' in tools/call"}), user

        tool_result, updated_user = execute_tool(tool_name, arguments, user, db)
        current_user = updated_user if updated_user is not None else user

        return make_response(result=tool_result), current_user

    # 5. Skills Extension (OpenAI draft SEP-2640)
    if method == "skills/list":
        return make_response(result=list_skills()), user

    if method == "skills/get":
        uri = params.get("uri")
        if not uri:
            return make_response(error={"code": -32602, "message": "Missing 'uri' in skills/get"}), user
        skill = get_skill(uri)
        if not skill:
            return make_response(error={"code": -32602, "message": f"Skill '{uri}' not found"}), user
        return make_response(result=skill), user

    # 6. Resources List
    if method == "resources/list":
        resources = list_resources_for_user(user)
        return make_response(result={"resources": resources}), user

    # 7. Resources Read (handles both standard resources and skill resources)
    if method == "resources/read":
        uri = params.get("uri", "")
        if not uri:
            return make_response(error={"code": -32602, "message": "Missing 'uri' in resources/read"}), user

        if uri.startswith("skill://"):
            skill_res = read_skill_resource(uri)
            if not skill_res:
                return make_response(error={"code": -32602, "message": f"Skill resource '{uri}' not found"}), user
            return make_response(result={"contents": [skill_res]}), user

        try:
            content = read_resource_content(uri, user, db)
            return make_response(result={"contents": [content]}), user
        except ValueError as ve:
            return make_response(error={"code": -32602, "message": str(ve)}), user
        except Exception as e:
            return make_response(error={"code": -32603, "message": f"Internal error reading resource: {str(e)}"}), user

    # 8. Prompts List
    if method == "prompts/list":
        prompts = list_prompts_for_user(user)
        return make_response(result={"prompts": prompts}), user

    # 9. Prompts Get
    if method == "prompts/get":
        prompt_name = params.get("name")
        prompt_args = params.get("arguments", {}) or {}
        if not prompt_name:
            return make_response(error={"code": -32602, "message": "Missing 'name' in prompts/get"}), user
        prompt_res = get_prompt_content(prompt_name, prompt_args, user)
        return make_response(result=prompt_res), user

    # Method not found
    return make_response(error={"code": -32601, "message": f"Method '{method}' not found"}), user
