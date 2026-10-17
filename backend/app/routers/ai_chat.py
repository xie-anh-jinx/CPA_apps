"""
PADI ERP / CPA Analytics — AI Chat & Intent Router Architecture
═════════════════════════════════════════════════════════════════
Connects Next.js ChatBox with:
1. PADI AI Intent Router: Decides whether query is Operational MCP or Business Reasoning LLM
2. PADI MCP Server: Direct database access with RBAC & Row-Level Security (RLS)
3. Python Report Engine: Generates Excel (.xlsx) and PDF (.pdf) with zero LLM tokens
4. LLM Provider Layer: Pluggable Gemini / DeepSeek / OpenAI provider with Dependency Injection
5. Audit Logger: Tracks timestamp, user, intent, route, tool, duration, token_used, success
"""

import os
import re
import json
import time
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_analytics_db
from app.mcp.auth import MCPUser, authenticate_jwt, create_role_user
from app.mcp.tools import list_tools_for_user, execute_tool
from app.router.intent_router import IntentRouter, IntentRouteResult, _default_router
from app.services.llm_provider import BaseLLMProvider, get_llm_provider
from app.services.report_engine import ReportEngine, get_report_engine, REPORTS_DIR
from app.services.audit_logger import AuditLogger, get_audit_logger


router = APIRouter()


# ─── Request / Response Schemas ───────────────────────────────────────────────

class ChatAttachment(BaseModel):
    name: str
    type: str = "application/octet-stream"
    size: int = 0
    dataUrl: Optional[str] = None


class ChatMessagePayload(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field("", description="Text content")
    attachments: Optional[List[ChatAttachment]] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessagePayload]
    context: Optional[Dict[str, Any]] = None
    stream: bool = True


class RouteCheckRequest(BaseModel):
    message: str


# ─── Auth Resolution ──────────────────────────────────────────────────────────

