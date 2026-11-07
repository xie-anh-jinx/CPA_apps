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
import base64
import asyncio
from typing import List, Dict, Any, Optional, Tuple
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
from app.services.cache_service import cache_service
from app.services.faq_cache import faq_cache
from app.services.document_service import document_service
from app.services.do_presentation_generator import do_presentation_generator
from app.models.analytics.models import UploadedDocument


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

    elif tool_name == "get_delivery_orders":
        orders = res.get("delivery_orders", []) if isinstance(res, dict) else (res if isinstance(res, list) else [])
        total_do = res.get("total_do_count", len(orders)) if isinstance(res, dict) else len(orders)
        total_vol = res.get("total_volume_liter", 0) if isinstance(res, dict) else 0
        date_f = res.get("date_filter", "Semua") if isinstance(res, dict) else "Semua"

        md.append(f"### 🚚 Monitoring Surat Jalan (Delivery Order / DO)")
        md.append(f"- **Periode / Tanggal:** `{date_f}`")
        md.append(f"- **Total Surat Jalan:** **{total_do:,} DO**")
        md.append(f"- **Total Volume Distribusi:** **{total_vol:,.1f} Liter** (Satuan: Liter)")
        if isinstance(res, dict) and res.get("status_summary"):
            st_text = ", ".join(f"**{k}:** {v}" for k, v in res["status_summary"].items())
            md.append(f"- **Komposisi Status:** {st_text}")

        if not orders:
            md.append("\nTidak ada data Surat Jalan yang ditemukan sesuai kriteria.")
        else:
            md.append("\n| No. DO | Tanggal | Customer / Penerima | Gudang | Sopir / Plat | Volume (Liter) | Status |")
            md.append("|---|---|---|---|---|---|---|")
            for it in orders[:25]:
                no_do = it.get("no_do", "-")
                tgl = it.get("tanggal", "-")
                cust = it.get("nama_customer") or it.get("penerima") or "-"
                gd = it.get("nama_gudang") or it.get("id_gudang", "-")
                drv = it.get("driver") or "-"
                pol = it.get("no_polisi") or ""
                driver_pol = f"{drv} ({pol})" if pol and pol != drv else drv
                vol = it.get("total_volume_liter", 0)
                st_lbl = it.get("status_label") or it.get("kode_status", "-")
                md.append(f"| `{no_do}` | {tgl} | {cust} | {gd} | {driver_pol} | **{vol:,.1f} L** | **{st_lbl}** |")
            if len(orders) > 25:
                md.append(f"\n*Menampilkan 25 dari total {total_do} Surat Jalan (DO).*")

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

    elif tool_name == "db_get_schema_overview":
        md.append("### 🗺️ Peta Arsitektur & Logika Database ERP PADI")
        domains = res.get("domains", {})
        if domains:
            md.append("\n#### 📦 Domain & Modul Bisnis ERP:")
            for d_name, d_val in domains.items():
                title = d_val.get("title", d_name)
                t_count = len(d_val.get("tables", {}))
                sample_tbls = ", ".join(list(d_val.get("tables", {}).keys())[:4])
                md.append(f"- **{title}** ({t_count} tabel): `{sample_tbls}`...")

        workflows = res.get("workflows", [])
        if workflows:
            md.append("\n#### 🔄 Alur Logika Relasi Data & Transaksi:")
            for wf in workflows:
                md.append(f"\n**{wf.get('flow_name')}:**")
                for st in wf.get("steps", []):
                    md.append(f"- {st}")

    elif tool_name == "db_list_tables":
        tables = res.get("tables", [])
        db_name = res.get("database", "PostgreSQL")
        total = res.get("total_tables_found", len(tables))
        md.append(f"### 🗄️ Daftar Tabel Database ({db_name})")
        md.append(f"Ditemukan **{total} tabel**. Berikut ringkasan tabel dan fungsi bisnisnya:\n")
        if not tables:
            md.append("Tidak ada tabel yang cocok dengan pencarian.")
        else:
            md.append("| Skema | Nama Tabel | Domain | Estimasi Baris | Keterangan & Fungsi Bisnis |")
            md.append("|---|---|---|---|---|")
            for t in tables[:25]:
                sch = t.get("schema", "public")
                tbl = t.get("table", "-")
                dom = t.get("domain", "-")
                rows = t.get("estimated_rows", 0)
                desc = t.get("business_meaning", "-")
                md.append(f"| `{sch}` | `{tbl}` | {dom} | {rows:,} baris | {desc} |")
            if len(tables) > 25:
                md.append(f"\n*Menampilkan 25 dari total {total} tabel. Tanyakan pada AI untuk melihat detail tabel tertentu.*")

    elif tool_name == "db_describe_table":
        tbl = res.get("table", "-")
        sch = res.get("schema", "public")
        db_label = res.get("database", "PostgreSQL")
        purpose = res.get("business_purpose", "-")
        cols = res.get("columns", [])
        samples = res.get("sample_rows", [])

        md.append(f"### 📋 Kamus Data & Struktur Tabel: `{sch}.{tbl}`")
        md.append(f"- **Database:** {db_label}")
        md.append(f"- **Fungsi Bisnis:** {purpose}")
        md.append(f"- **Total Kolom:** {len(cols)}")
        if res.get("primary_keys"):
            md.append(f"- **Primary Key:** `{', '.join(res.get('primary_keys', []))}`")

        if cols:
            md.append("\n#### 📑 Rincian Kolom & Terjemahan Bisnis:")
            md.append("| Nama Kolom | Tipe Data | Nullable | PK | Arti Bisnis & Penjelasan |")
            md.append("|---|---|---|---|---|")
            for c in cols:
                c_name = c.get("column", "-")
                dtype = c.get("data_type", "-")
                null_str = "Ya" if c.get("nullable") else "Tidak"
                pk_str = "🔑 PK" if c.get("is_primary_key") else "-"
                meaning = c.get("business_meaning", "-")
                desc = c.get("description", "")
                full_desc = f"**{meaning}**" + (f" — {desc}" if desc else "")
                md.append(f"| `{c_name}` | `{dtype}` | {null_str} | {pk_str} | {full_desc} |")

        if samples:
            md.append("\n#### 🔍 Sampel Data Real (3 Baris Pertama):")
            sample_keys = list(samples[0].keys())[:6]
            md.append("| " + " | ".join(sample_keys) + " |")
            md.append("| " + " | ".join(["---"] * len(sample_keys)) + " |")
            for s in samples:
                vals = [str(s.get(k, "-"))[:30] for k in sample_keys]
                md.append("| " + " | ".join(vals) + " |")

    elif tool_name == "db_execute_query":
        exec_ms = res.get("execution_time_ms", 0)
        ret_rows = res.get("returned_rows", 0)
        db_label = res.get("database", "PostgreSQL")
        cols = res.get("columns", [])
        rows = res.get("rows", [])

        md.append(f"### ⚡ Hasil Eksekusi Query Database ({db_label})")
        if res.get("status") == "error":
            md.append(f"> ⚠️ **Gagal:** {res.get('message')}")
        else:
            md.append(f"- **Status:** Sukses ({ret_rows} baris data, durasi: {exec_ms} ms)")
            if rows and cols:
                display_cols = cols[:8]
                md.append("\n| " + " | ".join(display_cols) + " |")
                md.append("| " + " | ".join(["---"] * len(display_cols)) + " |")
                for r in rows[:15]:
                    row_vals = [str(r.get(c, "-"))[:35] for c in display_cols]
                    md.append("| " + " | ".join(row_vals) + " |")
                if len(rows) > 15:
                    md.append(f"\n*Menampilkan 15 dari total {ret_rows} baris data.*")
            elif not rows:
                md.append("Query berhasil dieksekusi, tidak ada baris data yang cocok.")

    elif tool_name == "db_analyze_sql":
        atype = res.get("analysis_type", "SQL Analytics")
        data = res.get("data", [])
        md.append(f"### 📊 Hasil Analisis SQL: {atype}")
        if data:
            cols = list(data[0].keys())[:6]
            md.append("| " + " | ".join(cols) + " |")
            md.append("| " + " | ".join(["---"] * len(cols)) + " |")
            for r in data[:10]:
                row_vals = [str(r.get(c, "-"))[:35] for c in cols]
                md.append("| " + " | ".join(row_vals) + " |")

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


