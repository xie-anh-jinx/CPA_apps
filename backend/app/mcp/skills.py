"""
CPA MCP — Skills Extension (SEP-2640 proposal for OpenAI / ChatGPT Plugins)
Provides static skill definitions, digests, and file contents.
"""
import hashlib
from typing import Dict, Any, List, Optional

SKILL_WAREHOUSE_MD = """---
name: warehouse-inventory
description: Monitor warehouse inventory, check real-time product stock, and inspect low stock alerts across distribution warehouses.
---

# Warehouse Inventory Management Skill

This skill guides ChatGPT and AI assistants in monitoring and querying distribution inventory.

## Typical Workflows
1. Identify available warehouses using `get_warehouse_list`.
2. Inspect product availability and on-hand stock with `get_product_stock`.
3. Check urgent replenishment requirements using `get_low_stock_alerts`.
4. Review high-level stock valuation and SKU counts with `get_inventory_summary`.
"""

SKILL_SALES_MD = """---
name: sales-analytics
description: Analyze sales performance, track invoices, customer credit terms, and outstanding AR receivables.
---

# Sales Analytics & Accounts Receivable Skill

This skill guides ChatGPT and AI assistants in reviewing sales trends and financial metrics.

## Typical Workflows
1. Review overall sales revenue and AOV with `get_sales_summary`.
2. Inspect customer payment statuses and invoices using `get_invoices`.
3. Review company credit risk and overdue invoices using `get_ar_piutang_aging`.
4. Check detailed customer terms and credit limits with `get_customer_detail`.
"""

def _calc_digest(content: str) -> str:
    h = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return f"sha256:{h}"

SKILLS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "skill://cpa-analytics/warehouse-inventory/SKILL.md": {
        "uri": "skill://cpa-analytics/warehouse-inventory/SKILL.md",
        "frontmatter": {
            "name": "warehouse-inventory",
            "description": "Monitor warehouse inventory, check real-time product stock, and inspect low stock alerts across distribution warehouses."
        },
        "resources": [
            {
                "uri": "skill://cpa-analytics/warehouse-inventory/SKILL.md",
                "digest": _calc_digest(SKILL_WAREHOUSE_MD)
            }
        ],
        "content": SKILL_WAREHOUSE_MD
    },
    "skill://cpa-analytics/sales-analytics/SKILL.md": {
        "uri": "skill://cpa-analytics/sales-analytics/SKILL.md",
        "frontmatter": {
            "name": "sales-analytics",
            "description": "Analyze sales performance, track invoices, customer credit terms, and outstanding AR receivables."
        },
        "resources": [
            {
                "uri": "skill://cpa-analytics/sales-analytics/SKILL.md",
                "digest": _calc_digest(SKILL_SALES_MD)
            }
        ],
        "content": SKILL_SALES_MD
    }
}


def list_skills() -> Dict[str, Any]:
    """Returns list of skills according to SEP-2640."""
    skills_list = []
    for uri, item in SKILLS_REGISTRY.items():
        skills_list.append({
            "uri": item["uri"],
            "frontmatter": item["frontmatter"],
            "resources": item["resources"]
        })
    return {"skills": skills_list}


def get_skill(uri: str) -> Optional[Dict[str, Any]]:
    """Returns a single skill object."""
    item = SKILLS_REGISTRY.get(uri)
    if not item:
        return None
    return {
        "uri": item["uri"],
        "frontmatter": item["frontmatter"],
        "resources": item["resources"]
    }


def read_skill_resource(uri: str) -> Optional[Dict[str, Any]]:
    """Reads the content of a skill resource URI."""
    item = SKILLS_REGISTRY.get(uri)
    if not item:
        return None
    return {
        "uri": uri,
        "mimeType": "text/markdown",
        "text": item["content"]
    }
