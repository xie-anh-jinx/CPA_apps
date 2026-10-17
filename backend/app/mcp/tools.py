"""
CPA MCP — Tool Registry and Execution Dispatcher
Implements official Model Context Protocol (MCP) tool schemas and role enforcement,
fully compliant with OpenAI ChatGPT / Codex plugin specifications.
"""
import json
from typing import Dict, List, Any, Tuple, Optional, Set
from sqlalchemy.orm import Session

from app.mcp.auth import MCPUser, authenticate_credentials
from app.mcp.permissions import (
    check_tool_permission,
    get_allowed_tools_for_user
)
from app.mcp import queries

# ─── Tool Definitions (MCP JSON Schema + OpenAI Annotations) ──────────────────
ALL_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "cpa_whoami",
        "title": "Check Active Session Identity",
        "description": (
            "Inspect current MCP active user session, role, salesman ID, and accessible modules. "
            "Use this tool to verify identity, assigned permissions, and connected account details."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "active_user": {
                    "type": "object",
                    "properties": {
                        "username": {"type": "string"},
                        "role": {"type": "string"},
                        "email": {"type": "string"},
                        "id_pegawai": {"type": "string"}
                    }
                },
                "permissions": {"type": "object"},
                "available_tools_count": {"type": "integer"}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_inventory_summary",
        "title": "Get Warehouse Inventory Summary",
        "description": (
            "Retrieve high-level inventory metrics: total SKUs, on-hand quantity, available quantity, "
            "low-stock, and overstock counts across warehouses. "
            "[Financial valuation is only visible for Admin, Manager, and Finance roles]."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "id_gudang": {
                    "type": "string",
                    "description": "Optional warehouse code (e.g. '005', '047'). If omitted, covers all authorized warehouses."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "total_sku": {"type": "integer"},
                "total_stok_on_hand": {"type": "number"},
                "total_stok_available": {"type": "number"},
                "total_low_stock_items": {"type": "integer"},
                "total_overstock_items": {"type": "integer"}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_product_stock",
        "title": "Check Real-Time Product Stock",
        "description": (
            "Search and query real-time stock positions (on-hand, available, reserved, min/max) "
            "by product name or SKU code. Warehouse role is automatically restricted to assigned warehouses."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "search": {
                    "type": "string",
                    "description": "Search keyword for product name or SKU code (e.g. 'Rimula', 'Tellus', '550044360')."
                },
                "id_gudang": {
                    "type": "string",
                    "description": "Filter by specific warehouse code (optional)."
                },
                "limit": {
                    "type": "integer",
                    "default": 15,
                    "description": "Maximum number of products to return (max 50)."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "products": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id_barang": {"type": "string"},
                            "nama_barang": {"type": "string"},
                            "id_gudang": {"type": "string"},
                            "stok_on_hand": {"type": "number"},
                            "stok_available": {"type": "number"},
                            "satuan": {"type": "string"}
                        }
                    }
                }
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_low_stock_alerts",
        "title": "Get Low Stock Alerts",
        "description": (
            "List products with critical stock levels (available quantity below minimum safety stock) "
            "requiring immediate reorder/restocking."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "default": 20,
                    "description": "Number of alert items to display."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "alerts": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_inventory_aging_batch",
        "title": "Get Inventory Batch Aging",
        "description": (
            "Retrieve stock movement, receiving dates, and current remaining balance per batch for inventory aging analysis (0-30, 31-60, 61-90, >90 days)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "id_gudang": {
                    "type": "string",
                    "description": "Warehouse code (e.g., '005')"
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "count": {"type": "integer"},
                "data": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_sales_summary",
        "title": "Get Sales Summary",
        "description": (
            "Retrieve sales performance metrics: total invoices, total revenue (omzet), total paid, "
            "outstanding receivables, and Average Order Value (AOV). For Sales Reps, data is filtered to their assigned clients."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "date_from": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format (optional, e.g. '2024-01-01')."
                },
                "date_to": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format (optional, e.g. '2024-12-31')."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "total_invoices": {"type": "integer"},
                "total_omzet": {"type": "number"},
                "total_terbayar": {"type": "number"},
                "total_sisa_piutang": {"type": "number"},
                "aov": {"type": "number"}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_invoices",
        "title": "List Sales Invoices",
        "description": (
            "List recent sales invoices with customer details, grand total, and settlement status. "
            "Restricted for Warehouse role. Sales Reps view only their assigned customer invoices."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "default": 15,
                    "description": "Number of invoices to return."
                },
                "search": {
                    "type": "string",
                    "description": "Filter by invoice number or customer name (optional)."
                },
                "is_lunas": {
                    "type": "boolean",
                    "description": "Filter by payment status: true = fully paid, false = outstanding receivables."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "invoices": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_top_selling_products",
        "title": "Get Top Selling Products",
        "description": (
            "Inspect best-selling products by quantity volume and total revenue."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Number of top products (max 30)."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "top_products": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_ar_piutang_aging",
        "title": "Get Accounts Receivable Aging",
        "description": (
            "Analyze corporate Accounts Receivable aging buckets: current outstanding, "
            "overdue 1-30 days, 31-60 days, 61-90 days, and >90 days. "
            "[Restricted to Admin, Manager, Finance, and Credit Control]."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "aging_buckets": {"type": "object"},
                "total_outstanding": {"type": "number"}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_customer_detail",
        "title": "Get Customer Profile and Terms",
        "description": (
            "Find comprehensive customer profile: contact information, billing address, "
            "credit limit, payment terms (TOP), and assigned sales representative."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Customer name or customer ID code (e.g. 'PT Maju', 'CUST-001')."
                }
            },
            "required": ["query"]
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "customer": {"type": "object"}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_crm_activities",
        "title": "Get Customer CRM Activities",
        "description": (
            "Inspect customer interaction logs (calls, meetings, field visits, follow-ups). "
            "Sales Reps automatically see only their own logged interactions."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "default": 15,
                    "description": "Number of activities to return."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "activities": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_crm_opportunities",
        "title": "Get Sales Pipeline Opportunities",
        "description": (
            "Inspect sales pipeline deals and opportunities with stage, estimated value, and win probability."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage": {
                    "type": "string",
                    "enum": ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
                    "description": "Optional pipeline stage filter."
                },
                "limit": {
                    "type": "integer",
                    "default": 15,
                    "description": "Number of opportunities to return."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "opportunities": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_crm_complaints",
        "title": "Get Customer Complaints & Tickets",
        "description": (
            "Inspect customer service complaints and support tickets with status and urgency."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "default": 15,
                    "description": "Number of complaints to return."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "complaints": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_demand_forecast",
        "title": "Get AI Demand Forecast",
        "description": (
            "Inspect AI-driven inventory demand forecast predictions (7, 30, and 90-day horizons) "
            "and machine learning WAPE accuracy metrics."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "string",
                    "description": "Product ID (optional, e.g. '550044360'). If omitted, returns key forecast items."
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Number of forecast entries."
                }
            },
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "forecasts": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_warehouse_list",
        "title": "List Warehouses",
        "description": (
            "List active company warehouse locations. For warehouse staff, filtered to assigned warehouses."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "warehouses": {"type": "array", "items": {"type": "object"}}
            }
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_main_dashboard",
        "title": "Get Main Dashboard (C3)",
        "description": (
            "Retrieve Main Dashboard (C3) operational KPIs: YTD Omzet vs target, Gadus & Premium family "
            "sales achievements, inventory stock cover, SI-SO trends, and sector growth breakdowns."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["ytd", "mtd", "12m"],
                    "description": "Reporting time horizon (default: 'ytd')"
                }
            },
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_picture_of_success",
        "title": "Get Picture of Success Analytics",
        "description": (
            "Retrieve Picture of Success intelligence dashboard metrics: Pipeline Strength, "
            "Low Touch Customer %, Cross Sell %, Premium Contribution %, Dec Runner Ratio, and 12-month trends."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Reporting year (e.g. 2026)"},
                "month": {"type": "integer", "description": "Reporting month (1-12)"}
            },
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_sales_performance_intelligence",
        "title": "Get Sales Performance Intelligence",
        "description": (
            "Retrieve Sales Performance intelligence metrics: volume targets vs achievements "
            "per branch (Manado, Makassar), monthly trends, and prior year comparisons."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Reporting year (e.g. 2026)"},
                "month": {"type": "integer", "description": "Reporting month (1-12)"},
                "area": {"type": "string", "description": "Optional branch area filter (e.g. 'Manado', 'Makassar')"}
            },
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_customer_intelligence_dashboard",
        "title": "Get Customer Intelligence Dashboard",
        "description": (
            "Retrieve Customer 360 intelligence: Customer validation graphic, PANOL vs verified trends, "
            "key account customers table, and customer directory."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Reporting year (e.g. 2026)"},
                "month": {"type": "integer", "description": "Reporting month (1-12)"},
                "limit": {"type": "integer", "description": "Max rows for tables (default: 10)"}
            },
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "get_forecast_dashboard_summary",
        "title": "Get Demand Forecasting Dashboard Overview",
        "description": (
            "Retrieve Demand Forecasting dashboard overview: Total tracked SKUs, average WAPE %, "
            "total 30-day predicted units, AI model distribution, and top forecast products."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "db_list_tables",
        "title": "List PostgreSQL Ultima Database Tables",
        "description": (
            "Explore tables and schemas in the live PostgreSQL Ultima database. "
            "Use this tool to see available schemas (public, hr, finance), table names, and estimated row counts."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "schema": {"type": "string", "description": "Optional schema filter (e.g. 'public', 'hr', 'finance')"},
                "search": {"type": "string", "description": "Optional table name search term"}
            },
            "required": []
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "db_describe_table",
        "title": "Describe Table Schema & Columns",
        "description": (
            "Inspect exact column names, data types, nullability, and 3 sample rows from any table "
            "in the PostgreSQL Ultima database. Essential before writing custom SQL queries."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "table_name": {"type": "string", "description": "Name of target table (e.g. 'penjualan', 'customer', 'barang')"},
                "schema": {"type": "string", "description": "Schema name (default: 'public')"}
            },
            "required": ["table_name"]
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "db_execute_query",
        "title": "Execute Read-Only SQL Analytics Query",
        "description": (
            "Execute custom, read-only SELECT queries directly against PostgreSQL Ultima database. "
            "Allows full SQL aggregations, joins, filtering, and deep data analysis. "
            "[Strictly enforced: SELECT/WITH only, auto-capped limit, read-only transaction]."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "sql_query": {"type": "string", "description": "The SELECT SQL query string to execute"},
                "limit": {"type": "integer", "description": "Maximum rows to return (default: 100, max: 200)"}
            },
            "required": ["sql_query"]
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    },
    {
        "name": "db_analyze_sql",
        "title": "Perform Automated SQL Business Intelligence Analytics",
        "description": (
            "Run automated, deep BI analysis on PostgreSQL Ultima database. "
            "Analysis types: 'rfm_customer_segments', 'product_margin_hpp', 'inventory_turnover', "
            "'sales_rep_ranking', 'ar_overdue_aging'."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "analysis_type": {
                    "type": "string",
                    "enum": ["rfm_customer_segments", "product_margin_hpp", "inventory_turnover", "sales_rep_ranking", "ar_overdue_aging"],
                    "description": "BI analytical focus area"
                },
                "top_n": {"type": "integer", "description": "Number of top results (default: 10)"}
            },
            "required": ["analysis_type"]
        },
        "annotations": {
            "readOnlyHint": True,
            "openWorldHint": False,
            "destructiveHint": False
        }
    }
]


def list_tools_for_user(user: MCPUser) -> List[Dict[str, Any]]:
    """Returns all available tools cleanly without polluting descriptions (mirrors AIMS pattern)."""
    return [t.copy() for t in ALL_TOOLS]


def _make_json_safe(obj: Any) -> Any:
    """Recursively converts Decimal, date, datetime, and UUID to JSON-safe types."""
    import decimal
    import datetime
    import uuid
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: _make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_safe(v) for v in obj]
    return obj


def execute_tool(
    name: str, arguments: Dict[str, Any], user: MCPUser, db: Session
) -> Tuple[Dict[str, Any], Optional[MCPUser]]:
    """
    Executes an MCP tool with strict role verification and data sanitization.
    Returns (result_dict, updated_user_if_authenticated).
    """
    # 1. Hard RBAC check
    is_allowed, error_msg = check_tool_permission(name, user)
    if not is_allowed:
        return {
            "isError": True,
            "content": [
                {
                    "type": "text",
                    "text": f"⛔ {error_msg}"
                }
            ]
        }, None

    updated_user = None

    try:
        # 2. In-band Auth Tools
        if name == "cpa_whoami":
            res = {
                "active_user": user.to_dict(),
                "permissions": {
                    "can_view_sales": not user.is_warehouse,
                    "can_view_financial_valuation": user.is_admin or user.is_manager or user.is_finance,
                    "can_view_ar_aging": user.is_admin or user.is_manager or user.is_finance,
                    "can_view_crm": not user.is_warehouse,
                    "row_level_security": (
                        f"Salesman ID: {user.id_pegawai}" if user.is_sales else (
                            f"Warehouse Access: {len(user.accessible_warehouses)} gudang" if user.is_warehouse else "Unrestricted"
                        )
                    )
                },
                "available_tools_count": len(get_allowed_tools_for_user(user))
            }

        # 3. Inventory Tools
        elif name == "get_inventory_summary":
            res = queries.query_inventory_summary(db, user, id_gudang=arguments.get("id_gudang"))

        elif name == "get_product_stock":
            res = queries.query_product_stock(
                db, user,
                search=arguments.get("search"),
                id_gudang=arguments.get("id_gudang"),
                limit=arguments.get("limit", 15)
            )

        elif name == "get_low_stock_alerts":
            res = queries.query_low_stock_alerts(db, user, limit=arguments.get("limit", 20))

        elif name == "get_inventory_aging_batch":
            res = queries.query_inventory_aging_batch(
                db, user,
                id_gudang=arguments.get("id_gudang"),
                min_days=arguments.get("min_days"),
                limit=arguments.get("limit", 25)
            )

        # 4. Sales Tools
        elif name == "get_sales_summary":
            res = queries.query_sales_summary(
                db, user,
                date_from=arguments.get("date_from"),
                date_to=arguments.get("date_to")
            )

        elif name == "get_invoices":
            res = queries.query_invoices(
                db, user,
                limit=arguments.get("limit", 15),
                search=arguments.get("search"),
                is_lunas=arguments.get("is_lunas")
            )

        elif name == "get_top_selling_products":
            res = queries.query_top_selling_products(db, user, limit=arguments.get("limit", 10))

        # 5. Finance Tools
        elif name == "get_ar_piutang_aging":
            res = queries.query_ar_piutang_aging(db, user)

        elif name == "get_customer_detail":
            res = queries.query_customer_detail(db, user, query_str=arguments.get("query", ""))

        # 6. CRM Tools
        elif name == "get_crm_activities":
            res = queries.query_crm_activities(db, user, limit=arguments.get("limit", 15))

        elif name == "get_crm_opportunities":
            res = queries.query_crm_opportunities(
                db, user,
                stage=arguments.get("stage"),
                limit=arguments.get("limit", 15)
            )

        elif name == "get_crm_complaints":
            res = queries.query_crm_complaints(db, user, limit=arguments.get("limit", 15))

        # 7. Forecasting Tools
        elif name == "get_demand_forecast":
            res = queries.query_demand_forecast(
                db, user,
                product_id=arguments.get("product_id"),
                limit=arguments.get("limit", 10)
            )

        # 8. Warehouse Master
        elif name == "get_warehouse_list":
            res = queries.query_warehouse_list(db, user)

        # 9. Main Dashboard (C3)
        elif name == "get_main_dashboard":
            res = queries.query_main_dashboard(db, user, period=arguments.get("period", "ytd"))

        # 10. Picture of Success Analytics
        elif name == "get_picture_of_success":
            res = queries.query_picture_of_success(
                db, user,
                year=arguments.get("year", 2026),
                month=arguments.get("month", 9)
            )

        # 11. Sales Performance Intelligence
        elif name == "get_sales_performance_intelligence":
            res = queries.query_sales_performance_intelligence(
                db, user,
                year=arguments.get("year", 2026),
                month=arguments.get("month", 9),
                area=arguments.get("area")
            )

        # 12. Customer Intelligence Dashboard
        elif name == "get_customer_intelligence_dashboard":
            res = queries.query_customer_intelligence_dashboard(
                db, user,
                year=arguments.get("year", 2026),
                month=arguments.get("month", 9),
                limit=arguments.get("limit", 10)
            )

        # 13. Demand Forecasting Dashboard Overview
        elif name == "get_forecast_dashboard_summary":
            res = queries.query_forecast_dashboard_summary(db, user)

        # 14. PostgreSQL Ultima — List Tables
        elif name == "db_list_tables":
            res = queries.query_db_list_tables(
                db, user,
                schema=arguments.get("schema"),
                search=arguments.get("search")
            )

        # 15. PostgreSQL Ultima — Describe Table
        elif name == "db_describe_table":
            res = queries.query_db_describe_table(
                db, user,
                table_name=arguments.get("table_name", ""),
                schema=arguments.get("schema", "public")
            )

        # 16. PostgreSQL Ultima — Execute Custom Read-Only SQL Query
        elif name == "db_execute_query":
            res = queries.query_db_execute_query(
                db, user,
                sql_query=arguments.get("sql_query", ""),
                limit=arguments.get("limit", 100)
            )

        # 17. PostgreSQL Ultima — Business Intelligence Analysis
        elif name == "db_analyze_sql":
            res = queries.query_db_analyze_sql(
                db, user,
                analysis_type=arguments.get("analysis_type", ""),
                date_from=arguments.get("date_from"),
                date_to=arguments.get("date_to"),
                top_n=arguments.get("top_n", 10)
            )

        else:
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Handler untuk tool '{name}' belum diimplementasikan."}]
            }, None

        # Return standardized MCP content block + structuredContent for model consumption
        safe_res = _make_json_safe(res)
        result_block: Dict[str, Any] = {
            "isError": False,
            "structuredContent": safe_res if isinstance(safe_res, (dict, list)) else {"data": safe_res},
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(safe_res, indent=2, ensure_ascii=False, default=str)
                }
            ]
        }
        if name == "cpa_whoami":
            result_block["_meta"] = {"openai/profile": True}

        return result_block, updated_user

    except Exception as e:
        return {
            "isError": True,
            "content": [
                {
                    "type": "text",
                    "text": f"Terjadi kesalahan saat memproses tool '{name}': {str(e)}"
                }
            ]
        }, None