def trim_mcp_data_for_llm(data: Any, query: str, max_items: int = 35) -> Any:
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


def build_system_prompt(user: MCPUser, user_query: str) -> str:
    """Builds the comprehensive Database Intelligence & Translation prompt for DeepSeek."""
    return f"""Anda adalah PADI AI Business & Database Intelligence Analyst resmi untuk ERP PADI (distribusi pelumas/logistik).
Pengguna: {user.username} (Hak Akses / Role: {user.role})

PERAN & KEMAMPUAN UTAMA ANDA:
1. Akses Database & Logika Bisnis ERP:
   - Anda memiliki pemahaman menyeluruh terhadap arsitektur database operasional PostgreSQL (187 tabel) dan Analytics Mart.
   - Pahami relasi data & alur transaksi inti:
     • Order-to-Cash: Sales Order (`so`, `so_detail`) -> Surat Jalan/DO (`do_tbl`, `do_detail`, volume dalam Liter) -> Cross-link (`penjualando`) -> Faktur Penjualan (`penjualan`, `penjualan_detail`) -> Piutang Dagang (`acc_ar_faktur`).
     • Pengadaan: Permintaan Pembelian (`permintaan_pembelian`) -> Purchase Order (`po`, `po_detail`) -> Inbound Penerimaan (`penerimaan`, `penerimaan_detail`) -> Stok Gudang (`stok_barang`).
     • Siklus Persediaan: Master Barang (`barang`), Stok per Gudang (`stok_barang`), Gudang Master (`gudang`), Aturan Aging (Over-stock 150-239 hari, Deadstock >240 hari).
     • Pelanggan & CRM: Master Customer (`customer`), Kontak (`customer_kontak`), Titik Kirim (`customer_pengiriman`), Sektor Industri (`sektor`).
     • Keuangan & HRM: Jurnal Umum (`acc_gl_trans`), Kas/Bank (`acc_kas`), Karyawan/Salesman/Sopir (`pegawai`).

2. Penerjemah Database untuk Pengguna:
   - Tugas utama Anda adalah membantu pengguna memahami dan memudahkan pengguna membaca serta mengelola data.
   - Terjemahkan istilah teknis, nama kolom, dan kode status ke dalam bahasa bisnis Indonesia yang mudah dimengerti (contoh: 'hpp' = Modal/Harga Pokok Penjualan, 'is_lunas' = Status Pembayaran Lunas, 'no_do' = Nomor Surat Jalan, 'volume' = Kapasitas Muatan dalam Liter, 'id_sektor' = Sektor Industri Pembeli).
   - Saat pengguna menanyakan tentang tabel atau data, jelaskan fungsi tabel tersebut, apa saja kolom pentingnya, apa maknanya bagi operasional bisnis, dan berikan contoh sampel datanya.

3. Asistensi Query & Pengelolaan Data:
   - Jika pengguna ingin mencari atau memfilter data, bantu formulasikan query SQL SELECT read-only yang aman dan jelaskan hasilnya.
   - Analisa tren, perbandingan angka, dan berikan rekomendasi aksi konkret yang actionable.

4. Pahami Konteks Pertanyaan Pengguna & Respons Cerdas:
   - HINDARI jawaban kaku atau sekadar template MCP mentah. Jawablah secara kontekstual, cerdas, komunikatif, dan langsung menjawab apa yang ditanyakan (ChatGPT Style dengan grounding data MCP).
   - Jangan pernah menampilkan ringkasan stok/inventory jika pengguna menanyakan hal lain (seperti DO, invoice, customer, atau tabel database).
   - Untuk pertanyaan terkait Stok & Aging Persediaan:
     • Berikan ringkasan situasi stok secara keseluruhan atau per gudang yang ditanyakan (total SKU, total on-hand, total tersedia, dan valuasi).
     • Jika pengguna menanyakan stok gudang spesifik (misal: Makassar, Balikpapan, Bitung), jelaskan ringkasan gudang tersebut dan cantumkan tabel produk-produk utamanya.
     • Jika pengguna menanyakan aging / dead stock / masa simpan (misal > 2 tahun), soroti produk dengan umur terlama, gudang lokasi, tanggal masuk, umur dalam tahun/hari, dan volume stok sisa, serta berikan rekomendasi operasional singkat.
     • Sajikan data pendukung menggunakan tabel Markdown yang bersih dan terstruktur.
   - Untuk pertanyaan terkait Surat Jalan / Delivery Order (DO):
     • Tampilkan ringkasan metrik utama: total DO yang diterbitkan dan total volume distribusi dalam satuan Liter (ingat: satuan volume selalu dalam Liter, bukan QTY).
     • Uraikan rincian status pengiriman (misal: Selesai / Terkirim vs Dalam Perjalanan / Released).
     • Sajikan tabel daftar Surat Jalan yang rapi (No. DO, Customer / Penerima, Gudang Asal, Sopir & Plat Armada, Volume dalam Liter, dan Status).
     • Berikan highlight atau catatan operasional yang relevan bagi pengguna.

5. Format & Etika Respons:
   - JANGAN PERNAH menampilkan blok JSON mentah kepada pengguna.
   - Gunakan format Markdown yang terstruktur, rapi, dan mudah dibaca (gunakan tabel Markdown untuk data/kolom, bullet points untuk ringkasan).
   - Jawab dalam Bahasa Indonesia yang profesional, ramah, dan solutif.
   - Hormati batasan akses data Role: {user.role}.

6. Integritas Konteks Riwayat Chat & Fitur Unduh Dokumen:
   - Anda TERINTEGRASI dengan PADI Report Engine yang menghasilkan laporan dokumen PDF dan spreadsheet Excel (.xlsx) secara langsung di dalam chat.
   - Setiap kali laporan dibuat, sistem menyediakan link unduhan resmi berupa: `/api/v1/ai/reports/download/<nama_file>`.
   - Perhatikan dengan seksama riwayat percakapan sebelumnya. Jika pengguna menanyakan tentang cara mengunduh, link download, atau kelanjutan dari laporan/dokumen yang baru saja dibuat di pesan sebelumnya:
     • JANGAN PERNAH menyangkal atau mengatakan 'Saya tidak dapat meng-generate atau mengirim file PDF secara langsung melalui chat ini'.
     • Beritahukan bahwa tautan unduhan sudah tersedia pada pesan di atas, dan cantumkan kembali link unduhannya (contoh: `[Download PDF Laporan](/api/v1/ai/reports/download/nama_file.pdf)`).
     • Jelaskan bahwa pengguna cukup mengklik tautan tersebut untuk mengunduh dokumen langsung ke perangkat mereka.

7. Aturan Penggunaan Tool & Separasi Knowledge Transformation vs Data Acquisition:
   - Gunakan data tool HANYA jika pengguna meminta data baru/terkini (Need Data = YES), seperti: cek stok terbaru, lihat transaksi/invoice, ambil data dari database.
   - DILARANG menggunakan tool atau mengulang laporan data lama jika pengguna meminta Knowledge Transformation (Need Data = NO).
   - Jika pengguna melampirkan file atau meminta transformasi, jadikan file unggahan tersebut sebagai Sumber Utama (Source Binding: Highest Priority 100), dan ABAIKAN data lama dari riwayat percakapan sebelumnya.

8. Supply Chain Management (SCM) & Analisis Operasional Dinamis:
   - JANGAN PERNAH menggunakan template atau data mockup statis SCM lama (seperti tanggal buatan '1 Oktober 2026', atau tabel KPI Apr-26 s/d Sep-26 palsu).
   - Seluruh analisa Supply Chain Management (SOH, Runrate, Deadstock Ratio, OTIF, dan Outbound) HARUS digenerate secara dinamis dan analitis oleh Anda berdasarkan data aktual terkini dari MCP.

9. Visualisasi Grafik Interaktif C3.js (PILIHAN UTAMA):
   - KETIKA menyajikan analisa komparasi, rasio persediaan, proporsi stok, tren metrik, atau perbandingan antar gudang/wilayah:
   - GUNAKAN C3.js chart sebagai PILIHAN UTAMA untuk visualisasi grafik dengan menuliskannya di dalam blok kode ```c3 ... ``` berisi JSON konfigurasi standar C3.js.
   - Frontend akan secara otomatis merender blok ```c3``` tersebut menjadi grafik interaktif C3.js yang elegan dan interaktif langsung di dalam chat.
   - Contoh format JSON C3.js yang didukung:
     • Donut Chart (misal rasio stok Good Stock vs Over Stock vs Dead Stock):
       ```c3
       {{
         "data": {{
           "columns": [
             ["Good Stock (<150 hr)", 2136127],
             ["Over Stock (150-239 hr)", 194768],
             ["Dead Stock (≥240 hr)", 415561]
           ],
           "type": "donut",
           "colors": {{
             "Good Stock (<150 hr)": "#10b981",
             "Over Stock (150-239 hr)": "#f59e0b",
             "Dead Stock (≥240 hr)": "#ef4444"
           }}
         }},
         "donut": {{
           "title": "Kategori Stok"
         }}
       }}
       ```
     • Bar Chart (misal perbandingan volume stok antar gudang/area):
       ```c3
       {{
         "data": {{
           "columns": [
             ["Volume Stok", 146042, 115577, 80883, 73359]
           ],
           "type": "bar",
           "colors": {{
             "Volume Stok": "#3b82f6"
           }}
         }},
         "axis": {{
           "x": {{
             "type": "category",
             "categories": ["Makassar", "KIMU JKT", "Sampit", "Bitung"]
           }}
         }}
       }}
       ```
     • Spline / Line Chart (misal tren waktu atau pencapaian OTIF):
       ```c3
       {{
         "data": {{
           "columns": [
             ["OTIF (%)", 96.5, 97.2, 98.1, 98.8],
             ["Target Min (%)", 95.0, 95.0, 95.0, 95.0]
           ],
           "types": {{
             "OTIF (%)": "spline",
             "Target Min (%)": "line"
           }},
           "colors": {{
             "OTIF (%)": "#8b5cf6",
             "Target Min (%)": "#10b981"
           }}
         }},
         "axis": {{
           "x": {{
             "type": "category",
             "categories": ["Q1", "Q2", "Q3", "Q4"]
           }}
         }}
       }}
       ```
   - Pastikan JSON di dalam blok ```c3``` selalu valid dan sertakan penjelasan naratif serta tabel ringkasan sebelum atau sesudah grafik."""


