"""
PADI ERP / CPA Analytics — AI Intent Router
============================================
Determines whether incoming user queries can be served directly by the Model Context
Protocol (MCP) Server without calling LLMs, or require an LLM for Business Reasoning.

Key Principles:
1. Data Retrieval -> Direct MCP Route (token_used = 0, minimal latency).
2. Report Exporting -> Direct MCP + Report Engine (Excel/PDF, token_used = 0).
3. Business Reasoning / Strategy / Forecasting -> LLM Route with MCP context.
4. Deterministic Rule Engine: Keyword Matching (P1) -> Regex Patterns (P2) -> Scoring (P3).
5. Strictly decoupled from database: Router never queries SQL directly.
"""

import re
from typing import Dict, List, Any, Optional, Tuple, Literal
from dataclasses import dataclass, field, asdict


RouteType = Literal["mcp", "llm"]


# ─── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class IntentRule:
    """Represents a routing rule definition."""
    name: str
    target_route: RouteType
    keywords: List[str]
    regex_patterns: List[str]
    default_tools: List[Tuple[str, Dict[str, Any]]]
    weight: float = 1.0
    is_export: bool = False
    export_format: Optional[str] = None  # "excel" or "pdf"
    description: str = ""


@dataclass
class IntentRouteResult:
    """The structured decision returned by the Intent Router."""
    route: RouteType
    intent: str
    confidence: float
    matched_tools: List[Dict[str, Any]]
    is_export: bool = False
    export_format: Optional[str] = None
    reason: str = ""
    scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Returns standard dict format compliant with user specifications."""
        return {
            "route": self.route,
            "intent": self.intent,
            "confidence": round(self.confidence, 3),
            "matched_tools": self.matched_tools,
            "is_export": self.is_export,
            "export_format": self.export_format,
            "reason": self.reason,
            "scores": {k: round(v, 3) for k, v in self.scores.items()}
        }

    def __getitem__(self, item):
        """Allows dictionary-like access: result['route']."""
        return getattr(self, item)


# ─── Rule Definitions ─────────────────────────────────────────────────────────

# 1. Reasoning / LLM Triggers (User specifically asks for deep business analysis)
REASONING_RULES: List[IntentRule] = [
    IntentRule(
        name="root_cause_analysis",
        target_route="llm",
        keywords=[
            "mengapa", "kenapa", "penyebab", "sebab", "latar belakang", "faktor"
        ],
        regex_patterns=[
            r"\b(mengapa|kenapa|apa penyebab|faktor apa|apa latar belakang)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_sales_summary", {})],
        weight=2.5,
        description="Analisa akar masalah, mengapa KPI/stok/penjualan berubah"
    ),
    IntentRule(
        name="business_strategy_recommendation",
        target_route="llm",
        keywords=[
            "analisa", "analisis", "rekomendasi", "strategi", "saran", "tindakan", "solusi"
        ],
        regex_patterns=[
            r"\b(analisa|analisis|rekomendasi|rekomendasikan|strategi|berikan saran|langkah apa)\b"
        ],
        default_tools=[("get_picture_of_success", {}), ("get_sales_performance_intelligence", {})],
        weight=2.2,
        description="Rekomendasi strategi bisnis, pertumbuhan, atau efisiensi inventori"
    ),
    IntentRule(
        name="forecasting_prediction",
        target_route="llm",
        keywords=[
            "prediksi", "forecasting", "ramalan", "proyeksi", "estimasi ke depan", "tren mendatang"
        ],
        regex_patterns=[
            r"\b(prediksi|forecasting|ramalan|proyeksi|demand ke depan|prospek)\b"
        ],
        default_tools=[("get_demand_forecast", {}), ("get_forecast_dashboard_summary", {})],
        weight=2.0,
        description="Prediksi demand dan estimasi forecasting multi-minggu / bulanan"
    ),
    IntentRule(
        name="optimization_comparison",
        target_route="llm",
        keywords=[
            "optimasi", "optimalisasi", "perbandingan", "bandingkan", "evaluasi", "komparasi"
        ],
        regex_patterns=[
            r"\b(optimasi|optimalisasi|bandingkan|perbandingan|evaluasi|komparasi|efisiensi)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_sales_performance_intelligence", {})],
        weight=2.0,
        description="Evaluasi kinerja gudang/sales dan perbandingan antar cabang"
    ),
    IntentRule(
        name="executive_summary",
        target_route="llm",
        keywords=[
            "ringkasan manajemen", "executive summary", "kesimpulan direksi", "laporan eksekutif"
        ],
        regex_patterns=[
            r"\b(ringkasan manajemen|executive summary|laporan eksekutif|kesimpulan direksi|briefing direksi)\b"
        ],
        default_tools=[("get_main_dashboard", {}), ("get_picture_of_success", {})],
        weight=2.5,
        description="Sintesis narasi eksekutif tingkat manajemen C-Level"
    ),
]


# 2. Operational / Direct MCP Triggers (Direct DB Queries, zero token usage)
OPERATIONAL_RULES: List[IntentRule] = [
    # Stock Aging (High Priority: must take precedence over AR aging when stock/barang/persediaan is queried)
    IntentRule(
        name="cek_stock_aging",
        target_route="mcp",
        keywords=[
            "aging stock", "aging stok", "stock aging", "stok aging", "aging barang",
            "umur stok", "umur barang", "umur persediaan", "slow moving", "dead stock",
            "aging diatas", "aging >", "aging lebih dari", "stok lama", "barang lama",
            "stok mengendap", "aging persediaan"
        ],
        regex_patterns=[
            r"\b(stok|stock|barang|persediaan|sku)\b.*\b(aging|umur|slow.?moving|dead.?stock)\b",
            r"\b(aging|umur|slow.?moving|dead.?stock)\b.*\b(stok|stock|barang|persediaan|sku)\b",
            r"\b(aging|umur)\s+(diatas|di atas|lebih dari|>|>=)\b",
            r"\baging\s+\d+\s*(tahun|thn|bulan|bln|hari)\b"
        ],
        default_tools=[("get_inventory_aging_batch", {})],
        weight=2.5,
        description="Pemantauan umur persediaan stok (Stock Aging, Slow Moving, Dead Stock)"
    ),
    # Stock & Inventory
    IntentRule(
        name="cek_stok",
        target_route="mcp",
        keywords=[
            "cek stok", "cek stock", "stok", "stock", "inventory", "stok barang", "stock barang",
            "stok gudang", "stock gudang", "sisa stok", "sisa stock", "posisi stok", "posisi stock",
            "daftar stok", "daftar stock", "ketersediaan", "on hand", "available"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan|daftar|informasi|status)?\s*(stok|stock|inventory|persediaan|on[- ]hand|available)\b",
            r"\b(stok|stock)\s+(gudang|cabang|depo|barang|produk)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_product_stock", {})],
        weight=1.6,
        description="Pengecekan stok & inventori real-time per gudang"
    ),
    IntentRule(
        name="cek_stok_kritis",
        target_route="mcp",
        keywords=[
            "stok kritis", "stok habis", "menipis", "low stock", "reorder point", "rop", "safety stock"
        ],
        regex_patterns=[
            r"\b(kritis|menipis|habis|low.?stock|reorder|out of stock|stok kurang)\b"
        ],
        default_tools=[("get_low_stock_alerts", {})],
        weight=1.8,
        description="Alert stok menipis dan rekomendasi restock PO"
    ),
    # Mutasi, Transfer, Receiving
    IntentRule(
        name="cek_mutasi",
        target_route="mcp",
        keywords=[
            "cek mutasi", "mutasi stok", "mutasi barang", "kartu stok", "pergerakan barang"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan)?\s*(mutasi|kartu stok|pergerakan|in out)\s*(stok|barang|produk)?\b"
        ],
        default_tools=[("get_inventory_aging_batch", {}), ("get_inventory_summary", {})],
        weight=1.6,
        description="Riwayat mutasi keluar masuk barang"
    ),
    IntentRule(
        name="cek_transfer",
        target_route="mcp",
        keywords=[
            "cek transfer", "transfer gudang", "mutasi antar gudang", "distribusi", "kirim barang"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan)?\s*(transfer|pindah gudang|distribusi|antargudang|antar gudang)\b"
        ],
        default_tools=[("get_warehouse_list", {}), ("get_inventory_summary", {})],
        weight=1.5,
        description="Pengecekan transfer stok antar gudang"
    ),
    IntentRule(
        name="cek_receiving",
        target_route="mcp",
        keywords=[
            "cek receiving", "penerimaan barang", "barang masuk", "inbound", "surat jalan masuk"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan)?\s*(receiving|penerimaan|barang masuk|inbound|rilis kirim)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_invoices", {"limit": 5})],
        weight=1.5,
        description="Status penerimaan barang gudang"
    ),
    IntentRule(
        name="cek_purchasing",
        target_route="mcp",
        keywords=[
            "cek purchasing", "pembelian", "purchase order", "po supplier", "order pembelian"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan)?\s*(purchasing|pembelian|purchase order|\bpo\b|pengadaan)\b"
        ],
        default_tools=[("get_low_stock_alerts", {}), ("get_inventory_summary", {})],
        weight=1.5,
        description="Informasi purchasing & kebutuhan PO restock"
    ),
    # Customer & Supplier
    IntentRule(
        name="cek_customer",
        target_route="mcp",
        keywords=[
            "cek customer", "customer", "pelanggan", "outlet", "toko", "data customer", "klien"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan|daftar|profil)?\s*(customer|pelanggan|outlet|buyer|klien)\b"
        ],
        default_tools=[("get_customer_detail", {}), ("get_customer_intelligence_dashboard", {})],
        weight=1.5,
        description="Profil customer, riwayat transaksi, dan limit piutang"
    ),
    IntentRule(
        name="cek_supplier",
        target_route="mcp",
        keywords=[
            "cek supplier", "supplier", "vendor", "pemasok", "principal"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan|daftar)?\s*(supplier|vendor|pemasok|principal)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_product_stock", {})],
        weight=1.5,
        description="Daftar supplier / principal barang"
    ),
    # Invoices & Financials (AR, Aging)
    IntentRule(
        name="cek_invoice",
        target_route="mcp",
        keywords=[
            "cek invoice", "invoice", "faktur", "faktur pajak", "tagihan", "nomor faktur"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan|daftar)?\s*(invoice|faktur|nota|billing|tagihan)\b"
        ],
        default_tools=[("get_invoices", {"limit": 10})],
        weight=1.6,
        description="Daftar faktur / invoice penjualan"
    ),
    IntentRule(
        name="cek_ar_aging",
        target_route="mcp",
        keywords=[
            "cek ar", "piutang", "aging piutang", "ar aging", "umur piutang", "overdue piutang", "tunggakan"
        ],
        regex_patterns=[
            r"\b(ar|piutang|tagihan|faktur|pelanggan|customer|overdue|tunggakan)\b.*\baging\b",
            r"\baging\b.*\b(ar|piutang|tagihan|faktur|pelanggan|customer|overdue|tunggakan)\b",
            r"\b(ar|piutang|tunggakan|overdue)\b"
        ],
        default_tools=[("get_ar_piutang_aging", {})],
        weight=1.8,
        description="Analisis umur piutang (AR aging) dan status overdue"
    ),
    IntentRule(
        name="cek_batch",
        target_route="mcp",
        keywords=[
            "cek batch", "batch", "lot", "kadaluarsa", "expired", "masa simpan", "exp date"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan)?\s*(batch|lot|kadaluarsa|expired|exp date|masa simpan)\b"
        ],
        default_tools=[("get_inventory_aging_batch", {})],
        weight=1.7,
        description="Pemantauan batch, lot, dan tanggal kedaluwarsa produk"
    ),
    IntentRule(
        name="cek_warehouse",
        target_route="mcp",
        keywords=[
            "daftar gudang", "list gudang", "master gudang", "semua gudang", "seluruh gudang",
            "lokasi gudang", "cek warehouse", "daftar warehouse"
        ],
        regex_patterns=[
            r"\b(daftar|list|master|tampilkan semua|ada berapa|semua|seluruh)\s+(gudang|warehouse|depo)\b",
            r"\b(gudang|warehouse)\s+(apa saja|mana saja|terdaftar)\b"
        ],
        default_tools=[("get_warehouse_list", {})],
        weight=1.4,
        description="Daftar master gudang dan titik distribusi"
    ),
    # Reports & Exports
    IntentRule(
        name="export_excel",
        target_route="mcp",
        keywords=[
            "export excel", "unduh excel", "download excel", "format excel", ".xlsx", "tarik excel"
        ],
        regex_patterns=[
            r"\b(export|unduh|download|tarik|cetak)\s+(ke\s+)?(excel|\.xlsx|spreadsheet)\b",
            r"\b(format excel|file excel)\b"
        ],
        default_tools=[("get_inventory_summary", {})],
        weight=2.5,
        is_export=True,
        export_format="excel",
        description="Ekspor data operasional langsung ke Microsoft Excel (.xlsx)"
    ),
    IntentRule(
        name="export_pdf",
        target_route="mcp",
        keywords=[
            "export pdf", "unduh pdf", "download pdf", "format pdf", ".pdf", "export pdf standar", "cetak pdf"
        ],
        regex_patterns=[
            r"\b(export|unduh|download|tarik|cetak)\s+(ke\s+)?(pdf|\.pdf)\b",
            r"\b(format pdf|file pdf|pdf standar)\b"
        ],
        default_tools=[("get_inventory_summary", {})],
        weight=2.5,
        is_export=True,
        export_format="pdf",
        description="Ekspor data operasional langsung ke dokumen PDF terformat"
    ),
    IntentRule(
        name="download_laporan",
        target_route="mcp",
        keywords=[
            "download laporan", "unduh laporan", "tarik laporan", "cetak laporan", "laporan harian", "laporan bulanan"
        ],
        regex_patterns=[
            r"\b(download|unduh|tarik|ambil|minta|export)\s+laporan\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_sales_summary", {})],
        weight=2.0,
        is_export=True,
        export_format="excel",
        description="Download laporan operasional standar ERP"
    ),
    # Dashboards, Charts, KPIs
    IntentRule(
        name="dashboard_kpi",
        target_route="mcp",
        keywords=[
            "dashboard", "grafik", "kpi yang sudah tersedia", "kpi", "chart", "indikator", "ringkasan eksekutif"
        ],
        regex_patterns=[
            r"\b(dashboard|grafik|chart|kpi|indikator|picture of success|kinerja umum)\b"
        ],
        default_tools=[("get_main_dashboard", {}), ("get_picture_of_success", {})],
        weight=1.6,
        description="Dashboard visual, KPI, dan grafik operasional yang sudah tersedia"
    ),
    IntentRule(
        name="omzet_sales_summary",
        target_route="mcp",
        keywords=[
            "omzet", "omset", "penjualan", "revenue", "sales summary", "total penjualan"
        ],
        regex_patterns=[
            r"\b(omzet|omset|penjualan|sales|revenue|pendapatan)\b"
        ],
        default_tools=[("get_sales_summary", {})],
        weight=1.5,
        description="Ringkasan omzet dan transaksi penjualan aktual"
    ),
]


# ─── Intent Router Implementation ─────────────────────────────────────────────

class IntentRouter:
    """
    Modular Rule & Scoring Engine for routing ERP chat requests.
    Decoupled from LLMs, fast (< 1ms execution), and easily extensible.
    """

    def __init__(self, reasoning_rules: Optional[List[IntentRule]] = None,
                 operational_rules: Optional[List[IntentRule]] = None):
        self.reasoning_rules = reasoning_rules or REASONING_RULES
        self.operational_rules = operational_rules or OPERATIONAL_RULES

    def route(self, user_message: str) -> IntentRouteResult:
        """
        Main routing method.
        Evaluates user_message using Priority 1 (Keywords), Priority 2 (Regex),
        and Priority 3 (Scoring Engine).
        """
        clean_text = user_message.strip().lower()
        if not clean_text:
            return IntentRouteResult(
                route="mcp",
                intent="general_help",
                confidence=1.0,
                matched_tools=[{"name": "cpa_whoami", "args": {}}],
                reason="Pesan kosong, diarahkan ke tool info sesi MCP"
            )

        # ── Priority 1: Check Explicit Export Intents ──
        # If user explicitly asks to export to Excel or PDF, it MUST NOT go to LLM.
        for rule in self.operational_rules:
            if rule.is_export:
                # 1a. Keyword match
                if any(kw in clean_text for kw in rule.keywords):
                    target_tool = self._find_export_underlying_tool(clean_text)
                    return IntentRouteResult(
                        route="mcp",
                        intent=rule.name,
                        confidence=0.98,
                        matched_tools=[target_tool],
                        is_export=True,
                        export_format=rule.export_format,
                        reason=f"Permintaan ekspor file '{rule.export_format.upper()}'. Dijalankan langsung oleh Report Engine tanpa LLM."
                    )
                # 1b. Regex match
                for pat in rule.regex_patterns:
                    if re.search(pat, clean_text, re.IGNORECASE):
                        target_tool = self._find_export_underlying_tool(clean_text)
                        return IntentRouteResult(
                            route="mcp",
                            intent=rule.name,
                            confidence=0.95,
                            matched_tools=[target_tool],
                            is_export=True,
                            export_format=rule.export_format,
                            reason=f"Pola regex ekspor '{pat}' cocok. Dijalankan langsung oleh Report Engine tanpa LLM."
                        )

        # ── Priority 2: Keyword & Regex Matching for Reasoning (LLM) ──
        # Check if user explicitly asked for reasoning/analysis
        matched_reasoning_rule = None
        reasoning_score = 0.0

        for rule in self.reasoning_rules:
            # P1: Exact keyword matching
            for kw in rule.keywords:
                pattern = r"\b" + re.escape(kw) + r"\b"
                if re.search(pattern, clean_text):
                    reasoning_score += rule.weight * 2.0
                    matched_reasoning_rule = rule
                    break

            # P2: Regex pattern matching
            for pat in rule.regex_patterns:
                if re.search(pat, clean_text, re.IGNORECASE):
                    reasoning_score += rule.weight * 1.5
                    if not matched_reasoning_rule:
                        matched_reasoning_rule = rule

        # ── Priority 2: Keyword & Regex Matching for Operational (MCP) ──
        matched_operational_rules: List[Tuple[IntentRule, float]] = []
        for rule in self.operational_rules:
            if rule.is_export:
                continue

            rule_score = 0.0
            # P1: Keyword matching
            for kw in rule.keywords:
                pattern = r"\b" + re.escape(kw) + r"\b"
                if re.search(pattern, clean_text):
                    rule_score += rule.weight * 2.0
                    break
                elif kw in clean_text:
                    rule_score += rule.weight * 1.2

            # P2: Regex matching
            for pat in rule.regex_patterns:
                if re.search(pat, clean_text, re.IGNORECASE):
                    rule_score += rule.weight * 1.5
                    break

            if rule_score > 0:
                matched_operational_rules.append((rule, rule_score))

        # Sort operational rules by score descending
        matched_operational_rules.sort(key=lambda x: x[1], reverse=True)
        total_operational_score = sum(s for _, s in matched_operational_rules)

        # ── Priority 3: Scoring & Conflict Resolution ──
        scores = {
            "llm_reasoning_score": reasoning_score,
            "mcp_operational_score": total_operational_score
        }

        # Case A: Explicit Reasoning Trigger detected (mengapa, analisa, rekomendasi, dll.)
        # Per requirement: LLM is triggered ONLY if request contains reasoning terms.
        if reasoning_score > 0:
            # Determine contextual tools: what data should Gemini analyze?
            context_tools = []
            if matched_operational_rules:
                top_rule, _ = matched_operational_rules[0]
                context_tools = [{"name": t_name, "args": t_args} for t_name, t_args in top_rule.default_tools]
            else:
                top_rule = matched_reasoning_rule or self.reasoning_rules[0]
                context_tools = [{"name": t_name, "args": t_args} for t_name, t_args in top_rule.default_tools]

            intent_name = matched_reasoning_rule.name if matched_reasoning_rule else "business_reasoning"
            confidence = min(0.99, 0.70 + (reasoning_score * 0.08))

            return IntentRouteResult(
                route="llm",
                intent=intent_name,
                confidence=confidence,
                matched_tools=context_tools,
                reason=f"Permintaan mengandung aspek analisa/business reasoning ('{matched_reasoning_rule.keywords[0]}'). Memerlukan LLM sebagai Business Analyst.",
                scores=scores
            )

        # Case B: Operational Data Retrieval (cek stok, invoice, AR, mutasi, customer, dll.)
        # Per requirement: Do NOT call Gemini. Route directly to MCP!
        if matched_operational_rules:
            top_rule, best_score = matched_operational_rules[0]
            tools = [{"name": t_name, "args": t_args} for t_name, t_args in top_rule.default_tools]

            # If user query references specific product / gudang / id, extract args
            self._enhance_tool_arguments(clean_text, top_rule.name, tools)

            confidence = min(0.99, 0.65 + (best_score * 0.09))
            return IntentRouteResult(
                route="mcp",
                intent=top_rule.name,
                confidence=confidence,
                matched_tools=tools,
                reason=f"Data retrieval operasional terdeteksi ('{top_rule.name}'). Dijawab langsung oleh PADI MCP Server tanpa token LLM.",
                scores=scores
            )

        # Case C: Conversational greetings or unspecified short intent
        # Default fallback: Handle via direct MCP without wasting tokens
        greeting_match = re.search(r"^(hai|halo|hallo|hi|selamat\s+(pagi|siang|sore|malam)|assalamu|ping)", clean_text)
        if greeting_match:
            return IntentRouteResult(
                route="mcp",
                intent="greeting",
                confidence=0.95,
                matched_tools=[{"name": "cpa_whoami", "args": {}}],
                reason="Sapaan umum atau bantuan menu, dilayani langsung oleh MCP tanpa memanggil LLM.",
                scores=scores
            )

        # Case D: Ambiguous query without reasoning keywords
        # Conservative default: Route to MCP inventory summary to protect token quota
        return IntentRouteResult(
            route="mcp",
            intent="general_mcp_query",
            confidence=0.60,
            matched_tools=[{"name": "get_inventory_summary", "args": {}}],
            reason="Tidak ada pemicu business reasoning (mengapa/kenapa/analisa). Diarahkan ke MCP ringkasan inventori untuk menghemat token.",
            scores=scores
        )

    def _find_export_underlying_tool(self, text: str) -> Dict[str, Any]:
        """Identifies what dataset the user wants to export based on subject terms."""
        if any(w in text for w in ["invoice", "faktur", "penjualan", "sales"]):
            return {"name": "get_invoices", "args": {"limit": 50}}
        elif any(w in text for w in ["piutang", "ar", "aging", "overdue"]):
            return {"name": "get_ar_piutang_aging", "args": {}}
        elif any(w in text for w in ["kritis", "habis", "menipis", "reorder"]):
            return {"name": "get_low_stock_alerts", "args": {}}
        elif any(w in text for w in ["batch", "lot", "exp", "kadaluarsa"]):
            return {"name": "get_inventory_aging_batch", "args": {}}
        elif any(w in text for w in ["customer", "pelanggan", "outlet"]):
            return {"name": "get_customer_intelligence_dashboard", "args": {}}
        elif any(w in text for w in ["omzet", "omset", "revenue"]):
            return {"name": "get_sales_summary", "args": {}}
        else:
            # Default to full inventory stock export
            return {"name": "get_inventory_summary", "args": {}}

    WAREHOUSE_ALIAS_MAP = {
        "makassar": "005",
        "mks": "005",
        "mksr": "005",
        "balikpapan": "001",
        "bpn": "001",
        "kendari": "007",
        "kdr": "007",
        "palu": "009",
        "sampit": "010",
        "banjarmasin": "011",
        "bjm": "011",
        "ambon": "012",
        "maluku": "012",
        "papua": "012",
        "bitung": "013",
        "surabaya": "014",
        "sby": "014",
        "tonasa": "036",
        "morowali": "042",
    }

    def _enhance_tool_arguments(self, text: str, intent_name: str, tools: List[Dict[str, Any]]) -> None:
        """Lightweight extractor for warehouse ID, aging duration, or limit from natural language query."""
        # 1. Resolve Warehouse ID (from City Name or Code)
        target_gudang = None

        # Check direct city alias matches
        for city, code in self.WAREHOUSE_ALIAS_MAP.items():
            if re.search(r"\b" + re.escape(city) + r"\b", text):
                target_gudang = code
                break

        # Check regex for explicit "gudang <val>" or "wh <val>"
        if not target_gudang:
            wh_match = re.search(r"\b(?:gudang|gd|wh)\s*([a-zA-Z0-9_\-]+)", text)
            if wh_match:
                raw_val = wh_match.group(1).lower()
                if raw_val in self.WAREHOUSE_ALIAS_MAP:
                    target_gudang = self.WAREHOUSE_ALIAS_MAP[raw_val]
                elif raw_val.isdigit():
                    target_gudang = raw_val.zfill(3)

        if target_gudang:
            for t in tools:
                if t.get("name") in ["get_inventory_summary", "get_product_stock", "get_inventory_aging_batch"]:
                    t.setdefault("args", {})["id_gudang"] = target_gudang

        # 2. Extract Aging Duration (Tahun, Bulan, Hari) for get_inventory_aging_batch
        min_days = None
        m_year = re.search(r"(\d+(?:\.\d+)?)\s*(?:tahun|thn)", text)
        m_month = re.search(r"(\d+(?:\.\d+)?)\s*(?:bulan|bln)", text)
        m_day = re.search(r"(\d+)\s*(?:hari|day)", text)

        if m_year:
            try:
                min_days = int(float(m_year.group(1)) * 365)
            except ValueError:
                pass
        elif m_month:
            try:
                min_days = int(float(m_month.group(1)) * 30)
            except ValueError:
                pass
        elif m_day:
            try:
                min_days = int(m_day.group(1))
            except ValueError:
                pass

        if min_days is not None:
            for t in tools:
                if t.get("name") == "get_inventory_aging_batch":
                    t.setdefault("args", {})["min_days"] = min_days

        # 3. Check for row limit (e.g. "top 10", "limit 5")
        limit_match = re.search(r"\b(?:top|sebanyak|limit|teratas)\s*(\d+)", text)
        if limit_match:
            try:
                l_val = int(limit_match.group(1))
                for t in tools:
                    t.setdefault("args", {})["limit"] = min(50, max(1, l_val))
            except ValueError:
                pass


# ─── Singleton & Functional API ───────────────────────────────────────────────

_default_router = IntentRouter()

def route_intent(user_message: str) -> Dict[str, Any]:
    """
    Public convenience API for the Intent Router:
    route(user_message) -> {"route": "mcp"} or {"route": "llm"}
    """
    result = _default_router.route(user_message)
    return result.to_dict()
