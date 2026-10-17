"""
CPA Platform — Gemini AI Integration with Role-Based MCP Server
Demonstrates how to connect Google Gemini (e.g. Gemini 1.5 Pro/Flash, Gemini 2.0)
to the CPA MCP Server via HTTP JSON-RPC (/api/mcp/rpc).
"""
import os
import json
import httpx

# URL Endpoint CPA MCP
MCP_BASE_URL = os.environ.get("CPA_MCP_URL", "https://warehouse.pengajaran.com/api/mcp")

class CPAMCPClient:
    """Client helper untuk memanggil CPA MCP Server dengan Role tertentu."""
    def __init__(self, base_url: str = MCP_BASE_URL, role: str = "sales_rep", token: str = None):
        self.base_url = base_url.rstrip("/")
        self.role = role
        self.token = token

    def _headers(self):
        headers = {
            "Content-Type": "application/json",
            "X-CPA-Role": self.role
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def list_tools(self) -> list:
        """Mengambil daftar tools yang diizinkan untuk role saat ini."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        resp = httpx.post(f"{self.base_url}/rpc", headers=self._headers(), json=payload, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", {}).get("tools", [])

    def call_tool(self, tool_name: str, arguments: dict = None) -> dict:
        """Mengeksekusi tool MCP dan menerapkan Row-Level Security serta sanitasi field."""
        payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }
        resp = httpx.post(f"{self.base_url}/rpc", headers=self._headers(), json=payload, timeout=30.0)
        resp.raise_for_status()
        res = resp.json().get("result", {})
        if res.get("isError"):
            error_text = res.get("content", [{}])[0].get("text", "Unknown error")
            return {"error": error_text, "isError": True}
        raw_text = res.get("content", [{}])[0].get("text", "{}")
        try:
            return json.loads(raw_text)
        except Exception:
            return {"text": raw_text}


def convert_mcp_to_gemini_declarations(mcp_tools: list) -> list:
    """
    Mengonversi format MCP Tools (JSON Schema) ke Function Declarations
    yang didukung oleh Google Gemini Function Calling API.
    """
    gemini_tools = []
    for tool in mcp_tools:
        # Schema conversion
        schema = tool.get("inputSchema", {})
        gemini_tools.append({
            "name": tool["name"],
            "description": tool["description"],
            "parameters": {
                "type": "OBJECT",
                "properties": schema.get("properties", {}),
                "required": schema.get("required", [])
            }
        })
    return gemini_tools


# ─── CONTOH PENGGUNAAN MANDIRI / SIMULASI ──────────────────────────────────────
if __name__ == "__main__":
    print("=" * 65)
    print("🤖 SIMULASI INTERAKSI GEMINI DENGAN CPA ROLE-BASED MCP")
    print("=" * 65)

    # Contoh 1: Sales Rep (Azzuhri - CPA-452)
    print("\n[SKENARIO 1] Pengguna adalah Sales Rep (Azzuhri):")
    sales_client = CPAMCPClient(role="sales_rep")
    tools = sales_client.list_tools()
    print(f"  • Tools yang diizinkan untuk Sales: {[t['name'] for t in tools]}")
    
    print("  • Gemini memanggil tool: 'get_sales_summary'...")
    sales_data = sales_client.call_tool("get_sales_summary")
    print("  • Hasil dari MCP Server (Row-Level Security diterapkan):")
    print(f"    - Scope: {sales_data.get('scope')}")
    print(f"    - Total Faktur: {sales_data.get('total_invoices')}")
    print(f"    - Total Omzet: Rp {sales_data.get('total_omzet', 0):,.2f}")

    # Contoh 2: Gudang (Ratih - CPA-051)
    print("\n[SKENARIO 2] Pengguna adalah Staf Gudang (Ratih):")
    wh_client = CPAMCPClient(role="warehouse_staff")
    print("  • Gemini mencoba memanggil 'get_sales_summary' untuk user gudang...")
    wh_sales_attempt = wh_client.call_tool("get_sales_summary")
    print(f"  • Hasil penolakan: {wh_sales_attempt}")

    print("  • Gemini memanggil 'get_inventory_summary' untuk user gudang...")
    wh_inv_data = wh_client.call_tool("get_inventory_summary")
    print(f"  • Total SKU: {wh_inv_data.get('total_sku')}")
    print(f"  • Total On-Hand: {wh_inv_data.get('total_on_hand')}")
    print(f"  • Total Nilai Rupiah: {wh_inv_data.get('total_nilai')} (Dimasking untuk staf gudang!)")

    # Contoh 3: Finance Manager
    print("\n[SKENARIO 3] Pengguna adalah Finance Manager:")
    fin_client = CPAMCPClient(role="finance_manager")
    print("  • Gemini memanggil 'get_ar_piutang_aging'...")
    aging_data = fin_client.call_tool("get_ar_piutang_aging")
    print(f"  • Total Piutang Outstanding: Rp {aging_data.get('total_piutang_outstanding', 0):,.2f}")
    print(f"  • Overdue >90 Hari: Rp {aging_data.get('overdue_above_90_days', 0):,.2f}")

    print("\n" + "=" * 65)
    print("✅ Gemini Function Calling dapat langsung menggunakan toolset ini!")
    print("=" * 65)