def _summarize_assistant_turn(content: str) -> str:
    """Summarizes a lengthy assistant turn into a concise 1-2 sentence recap without raw tables or dumps."""
    if not content:
        return ""
    # Strip code blocks
    cleaned = re.sub(r'```[\s\S]*?```', '', content)
    # Strip any lines containing table pipes (|)
    cleaned = re.sub(r'(?m)^.*\|.*$\n?', '', cleaned)
    # Remove any stray pipe characters
    cleaned = cleaned.replace('|', '')
    # Strip excessive newlines and whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    # Extract first 2 sentences
    sentences = re.split(r'(?<=[.!?])\s+', cleaned)
    short_summary = " ".join([s.strip() for s in sentences if s.strip()][:2]).strip()
    if len(short_summary) > 250:
        short_summary = short_summary[:247] + "..."
    return f"[Ringkasan Asisten Sebelumnya: {short_summary}]" if short_summary else ""


def compact_conversation_history(
    messages: list,
    allow_previous_context: bool = True,
    max_turns: int = 4
) -> list:
    """
    Context Prioritizer & History Compactor:
    - If allow_previous_context is False (e.g. uploaded file active or source binding locked),
      drops all previous assistant turns to prevent old 7000-token SCM reports from repeating.
    - If allow_previous_context is True:
      - Assistant messages are stripped of raw Markdown tables and large data dumps,
        keeping only a concise 1-2 sentence summary (< 250 chars).
      - Drops redundant turns beyond max_turns.
    - Context Priority Hierarchy:
      Current Upload: Priority 100
      Current Question: Priority 90
      Current MCP Result: Priority 80 (Only if Need Data = YES)
      History Summary: Priority 20
    """
    if not messages:
        return []

    prior_messages = messages[:-1]
    if not prior_messages:
        return []

    if not allow_previous_context:
        # Strictly exclude past assistant dumps when new source is bound
        return []

    compacted = []
    # Take at most max_turns from recent history
    for msg in prior_messages[-max_turns:]:
        role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else "")
        text = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "")

        if role == "user":
            user_text = text.strip()
            if len(user_text) > 400:
                user_text = user_text[:397] + "..."
            compacted.append({"role": "user", "content": user_text})
        elif role == "assistant":
            assistant_summary = _summarize_assistant_turn(text)
            if assistant_summary:
                compacted.append({"role": "assistant", "content": assistant_summary})

    return compacted


def extract_recent_download_link(messages: List[Any]) -> Optional[Tuple[str, str]]:
    """Extracts (filename, download_url) from recent assistant messages if available."""
    if not messages:
        return None
    for msg in reversed(messages):
        role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else "")
        if role == "assistant":
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "")
            match = re.search(r"\[([a-zA-Z0-9_\-\.]+\.(pdf|xlsx|html))\]\((/api/v1/ai/reports/download/[^\)]+)\)", content)
            if match:
                return match.group(1), match.group(3)
    return None


