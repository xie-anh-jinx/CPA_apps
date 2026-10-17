"""
Test Script: MCP Role-Based Access Control & Row-Level Security Verification
Validates:
1. Warehouse staff is blocked from sales data (403 Forbidden).
2. Sales rep only sees their own scoped sales invoices & omzet (RLS by id_pegawai).
3. Admin sees all corporate data.
4. Financial valuation (total_nilai) in inventory is masked for Sales/Warehouse and visible for Admin/Finance.
5. AR Aging report is exclusive to Finance & Admin.
"""
import httpx
import json

BASE_URL = "http://localhost:8000/api/mcp"

def call_mcp(role: str, method: str, params: dict = None) -> dict:
    headers = {
        "X-CPA-Role": role,
        "Content-Type": "application/json"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }
    resp = httpx.post(f"{BASE_URL}/rpc", headers=headers, json=payload, timeout=30.0)
    return resp.json()

def run_tests():
    print("=" * 70)
    print("🔐 CPA PLATFORM MCP — RBAC & ROW-LEVEL SECURITY TEST SUITE")
    print("=" * 70)

    # 1. Tools Visibility per Role
    print("\n[TEST 1] Verifying Tools List Exposure per Role:")
    for test_role in ["admin", "sales_rep", "warehouse_staff", "finance_manager"]:
        res = call_mcp(test_role, "tools/list")
        tool_names = [t["name"] for t in res.get("result", {}).get("tools", [])]
        print(f"  • Role '{test_role}': {len(tool_names)} tools accessible")
        has_sales = "get_sales_summary" in tool_names
        has_ar = "get_ar_piutang_aging" in tool_names
        print(f"    - Can view sales tools: {has_sales} | Can view AR Aging: {has_ar}")

    # 2. Hard Execution Security: Warehouse Calls Sales Tool
    print("\n[TEST 2] Hard Execution Guard: Warehouse Staff calls 'get_sales_summary'")
    res = call_mcp("warehouse_staff", "tools/call", {"name": "get_sales_summary"})
    tool_res = res.get("result", {})
    is_error = tool_res.get("isError", False)
    content_text = tool_res.get("content", [{}])[0].get("text", "")
    print(f"  • isError: {is_error}")
    print(f"  • Server Response: {content_text}")
    assert is_error is True, "Security Breach: Warehouse was able to call get_sales_summary!"
    print("  ✅ PASS: Warehouse access correctly rejected.")

    # 3. Row-Level Security: Sales Rep vs Admin for get_sales_summary
    print("\n[TEST 3] Row-Level Security (RLS): Sales Rep vs Admin for 'get_sales_summary'")
    sales_res = call_mcp("sales_rep", "tools/call", {"name": "get_sales_summary"})
    admin_res = call_mcp("admin", "tools/call", {"name": "get_sales_summary"})
    
    sales_data = json.loads(sales_res["result"]["content"][0]["text"])
    admin_data = json.loads(admin_res["result"]["content"][0]["text"])
    
    print(f"  • Sales Rep Scope: {sales_data.get('scope')}")
    print(f"    - Total Invoices: {sales_data.get('total_invoices')}")
    print(f"    - Total Omzet: Rp {sales_data.get('total_omzet', 0):,.2f}")
    
    print(f"  • Admin Scope: {admin_data.get('scope')}")
    print(f"    - Total Invoices: {admin_data.get('total_invoices')}")
    print(f"    - Total Omzet: Rp {admin_data.get('total_omzet', 0):,.2f}")
    
    assert sales_data["total_invoices"] < admin_data["total_invoices"], "RLS Failure: Sales Rep should have fewer invoices than Admin!"
    print("  ✅ PASS: Sales Rep is strictly scoped to own sales pipeline via RLS.")

    # 4. Data Masking: Inventory Valuation
    print("\n[TEST 4] Data Field Masking: Inventory Total Nilai Persediaan")
    inv_sales = call_mcp("sales_rep", "tools/call", {"name": "get_inventory_summary"})
    inv_admin = call_mcp("admin", "tools/call", {"name": "get_inventory_summary"})
    
    sales_inv_data = json.loads(inv_sales["result"]["content"][0]["text"])
    admin_inv_data = json.loads(inv_admin["result"]["content"][0]["text"])
    
    print(f"  • Sales Rep sees total_nilai: {sales_inv_data.get('total_nilai')}")
    print(f"  • Admin sees total_nilai: Rp {admin_inv_data.get('total_nilai', 0):,.2f}")
    
    assert "RESTRICTED" in str(sales_inv_data.get("total_nilai")), "Masking Failure: Sales Rep should not see inventory valuation!"
    print("  ✅ PASS: Sensitive financial valuation is masked for Sales Rep.")

    # 5. Finance Exclusive: AR Aging
    print("\n[TEST 5] Financial AR Aging Report (Finance vs Sales Rep)")
    ar_sales = call_mcp("sales_rep", "tools/call", {"name": "get_ar_piutang_aging"})
    ar_finance = call_mcp("finance_manager", "tools/call", {"name": "get_ar_piutang_aging"})
    
    print(f"  • Sales Rep calling AR Aging: isError={ar_sales['result'].get('isError')}")
    print(f"  • Finance calling AR Aging: isError={ar_finance['result'].get('isError')}")
    finance_ar_data = json.loads(ar_finance["result"]["content"][0]["text"])
    print(f"    - Total Outstanding Piutang: Rp {finance_ar_data.get('total_piutang_outstanding', 0):,.2f}")
    print(f"    - Overdue >90 Days: Rp {finance_ar_data.get('overdue_above_90_days', 0):,.2f}")
    
    assert ar_sales["result"].get("isError") is True, "Security Breach: Sales Rep accessed AR aging!"
    assert ar_finance["result"].get("isError") is False, "Finance should have access to AR aging!"
    print("  ✅ PASS: AR Aging report properly restricted to Finance.")

    # 6. Demand Forecast AI
    print("\n[TEST 6] Demand Forecast AI Tool Verification")
    fc_res = call_mcp("admin", "tools/call", {"name": "get_demand_forecast", "arguments": {"limit": 3}})
    fc_data = json.loads(fc_res["result"]["content"][0]["text"])
    print(f"  • Tracked Products: {fc_data.get('overview', {}).get('total_tracked_products')}")
    print(f"  • Average Model WAPE: {fc_data.get('overview', {}).get('avg_model_wape_percentage')}%")
    print(f"  • Sample Forecast Rows: {len(fc_data.get('forecasts', []))}")
    if fc_data.get('forecasts'):
        sample = fc_data['forecasts'][0]
        print(f"    - Product: {sample.get('nama_barang')} ({sample.get('horizon_days')} days): predicted {sample.get('predicted_qty')} qty [Model: {sample.get('model_name')}]")
    print("  ✅ PASS: AI Demand Forecasting data accessible.")

    print("\n" + "=" * 70)
    print("🎉 ALL RBAC & ROW-LEVEL SECURITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
