"""
CPA MCP — Role-Based Access Control (RBAC) & Row-Level Security (RLS)
Defines permissions, role capabilities, forbidden rules, and data sanitization.
"""
from typing import Dict, List, Set, Optional, Tuple, Any
from app.mcp.auth import MCPUser

# ─── Tool Permission Groups ──────────────────────────────────────────────────
# Modules mapped to allowed roles
MODULE_PERMISSIONS: Dict[str, Set[str]] = {
    # System / Auth info
    "AUTH": {
        "admin", "manager", "sales", "sales_rep",
        "warehouse", "warehouse_staff", "finance_manager", "ar_staff", "credit_control", "viewer"
    },
    # Inventory balances, stock counts
    "INVENTORY": {
        "admin", "manager", "sales", "sales_rep",
        "warehouse", "warehouse_staff", "finance_manager", "ar_staff", "credit_control", "viewer"
    },
    # Sales Orders, Invoices, Top products, Omzet
    "SALES": {
        "admin", "manager", "sales", "sales_rep", "finance_manager", "ar_staff", "credit_control"
    },
    # Accounts Receivable, Piutang aging, Customer credit limits
    "FINANCE_AR": {
        "admin", "manager", "finance_manager", "ar_staff", "credit_control"
    },
    # CRM: Activities, Pipeline Opportunities, Customer Complaints
    "CRM": {
        "admin", "manager", "sales", "sales_rep", "finance_manager"
    },
    # AI Demand Forecasting: 7d, 30d, 90d projections, WAPE, Model rankings
    "FORECAST": {
        "admin", "manager", "sales", "sales_rep", "warehouse", "warehouse_staff"
    },
    # Warehouse locations and master lists
    "WAREHOUSE": {
        "admin", "manager", "warehouse", "warehouse_staff", "sales", "sales_rep", "viewer"
    },
    # Direct PostgreSQL Analytics Engine
    "DB_ANALYTICS": {
        "admin", "manager", "finance_manager"
    }
}

# Mapping each MCP tool name to its required permission module
TOOL_MODULE_MAP: Dict[str, str] = {
    "cpa_whoami": "AUTH",
    "get_inventory_summary": "INVENTORY",
    "get_product_stock": "INVENTORY",
    "get_low_stock_alerts": "INVENTORY",
    "get_inventory_aging_batch": "INVENTORY",
    "get_sales_summary": "SALES",
    "get_invoices": "SALES",
    "get_top_selling_products": "SALES",
    "get_customer_detail": "SALES",
    "get_ar_piutang_aging": "FINANCE_AR",
    "get_crm_activities": "CRM",
    "get_crm_opportunities": "CRM",
    "get_crm_complaints": "CRM",
    "get_demand_forecast": "FORECAST",
    "get_warehouse_list": "WAREHOUSE",
    "get_main_dashboard": "SALES",
    "get_picture_of_success": "SALES",
    "get_sales_performance_intelligence": "SALES",
    "get_customer_intelligence_dashboard": "CRM",
    "get_forecast_dashboard_summary": "FORECAST",
    "db_list_tables": "DB_ANALYTICS",
    "db_describe_table": "DB_ANALYTICS",
    "db_execute_query": "DB_ANALYTICS",
    "db_analyze_sql": "DB_ANALYTICS",
}


def check_tool_permission(tool_name: str, user: MCPUser) -> Tuple[bool, Optional[str]]:
    """
    Validates if the user's role is allowed to execute the given tool.
    Returns (is_allowed, error_reason).
    """
    module = TOOL_MODULE_MAP.get(tool_name)
    if not module:
        return False, f"Unknown tool: '{tool_name}'"

    allowed_roles = MODULE_PERMISSIONS.get(module, set())
    user_role = (user.role or "viewer").lower()

    if user.is_admin:
        return True, None

    if user_role not in allowed_roles:
        # Contextual error messages matching CPA Analytics security policies
        if module == "SALES" and user.is_warehouse:
            return False, (
                f"Akses Ditolak (403 Forbidden): Role '{user.role}' (Gudang) tidak memiliki izin "
                "mengakses data penjualan, invoice, atau omzet finansial."
            )
        if module == "CRM" and user.is_warehouse:
            return False, (
                f"Akses Ditolak (403 Forbidden): Role '{user.role}' tidak memiliki izin "
                "mengakses modul CRM dan pipeline pelanggan."
            )
        if module == "FINANCE_AR" and user.is_sales:
            return False, (
                f"Akses Ditolak (403 Forbidden): Role '{user.role}' tidak memiliki izin "
                "mengakses laporan keuangan dan analisa piutang korporat."
            )

        return False, (
            f"Akses Ditolak (403 Forbidden): Role '{user.role}' tidak memiliki izin untuk fitur '{tool_name}'. "
            f"Role yang diperbolehkan: {', '.join(sorted(allowed_roles))}."
        )

    return True, None


def get_allowed_tools_for_user(user: MCPUser) -> Set[str]:
    """Returns set of all tool names permitted for the given user."""
    allowed = set()
    for tool_name, module in TOOL_MODULE_MAP.items():
        if user.is_admin or (user.role or "viewer").lower() in MODULE_PERMISSIONS.get(module, set()):
            allowed.add(tool_name)
    return allowed


def sanitize_inventory_output(data: Any, user: MCPUser) -> Any:
    """
    Masks financial fields like 'total_nilai', 'hpp', 'nilai_persediaan'
    from roles that are not authorized to view financial valuations (e.g. sales, warehouse, viewer).
    """
    can_view_valuation = user.is_admin or user.is_manager or user.is_finance

    if can_view_valuation:
        return data

    if isinstance(data, dict):
        sanitized = data.copy()
        for key in ["total_nilai", "hpp", "nilai_persediaan", "margin", "harga_pokok"]:
            if key in sanitized:
                sanitized[key] = "[RESTRICTED - Butuh Role Finance/Manager]"
        return sanitized
    elif isinstance(data, list):
        return [sanitize_inventory_output(item, user) for item in data]

    return data