def execute_tool_with_cache(
    t_name: str,
    t_args: Dict[str, Any],
    user: MCPUser,
    db: Session,
) -> Tuple[Dict[str, Any], bool]:
    """
    Executes an MCP tool with Layer 2 Redis Query Caching.
    Returns (result_dict, from_cache).
    """
    cached = cache_service.get_query_cache(t_name, t_args, role=user.role)
    if cached is not None:
        return cached, True

    res_dict, _ = execute_tool(t_name, t_args, user, db)
    if not res_dict.get("isError"):
        cache_service.set_query_cache(t_name, t_args, res_dict, role=user.role)
    return res_dict, False


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
    Main chat endpoint orchestrated by the PADI AI Cost-Reduction Multi-Layer Architecture:
    - Layer 1: Intent Classifier (mcp / llm / faq)
    - Layer 2: Query Cache (Redis)
    - Layer 3: FAQ Cache (0 DB, 0 LLM)
    - Layer 4: SQL Fast Path (Direct Markdown, Token = 0)
    - Layer 5: DeepSeek LLM (Analytic reasoning only)
    - Layer 6: Response Cache (Redis, TTL 10m)
    - Layer 7: DeepSeek KV Context Caching
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

    # ── Document Upload & RAG Pipeline (PDF & Excel Cost Reduction) ──
    processed_doc = None
    if attachments:
        for att in attachments:
            if getattr(att, "dataUrl", None):
                try:
                    data_url = att.dataUrl
                    if "," in data_url:
                        _, b64data = data_url.split(",", 1)
                    else:
                        b64data = data_url
                    raw_bytes = base64.b64decode(b64data)
                    processed_doc = document_service.process_file_bytes(
                        file_bytes=raw_bytes,
                        filename=att.name,
                        db=db
                    )
                    break
                except Exception as e:
                    pass

    # If no new attachment, check if context has active document_id
    if not processed_doc and req.context and req.context.get("document_id"):
        ctx_doc_id = req.context.get("document_id")
        db_doc = db.query(UploadedDocument).filter(UploadedDocument.id == ctx_doc_id).first()
        if db_doc:
            processed_doc = {
                "document_id": db_doc.id,
                "file_hash": db_doc.file_hash,
                "filename": db_doc.filename,
                "file_type": db_doc.file_type,
                "page_count": db_doc.page_count,
                "sheet_count": db_doc.sheet_count,
                "summary": db_doc.summary,
                "is_cached": True
            }

    # If an uploaded document is active, process via Document RAG:
    if processed_doc:
        doc_id = processed_doc["document_id"]
        filename = processed_doc["filename"]
        file_type = processed_doc["file_type"]
        summary = processed_doc["summary"]
        clean_q = user_query.lower()

        # Branch A: Summary Cache Hit & Delivery Order Recap Presentation
        is_recap_query = any(k in clean_q for k in [
            "recap", "rekap", "rekapitulasi", "presentasi", "slide", "deck",
            "format", "formatnya", "template", "seperti ini", "sample",
            "laporan do", "delivery order", "kinerja pengiriman", "do", "laporan"
        ])
        is_summary_query = (
            not clean_q or
            is_recap_query or
            any(k in clean_q for k in ["ringkas", "summary", "rangkum", "apa isi", "jelaskan dokumen", "ikhtisar", "overview", "baca file"])
        )

        # Jika dokumen adalah Excel Delivery Order atau pengguna meminta recap dari Excel yang diupload
        if file_type == "excel":
            meta = processed_doc.get("metadata") or {}
            is_do_doc = meta.get("is_do_report") or "presentasi interaktif" in summary.lower() or "delivery order" in summary.lower()

            # Jika belum di-generate atau perlu dihitung ulang dari file bytes
            if (is_recap_query or is_summary_query or is_do_doc) and not is_do_doc:
                try:
                    df_check = None
                    file_save_path = meta.get("file_save_path")
                    if file_save_path and os.path.exists(file_save_path):
                        with open(file_save_path, "rb") as fs:
                            df_check = do_presentation_generator.parse_dataframe(fs.read(), filename)
                    elif 'raw_bytes' in locals() and raw_bytes:
                        df_check = do_presentation_generator.parse_dataframe(raw_bytes, filename)

                    if df_check is not None and do_presentation_generator.is_delivery_order_file(df_check, filename):
                        metrics = do_presentation_generator.analyze_dataset(df_check, filename)
                        html_fn, html_fp, html_url = do_presentation_generator.generate_html_deck(
                            metrics, output_filename=f"padi_presentasi_do_{doc_id[:10]}_{int(time.time())}.html"
                        )
                        summary = do_presentation_generator.generate_chat_markdown_reply(
                            metrics, html_fn, html_url, user=user
                        )
                        is_do_doc = True
                except Exception as ex_do:
                    logger.warning(f"On-the-fly DO Presentation generation fallback: {ex_do}")

            if is_do_doc and (is_recap_query or is_summary_query):
                final_text = summary
                duration_ms = (time.time() - start_time) * 1000
                audit_logger.log(
                    user=f"{user.username} ({user.role})",
                    intent="do_presentation_recap",
                    route="mcp",
                    tool="do_presentation_generator",
                    duration=duration_ms,
                    token_used=0,
                    success=True,
                    extra_details={"document_id": doc_id, "filename": filename}
                )
                if req.stream:
                    async def do_recap_stream():
                        yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                        for word in final_text.split(" "):
                            yield "data: " + json.dumps({"type": "token", "content": word + " "}) + "\n\n"
                            await asyncio.sleep(0.01)
                        yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                        yield "data: [DONE]\n\n"

                    return StreamingResponse(
                        do_recap_stream(),
                        media_type="text/event-stream",
                        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                    )
                else:
                    return {
                        "role": "assistant",
                        "content": final_text,
                        "tool_calls": [],
                        "user_role": user.role,
                        "route_info": {"route": "mcp", "intent": "do_presentation_recap", "token_used": 0, "document_id": doc_id}
                    }

        if is_summary_query:
            final_text = summary
            duration_ms = (time.time() - start_time) * 1000
            audit_logger.log(
                user=f"{user.username} ({user.role})",
                intent="document_summary",
                route="cache",
                tool="summary_cache",
                duration=duration_ms,
                token_used=0,
                success=True,
                extra_details={"document_id": doc_id, "filename": filename}
            )
            if req.stream:
                async def doc_summary_stream():
                    yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                    for word in final_text.split(" "):
                        yield "data: " + json.dumps({"type": "token", "content": word + " "}) + "\n\n"
                        await asyncio.sleep(0.01)
                    yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                    yield "data: [DONE]\n\n"

                return StreamingResponse(
                    doc_summary_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                )
            else:
                return {
                    "role": "assistant",
                    "content": final_text,
                    "tool_calls": [],
                    "user_role": user.role,
                    "route_info": {"route": "cache", "intent": "document_summary", "token_used": 0, "document_id": doc_id}
                }

        # Branch B: Excel Structured Aggregation (Recommendation 6 & 8)
        if file_type == "excel":
            structured_calc = document_service.query_excel_structure(doc_id, user_query, db)
            if structured_calc:
                final_text = structured_calc
                duration_ms = (time.time() - start_time) * 1000
                audit_logger.log(
                    user=f"{user.username} ({user.role})",
                    intent="excel_aggregation",
                    route="mcp",
                    tool="excel_structure",
                    duration=duration_ms,
                    token_used=0,
                    success=True,
                    extra_details={"document_id": doc_id, "filename": filename}
                )
                if req.stream:
                    async def doc_calc_stream():
                        yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                        for word in final_text.split(" "):
                            yield "data: " + json.dumps({"type": "token", "content": word + " "}) + "\n\n"
                            await asyncio.sleep(0.01)
                        yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                        yield "data: [DONE]\n\n"

                    return StreamingResponse(
                        doc_calc_stream(),
                        media_type="text/event-stream",
                        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                    )
                else:
                    return {
                        "role": "assistant",
                        "content": final_text,
                        "tool_calls": [],
                        "user_role": user.role,
                        "route_info": {"route": "mcp", "intent": "excel_aggregation", "token_used": 0, "document_id": doc_id}
                    }

        # Branch C: Targeted PDF RAG (Recommendation 2 & 3: Top 3 Chunks Only)
        top_chunks = document_service.retrieve_top_chunks(doc_id, user_query, db, top_k=3)
        if top_chunks:
            rag_context_parts = []
            for ch in top_chunks:
                rag_context_parts.append(
                    f"--- [Halaman {ch['page_number']} | Bagian: {ch['title']}] ---\n{ch['content']}"
                )
            rag_combined_context = "\n\n".join(rag_context_parts)

            doc_system_prompt = f"""Anda adalah PADI AI Business & Document Intelligence Analyst resmi untuk ERP PADI.
Pengguna: {user.username} (Role: {user.role})
Dokumen Terlampir: {filename} ({processed_doc.get('page_count') or processed_doc.get('sheet_count', 1)} {'halaman' if file_type == 'pdf' else 'sheet'})

PETUNJUK ANALISIS & PEMBUATAN LAPORAN:
1. Anda menerima potongan dan data dari berkas yang diunggah pengguna.
2. Jawab pertanyaan dan penuhi instruksi pengguna secara lengkap dan profesional.
3. Jika pengguna meminta laporan / chart / tabel:
   - Buatkan Ringkasan Eksekutif (Total record, metrik penting, temuan utama).
   - Buatkan Tabel Analisis terstruktur menggunakan Markdown table.
   - Buatkan visualisasi data berupa tabel perbandingan tren / distribusi / proporsi kategori.
   - Cantumkan rekomendasi dan kesimpulan operasional yang actionable.
4. Gunakan Bahasa Indonesia profesional, komunikatif, dan format Markdown yang rapi."""

            mcp_rag_context = [{
                "mcp_tool": "document_rag_retrieval",
                "data": {
                    "document_id": doc_id,
                    "filename": filename,
                    "matched_chunks": len(top_chunks),
                    "context_text": rag_combined_context
                }
            }]

            try:
                rag_history = [{"role": m.role, "content": m.content} for m in req.messages[:-1]] if req.messages else []
                llm_response = await llm_provider.generate_response(
                    system_prompt=doc_system_prompt,
                    user_query=user_query,
                    mcp_context=mcp_rag_context,
                    conversation_history=rag_history
                )
                if llm_response.success and llm_response.content:
                    final_text = llm_response.content
                    final_text += f"\n\n*📑 Dokumen Acuan: `{filename}`*"
                    tokens_used = llm_response.token_used

                    # If user requested a PDF report, auto-generate PDF and provide download link
                    if any(w in clean_q for w in ["pdf", "download", "unduh"]) and file_type == "excel":
                        try:
                            doc_tbl = db.query(DocumentExcelTable).filter(DocumentExcelTable.document_id == doc_id).first()
                            if doc_tbl and doc_tbl.column_names and doc_tbl.sample_rows:
                                headers = doc_tbl.column_names[:10]
                                rows = [[r.get(c, "-") for c in headers] for r in doc_tbl.sample_rows]
                                rep_res = report_engine.generate_pdf(
                                    tool_name="uploaded_excel",
                                    mcp_data={"headers": headers, "rows": rows},
                                    user=user,
                                    custom_title=f"Laporan {filename}"
                                )
                                if rep_res and rep_res.success:
                                    final_text += (
                                        f"\n\n---\n"
                                        f"### 📥 Unduh Dokumen Laporan Resmi\n"
                                        f"Laporan PDF telah berhasil digenerate berdasarkan data `{filename}`.\n\n"
                                        f"👉 **[{rep_res.filename}]({rep_res.download_url})** *(Klik untuk mengunduh laporan PDF)*\n"
                                    )
                        except Exception as pdf_err:
                            logger.warning(f"Auto-generate PDF for excel failed: {pdf_err}")
                else:
                    raise ValueError(llm_response.error_message or "DeepSeek returned empty")
            except Exception as e:
                final_text = f"### 📑 Hasil Pembacaan Dokumen `{filename}`:\n\n" + rag_combined_context
                tokens_used = 0

            duration_ms = (time.time() - start_time) * 1000
            audit_logger.log(
                user=f"{user.username} ({user.role})",
                intent="document_rag_query",
                route="llm",
                tool="document_rag",
                duration=duration_ms,
                token_used=tokens_used,
                success=True,
                extra_details={"document_id": doc_id, "chunks_used": len(top_chunks)}
            )

            if req.stream:
                async def doc_rag_stream():
                    yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                    for word in final_text.split(" "):
                        yield "data: " + json.dumps({"type": "token", "content": word + " "}) + "\n\n"
                        await asyncio.sleep(0.012)
                    yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                    yield "data: [DONE]\n\n"

                return StreamingResponse(
                    doc_rag_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                )
            else:
                return {
                    "role": "assistant",
                    "content": final_text,
                    "tool_calls": [],
                    "user_role": user.role,
                    "route_info": {
                        "route": "llm",
                        "intent": "document_rag_query",
                        "token_used": tokens_used,
                        "document_id": doc_id,
                        "chunks_used": len(top_chunks)
                    }
                }

    # ── Layer 1: Intent Classifier Evaluation (With Conversational History Context) ──
    has_attachment = bool(processed_doc or attachments)
    route_decision = intent_router.route(user_query, messages=req.messages, has_attachment=has_attachment)

    # ── Context Prioritizer: Upload Context Block (Priority 100 — Highest) ──
    upload_context_block = ""
    if processed_doc:
        p_name = processed_doc.get("filename", "file_lampiran")
        p_type = processed_doc.get("file_type", "dokumen")
        p_raw = processed_doc.get("raw_text") or (processed_doc.get("metadata") or {}).get("raw_text") or ""
        if not p_raw and processed_doc.get("document_id"):
            ch = db.query(DocumentChunk).filter(DocumentChunk.document_id == processed_doc["document_id"]).first()
            if ch and ch.content:
                p_raw = ch.content

        upload_context_block = (
            f"\n\n======================================================\n"
            f"🎯 [CURRENT SOURCE BINDING — PRIORITY 100: HIGHEST]\n"
            f"Nama Berkas Terlampir: {p_name} (Format: {p_type.upper()})\n"
            f"Instruksi Pengikatan Sumber (Source Binding):\n"
            f"- Gunakan HANYA file/kode/dokumen ini sebagai acuan utama.\n"
            f"- Sesuaikan output, tata letak, dan konten persis dengan file ini.\n"
            f"- ABAIKAN seluruh riwayat dan laporan lama sebelumnya.\n"
            f"------------------------------------------------------\n"
            f"KONTEN / STRUKTUR BERKAS:\n"
            f"{p_raw[:25000] if p_raw else processed_doc.get('summary', '')}\n"
            f"======================================================\n"
        )

    # ── Contextual Fast Path: Download Guide & File Path for Recently Produced Report ──
    recent_download = extract_recent_download_link(req.messages)
    is_download_inquiry = bool(re.search(
        r"\b(bagaimana\s+cara|cara\s+download|cara\s+unduh|link\s+download|mana\s+link|link\s+unduh|download\s+pdfnya|unduh\s+pdfnya|cara\s+buka|dimana\s+download|dimana\s+saya\s+bisa|pathnya\s+dimana|pathnya|lokasi\s+file|lokasi\s+path|path\s+file|simpan\s+dimana|tersimpan\s+dimana|bisa\s+download)\b",
        user_query,
        re.IGNORECASE
    )) or bool(re.search(
        r"\b(download|unduh|link|path|lokasi)\b",
        user_query,
        re.IGNORECASE
    ) and any(k in user_query.lower() for k in ["pdf", "file", "laporan", "dokumen", "excel", "dimana", "mana"]))

    if recent_download and is_download_inquiry:
        fname, durl = recent_download
        physical_server_path = os.path.join(REPORTS_DIR, fname)
        final_text = (
            f"### 📥 Akses & Unduh File Laporan\n\n"
            f"File laporan **`{fname}`** telah berhasil diproduksi dan tersedia melalui 2 cara akses:\n\n"
            f"#### 1️⃣ Unduh Langsung via Browser (Klik Link):\n"
            f"🔗 **[Download {fname}]({durl})**\n\n"
            f"*(Klik link tombol biru di atas, file akan langsung otomatis tersimpan ke folder Downloads pada perangkat Anda)*\n\n"
            f"#### 2️⃣ Lokasi Path File Fisik di Server:\n"
            f"- **Host / Server Local Path:**\n"
            f"  `{physical_server_path}`\n"
            f"- **Container Path (Docker):**\n"
            f"  `/app/app/static/reports/{fname}`\n"
            f"- **URL Endpoint API:**\n"
            f"  `{durl}`\n\n"
            f"Anda dapat menyalin file secara langsung dari server atau membuka tautan unduh di browser."
        )
        duration_ms = (time.time() - start_time) * 1000
        audit_logger.log(
            user=f"{user.username} ({user.role})",
            intent="download_guide",
            route="fastpath",
            tool="report_engine_link",
            duration=duration_ms,
            token_used=0,
            success=True,
            extra_details={"filename": fname, "url": durl}
        )
        if req.stream:
            async def download_guide_stream():
                yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                words = final_text.split(" ")
                for i, word in enumerate(words):
                    chunk = word + (" " if i < len(words) - 1 else "")
                    yield "data: " + json.dumps({"type": "token", "content": chunk}) + "\n\n"
                    await asyncio.sleep(0.01)
                yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(
                download_guide_stream(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
            )
        else:
            return {
                "role": "assistant",
                "content": final_text,
                "tool_calls": [],
                "user_role": user.role,
                "route_info": {"route": "fastpath", "intent": "download_guide", "token_used": 0, "cache_hit": True}
            }

    # ── Layer 3: FAQ Cache & Direct Clarification Early Exit (0 DB Queries, 0 LLM Tokens) ──
    if route_decision.route in ["faq", "clarification"]:
        faq_info = route_decision.faq_data or faq_cache.lookup(user_query)
        final_text = ""
        if faq_info and isinstance(faq_info, dict):
            final_text = faq_info.get("content") or faq_info.get("answer") or faq_info.get("title", "")
        if final_text:
            duration_ms = (time.time() - start_time) * 1000
            audit_logger.log(
                user=f"{user.username} ({user.role})",
                intent=route_decision.intent,
                route=route_decision.route,
                tool="faq_or_clarify",
                duration=duration_ms,
                token_used=0,
                success=True,
                extra_details={"faq_id": faq_info.get("faq_id") if isinstance(faq_info, dict) else None}
            )
            if req.stream:
                async def faq_stream():
                    yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                    words = final_text.split(" ")
                    for i, word in enumerate(words):
                        chunk = word + (" " if i < len(words) - 1 else "")
                        yield "data: " + json.dumps({"type": "token", "content": chunk}) + "\n\n"
                        await asyncio.sleep(0.01)
                    yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                    yield "data: [DONE]\n\n"

                return StreamingResponse(
                    faq_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                )
            else:
                return {
                    "role": "assistant",
                    "content": final_text,
                    "tool_calls": [],
                    "user_role": user.role,
                    "route_info": {"route": route_decision.route, "intent": route_decision.intent, "token_used": 0}
                }

    # ── Layer 6: Response Cache Early Exit (Identical Analytical Questions, 0 LLM Tokens) ──
    if route_decision.requires_llm:
        cached_llm = cache_service.get_llm_response(user_query, role=user.role)
        if cached_llm:
            cached_content = cached_llm.get("content", "")
            final_text = cached_content
            duration_ms = (time.time() - start_time) * 1000
            audit_logger.log(
                user=f"{user.username} ({user.role})",
                intent=route_decision.intent,
                route="cache",
                tool="response_cache",
                duration=duration_ms,
                token_used=0,
                success=True,
                extra_details={"source": "llm_response_cache"}
            )
            if req.stream:
                async def cache_stream():
                    yield "data: " + json.dumps({"type": "token", "content": ""}) + "\n\n"
                    words = final_text.split(" ")
                    for i, word in enumerate(words):
                        chunk = word + (" " if i < len(words) - 1 else "")
                        yield "data: " + json.dumps({"type": "token", "content": chunk}) + "\n\n"
                        await asyncio.sleep(0.01)
                    yield "data: " + json.dumps({"type": "done"}) + "\n\n"
                    yield "data: [DONE]\n\n"

                return StreamingResponse(
                    cache_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
                )
            else:
                return {
                    "role": "assistant",
                    "content": final_text,
                    "tool_calls": [],
                    "user_role": user.role,
                    "route_info": {"route": "cache", "intent": route_decision.intent, "token_used": 0, "cache_hit": True}
                }

    # Filter matched tools by user RBAC permissions & Tool Lock (Need Data Detector)
    valid_tools = []
    if not route_decision.tool_lock and route_decision.need_data:
        for t_spec in route_decision.matched_tools:
            t_name = t_spec.get("name")
            if t_name in allowed_tool_names:
                valid_tools.append(t_spec)

    # ── Streaming Response Branch (SSE) ──
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

            # Execute MCP Tools with Layer 2 Redis Query Caching
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

                await asyncio.sleep(0.08)

                try:
                    res_dict, from_cache = execute_tool_with_cache(t_name, t_args, user, db)
                    is_err = res_dict.get("isError", False)
                    summary = "Selesai (Redis Cache Hit)" if from_cache else ("Selesai" if not is_err else "Akses Ditolak")
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

            # ── Assemble Response based on Route & Requirement ──
            final_text = ""

            # Sub-case 0: Knowledge Transformation (HTML, PowerPoint, Layout, Upload Binding — Need Data: NO, Tool Lock: ON)
            if route_decision.route == "transform" or route_decision.action_type == "transform":
                pres_str = ", ".join(getattr(route_decision, "presentation", [])) or "HTML & Tata Letak Responsif"
                transform_system_prompt = (
                    build_system_prompt(user, user_query) +
                    f"\n\n[PADI KNOWLEDGE TRANSFORMATION WORKFLOW]\n"
                    f"Mode: Transformasi Pengetahuan & Presentasi (Need Data: NO, Tool Lock: ON).\n"
                    f"Gaya / Format Penyajian: {pres_str}.\n"
                    f"Instruksi Khusus untuk Chief Intelligence Advisor PADI:\n"
                    f"1. Anda sedang melakukan transformasi format/tampilan data yang sudah ada, BUKAN mengambil data backend baru.\n"
                    f"2. Prioritaskan dan ikuti struktur dari berkas/lampiran aktif (Source Binding: Priority 100).\n"
                    f"3. Jika pengguna meminta kode HTML/CSS atau mockup, sajikan kode yang lengkap, semantik, responsif, dan berestetika modern kelas dunia (dark/light clean palette, card grid, interactive feel).\n"
                    f"4. DILARANG memanggil tool MCP atau menampilkan laporan mentah berulang.\n"
                )
                if upload_context_block:
                    transform_system_prompt += upload_context_block

                history_payload = compact_conversation_history(
                    req.messages,
                    allow_previous_context=route_decision.allow_previous_context
                )
                try:
                    llm_response = await llm_provider.generate_response(
                        system_prompt=transform_system_prompt,
                        user_query=user_query,
                        mcp_context=[],
                        conversation_history=history_payload
                    )
                    if llm_response.success and llm_response.content:
                        final_text = llm_response.content
                        tokens_used = llm_response.token_used
                        success = True
                    else:
                        raise ValueError(llm_response.error_message or "DeepSeek returned empty response")
                except Exception as llm_err:
                    final_text = f"Terjadi kendala saat melakukan transformasi tampilan: {str(llm_err)}"
                    tokens_used = 0

            # Sub-case 1: Hybrid Pipeline (MCP Data -> DeepSeek LLM Analysis -> Report Engine with Visuals)
            elif (route_decision.route == "hybrid" or (route_decision.is_export and route_decision.requires_llm)) and tool_outputs:
                t_name, raw_data = tool_outputs[0]
                mcp_context_list = []
                for t_n, res_dict in tool_outputs:
                    res_content = res_dict.get("structuredContent") or res_dict.get("content") or res_dict
                    mcp_context_list.append({
                        "mcp_tool": t_n,
                        "data": trim_mcp_data_for_llm(res_content, user_query)
                    })

                pres_str = ", ".join(getattr(route_decision, "presentation", [])) or "table, visual chart & executive analysis"
                hybrid_system_prompt = (
                    build_system_prompt(user, user_query) +
                    f"\n\n[PADI HYBRID EXECUTIVE WORKFLOW]\n"
                    f"Pengguna meminta laporan dan analisis eksekutif dengan preferensi visual/penyajian: {pres_str}.\n"
                    f"Instruksi Khusus untuk Chief Intelligence Advisor PADI:\n"
                    f"1. Sajikan Executive Summary berbobot dan berbasis data aktual di atas.\n"
                    f"2. Gunakan format Markdown yang rapi dengan tabel ringkas, metrik kunci, dan perbandingan antar area/gudang.\n"
                    f"3. Uraikan interpretasi visual chart (proporsi Good Stock vs Dead Stock, trend runrate, OTIF) dengan metode penyajian yang memudahkan pembacaan data bagi jajaran direksi.\n"
                    f"4. Berikan Rekomendasi Strategis konkret (langkah mitigasi dead stock, penataan buffer stock, percepatan distribusi) yang dapat segera diimplementasikan."
                )

                if upload_context_block:
                    hybrid_system_prompt += upload_context_block
                history_payload = compact_conversation_history(
                    req.messages,
                    allow_previous_context=route_decision.allow_previous_context
                )
                llm_analysis_text = ""
                try:
                    llm_response = await llm_provider.generate_response(
                        system_prompt=hybrid_system_prompt,
                        user_query=user_query,
                        mcp_context=mcp_context_list,
                        conversation_history=history_payload
                    )
                    if llm_response.success and llm_response.content:
                        llm_analysis_text = llm_response.content
                        tokens_used = llm_response.token_used
                        success = True
                except Exception as llm_err:
                    logger.error(f"Hybrid LLM analysis error: {llm_err}")
                    llm_analysis_text = "Evaluasi Analitis: Tinjauan persediaan menunjukkan perlunya mitigasi dead stock dan penyesuaian runrate pada wilayah operasional terkait."

                try:
                    rep_res = report_engine.generate(
                        export_format=route_decision.export_format or "pdf",
                        tool_name=t_name,
                        mcp_data=raw_data,
                        user=user,
                        executive_analysis=llm_analysis_text
                    )
                    final_text = (
                        f"{rep_res.markdown_summary}\n\n"
                        f"---\n\n"
                        f"### 📊 Analisis Eksekutif & Tinjauan Strategis AI\n\n"
                        f"{llm_analysis_text}"
                    )
                except Exception as rep_err:
                    logger.error(f"Report engine generation error: {rep_err}")
                    final_text = (
                        f"⚠️ Gagal menghasilkan file laporan fisik ({rep_err}), namun berikut analisis data langsung:\n\n"
                        f"{llm_analysis_text}"
                    )

            # Sub-case 2: Pure Report Export (Excel or PDF without LLM, 0 Token)
            elif route_decision.is_export and tool_outputs:
                tokens_used = 0
                t_name, raw_data = tool_outputs[0]
                try:
                    rep_res = report_engine.generate(
                        export_format=route_decision.export_format or "excel",
                        tool_name=t_name,
                        mcp_data=raw_data,
                        user=user
                    )
                    final_text = rep_res.markdown_summary
                except Exception as rep_err:
                    logger.error(f"Pure report export error: {rep_err}")
                    final_text = f"⚠️ Terjadi kendala saat mengekspor laporan: {rep_err}"

            # Sub-case: Pure greeting or whoami session ping
            elif route_decision.intent == "greeting":
                tokens_used = 0
                final_text = "Halo! Saya PADI AI Assistant. Saya siap membantu Anda mengakses data persediaan stok, surat jalan (DO), invoice piutang, mutasi, master gudang, serta analisa performa bisnis ERP PADI. Ada yang bisa saya bantu?"

            # Sub-case: Layer 4 Fast Path (Operational Data Retrieval without LLM)
            elif not route_decision.requires_llm and route_decision.route == "mcp":
                tokens_used = 0
                reply_sections = []
                if attachments and not user_query:
                    reply_sections.append(f"Saya telah menerima {len(attachments)} file lampiran. Silakan tanyakan apa yang ingin Anda analisis dari file ini.")
                if tool_outputs:
                    for t_name, res_dict in tool_outputs:
                        # Only show cpa_whoami if user explicitly asked for session / user info
                        if t_name == "cpa_whoami" and not any(k in user_query.lower() for k in ["siapa saya", "whoami", "profil", "role saya", "cek sesi"]):
                            continue
                        reply_sections.append(format_tool_result_markdown(t_name, res_dict, user))
                if not reply_sections:
                    reply_sections.append("Data operasional siap diakses melalui PADI MCP Server. Silakan ajukan pertanyaan atau instruksi yang ingin dijalankan.")
                final_text = "\n\n".join(reply_sections)

            # Sub-case: Layer 5 DeepSeek LLM (Analytical Reasoning & Strategy)
            else:
                mcp_context_list = []
                for t_name, res_dict in tool_outputs:
                    res_content = res_dict.get("structuredContent") or res_dict.get("content") or res_dict
                    mcp_context_list.append({
                        "mcp_tool": t_name,
                        "data": trim_mcp_data_for_llm(res_content, user_query)
                    })

                system_prompt = build_system_prompt(user, user_query)
                if upload_context_block:
                    system_prompt += upload_context_block
                history_payload = compact_conversation_history(
                    req.messages,
                    allow_previous_context=route_decision.allow_previous_context
                )

                try:
                    llm_response = await llm_provider.generate_response(
                        system_prompt=system_prompt,
                        user_query=user_query,
                        mcp_context=mcp_context_list,
                        conversation_history=history_payload
                    )
                    if llm_response.success and llm_response.content:
                        final_text = llm_response.content
                        tokens_used = llm_response.token_used
                        success = True

                        # Layer 6: Store in Response Cache (TTL 10 min)
                        cache_service.set_llm_response(
                            query=user_query,
                            content=final_text,
                            role=user.role,
                            model=getattr(llm_response, "model", "deepseek-chat"),
                            token_used=tokens_used
                        )
                    else:
                        raise ValueError(llm_response.error_message or "DeepSeek returned empty response")
                except Exception as llm_err:
                    tokens_used = 0
                    reply_sections = []
                    if attachments:
                        reply_sections.append(f"Saya telah menerima {len(attachments)} file lampiran.")
                    if tool_outputs:
                        for t_name, res_dict in tool_outputs:
                            reply_sections.append(format_tool_result_markdown(t_name, res_dict, user))
                    else:
                        reply_sections.append(f"Layanan DeepSeek tidak dapat dihubungi: {str(llm_err)}")
                    final_text = "\n\n".join(reply_sections)

            # ── Audit Logging ──
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
                    "requires_llm": route_decision.requires_llm,
                    "reason": route_decision.reason
                }
            )

            # ── Stream Words to Frontend ──
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

    # ── Non-Streaming Response Branch ──
    tool_results = []
    tool_outputs = []
    for t_spec in valid_tools[:3]:
        t_name = t_spec["name"]
        t_args = t_spec.get("args", {})
        res_dict, from_cache = execute_tool_with_cache(t_name, t_args, user, db)
        tool_results.append({"name": t_name, "args": t_args, "result": res_dict, "from_cache": from_cache})
        tool_outputs.append((t_name, res_dict))

    tokens_used = 0
    success = True
    content_text = ""

    if route_decision.route == "transform" or route_decision.action_type == "transform":
        pres_str = ", ".join(getattr(route_decision, "presentation", [])) or "HTML & Tata Letak Responsif"
        transform_system_prompt = (
            build_system_prompt(user, user_query) +
            f"\n\n[PADI KNOWLEDGE TRANSFORMATION WORKFLOW]\n"
            f"Mode: Transformasi Pengetahuan & Presentasi (Need Data: NO, Tool Lock: ON).\n"
            f"Gaya / Format Penyajian: {pres_str}.\n"
            f"Instruksi Khusus untuk Chief Intelligence Advisor PADI:\n"
            f"1. Anda sedang melakukan transformasi format/tampilan data yang sudah ada, BUKAN mengambil data backend baru.\n"
            f"2. Prioritaskan dan ikuti struktur dari berkas/lampiran aktif (Source Binding: Priority 100).\n"
            f"3. Jika pengguna meminta kode HTML/CSS atau mockup, sajikan kode yang lengkap, semantik, responsif, dan berestetika modern kelas dunia.\n"
            f"4. DILARANG memanggil tool MCP atau menampilkan laporan mentah berulang.\n"
        )
        if upload_context_block:
            transform_system_prompt += upload_context_block

        history_payload = compact_conversation_history(
            req.messages,
            allow_previous_context=route_decision.allow_previous_context
        )
        try:
            llm_resp = await llm_provider.generate_response(
                system_prompt=transform_system_prompt,
                user_query=user_query,
                mcp_context=[],
                conversation_history=history_payload
            )
            if llm_resp.success and llm_resp.content:
                content_text = llm_resp.content
                tokens_used = llm_resp.token_used
                success = True
            else:
                raise ValueError(llm_resp.error_message or "DeepSeek returned empty response")
        except Exception as llm_err:
            content_text = f"Terjadi kendala saat melakukan transformasi tampilan: {str(llm_err)}"
            tokens_used = 0
    elif (route_decision.route == "hybrid" or (route_decision.is_export and route_decision.requires_llm)) and tool_outputs:
        t_name, raw_data = tool_outputs[0]
        mcp_context_list = [{"mcp_tool": t["name"], "data": t["result"]} for t in tool_results]
        pres_str = ", ".join(getattr(route_decision, "presentation", [])) or "table, visual chart & executive analysis"
        hybrid_system_prompt = (
            build_system_prompt(user, user_query) +
            f"\n\n[PADI HYBRID EXECUTIVE WORKFLOW]\n"
            f"Pengguna meminta laporan dan analisis eksekutif dengan preferensi visual/penyajian: {pres_str}.\n"
            f"Instruksi Khusus untuk Chief Intelligence Advisor PADI:\n"
            f"1. Sajikan Executive Summary berbobot dan berbasis data aktual di atas.\n"
            f"2. Gunakan format Markdown yang rapi dengan tabel ringkas, metrik kunci, dan perbandingan antar area/gudang.\n"
            f"3. Uraikan interpretasi visual chart (proporsi Good Stock vs Dead Stock, trend runrate, OTIF) dengan metode penyajian yang memudahkan pembacaan data bagi jajaran direksi.\n"
            f"4. Berikan Rekomendasi Strategis konkret (langkah mitigasi dead stock, penataan buffer stock, percepatan distribusi) yang dapat segera diimplementasikan."
        )
        if upload_context_block:
            hybrid_system_prompt += upload_context_block
        history_payload = compact_conversation_history(
            req.messages,
            allow_previous_context=route_decision.allow_previous_context
        )
        llm_analysis_text = ""
        try:
            llm_resp = await llm_provider.generate_response(
                system_prompt=hybrid_system_prompt,
                user_query=user_query,
                mcp_context=mcp_context_list,
                conversation_history=history_payload
            )
            if llm_resp.success and llm_resp.content:
                llm_analysis_text = llm_resp.content
                tokens_used = llm_resp.token_used
                success = True
        except Exception as llm_err:
            logger.error(f"Hybrid LLM analysis error: {llm_err}")
            llm_analysis_text = "Evaluasi Analitis: Tinjauan persediaan menunjukkan perlunya mitigasi dead stock dan penyesuaian runrate pada wilayah operasional terkait."

        rep_res = report_engine.generate(
            export_format=route_decision.export_format or "pdf",
            tool_name=t_name,
            mcp_data=raw_data,
            user=user,
            executive_analysis=llm_analysis_text
        )
        content_text = (
            f"{rep_res.markdown_summary}\n\n"
            f"---\n\n"
            f"### 📊 Analisis Eksekutif & Tinjauan Strategis AI\n\n"
            f"{llm_analysis_text}"
        )
    elif route_decision.is_export and tool_outputs:
        tokens_used = 0
        t_name, raw_data = tool_outputs[0]
        rep_res = report_engine.generate(
            export_format=route_decision.export_format or "excel",
            tool_name=t_name,
            mcp_data=raw_data,
            user=user
        )
        content_text = rep_res.markdown_summary
    elif route_decision.intent == "greeting":
        tokens_used = 0
        content_text = "Halo! Saya PADI AI Assistant. Saya siap membantu Anda mengakses data persediaan stok, surat jalan (DO), invoice piutang, mutasi, master gudang, serta analisa performa bisnis ERP PADI. Ada yang bisa saya bantu?"
    elif not route_decision.requires_llm and route_decision.route == "mcp":
        tokens_used = 0
        reply_sections = []
        if tool_outputs:
            for t_name, res_dict in tool_outputs:
                reply_sections.append(format_tool_result_markdown(t_name, res_dict, user))
        else:
            reply_sections.append("Data operasional siap diakses melalui PADI MCP Server.")
        content_text = "\n\n".join(reply_sections)
    else:
        mcp_context_list = [{"mcp_tool": t["name"], "data": t["result"]} for t in tool_results]
        system_prompt = build_system_prompt(user, user_query)
        if upload_context_block:
            system_prompt += upload_context_block
        history_payload = compact_conversation_history(
            req.messages,
            allow_previous_context=route_decision.allow_previous_context
        )
        try:
            llm_resp = await llm_provider.generate_response(
                system_prompt=system_prompt,
                user_query=user_query,
                mcp_context=mcp_context_list,
                conversation_history=history_payload
            )
            if llm_resp.success and llm_resp.content:
                content_text = llm_resp.content
                tokens_used = llm_resp.token_used
                success = True
                cache_service.set_llm_response(
                    query=user_query,
                    content=content_text,
                    role=user.role,
                    model=getattr(llm_resp, "model", "deepseek-chat"),
                    token_used=tokens_used
                )
            else:
                raise ValueError(llm_resp.error_message or "DeepSeek returned empty response")
        except Exception as llm_err:
            tokens_used = 0
            text_parts = [format_tool_result_markdown(t["name"], t["result"], user) for t in tool_results]
            content_text = "\n\n".join(text_parts) if text_parts else f"Gagal memanggil DeepSeek LLM: {str(llm_err)}"

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
            "token_used": tokens_used,
            "requires_llm": route_decision.requires_llm
        }
    }