def resolve_mcp_user(request: Request, db: Session) -> MCPUser:
    """Resolves MCPUser context from Bearer token or role headers."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        success, user, _ = authenticate_jwt(token, db)
        if success and user:
            return user

    # Fallback to X-CPA-Role or default admin
    role = request.headers.get("X-CPA-Role", "admin").lower()
    return create_role_user(role=role, username=f"chat_user_{role}")


# ─── Formatting Helpers ───────────────────────────────────────────────────────

def format_tool_result_markdown(tool_name: str, result_dict: Dict[str, Any], user: MCPUser) -> str:
    """Formats raw MCP tool output into clean, human-readable Markdown."""
    if result_dict.get("isError"):
        content_items = result_dict.get("content", [])
        msg = content_items[0].get("text", "Error") if content_items else "Error"
        return f"> ⚠️ **Gagal memanggil tool `{tool_name}`:** {msg}\n"

    res = result_dict.get("structuredContent") or result_dict
    if "content" in result_dict and isinstance(result_dict["content"], list) and not result_dict.get("structuredContent"):
        for item in result_dict["content"]:
            if item.get("type") == "text":
                try:
                    res = json.loads(item.get("text", "{}"))
                    break
                except Exception:
                    pass

    md = []
    if not isinstance(res, (dict, list)):
        return f"### 🔧 Hasil MCP: `{tool_name}`\n{str(res)}"

    if tool_name == "get_sales_summary" and isinstance(res, dict):
        omzet = res.get("total_omzet") or res.get("total_omzet_penjualan") or 0
        faktur = res.get("total_invoices") or res.get("total_faktur") or 0
        piutang = res.get("total_piutang") or res.get("total_piutang_outstanding") or 0
        scope = res.get("scope", "Corporate")
        md.append(f"### 📊 Ringkasan Penjualan PADI ERP ({scope})")
        md.append(f"- **Total Omzet:** Rp {omzet:,.0f}".replace(",", "."))
        md.append(f"- **Jumlah Faktur Terkonfirmasi:** {faktur:,} transaksi")
        md.append(f"- **Total Piutang Berjalan:** Rp {piutang:,.0f}".replace(",", "."))

    elif tool_name == "get_inventory_summary" and isinstance(res, dict):
        sku = res.get("total_sku") or 0
        on_hand = res.get("total_on_hand") or res.get("total_stok_on_hand") or 0
        avail = res.get("total_available") or res.get("total_stok_available") or 0
        low = res.get("low_stock_count") or res.get("total_low_stock_items") or 0
        nilai = res.get("total_nilai") or res.get("total_nilai_persediaan") or 0
        gd_name = res.get("nama_gudang")
        gd_id = res.get("id_gudang")
        wh_suffix = f" — {gd_name} ({gd_id})" if gd_name and gd_id else (f" (Gudang {gd_id})" if gd_id else "")
        md.append(f"### 📦 Ringkasan Stok Gudang{wh_suffix}")
        md.append(f"- **Total SKU:** {int(sku):,} produk")
        md.append(f"- **Total Stok On Hand:** {on_hand:,.0f} units")
        md.append(f"- **Total Stok Tersedia:** {avail:,.0f} units")
        md.append(f"- **Item Stok Kritis / Menipis:** {int(low):,} SKU")
        if isinstance(nilai, (int, float)) and nilai > 0:
            md.append(f"- **Valuasi Nilai Persediaan:** Rp {nilai:,.0f}".replace(",", "."))

    elif tool_name == "get_product_stock":
        items = res if isinstance(res, list) else (res.get("data", []) or res.get("products", []))
        md.append("### 📋 Rincian Stok Produk")
        if not items:
            md.append("Tidak ada data produk yang ditemukan.")
        else:
            md.append("| SKU / Kode | Nama Produk | Gudang | On Hand | Tersedia |")
            md.append("|---|---|---|---|---|")
            for it in items[:15]:
                sku = it.get("id_barang", "-")
                nama = it.get("nama_barang", "-")
                gd = it.get("nama_gudang") or it.get("id_gudang", "-")
                on_h = it.get("on_hand", 0)
                av = it.get("available", 0)
                md.append(f"| `{sku}` | {nama} | {gd} | **{on_h:,.0f}** | **{av:,.0f}** |".replace(",", "."))

    elif tool_name == "get_low_stock_alerts":
        items = res if isinstance(res, list) else (res.get("items", []) or res.get("alerts", []))
        md.append("### ⚠️ Alert Stok Kritis / Perlu Reorder")
        if not items:
            md.append("Seluruh stok gudang saat ini berada pada batas aman.")
        else:
            md.append("| SKU / Kode | Nama Produk | Gudang | Tersedia | Safety Stock |")
            md.append("|---|---|---|---|---|")
            for it in items[:10]:
                if isinstance(it, dict):
                    kd = it.get("id_barang", "-")
                    nm = it.get("nama_barang", "-")
                    gd = it.get("id_gudang", "-")
                    stok = it.get("stok_available", 0)
                    min_s = it.get("min_stock", 0)
                    md.append(f"| `{kd}` | {nm} | {gd} | **{stok}** | {min_s} |")

    elif tool_name == "get_ar_piutang_aging":
        md.append("### 💳 Analisa Aging Piutang Pelanggan")
        total = res.get("total_piutang", 0) if isinstance(res, dict) else 0
        md.append(f"Total Piutang Berjalan: **Rp {total:,.0f}**".replace(",", "."))
        brackets = res.get("aging_brackets", {}) if isinstance(res, dict) else {}
        if brackets:
            md.append("\n| Kategori Hari | Nominal | Persentase |")
            md.append("|---|---|---|")
            for k, v in brackets.items():
                nom = v.get("nominal", 0) if isinstance(v, dict) else v
                pct = v.get("percentage", 0) if isinstance(v, dict) else 0
                md.append(f"| {k} | Rp {nom:,.0f} | {pct}% |".replace(",", "."))

    elif tool_name == "get_invoices":
        invs = res if isinstance(res, list) else res.get("invoices", [])
        md.append("### 🧾 Daftar Faktur Penjualan Terbaru")
        if not invs:
            md.append("Tidak ada data faktur yang ditemukan.")
        else:
            md.append("| No. Faktur | Tanggal | Jatuh Tempo | Nilai Faktur | Status |")
            md.append("|---|---|---|---|---|")
            for it in invs[:10]:
                no_f = it.get("no_faktur", "-")
                tgl = it.get("tgl_faktur", "-")
                jth = it.get("tgl_jth_tempo", "-")
                nilai_f = it.get("total_nilai", 0)
                status_f = it.get("status_pembayaran", "UNPAID")
                md.append(f"| `{no_f}` | {tgl} | {jth} | Rp {nilai_f:,.0f} | **{status_f}** |".replace(",", "."))

    elif tool_name == "get_warehouse_list":
        whs = res if isinstance(res, list) else res.get("warehouses", [])
        md.append("### 🏬 Daftar Master Gudang PADI")
        if not whs:
            md.append("Tidak ada gudang terdaftar.")
        else:
            md.append("| Kode | Nama Gudang | Lokasi | Tipe |")
            md.append("|---|---|---|---|")
            for w in whs:
                kd = w.get("id_gudang", "-")
                nm = w.get("nama_gudang", "-")
                lok = w.get("lokasi", "-")
                tp = w.get("tipe", "Utama")
                md.append(f"| `{kd}` | {nm} | {lok} | {tp} |")

    elif tool_name == "get_inventory_aging_batch":
        batches = res.get("data") if isinstance(res, dict) and "data" in res else (res if isinstance(res, list) else res.get("batches", []))
        min_d = res.get("min_days_filter") if isinstance(res, dict) else None
        filter_str = f" (Aging ≥ {min_d} Hari)" if min_d else ""
        md.append(f"### 🏷️ Monitoring Umur Stok & Batch Produk{filter_str}")
        if not batches:
            md.append("Tidak ada persediaan barang yang melampaui kriteria umur yang dipilih.")
        else:
            md.append("| Gudang | SKU | Nama Produk | Batch | Tgl Masuk | Umur Barang | Sisa Stok |")
            md.append("|---|---|---|---|---|---|---|")
            for b in batches[:15]:
                gd = b.get("nama_gudang") or b.get("id_gudang", "-")
                sku = b.get("id_barang", "-")
                nama = b.get("nama_barang", "-")
                no_b = b.get("batch") or b.get("no_batch", "-")
                tgl = b.get("tanggal_masuk", "-")
                thn = b.get("umur_tahun", 0)
                hari = b.get("umur_hari", 0)
                stok = b.get("saldo_sisa") or b.get("qty", 0)
                md.append(f"| {gd} | `{sku}` | {nama} | `{no_b}` | {tgl} | **{thn} thn** ({hari} hr) | **{stok:,.0f}** |".replace(",", "."))

    elif tool_name == "get_main_dashboard":
        md.append("### 📈 Main Executive Dashboard (C3)")
        if isinstance(res, dict):
            for k, v in res.items():
                if not isinstance(v, (dict, list)):
                    md.append(f"- **{k.replace('_', ' ').title()}:** {v}")

    elif tool_name == "cpa_whoami":
        u = res.get("active_user", {}) if isinstance(res, dict) else {}
        md.append("### 👤 Sesi Pengguna Aktif")
        md.append(f"- **Username:** `{u.get('username', user.username)}`")
        md.append(f"- **Role Akses:** `{u.get('role', user.role)}`")
        md.append(f"- **Perlindungan Data:** Row-Level Security (RLS) Aktif")

    else:
        # Fallback dictionary formatting
        if isinstance(res, dict):
            md.append(f"### 📋 Data `{tool_name}`")
            for k, v in res.items():
                if not isinstance(v, (dict, list)):
                    md.append(f"- **{k.replace('_', ' ').title()}:** {v}")
        elif isinstance(res, list):
            md.append(f"### 📋 Daftar Data ({len(res)} item)")
            md.append(f"Ditemukan {len(res)} rekaman data operasional.")

    return "\n".join(md) if md else f"Data berhasil diambil melalui tool `{tool_name}`."


def trim_mcp_data_for_llm(data: Any, query: str, max_items: int = 15) -> Any:
    """Safely compacts MCP data sent to the LLM layer."""
    if isinstance(data, list):
        return data[:max_items]
    if isinstance(data, dict):
        trimmed = {}
        for k, v in data.items():
            if isinstance(v, list):
                trimmed[k] = v[:max_items]
            else:
                trimmed[k] = v
        return trimmed
    return data


# ─── Chat Endpoint (Main AI Router Handler) ───────────────────────────────────

@router.post("/chat")
async def ai_chat_endpoint(
    req: ChatRequest,
    request: Request,
    db: Session = Depends(get_analytics_db),
    intent_router: IntentRouter = Depends(lambda: _default_router),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    report_engine: ReportEngine = Depends(get_report_engine),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Main chat endpoint orchestrated by the AI Intent Router:
    1. Operational Data Retrieval & Reports -> Direct MCP / Report Engine (Token = 0)
    2. Business Reasoning & Strategy -> LLM Provider (Gemini / DeepSeek) with MCP Context
    """
    start_time = time.time()
    intent_router = intent_router if isinstance(intent_router, IntentRouter) else _default_router
    llm_provider = llm_provider if isinstance(llm_provider, BaseLLMProvider) else get_llm_provider()
    report_engine = report_engine if isinstance(report_engine, ReportEngine) else get_report_engine()
    audit_logger = audit_logger if isinstance(audit_logger, AuditLogger) else get_audit_logger()

    user = resolve_mcp_user(request, db)
    allowed_tools = list_tools_for_user(user)
    allowed_tool_names = {t["name"] for t in allowed_tools}

    last_user_msg = next((m for m in reversed(req.messages) if m.role == "user"), None)
    user_query = last_user_msg.content.strip() if last_user_msg else ""
    attachments = last_user_msg.attachments if last_user_msg else []

    # ── 1. Intent Router Evaluation ──
    route_decision = intent_router.route(user_query)

    # Filter matched tools by user RBAC permissions
    valid_tools = []
    for t_spec in route_decision.matched_tools:
        t_name = t_spec.get("name")
        if t_name in allowed_tool_names:
            valid_tools.append(t_spec)

    # Fallback to get_inventory_summary if no tool permitted or matched
    if not valid_tools and "get_inventory_summary" in allowed_tool_names:
        valid_tools.append({"name": "get_inventory_summary", "args": {}})

    # ── 2. Streaming Response Branch (SSE) ──
    if req.stream:
        async def event_generator():
            # Initial SSE handshake
            yield "data: " + json.dumps({
                "type": "token",
                "content": ""
            }) + "\n\n"

            tool_outputs = []
            tokens_used = 0
            success = True

            # Execute MCP Tools
            for t_spec in valid_tools[:3]:
                t_name = t_spec["name"]
                t_args = t_spec.get("args", {})
                t_id = f"{t_name}_{int(time.time() * 1000)}"

                yield "data: " + json.dumps({
                    "type": "tool_call",
                    "id": t_id,
                    "name": t_name,
                    "args": t_args,
                    "status": "running"
                }) + "\n\n"

                await asyncio.sleep(0.15)

                try:
                    res_dict, _ = execute_tool(t_name, t_args, user, db)
                    is_err = res_dict.get("isError", False)
                    summary = "Selesai" if not is_err else "Akses Ditolak"
                    yield "data: " + json.dumps({
                        "type": "tool_result",
                        "id": t_id,
                        "status": "done" if not is_err else "error",
                        "summary": summary
                    }) + "\n\n"
                    tool_outputs.append((t_name, res_dict))
                except Exception as err:
                    yield "data: " + json.dumps({
                        "type": "tool_result",
                        "id": t_id,
                        "status": "error",
                        "summary": str(err)
                    }) + "\n\n"

            # ── 3. Assemble Response based on Route ──
            final_text = ""

            # ROUTE A: DIRECT MCP ROUTE (NO LLM, TOKEN_USED = 0)
            if route_decision.route == "mcp":
                tokens_used = 0

                # Sub-case: Report Export (Excel or PDF)
                if route_decision.is_export and tool_outputs:
                    t_name, raw_data = tool_outputs[0]
                    rep_res = report_engine.generate(
                        export_format=route_decision.export_format or "excel",
                        tool_name=t_name,
                        mcp_data=raw_data,
                        user=user
                    )
                    final_text = rep_res.markdown_summary

                # Sub-case: Standard Data Retrieval (Zero LLM)
                else:
                    reply_sections = []
                    if attachments:
                        reply_sections.append(f"Saya telah menerima {len(attachments)} file lampiran.")

                    if tool_outputs:
                        for t_name, res_dict in tool_outputs:
                            reply_sections.append(format_tool_result_markdown(t_name, res_dict, user))
                    else:
                        reply_sections.append("Data operasional siap diakses melalui PADI MCP Server.")

                    final_text = "\n\n".join(reply_sections)

            # ROUTE B: LLM ROUTE (BUSINESS REASONING)
            else:
                mcp_context_list = []
                for t_name, res_dict in tool_outputs:
                    res_content = res_dict.get("structuredContent") or res_dict.get("content") or res_dict
                    mcp_context_list.append({
                        "mcp_tool": t_name,
                        "data": trim_mcp_data_for_llm(res_content, user_query)
                    })

                system_prompt = f"""Anda adalah PADI AI Business Analyst, asisten analis kecerdasan bisnis dan operasional resmi untuk ERP PADI (distribusi pelumas/logistik).
Pengguna: {user.username} (Hak Akses / Role: {user.role})

PEDOMAN ANALISIS:
1. Berikan analisa bisnis yang tajam, rekomendasi tindakan nyata, atau proyeksi logis berdasarkan data MCP di atas.
2. JANGAN PERNAH menampilkan blok JSON mentah kepada pengguna.
3. Gunakan format Markdown yang terstruktur (tabel Markdown untuk perbandingan/angka penting, bullet points untuk poin strategi).
4. Jawab dalam Bahasa Indonesia yang profesional, ringkas, dan actionable.
5. Hormati batasan akses data Role: {user.role}."""

                llm_response = await llm_provider.generate_response(
                    system_prompt=system_prompt,
                    user_query=user_query,
                    mcp_context=mcp_context_list
                )
                final_text = llm_response.content
                tokens_used = llm_response.token_used
                success = llm_response.success

            # ── 4. Audit Logging ──
            duration_ms = (time.time() - start_time) * 1000
            primary_tool = valid_tools[0]["name"] if valid_tools else "none"
            audit_logger.log(
                user=f"{user.username} ({user.role})",
                intent=route_decision.intent,
                route=route_decision.route,
                tool=primary_tool,
                duration=duration_ms,
                token_used=tokens_used,
                success=success,
                extra_details={
                    "is_export": route_decision.is_export,
                    "reason": route_decision.reason
                }
            )

            # ── 5. Stream Words to Frontend ──
            words = final_text.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield "data: " + json.dumps({"type": "token", "content": chunk}) + "\n\n"
                await asyncio.sleep(0.012)

            yield "data: " + json.dumps({"type": "done"}) + "\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # ── 3. Non-Streaming Response Branch ──
    tool_results = []
    tool_outputs = []
    for t_spec in valid_tools[:3]:
        t_name = t_spec["name"]
        t_args = t_spec.get("args", {})
        res_dict, _ = execute_tool(t_name, t_args, user, db)
        tool_results.append({"name": t_name, "args": t_args, "result": res_dict})
        tool_outputs.append((t_name, res_dict))

    tokens_used = 0
    success = True
    content_text = ""

    if route_decision.route == "mcp":
        tokens_used = 0
        if route_decision.is_export and tool_outputs:
            t_name, raw_data = tool_outputs[0]
            rep_res = report_engine.generate(
                export_format=route_decision.export_format or "excel",
                tool_name=t_name,
                mcp_data=raw_data,
                user=user
            )
            content_text = rep_res.markdown_summary
        else:
            text_parts = [format_tool_result_markdown(t["name"], t["result"], user) for t in tool_results]
            content_text = "\n\n".join(text_parts) if text_parts else "Data diproses melalui PADI MCP Server."
    else:
        mcp_context_list = [{"mcp_tool": t["name"], "data": t["result"]} for t in tool_results]
        system_prompt = f"Anda adalah PADI AI Business Analyst untuk ERP PADI. Jawab: {user_query} secara profesional."
        llm_resp = await llm_provider.generate_response(system_prompt, user_query, mcp_context_list)
        content_text = llm_resp.content
        tokens_used = llm_resp.token_used
        success = llm_resp.success

    duration_ms = (time.time() - start_time) * 1000
    primary_tool = valid_tools[0]["name"] if valid_tools else "none"
    audit_logger.log(
        user=f"{user.username} ({user.role})",
        intent=route_decision.intent,
        route=route_decision.route,
        tool=primary_tool,
        duration=duration_ms,
        token_used=tokens_used,
        success=success
    )

    return {
        "role": "assistant",
        "content": content_text,
        "tool_calls": tool_results,
        "user_role": user.role,
        "route_info": {
            "route": route_decision.route,
            "intent": route_decision.intent,
            "token_used": tokens_used
        }
    }


# ─── Additional AI Architecture Endpoints ─────────────────────────────────────

@router.get("/reports/download/{filename}")
async def download_report_file(filename: str):
    """Serves generated Excel or PDF report files securely."""
    # Sanitize filename
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(REPORTS_DIR, clean_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File laporan tidak ditemukan.")

    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if clean_filename.endswith(".pdf"):
        media_type = "application/pdf"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=clean_filename
    )


@router.get("/stats")
async def get_ai_router_stats(audit_logger: AuditLogger = Depends(get_audit_logger)):
    """
    Returns live statistics on token savings and routing distributions.
    Confirms token reduction metrics.
    """
    return audit_logger.get_statistics()


@router.get("/audit-logs")
async def get_ai_audit_logs(
    limit: int = 50,
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """Returns recent audit logs."""
    return audit_logger.get_recent_entries(limit=limit)


@router.post("/route-check")
async def check_query_route(
    req: RouteCheckRequest,
    intent_router: IntentRouter = Depends(lambda: _default_router)
):
    """Diagnostics endpoint to inspect route determination for any query."""
    res = intent_router.route(req.message)
    return res.to_dict()
