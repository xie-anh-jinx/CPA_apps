"""
CPA MCP — URI Resources Provider
Exposes static and dynamic state streams (e.g. cpa://system/status, cpa://inventory/low-stock).
"""
import json
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.mcp.auth import MCPUser
from app.mcp import queries

ALL_RESOURCES = [
    {
        "uri": "cpa://system/status",
        "name": "CPA System Status & Session",
        "description": "Status konektivitas platform CPA dan hak akses sesi pengguna aktif.",
        "mimeType": "application/json"
    },
    {
        "uri": "cpa://inventory/low-stock",
        "name": "Active Low Stock Deficit",
        "description": "Daftar barang dengan stok di bawah minimum yang butuh reorder segera.",
        "mimeType": "application/json"
    },
    {
        "uri": "cpa://forecast/overview",
        "name": "AI Demand Forecast Overview",
        "description": "Metrik akurasi WAPE dan rangkuman model demand forecasting produk utama.",
        "mimeType": "application/json"
    }
]


def list_resources_for_user(user: MCPUser) -> List[Dict[str, Any]]:
    return ALL_RESOURCES


def read_resource_content(uri: str, user: MCPUser, db: Session) -> Dict[str, Any]:
    if uri == "cpa://system/status":
        content = {
            "app": "CPA Inventory Intelligence & CRM Platform",
            "mcp_version": "1.0.0",
            "protocol_spec": "2024-11-05",
            "timestamp": datetime.now().isoformat(),
            "user": user.to_dict()
        }
    elif uri == "cpa://inventory/low-stock":
        content = queries.query_low_stock_alerts(db, user, limit=25)
    elif uri == "cpa://forecast/overview":
        content = queries.query_demand_forecast(db, user, limit=10)
    else:
        raise ValueError(f"Resource URI not found: {uri}")

    return {
        "uri": uri,
        "mimeType": "application/json",
        "text": json.dumps(content, indent=2, ensure_ascii=False)
    }