# ─── Additional AI Architecture Endpoints ─────────────────────────────────────

@router.get("/reports/download/{filename}")
@router.head("/reports/download/{filename}")
async def download_report_file(filename: str):
    """Serves generated Excel, PDF, or interactive HTML presentation files securely."""
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(REPORTS_DIR, clean_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File laporan tidak ditemukan.")

    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    disp_type = "attachment"
    if clean_filename.endswith(".pdf"):
        media_type = "application/pdf"
        disp_type = "inline"
    elif clean_filename.endswith(".html") or clean_filename.endswith(".htm"):
        media_type = "text/html; charset=utf-8"
        disp_type = "inline"
    elif clean_filename.endswith(".md") or clean_filename.endswith(".markdown"):
        media_type = "text/markdown; charset=utf-8"
        disp_type = "inline"
    elif clean_filename.endswith(".txt"):
        media_type = "text/plain; charset=utf-8"
        disp_type = "inline"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=clean_filename,
        content_disposition_type=disp_type
    )


@router.get("/stats")
async def get_ai_router_stats(audit_logger: AuditLogger = Depends(get_audit_logger)):
    """
    Returns live statistics on token savings and routing distributions.
    Confirms token reduction metrics.
    """
    return audit_logger.get_statistics()


@router.get("/cache-stats")
async def get_cache_stats():
    """
    Returns real-time multi-layer caching and token savings statistics.
    Layer 2 (Redis Query Cache) + Layer 6 (Response Cache).
    """
    return cache_service.get_stats()


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
