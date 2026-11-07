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
from datetime import date, timedelta
from typing import Dict, List, Any, Optional, Tuple, Literal
from dataclasses import dataclass, field, asdict


RouteType = Literal["mcp", "llm", "faq", "hybrid", "transform"]
ActionType = Literal["retrieval", "report", "analysis", "hybrid", "transform"]


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
    faq_data: Optional[Dict[str, Any]] = None
    requires_llm: bool = False
    action_type: str = "retrieval"  # "retrieval", "report", "analysis", "hybrid", "transform"
    domain: str = "general"
    presentation: List[str] = field(default_factory=list)
    task_plan: List[str] = field(default_factory=list)
    need_data: bool = True
    need_llm: bool = False
    need_report: bool = False
    source_binding: str = "mcp"  # "uploaded_file", "presentation_transform", "mcp", "user_prompt"
    allow_previous_context: bool = True
    tool_lock: bool = False  # If True, calling MCP is strictly forbidden

    def to_dict(self) -> Dict[str, Any]:
        """Returns standard dict format compliant with user specifications."""
        return {
            "route": self.route,
            "intent": self.intent,
            "action_type": self.action_type,
            "domain": self.domain,
            "confidence": round(self.confidence, 3),
            "matched_tools": self.matched_tools,
            "is_export": self.is_export,
            "export_format": self.export_format,
            "presentation": self.presentation,
            "need_data": self.need_data,
            "need_llm": self.need_llm,
            "need_report": self.need_report,
            "source_binding": self.source_binding,
            "allow_previous_context": self.allow_previous_context,
            "tool_lock": self.tool_lock,
            "task_plan": self.task_plan,
            "requires_llm": self.requires_llm,
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
    IntentRule(
        name="database_schema_dictionary",
        target_route="llm",
        keywords=[
            "struktur database", "tabel database", "skema database", "relasi database",
            "kamus data", "erd", "hubungan tabel", "foreign key", "arti kolom", "maksud kolom",
            "arti tabel", "maksud tabel", "terjemahkan database", "terjemahkan data",
            "pahami database", "jelaskan database", "baca database", "logika database",
            "logika databasenya", "logika relasi", "alurnya di database"
        ],
        regex_patterns=[
            r"\b(struktur|skema|schema|kamus data|relasi|hubungan|erd|logika)\s+(database|tabel|db)\b",
            r"\b(arti|maksud|arti kolom|maksud kolom|terjemahkan|jelaskan)\s+(kolom|tabel|data|database)\b",
            r"\b(bagaimana|apa saja)\s+(tabel|kolom|relasi|alur data)\b"
        ],
        default_tools=[("db_get_schema_overview", {}), ("db_list_tables", {})],
        weight=2.8,
        description="Penjelasan struktur database, relasi antar tabel, dan penerjemahan kolom/data"
    ),
    IntentRule(
        name="database_query_assistance",
        target_route="llm",
        keywords=[
            "query database", "bantu query", "sql query", "select dari", "cari di database",
            "tampilkan data tabel", "tarik data dari database", "buatkan sql", "bantu sql",
            "query sql", "kueri data", "kelola data"
        ],
        regex_patterns=[
            r"\b(query|select|sql|kueri|cari|tarik)\s+(dari\s+)?(database|tabel|db)\b",
            r"\b(bantu|buatkan|tuliskan)\s+(query|sql)\b"
        ],
        default_tools=[("db_describe_table", {}), ("db_execute_query", {})],
        weight=2.6,
        description="Asistensi penulisan query SQL, pencarian data mentah, dan interpretasi hasil query"
    ),
]


# 2. Operational / Direct MCP Triggers (Direct DB Queries, zero token usage)
OPERATIONAL_RULES: List[IntentRule] = [
    # Supply Chain Management Review (PADI ERP Executive Slide)
    IntentRule(
        name="scm_management_review",
        target_route="mcp",
        keywords=[
            "scm review", "supply chain review", "laporan scm", "review scm",
            "supply chain management review", "executive slide scm", "slide scm",
            "laporan seperti pada gambar", "laporan seperti gambar", "laporan pada gambar",
            "buatkan laporan seperti pada gambar", "buatkan laporan seperti gambar",
            "seperti pada gambar", "seperti gambar", "pada gambar",
            "coba buatkan", "oke coba buatkan", "buatkan laporan", "buatkan review scm",
            "scm runrate", "runrate scm", "dead stock rate performance", "category ratio scm",
            "delivery otif ytd", "status pengiriman outbound", "laporan scm review"
        ],
        regex_patterns=[
            r"\b(scm|supply\s+chain)\s+(review|management\s+review|laporan)\b",
            r"\b(laporan|review)\s+(scm|supply\s+chain)\b",
            r"\b(laporan|tampilan|slide|dashboard|buatkan)\s+(seperti\s+pada\s+gambar|seperti\s+gambar|pada\s+gambar)\b",
            r"\b(buatkan|buat|tampilkan)\s+(laporan|review)\s+(scm|supply\s+chain)\b",
            r"\b(oke\s+)?coba\s+buatkan\b",
            r"\b(coba\s+buatkan|buatkan\s+laporannya)\b"
        ],
        default_tools=[("get_inventory_summary", {}), ("get_inventory_aging_batch", {"min_days": 150}), ("get_delivery_orders_by_date", {"limit": 10})],
        weight=3.5,
        description="Supply Chain Management Review Eksekutif (SOH Runrate, Dead Stock Rate, OTIF, Status Pengiriman Outbound)"
    ),
    # Database Table Exploration (Zero LLM Token)
    IntentRule(
        name="cek_daftar_tabel",
        target_route="mcp",
        keywords=[
            "daftar tabel", "list tabel", "tabel apa saja", "ada tabel apa", "show tables", "list tables",
            "tampilkan semua tabel", "tabel di database", "semua tabel"
        ],
        regex_patterns=[
            r"\b(daftar|list|show|tampilkan)\s+(semua\s+)?(tabel|table|tables)\b",
            r"\b(tabel|table)\s+apa\s+saja\b"
        ],
        default_tools=[("db_list_tables", {})],
        weight=2.4,
        description="Menampilkan daftar seluruh tabel dan perkiraan jumlah baris pada database"
    ),
    IntentRule(
        name="cek_struktur_tabel",
        target_route="mcp",
        keywords=[
            "describe tabel", "struktur tabel", "kolom tabel", "detail tabel", "skema tabel",
            "isi kolom", "deskripsi tabel", "describe table"
        ],
        regex_patterns=[
            r"\b(describe|struktur|detail|skema|kolom)\s+(tabel|table)\b",
            r"\b(tabel|table)\s+([a-zA-Z0-9_]+)\s+(kolom|struktur|isi)\b"
        ],
        default_tools=[("db_describe_table", {})],
        weight=2.4,
        description="Inspeksi detail kolom, tipe data, dan sampel baris tabel tertentu"
    ),
    IntentRule(
        name="cek_overview_schema",
        target_route="mcp",
        keywords=[
            "overview database", "peta database", "ringkasan database", "arsitektur database",
            "domain database", "modul database"
        ],
        regex_patterns=[
            r"\b(overview|peta|ringkasan|arsitektur)\s+(database|skema|erd)\b"
        ],
        default_tools=[("db_get_schema_overview", {})],
        weight=2.3,
        description="Peta gambaran besar modul bisnis dan alur transaksi database"
    ),
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
        name="cek_do_pengiriman",
        target_route="mcp",
        keywords=[
            "cek do", "do", "surat jalan", "delivery order", "do hari ini", "pengiriman hari ini",
            "status do", "status pengiriman", "surat jalan hari ini", "do keluar", "do pengiriman",
            "lihat do", "monitoring do", "tracking do", "sj", "surat jalan keluar", "sj keluar",
            "cek surat jalan", "daftar do", "list do", "pengiriman", "distribusi do", "lacak do"
        ],
        regex_patterns=[
            r"\b(cek|lihat|tampilkan|daftar|pantau|lacak|cari)?\s*(do|surat\s+jalan|delivery\s+order|sj)\b",
            r"\b(do|surat\s+jalan|delivery\s+order)\s+(hari ini|kemarin|terbaru|status|keluar|pending|selesai|sampit|makassar|banjarmasin)\b",
            r"\b(pengiriman|distribusi)\s+(hari ini|barang|pelumas|do)\b"
        ],
        default_tools=[("get_delivery_orders", {})],
        weight=2.5,
        description="Monitoring Surat Jalan (DO / Delivery Order), tracking pengiriman, sopir, armada, dan volume dalam Liter"
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


# ─── Multi-Tier Scoring Engine Definitions ────────────────────────────────────
# Each intent has: positive keywords with weights, negative keywords (penalizers),
# abbreviation keywords (always low weight=1), and tools to call.
# Architecture follows user's recommendation:
#   Tokenize → Score each intent → Apply negatives → Confidence threshold → Tool

SCORED_INTENTS = [
    {
        "name": "scm_management_review",
        "route": "mcp",
        "tools": [("get_inventory_summary", {}), ("get_inventory_aging_batch", {"min_days": 150}), ("get_delivery_orders_by_date", {"limit": 10})],
        "positives": {
            # High confidence: explicit domain terms
            "scm review": 6, "supply chain review": 7, "management review": 6,
            "laporan scm": 6, "executive slide scm": 6,
            "scm runrate": 6, "dead stock rate performance": 6, "delivery otif": 6,
            "status pengiriman outbound": 6, "outbound": 4, "runrate": 4,
            "category ratio": 5, "kategori umur persediaan": 5,
            "good stock": 4, "over stock": 4, "dead stock rate": 5, "otif": 4,
            # Context: refers to a previous report/image (moderate/high weight)
            "seperti gambar": 5, "seperti pada gambar": 5, "gambar sebelumnya": 5,
            "sesuai gambar": 5, "sesuai format gambar": 5, "format gambar yang saya kirim": 5,
            "format gambar": 4, "pada gambar": 3,
            "buatkan laporan scm": 6, "buatkan review scm": 6,
            # Abbreviation: low weight
            "scm": 2,
        },
        "negatives": {"piutang": -4, "aging piutang": -6, "ar": -3, "receivable": -5,
                       "invoice": -3, "faktur": -3, "stok kritis": -3},
        "abbreviations": {"scm": 1},  # Already included above but re-noted
        "description": "Supply Chain Management Review Eksekutif (SOH Runrate, Dead Stock Rate, OTIF)"
    },
    {
        "name": "cek_ar_aging",
        "route": "mcp",
        "tools": [("get_ar_piutang_aging", {})],
        "positives": {
            # Explicit financial terms: very high weight
            "aging piutang": 8, "piutang aging": 8, "umur piutang": 7,
            "overdue piutang": 7, "tunggakan": 6, "jatuh tempo": 5,
            "piutang berjalan": 6, "accounts receivable": 7, "receivable": 6,
            # Moderate
            "piutang": 5, "cek ar": 5, "ar aging": 5,
            # Abbreviation: VERY low weight to avoid false triggers
            "ar": 1,
        },
        "negatives": {
            # Penalize heavily if chart/stock context is present
            "chart": -5, "grafik": -5, "gambar": -4, "stok": -3, "stock": -3,
            "barang": -3, "inventory": -3, "pie": -4, "bar chart": -5,
            "scm": -4, "supply chain": -5, "runrate": -5, "otif": -5,
        },
        "abbreviations": {"ar": 1},
        "description": "Aging piutang / Accounts Receivable - status tunggakan pelanggan"
    },
    {
        "name": "cek_stok",
        "route": "mcp",
        "tools": [("get_inventory_summary", {}), ("get_product_stock", {})],
        "positives": {
            "cek stok": 5, "cek stock": 5, "stok barang": 5, "stock barang": 5,
            "stok gudang": 5, "stock gudang": 5, "daftar stok": 5, "daftar stock": 5,
            "posisi stok": 5, "sisa stok": 5, "ketersediaan": 4, "on hand": 4,
            "inventory": 3, "stok": 3, "stock": 3, "persediaan": 3, "available": 2,
        },
        "negatives": {
            "aging": -6, "umur": -4, "slow moving": -5, "dead stock": -5, "deadstock": -5, "kritis": -2,
            "piutang": -3, "ar aging": -4,
        },
        "abbreviations": {},
        "description": "Pengecekan stok & inventori real-time per gudang"
    },
    {
        "name": "cek_stock_aging",
        "route": "mcp",
        "tools": [("get_inventory_aging_batch", {})],
        "positives": {
            "aging stock": 8, "aging stok": 8, "stock aging": 8, "stok aging": 8,
            "aging barang": 8, "umur stok": 8, "umur barang": 7, "umur persediaan": 7,
            "aging diatas": 8, "aging >": 8, "aging lebih dari": 8,
            "memiliki aging": 8, "ada aging": 7, "dead stock": 8, "deadstock": 8,
            "slow moving": 7, "stok lama": 6, "barang lama": 6, "stok mengendap": 6,
            "aging persediaan": 7,
            # Generic aging keyword — moderate weight
            "aging": 4,
        },
        "negatives": {
            "piutang": -5, "ar aging": -7, "accounts receivable": -6,
            "tunggakan": -4, "jatuh tempo": -3,
        },
        "abbreviations": {},
        "description": "Stock Aging - umur persediaan, slow moving, dead stock"
    },
    {
        "name": "cek_stok_kritis",
        "route": "mcp",
        "tools": [("get_low_stock_alerts", {})],
        "positives": {
            "stok kritis": 7, "stok habis": 7, "menipis": 6, "low stock": 6,
            "reorder point": 6, "safety stock": 5, "out of stock": 6, "rop": 4,
            "stok kurang": 5, "habis": 4,
        },
        "negatives": {"aging": -2, "piutang": -4, "ar": -3},
        "abbreviations": {"rop": 3},
        "description": "Alert stok menipis dan reorder point"
    },
    {
        "name": "cek_do_pengiriman",
        "route": "mcp",
        "tools": [("get_delivery_orders", {})],
        "positives": {
            "surat jalan": 6, "delivery order": 6, "surat jalan keluar": 7,
            "monitoring do": 6, "tracking do": 6, "daftar do": 5, "list do": 5,
            "cek do": 5, "lihat do": 5, "pengiriman hari ini": 5,
            "do keluar": 5, "do pengiriman": 5, "lacak do": 5, "do hari ini": 5,
            "status pengiriman": 4, "pengiriman": 3, "distribusi do": 4,
            # Abbreviations: low weight
            "do": 1, "sj": 2,
        },
        "negatives": {"piutang": -4, "ar": -3, "invoice": -2, "stok kritis": -3},
        "abbreviations": {"do": 1, "sj": 2},
        "description": "Monitoring Surat Jalan (DO), pengiriman, sopir, armada"
    },
    {
        "name": "cek_invoice",
        "route": "mcp",
        "tools": [("get_invoices", {"limit": 10})],
        "positives": {
            "faktur penjualan": 6, "cek invoice": 6, "daftar invoice": 6,
            "nomor faktur": 5, "faktur pajak": 5, "cek faktur": 5, "invoice": 4,
            "faktur": 3, "tagihan": 3, "billing": 3, "nota": 2,
        },
        "negatives": {"piutang aging": -4, "aging piutang": -4, "ar aging": -4},
        "abbreviations": {},
        "description": "Daftar faktur/invoice penjualan"
    },
    {
        "name": "cek_customer",
        "route": "mcp",
        "tools": [("get_customer_detail", {}), ("get_customer_intelligence_dashboard", {})],
        "positives": {
            "data customer": 6, "profil customer": 6, "customer intelligence": 6,
            "cek customer": 5, "daftar customer": 5, "pelanggan": 4, "outlet": 4,
            "customer": 3, "klien": 3, "buyer": 3, "toko": 2,
        },
        "negatives": {"piutang": -2, "aging": -2},
        "abbreviations": {},
        "description": "Profil customer, riwayat transaksi, dan limit piutang"
    },
    {
        "name": "dashboard_kpi",
        "route": "mcp",
        "tools": [("get_main_dashboard", {}), ("get_picture_of_success", {})],
        "positives": {
            "picture of success": 6, "main dashboard": 5, "kpi yang sudah tersedia": 5,
            "ringkasan eksekutif": 4, "indikator kinerja": 4, "dashboard": 3,
            "grafik": 2, "kpi": 2, "chart": 2, "indikator": 2,
        },
        "negatives": {"scm review": -4, "piutang": -3, "ar aging": -4, "supply chain": -3},
        "abbreviations": {"kpi": 1},
        "description": "Dashboard visual, KPI, dan grafik operasional"
    },
    {
        "name": "omzet_sales_summary",
        "route": "mcp",
        "tools": [("get_sales_summary", {})],
        "positives": {
            "total penjualan": 6, "omzet penjualan": 6, "revenue penjualan": 6,
            "sales summary": 5, "omzet": 5, "omset": 5, "revenue": 4,
            "pendapatan": 4, "penjualan": 3,
        },
        "negatives": {"piutang": -3, "ar": -2, "stok": -2},
        "abbreviations": {},
        "description": "Ringkasan omzet dan transaksi penjualan aktual"
    },
    {
        "name": "cek_batch",
        "route": "mcp",
        "tools": [("get_inventory_aging_batch", {})],
        "positives": {
            "cek batch": 6, "nomor batch": 6, "exp date": 6, "expired": 5,
            "kadaluarsa": 5, "masa simpan": 5, "lot": 4, "batch": 4,
        },
        "negatives": {"piutang": -4, "ar": -3},
        "abbreviations": {},
        "description": "Pemantauan batch, lot, dan tanggal kedaluwarsa produk"
    },
    {
        "name": "cek_warehouse",
        "route": "mcp",
        "tools": [("get_warehouse_list", {})],
        "positives": {
            "daftar gudang": 6, "list gudang": 6, "master gudang": 6, "semua gudang": 5,
            "lokasi gudang": 5, "cek warehouse": 5, "ada gudang apa": 5,
            "gudang": 2, "warehouse": 2, "depo": 2,
        },
        "negatives": {"piutang": -3, "ar": -2},
        "abbreviations": {},
        "description": "Daftar master gudang dan titik distribusi"
    },
    {
        "name": "cek_daftar_tabel",
        "route": "mcp",
        "tools": [("db_list_tables", {})],
        "positives": {
            "daftar tabel": 6, "list tabel": 6, "tabel apa saja": 6, "ada tabel apa": 6,
            "show tables": 5, "list tables": 5, "tampilkan semua tabel": 5, "semua tabel": 5,
            "tabel di database": 5,
        },
        "negatives": {},
        "abbreviations": {},
        "description": "Daftar seluruh tabel database"
    },
]

# Export intents remain as separate high-priority overrides
EXPORT_SCORED_INTENTS = [
    {
        "name": "export_excel",
        "format": "excel",
        "tokens": [
            "export excel", "unduh excel", "download excel", "format excel", ".xlsx", "tarik excel",
            "excel", "file excel", "ke excel", "dalam format excel", "dalam bentuk excel", "bentuk excel",
            "ekspor excel", "versi excel", "dokumen excel"
        ],
        "patterns": [
            r"\b(export|unduh|download|tarik|cetak|buat|buatkan|ekspor)\s+.*?\b(excel|\.xlsx|spreadsheet)\b",
            r"\b(format|file|bentuk|versi|dokumen)\s+excel\b",
            r"\bdalam\s+(format|bentuk)\s+excel\b",
            r"\b(ke|dalam)\s+(excel|\.xlsx)\b",
            r"\bexcel\b"
        ],
    },
    {
        "name": "export_pdf",
        "format": "pdf",
        "tokens": [
            "export pdf", "unduh pdf", "download pdf", "format pdf", ".pdf", "cetak pdf",
            "pie chart pdf", "bar chart pdf", "chart pdf", "buat pdf", "buatkan pdf",
            "dalam format pdf", "format pdf berupa", "dalam bentuk pdf", "bentuk pdf",
            "file pdf", "dokumen pdf", "versi pdf", "ke pdf", "ekspor pdf", "pdf"
        ],
        "patterns": [
            r"\b(export|unduh|download|tarik|cetak|buat|buatkan|kirim|jadikan|konversi|hasilkan|simpan|ekspor)\s+.*?\b(pdf|\.pdf)\b",
            r"\b(format|file|dokumen|bentuk|versi)\s+pdf\b",
            r"\bdalam\s+(format|bentuk)\s+pdf\b",
            r"\b(ke|dalam)\s+pdf\b",
            r"\bpdf\b"
        ],
    },
]

# Reasoning intent: activated by explicit analysis-request keywords
REASONING_TRIGGERS = [
    (r"\b(mengapa|kenapa|apa penyebab|faktor apa)\b", "root_cause_analysis", 5.0),
    (r"\b(analisa|analisis|rekomendasi|rekomendasikan|strategi|berikan saran|langkah apa)\b", "business_strategy_recommendation", 4.5),
    (r"\b(prediksi|forecasting|ramalan|proyeksi)\b", "forecasting_prediction", 4.0),
    (r"\b(optimasi|optimalisasi|bandingkan|perbandingan|evaluasi|komparasi)\b", "optimization_comparison", 4.0),
    (r"\b(ringkasan manajemen|executive summary|laporan eksekutif|kesimpulan direksi)\b", "executive_summary", 5.0),
    # Data Management & Custom Database Query Assistance
    (r"\b(kelola|mengelola|pengelolaan|olah|manipulasi|filter|update|koreksi|proses)\s+(data|tabel|database|stok|persediaan|transaksi)\b", "database_query_assistance", 5.5),
    (r"\b(kelola\s+data|mengelola\s+data|bisa\s+kelola\s+data|bisa\s+mengelola\s+data|bukan\s+hanya\s+menampilkan\s+data)\b", "database_query_assistance", 5.5),
    (r"\b(struktur|skema)\s+(database|tabel|db)\b", "database_schema_dictionary", 5.5),
    (r"\b(arti|maksud)\s+(kolom|tabel|data)\b", "database_schema_dictionary", 5.0),
    (r"\b(query|select|sql|kueri)\s+(dari\s+)?(database|tabel|db)\b", "database_query_assistance", 5.5),
    (r"\b(bantu|buatkan|tuliskan|jalankan|eksekusi)\s+(query|sql|kueri)\b", "database_query_assistance", 5.0),
    (r"\b(logika|alur|relasi)\s+(database|data|tabelnya?)\b", "database_schema_dictionary", 4.5),
]

# Map reasoning intent name → default tools
REASONING_TOOLS: Dict[str, List[Tuple[str, Dict]]] = {
    "root_cause_analysis": [("get_inventory_summary", {}), ("get_sales_summary", {})],
    "business_strategy_recommendation": [("get_picture_of_success", {}), ("get_sales_performance_intelligence", {})],
    "forecasting_prediction": [("get_demand_forecast", {}), ("get_forecast_dashboard_summary", {})],
    "optimization_comparison": [("get_inventory_summary", {}), ("get_sales_performance_intelligence", {})],
    "executive_summary": [("get_main_dashboard", {}), ("get_picture_of_success", {})],
    "database_schema_dictionary": [("db_get_schema_overview", {}), ("db_list_tables", {})],
    "database_query_assistance": [("db_describe_table", {}), ("db_execute_query", {}), ("db_list_tables", {})],
}


# ─── Intent Router Implementation ─────────────────────────────────────────────

class IntentRouter:
    """
    Multi-Tier Scoring Intent Router — PADI ERP AI.
    Implements user's recommended architecture:
      1. Tokenization (not substring matching)
      2. Per-intent weighted scoring (not if-else)
      3. Short abbreviations always assigned low weight (1 point)
      4. Negative keywords penalize conflicting intents
      5. Confidence threshold (≥0.8 → call tool; <0.6 → ask clarification)
      6. Intent and Entity are extracted separately
      7. LLM called ONLY after tool executes (never before)
    """

    # Confidence thresholds
    CONFIDENCE_CALL_THRESHOLD = 0.80   # ≥ this → call tool immediately
    CONFIDENCE_CLARIFY_THRESHOLD = 0.60  # < this → ask clarification
    # Between 0.60 and 0.80 → proceed cautiously (route to best match)

    def __init__(self):
        # No longer uses old IntentRule list; uses SCORED_INTENTS and EXPORT_SCORED_INTENTS
        pass

    # ── Tokenizer ──────────────────────────────────────────────────────────────
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Split text into word tokens for matching — avoids substring false positives."""
        return re.findall(r"\w+", text.lower())

    @staticmethod
    def _token_set(text: str) -> set:
        return set(IntentRouter._tokenize(text))

    def _word_in_text(self, word: str, text: str) -> bool:
        """
        Exact word-boundary match.
        Short abbreviations (≤3 chars) require strict \b boundary.
        Multi-word phrases use phrase-in-text check.
        Example: 'ar' matches 'ar piutang' but NOT 'gambar' or 'cgart'.
        """
        if " " in word:
            # Multi-word phrase: match as sequence, boundary-safe
            pattern = r"\b" + r"\s+".join(re.escape(w) for w in word.split()) + r"\b"
            return bool(re.search(pattern, text, re.IGNORECASE))
        # Single word: always boundary match
        return bool(re.search(r"\b" + re.escape(word) + r"\b", text, re.IGNORECASE))

    # ── Core Scoring Engine ───────────────────────────────────────────────────
    def _compute_intent_scores(
        self, clean_text: str
    ) -> List[Tuple[str, float, dict]]:
        """
        Step 1: For each defined SCORED_INTENT, accumulate a weighted score.
        Step 2: Subtract negative keyword penalties.
        Step 3: Return sorted list of (intent_name, net_score, intent_def).

        Abbreviations always contribute only 1 point regardless of how
        they appear — they cannot override explicit intent signals.
        """
        results = []
        for intent in SCORED_INTENTS:
            score = 0.0
            matched_pos = []
            matched_neg = []

            # Positive scoring
            for phrase, weight in intent["positives"].items():
                if self._word_in_text(phrase, clean_text):
                    # Check if this phrase is an abbreviation → cap weight at 1
                    is_abbrev = phrase in intent.get("abbreviations", {})
                    effective_weight = 1.0 if is_abbrev else float(weight)
                    score += effective_weight
                    matched_pos.append((phrase, effective_weight))

            # Regex pattern boost for composite stock aging intents
            if intent["name"] == "cek_stock_aging":
                if re.search(r"\b(stock|stok|barang|persediaan)\b.*\b(aging|umur|slow.?moving|dead.?stock)\b", clean_text) or \
                   re.search(r"\b(aging|umur|slow.?moving|dead.?stock)\b.*\b(stock|stok|barang|persediaan)\b", clean_text) or \
                   re.search(r"\baging\s+(\d+|diatas|lebih|>)", clean_text):
                    score += 8.0
                    matched_pos.append(("composite_stock_aging_pattern", 8.0))

            # Negative penalties (apply only if positive score > 0 to avoid noise)
            if score > 0:
                for phrase, penalty in intent.get("negatives", {}).items():
                    if self._word_in_text(phrase, clean_text):
                        score += float(penalty)  # penalty is already negative
                        matched_neg.append((phrase, penalty))

            if score > 0:
                results.append((intent["name"], score, intent, matched_pos, matched_neg))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def _compute_reasoning_score(self, clean_text: str) -> Tuple[float, str, List[Tuple[str, Dict]]]:
        """
        Score reasoning triggers. Returns (best_score, intent_name, tools).
        """
        best_score = 0.0
        best_name = "business_reasoning"
        for pattern, intent_name, weight in REASONING_TRIGGERS:
            if re.search(pattern, clean_text, re.IGNORECASE):
                if weight > best_score:
                    best_score = weight
                    best_name = intent_name
        tools = REASONING_TOOLS.get(best_name, [])
        return best_score, best_name, tools

    def _compute_confidence(self, top_score: float, second_score: float) -> float:
        """
        Confidence = sigmoid-like transform of top_score.
        Penalty applied if top and second scores are close (ambiguity).
        """
        # Base confidence from score magnitude
        base = min(0.98, 0.50 + (top_score * 0.06))
        # Ambiguity penalty: if 2nd intent is within 80% of top, reduce confidence
        if second_score > 0 and (second_score / top_score) > 0.80:
            base -= 0.10
        return max(0.0, round(base, 3))

    def _generate_clarification(self, top_two: list) -> str:
        """Generate a clarification question when confidence is too low."""
        if len(top_two) >= 2:
            n1 = top_two[0][0].replace("_", " ").title()
            n2 = top_two[1][0].replace("_", " ").title()
            desc1 = top_two[0][2].get("description", n1)
            desc2 = top_two[1][2].get("description", n2)
            return (
                f"❓ Saya memiliki dua interpretasi yang sama kuat untuk pertanyaan Anda:\n\n"
                f"**Opsi 1** — **{n1}**: {desc1}\n"
                f"**Opsi 2** — **{n2}**: {desc2}\n\n"
                f"Mohon perjelas maksud Anda agar saya dapat memberikan data yang tepat."
            )
        return (
            "❓ Maaf, saya kurang yakin dengan maksud pertanyaan Anda. "
            "Bisakah Anda menjelaskan lebih spesifik — "
            "misalnya apakah Anda mencari data **stok**, **piutang**, **pengiriman**, atau **laporan SCM**?"
        )

    # ── Action Classifier & Capability Matrix ──────────────────────────────────
    ANALYSIS_VERB_PATTERNS = [
        r"\b(analisa|analisis|review|evaluasi|eval|komparasi|perbandingan|bandingkan)\b",
        r"\b(rekomendasi|rekomendasikan|saran|strategi|solusi|langkah\s+apa)\b",
        r"\b(mengapa|kenapa|penyebab|sebab|latar\s+belakang|faktor|alasan|kesimpulan)\b",
        r"\b(prediksi|forecasting|ramalan|proyeksi|estimasi\s+ke\s+depan)\b",
        r"\b(optimasi|optimalisasi|telaah|efisiensi)\b",
        r"\b(memudahkan\s+pembacaan|mudah\s+dibaca|metode\s+baca|metode)\b",
        r"\b(kelola\s+data|mengelola\s+data|olah\s+data)\b",
        r"\b(struktur|skema|relasi|erd|kamus\s+data)\s+(database|tabel|db)\b",
        r"\b(arti|maksud)\s+(kolom|tabel|data)\b",
    ]

    GENERATE_VERB_PATTERNS = [
        r"\b(coba\s+buatkan|buatkan\s+saya|tolong\s+buatkan|bisa\s+buatkan|buatkan|susun|sajikan|siapkan|hasilkan|generate)\b",
    ]

    EXPORT_VERB_PATTERNS = [
        r"\b(export|ekspor|unduh|download|tarik\s+data|cetak)\b",
    ]

    REPORT_NOUN_PATTERNS = [
        r"\b(laporan|report|rekap|rekapitulasi|dokumen|lembar)\b",
    ]

    RETRIEVAL_VERB_PATTERNS = [
        r"\b(cek|lihat|tampilkan|daftar|list|cari|pantau|monitoring|lacak|status|ada\s+berapa|posisi)\b",
    ]

    PRESENTATION_PATTERNS = {
        "table": r"\b(table|tabel)\b",
        "chart": r"\b(chart|grafik|diagram)\b",
        "pie_chart": r"\b(pie\s*chart|diagram\s*lingkaran|pie)\b",
        "bar_chart": r"\b(bar\s*chart|diagram\s*batang|batang)\b",
        "trend_line": r"\b(line\s*chart|tren|trend|garis)\b",
        "easy_reading": r"\b(memudahkan\s+pembacaan|mudah\s+dibaca|metode)\b",
        "executive_summary": r"\b(ringkasan\s+eksekutif|executive\s+summary|kesimpulan\s+manajemen)\b",
    }

    TRANSFORMATION_PATTERNS = [
        # HTML & Web Code formatting
        r"\b(ubah|ganti|edit|buatkan|bikin|format|sesuaikan|konversi|tata)\s+(ke\s+)?(html|css|styling|kode|script|web|website|mockup)\b",
        r"\b(tampilan\s+html|format\s+html|file\s+html|dokumen\s+html|kode\s+html)\b",
        r"\b(ubah\s+html|edit\s+html|buatkan\s+html|bikin\s+html)\b",
        # Presentation & Layout
        r"\b(powerpoint|ppt|slide|presentasi|dark\s*mode|tema\s+gelap|tema\s+terang)\b",
        r"\b(ubah|perbaiki|rapikan|baguskan|percantik|desain|tata\s+letak)\s+(tampilan|layout|desain|format|posisi|tabel)\b",
        r"\b(buat\s+lebih\s+menarik|lebih\s+menarik|beautify|redesign|format\s+ulang)\b",
        r"\b(executive\s+dashboard|dashboard\s+eksekutif|ubah\s+menjadi\s+website)\b",
        # Binding to Uploaded File / Image
        r"\b(sesuaikan|sesuai|seperti|berdasarkan|mengikuti|pake|pakai|gunakan)\s+(dengan\s+)?(file|gambar|foto|html|lampiran|upload|unggahan)\b",
        r"\b(file|gambar|foto|html|lampiran)\s+(yang\s+saya\s+(upload|kirim|unggah))\b",
        r"\b(seperti\s+pada\s+gambar|sesuai\s+gambar|pada\s+gambar|format\s+gambar)\b",
        r"\b(sesuai\s+(dengan\s+)?format\s+gambar)\b",
        # Editing existing output
        r"\b(dari\s+(data|laporan|hasil)\s+(di\s+atas|sebelumnya|tadi))\s+(ubah|jadikan|format|buatkan)\b",
        r"\b(bukan\s+hanya\s+menampilkan\s+data|mengelola\s+data|bisa\s+kelola\s+data)\b",
        # UI Feature Engineering / Multi-Filter / Search & Selection Features
        r"\b(buat|buatkan|bikin|tambah|tambahkan|pasang|desain|implementasikan|kembangkan)\s+(fitur\s+)?(filter|multiple\s+filter|multi\s+filter|pencarian|search|pilihan|multiple\s+selection|seleksi)\b",
        r"\b(multiple\s+filter|multi\s+filter|input\s+pencarian|filter\s+transaksi|pilihan\s+dari\s+beberapa\s+transaksi|pilih\s+transaksi)\b",
        r"\b(agar|bisa|dapat)\s+(mencari\s+dengan\s+mengim?put|membuat\s+pilihan|mencari|filter|pilih\s+transaksi)\b",
        r"\b(monitoring\s+distribusi).*?(buat\s+filter|multiple\s+filter|fitur\s+filter|pencarian)\b",
    ]

    def _classify_actions(self, text: str) -> Dict[str, Any]:
        """Classifies requested actions with verb priority over noun domains."""
        transformation_hits = []
        for pat in self.TRANSFORMATION_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                transformation_hits.append(m.group(0))

        analysis_hits = []
        for pat in self.ANALYSIS_VERB_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                analysis_hits.append(m.group(0))

        generate_hits = []
        for pat in self.GENERATE_VERB_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                generate_hits.append(m.group(0))

        export_hits = []
        for pat in self.EXPORT_VERB_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                export_hits.append(m.group(0))

        report_hits = []
        for pat in self.REPORT_NOUN_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                report_hits.append(m.group(0))

        retrieval_hits = []
        for pat in self.RETRIEVAL_VERB_PATTERNS:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                retrieval_hits.append(m.group(0))

        # Check export format
        export_format = None
        if re.search(r"\b(pdf|\.pdf|format\s+pdf|file\s+pdf|dokumen\s+pdf|bentuk\s+pdf)\b", text, re.IGNORECASE):
            export_format = "pdf"
        elif re.search(r"\b(excel|\.xlsx|format\s+excel|file\s+excel|dokumen\s+excel|spreadsheet|bentuk\s+excel)\b", text, re.IGNORECASE):
            export_format = "excel"

        # Check presentation requirements
        presentation = []
        for p_name, p_pat in self.PRESENTATION_PATTERNS.items():
            if re.search(p_pat, text, re.IGNORECASE):
                presentation.append(p_name)

        return {
            "transformation_hits": transformation_hits,
            "analysis_hits": analysis_hits,
            "generate_hits": generate_hits,
            "export_hits": export_hits,
            "report_hits": report_hits,
            "retrieval_hits": retrieval_hits,
            "export_format": export_format,
            "presentation": presentation
        }

    def _build_task_plan(
        self,
        action_type: str,
        domain_name: str,
        tool_name: str,
        export_format: Optional[str],
        presentation: List[str]
    ) -> List[str]:
        """Constructs an execution task plan based on user goals and capability matrix."""
        if action_type == "transform":
            return [
                "1. Kunci pemanggilan MCP (Tool Lock: ON, Need Data: NO)",
                f"2. Ikat sumber utama ke '{domain_name}' dengan prioritas tertinggi (Priority: 100)",
                "3. Abaikan riwayat data/laporan lama (Allow Previous Context: False)",
                "4. Lakukan transformasi pengetahuan/format/HTML sesuai preferensi pengguna"
            ]
        elif action_type == "hybrid":
            pres_str = ", ".join(presentation) if presentation else "table, visual chart & executive analysis"
            return [
                f"1. Ambil dataset operasional domain '{domain_name}' via MCP Tool '{tool_name}'",
                f"2. Minta LLM (DeepSeek) melakukan evaluasi analitis mendalam & rekomendasi strategis (format: {pres_str})",
                f"3. Susun dokumen visual {export_format.upper() if export_format else 'PDF'} terformat dengan grafik chart via PADI Report Engine",
                "4. Sajikan insight eksekutif lengkap di chatbox dan sediakan kartu unduhan dokumen"
            ]
        elif action_type == "analysis":
            return [
                f"1. Ambil data operasional domain '{domain_name}' via MCP Tool '{tool_name}'",
                "2. Minta LLM (DeepSeek) menganalisis akar masalah, tren, dan menyusun rekomendasi bisnis",
                "3. Tampilkan hasil analisis komprehensif langsung di chatbox"
            ]
        elif action_type == "report":
            return [
                f"1. Tarik dataset '{domain_name}' via MCP Tool '{tool_name}'",
                f"2. Ekspor ke dokumen format {export_format.upper() if export_format else 'EXCEL'} via Report Engine (0 Token LLM)",
                "3. Sediakan tautan unduh instan kepada pengguna"
            ]
        else:  # retrieval
            return [
                f"1. Tarik data operasional real-time '{domain_name}' via PADI MCP Server & Redis Cache",
                "2. DeepSeek LLM membaca data konteks MCP dan menyusun respons kontekstual cerdas (ChatGPT Style)"
            ]

    def route(self, user_message: str, messages: Optional[List[Any]] = None, has_attachment: bool = False) -> IntentRouteResult:
        """
        Main routing method — 4-Class Architecture (Retrieval, Report, Analysis, Hybrid, Transform)
        with Verb Priority, Capability Matrix, Need Data Detector, and Task Planner.
        """
        clean_text = user_message.strip().lower()
        if not clean_text:
            if has_attachment:
                return IntentRouteResult(
                    route="llm",
                    intent="document_inquiry",
                    confidence=1.0,
                    matched_tools=[],
                    requires_llm=True,
                    action_type="analysis",
                    domain="document",
                    reason="File terlampir tanpa teks, diproses untuk analisis ringkasan dokumen"
                )
            return IntentRouteResult(
                route="clarification",
                intent="general_help",
                confidence=1.0,
                matched_tools=[],
                faq_data={
                    "title": "Bantuan PADI AI",
                    "answer": "Halo! Ada yang bisa saya bantu terkait data stok, surat jalan (DO), invoice piutang, atau analisis ERP PADI? Silakan ajukan pertanyaan Anda.",
                    "content": "Halo! Ada yang bisa saya bantu terkait data stok, surat jalan (DO), invoice piutang, atau analisis ERP PADI? Silakan ajukan pertanyaan Anda."
                },
                requires_llm=False,
                reason="Pesan kosong, berikan salam dan panduan bantuan"
            )

        # ─ Layer 0: Synonym normalization ──────────────────────────────────────
        SYNONYM_MAP = {
            r"\bcgart\b": "chart",
            r"\bstcok\b": "stok",
            r"\bdo\s+hari\s+ini\b": "delivery order hari ini",
            r"\bsj\b": "surat jalan",
        }
        normalized = clean_text
        for pat, replacement in SYNONYM_MAP.items():
            normalized = re.sub(pat, replacement, normalized, flags=re.IGNORECASE)

        # ─ Layer 1: FAQ Cache (0 DB, 0 LLM) ───────────────────────────────────
        from app.services.faq_cache import faq_cache
        faq_match = faq_cache.lookup(normalized)
        if faq_match:
            return IntentRouteResult(
                route="faq",
                intent="FAQ",
                confidence=1.0,
                matched_tools=[],
                faq_data=faq_match,
                requires_llm=False,
                action_type="retrieval",
                need_data=False,
                need_llm=False,
                need_report=False,
                task_plan=["1. Temukan jawaban terminologi ERP via FAQ Cache"],
                reason=f"Terminologi ERP PADI ('{faq_match['title']}')."
            )

        # ─ Layer 2: Greeting shortcut ──────────────────────────────────────────
        greeting_match = re.search(
            r"^(hai|halo|hallo|hi|selamat\s+(pagi|siang|sore|malam)|assalamu|ping)\b",
            normalized
        )
        if greeting_match:
            return IntentRouteResult(
                route="clarification",
                intent="greeting",
                confidence=0.97,
                matched_tools=[],
                faq_data={
                    "title": "Salam",
                    "answer": "Halo! Saya PADI AI Assistant. Saya siap membantu Anda mengakses data persediaan stok, surat jalan (DO), invoice piutang, mutasi, master gudang, serta analisa performa bisnis ERP PADI. Ada yang bisa saya bantu?",
                    "content": "Halo! Saya PADI AI Assistant. Saya siap membantu Anda mengakses data persediaan stok, surat jalan (DO), invoice piutang, mutasi, master gudang, serta analisa performa bisnis ERP PADI. Ada yang bisa saya bantu?"
                },
                requires_llm=False,
                action_type="retrieval",
                need_data=False,
                need_llm=False,
                need_report=False,
                task_plan=["1. Jawab salam pembuka"],
                reason="Sapaan umum dilayani langsung tanpa pemanggilan tool sesi."
            )

        # ─ Layer 2B: Download / Path Inquiry Shortcut ─────────────────────────
        is_download_inquiry = bool(re.search(
            r"\b(bagaimana\s+cara|cara\s+download|cara\s+unduh|link\s+download|mana\s+link|link\s+unduh|download\s+pdfnya|unduh\s+pdfnya|dimana\s+download|dimana\s+saya\s+bisa|pathnya\s+dimana|pathnya|lokasi\s+file|lokasi\s+path|path\s+file|simpan\s+dimana|tersimpan\s+dimana|bisa\s+download)\b",
            normalized,
            re.IGNORECASE
        )) or (
            bool(re.search(r"\b(dimana|mana|bagaimana|cara|path|lokasi)\b", normalized))
            and bool(re.search(r"\b(download|unduh|file|pdf|laporan)\b", normalized))
        )
        if is_download_inquiry:
            return IntentRouteResult(
                route="transform",
                intent="download_guide",
                confidence=0.99,
                matched_tools=[],
                requires_llm=True,
                action_type="retrieval",
                need_data=False,
                need_llm=True,
                need_report=False,
                tool_lock=True,
                source_binding="conversation_history",
                allow_previous_context=True,
                task_plan=[
                    "1. Temukan dokumen/link unduhan terakhir di konteks percakapan",
                    "2. Berikan tautan dan lokasi file fisik di server (Need Data: NO, Tool Lock: ON)"
                ],
                reason="Permintaan akses unduhan/lokasi file laporan terdeteksi. Need Data: NO, Tool Lock: ON (0 MCP Call)."
            )

        # ─ Layer 3: Action Classification & Verb Priority ──────────────────────
        action_info = self._classify_actions(normalized)
        analysis_hits = action_info["analysis_hits"]
        generate_hits = action_info["generate_hits"]
        export_hits = action_info["export_hits"]
        report_hits = action_info["report_hits"]
        retrieval_hits = action_info["retrieval_hits"]
        export_format = action_info["export_format"]
        presentation = action_info["presentation"]

        # ─ Layer 4: Multi-tier Domain & Tool Scoring ──────────────────────────
        reasoning_score, reasoning_name, reasoning_tools = self._compute_reasoning_score(normalized)
        scored = self._compute_intent_scores(normalized)
        underlying_export_tool = self._find_export_underlying_tool(normalized, messages=messages)

        scores: Dict[str, float] = {"llm_reasoning": reasoning_score}
        for entry in scored:
            scores[entry[0]] = round(entry[1], 2)

        # Determine primary domain intent
        if scored:
            primary_intent = scored[0][0]
            top_score = scored[0][1]
            tools = [{"name": t_name, "args": t_args.copy()} for t_name, t_args in scored[0][2]["tools"]]
        else:
            primary_intent = underlying_export_tool["name"].replace("get_", "").replace("db_", "")
            top_score = 3.0
            tools = [underlying_export_tool]

        self._enhance_tool_arguments(normalized, primary_intent, tools)
        domain_tool_name = tools[0]["name"] if tools else underlying_export_tool["name"]

        # ─ Layer 5: Capability Matrix & Decision Engine ───────────────────────
        # ─ Layer 5A: Need Data Detector & Knowledge Transformation (Need Data = NO) ─
        # When user asks to edit HTML, modify layout, style, adapt uploaded file,
        # create presentation/PowerPoint, or adjust existing view:
        # MCP is LOCKED (Forbidden). The task is pure Knowledge Transformation.
        is_explicit_data_request = bool(
            re.search(r"\b(ambil data|tarik data|data baru|refresh|sinkron|update data|stok aktual|cek stok|lihat do|daftar invoice)\b", normalized)
        )
        transformation_hits = action_info.get("transformation_hits", [])
        if has_attachment and not is_explicit_data_request:
            transformation_hits.append("lampiran_file_aktif")

        if transformation_hits and not is_explicit_data_request:
            is_upload_ref = has_attachment or any(k in normalized for k in ["upload", "gambar", "foto", "lampiran", "html"])
            source_binding = "uploaded_file" if is_upload_ref else "presentation_transform"
            task_plan = self._build_task_plan("transform", source_binding, "None", export_format, presentation)
            return IntentRouteResult(
                route="transform",
                intent="knowledge_transformation",
                confidence=0.99,
                matched_tools=[],
                is_export=bool(export_format),
                export_format=export_format,
                requires_llm=True,
                action_type="transform",
                domain="presentation_transformation",
                presentation=presentation,
                need_data=False,
                need_llm=True,
                need_report=bool(export_format),
                source_binding=source_binding,
                allow_previous_context=False if is_upload_ref else True,
                tool_lock=True,
                task_plan=task_plan,
                reason=(
                    f"Permintaan transformasi pengetahuan & penyajian terdeteksi ({', '.join(transformation_hits[:2])}). "
                    f"Need Data: NO, Tool Lock: ON (Pemanggilan MCP dikunci, 0 DB Query)."
                ),
                scores=scores
            )

        has_format = export_format is not None
        has_presentation = len(presentation) > 0

        # Disambiguate noun vs verb for "review":
        # In "download review scm", "review" is a noun phrase (the name of the report),
        # whereas the operative verb is "download" (action = export/report).
        # In "buatkan review scm" or when presentation/methods are requested, it is analysis/hybrid.
        deep_analysis_terms = {
            "analisa", "analisis", "evaluasi", "komparasi", "perbandingan", "bandingkan",
            "mengapa", "kenapa", "penyebab", "rekomendasi", "strategi", "memudahkan pembacaan", "metode"
        }
        has_deep_analysis = any(h.lower() in deep_analysis_terms for h in analysis_hits)
        has_noun_review_only = (
            bool(analysis_hits) and not has_deep_analysis and all(h.lower() in ("review", "laporan") for h in analysis_hits)
        )

        has_generate_signals = bool(generate_hits)
        has_export_signals = bool(export_hits or has_format)

        # If user only said "download review scm" (export verb + noun review), treat as pure report
        if export_hits and has_noun_review_only and not has_generate_signals and not has_presentation:
            effective_analysis_signals = False
        else:
            effective_analysis_signals = bool(analysis_hits or reasoning_score > 0)

        # Class 4: HYBRID (MCP Data -> LLM Executive Analysis -> Report Engine PDF/Excel)
        # Triggered when:
        # a) User asks to "buatkan" / "review" / analyze AND requests PDF/Excel
        # b) User asks for report/review with explicit presentation format (chart, table, pie chart, bar chart, easy reading)
        is_hybrid_case = (
            (has_generate_signals or effective_analysis_signals) and (has_format or (has_presentation and (has_export_signals or report_hits)))
        ) or (
            has_generate_signals and has_format
        )

        if is_hybrid_case:
            target_format = export_format or "pdf"
            task_plan = self._build_task_plan("hybrid", primary_intent, domain_tool_name, target_format, presentation)
            return IntentRouteResult(
                route="hybrid",
                intent=primary_intent,
                confidence=0.98,
                matched_tools=tools,
                is_export=True,
                export_format=target_format,
                requires_llm=True,
                action_type="hybrid",
                domain=primary_intent,
                presentation=presentation,
                need_data=True,
                need_llm=True,
                need_report=True,
                task_plan=task_plan,
                reason=(
                    f"Permintaan analitis & format visual eksekutif ({', '.join(presentation) if presentation else target_format.upper()}) terdeteksi. "
                    f"Pipeline Hybrid: MCP Data -> LLM Executive Reasoning -> Report Engine {target_format.upper()}."
                ),
                scores=scores
            )

        # Class 3: ANALYSIS (MCP Data -> LLM Strategic Reasoning, 0 PDF)
        # Triggered when user asks for analysis, evaluation, reasoning without export format
        if effective_analysis_signals or (has_generate_signals and not has_format):
            task_plan = self._build_task_plan("analysis", primary_intent, domain_tool_name, None, presentation)
            r_confidence = min(0.99, 0.75 + reasoning_score * 0.05)
            return IntentRouteResult(
                route="llm",
                intent=reasoning_name if reasoning_score > top_score else primary_intent,
                confidence=r_confidence,
                matched_tools=tools,
                is_export=False,
                export_format=None,
                requires_llm=True,
                action_type="analysis",
                domain=primary_intent,
                presentation=presentation,
                need_data=True,
                need_llm=True,
                need_report=False,
                task_plan=task_plan,
                reason=f"Aspek analisa/reasoning bisnis terdeteksi. DeepSeek LLM mengevaluasi data operasional.",
                scores=scores
            )

        # Class 2: REPORT (MCP Data -> Report Engine, 0 Token LLM)
        # Triggered when user wants to export/download standard report without analytical synthesis
        if has_export_signals or report_hits:
            target_format = export_format or "excel"
            task_plan = self._build_task_plan("report", primary_intent, domain_tool_name, target_format, presentation)
            return IntentRouteResult(
                route="mcp",
                intent=f"export_{target_format}",
                confidence=0.97,
                matched_tools=tools,
                is_export=True,
                export_format=target_format,
                requires_llm=False,
                action_type="report",
                domain=primary_intent,
                presentation=presentation,
                need_data=True,
                need_llm=False,
                need_report=True,
                task_plan=task_plan,
                reason=f"Permintaan ekspor laporan {target_format.upper()} terdeteksi. PADI Report Engine — 0 LLM Token.",
                scores=scores
            )

        # Class 1: RETRIEVAL (MCP Grounding Context -> DeepSeek LLM Contextual Response)
        second_score = scored[1][1] if len(scored) > 1 else 0.0
        confidence = self._compute_confidence(top_score, second_score)

        if scored and confidence >= self.CONFIDENCE_CLARIFY_THRESHOLD:
            task_plan = self._build_task_plan("retrieval", primary_intent, domain_tool_name, None, presentation)
            return IntentRouteResult(
                route="mcp",
                intent=primary_intent,
                confidence=confidence,
                matched_tools=tools,
                is_export=False,
                export_format=None,
                requires_llm=True,
                action_type="retrieval",
                domain=primary_intent,
                presentation=presentation,
                need_data=True,
                need_llm=True,
                need_report=False,
                task_plan=task_plan,
                reason=f"Data operasional ('{primary_intent}') diambil via PADI MCP, kemudian DeepSeek menyusun jawaban cerdas & kontekstual (ChatGPT Grounded Style).",
                scores=scores
            )

        # Fallback / Clarification
        if scored and confidence < self.CONFIDENCE_CLARIFY_THRESHOLD:
            # If user attached a file or document is present, send to LLM for document comprehension
            if has_attachment:
                return IntentRouteResult(
                    route="llm",
                    intent="document_inquiry",
                    confidence=0.85,
                    matched_tools=[],
                    requires_llm=True,
                    action_type="analysis",
                    domain="document",
                    task_plan=["1. DeepSeek LLM memproses pertanyaan berdasarkan dokumen terlampir"],
                    reason="Terdapat dokumen terlampir, pertanyaan diproses oleh LLM dengan konteks dokumen.",
                    scores=scores
                )

            clarification = self._generate_clarification(scored[:2])
            return IntentRouteResult(
                route="clarification",
                intent="clarification_needed",
                confidence=confidence,
                matched_tools=[],
                faq_data={
                    "title": "Klarifikasi",
                    "answer": clarification,
                    "content": clarification
                },
                requires_llm=False,
                action_type="retrieval",
                domain="clarification",
                task_plan=["1. Minta klarifikasi spesifik kepada pengguna"],
                reason=f"Confidence rendah ({confidence:.2f}). Meminta klarifikasi ke pengguna daripada menebak.",
                scores=scores
            )

        return IntentRouteResult(
            route="llm",
            intent="general_inquiry",
            confidence=0.60,
            matched_tools=[],
            requires_llm=True,
            action_type="analysis",
            domain="general",
            task_plan=["1. DeepSeek LLM memproses pertanyaan umum pengguna"],
            reason="Tidak ada domain operasional spesifik terdeteksi. DeepSeek LLM dipanggil untuk memahami konteks.",
            scores=scores
        )

    def _extract_recent_topic_or_tool(self, messages: Optional[List[Any]]) -> Optional[str]:
        """Extracts the active tool or business domain from previous conversation messages."""
        if not messages:
            return None

        # Check in reverse chronological order
        history_msgs = messages[:-1] if len(messages) > 1 else messages
        for msg in reversed(history_msgs):
            # Check explicit tool calls
            tool_calls = getattr(msg, "tool_calls", None) or (msg.get("tool_calls") if isinstance(msg, dict) else None)
            if tool_calls and isinstance(tool_calls, list):
                for tc in tool_calls:
                    t_name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
                    if t_name and t_name != "cpa_whoami":
                        return t_name

            content = (getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "") or "").lower()
            if any(k in content for k in [
                "supply chain management review", "get_scm_management_review", "soh runrate",
                "dead stock rate performance", "kategori umur persediaan", "good stock", "cpa 01", "cpa 02", "cpa 03"
            ]):
                return "get_inventory_summary"
            if any(k in content for k in ["surat jalan", "delivery order", "get_delivery_orders", "monitoring surat jalan"]):
                return "get_delivery_orders"
            if any(k in content for k in ["faktur penjualan", "get_invoices"]):
                return "get_invoices"
            if any(k in content for k in ["aging piutang", "get_ar_piutang_aging", "piutang berjalan"]):
                return "get_ar_piutang_aging"
            if any(k in content for k in ["stok kritis", "get_low_stock_alerts", "reorder point"]):
                return "get_low_stock_alerts"
            if any(k in content for k in ["umur stok", "batch produk", "get_inventory_aging_batch"]):
                return "get_inventory_aging_batch"
            if any(k in content for k in ["ringkasan stok", "get_inventory_summary", "stok gudang"]):
                return "get_inventory_summary"
        return None

    def _contains_word(self, text: str, word: str) -> bool:
        """Exact word match to avoid false substring triggers (e.g. 'ar' in 'gambar' or 'cgart')."""
        if len(word) <= 3:
            return bool(re.search(r"\b" + re.escape(word) + r"\b", text, re.IGNORECASE))
        return word.lower() in text.lower()

    def _matches_any_term(self, text: str, terms: List[str]) -> bool:
        return any(self._contains_word(text, t) for t in terms)

    def _find_export_underlying_tool(self, text: str, messages: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Identifies what dataset the user wants to export based on subject terms and conversation history."""
        clean = text.lower()

        # 1. Check if user query refers to previous chat/report context
        is_referential = any(ref in clean for ref in [
            "sebelumnya", "tadi", "yang tadi", "gambar", "sesuai", "laporan ini", "data ini",
            "tersebut", "hasil tadi", "chart", "pie", "kolom", "grafik", "seperti gambar"
        ])

        if is_referential and messages:
            recent_tool = self._extract_recent_topic_or_tool(messages)
            if recent_tool:
                return {"name": recent_tool, "args": {}}

        # 2. SCM Review / Executive Image Slide terms
        if self._matches_any_term(clean, [
            "scm", "supply chain", "review scm", "management review",
            "gambar sebelumnya", "sesuai gambar", "seperti gambar", "seperti pada gambar",
            "format gambar", "gambar yang saya kirim", "sesuai format gambar", "format gambar yang",
            "sesuai dengan format gambar", "gambar",
            "pie chart", "cgart", "bar chart", "runrate", "otif", "dead stock rate",
            "kategori umur", "dead stock", "over stock"
        ]):
            return {"name": "get_inventory_summary", "args": {}}

        # 3. Delivery Order (DO)
        if self._matches_any_term(clean, ["do", "surat jalan", "pengiriman", "delivery order", "sj"]):
            return {"name": "get_delivery_orders", "args": {}}

        # 4. Invoices / Faktur
        if self._matches_any_term(clean, ["invoice", "faktur", "penjualan", "sales"]):
            return {"name": "get_invoices", "args": {"limit": 50}}

        # 5. Accounts Receivable (AR Piutang) — using word boundary so 'ar' won't match 'gambar' or 'cgart'!
        if self._matches_any_term(clean, ["piutang", "ar", "aging piutang", "overdue"]):
            return {"name": "get_ar_piutang_aging", "args": {}}

        # 6. Critical Stock / Alerts
        if self._matches_any_term(clean, ["kritis", "habis", "menipis", "reorder", "safety stock"]):
            return {"name": "get_low_stock_alerts", "args": {}}

        # 7. Batch Aging Stock
        if self._matches_any_term(clean, ["batch", "lot", "kadaluarsa", "aging stock", "aging stok"]):
            return {"name": "get_inventory_aging_batch", "args": {}}

        # 8. Customer
        if self._matches_any_term(clean, ["customer", "pelanggan", "outlet"]):
            return {"name": "get_customer_intelligence_dashboard", "args": {}}

        # 9. Omzet / Sales Summary
        if self._matches_any_term(clean, ["omzet", "omset", "revenue"]):
            return {"name": "get_sales_summary", "args": {}}

        # 10. Fallback: check history again before defaulting
        if messages:
            recent_tool = self._extract_recent_topic_or_tool(messages)
            if recent_tool:
                return {"name": recent_tool, "args": {}}

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
                if t.get("name") in ["get_inventory_summary", "get_product_stock", "get_inventory_aging_batch", "get_delivery_orders"]:
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

        # 4. Extract Table Name & Domain for database tools
        known_tables = [
            "penjualan", "penjualan_detail", "penjualando", "barang", "stok_barang", "gudang",
            "customer", "customer_kontak", "sektor", "do_tbl", "do_detail", "so", "so_detail",
            "po", "po_detail", "penerimaan", "penerimaan_detail", "pegawai", "supplier",
            "acc_ar_faktur", "acc_ap_faktur", "acc_gl_trans", "acc_kas", "barang_minmax"
        ]
        target_table = None
        # Check explicit regex: tabel <name>
        t_match = re.search(r"\b(?:tabel|table)\s+([a-zA-Z0-9_]+)\b", text)
        if t_match:
            cand = t_match.group(1).lower()
            if cand in known_tables or "_" in cand:
                target_table = cand

        if not target_table:
            for kt in known_tables:
                if re.search(r"\b" + re.escape(kt) + r"\b", text):
                    target_table = kt
                    break

        if target_table:
            has_describe = any(t.get("name") == "db_describe_table" for t in tools)
            if not has_describe and intent_name in ("database_schema_dictionary", "cek_struktur_tabel"):
                tools.insert(0, {"name": "db_describe_table", "args": {"table_name": target_table}})

            for t in tools:
                if t.get("name") in ["db_describe_table", "db_execute_query"]:
                    t.setdefault("args", {})["table_name"] = target_table
                elif t.get("name") == "db_list_tables":
                    t.setdefault("args", {})["search"] = target_table

        # 5. Extract Domain for db_get_schema_overview
        domains = ["INVENTORY", "SALES", "DISTRIBUTION", "PROCUREMENT", "CUSTOMER_CRM", "FINANCE", "HRM", "ANALYTICS"]
        for dm in domains:
            if dm.lower().replace("_", " ") in text or dm.lower() in text:
                for t in tools:
                    if t.get("name") == "db_get_schema_overview":
                        t.setdefault("args", {})["domain"] = dm

        # 6. Extract Delivery Order (DO) parameters
        is_today = bool(re.search(r"\b(hari ini|today|sekarang)\b", text))
        is_yesterday = bool(re.search(r"\b(kemarin|yesterday)\b", text))
        date_explicit = re.search(r"\b(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b", text)

        target_do_date = None
        if is_today:
            target_do_date = str(date.today())
        elif is_yesterday:
            target_do_date = str(date.today() - timedelta(days=1))
        elif date_explicit:
            raw_d = date_explicit.group(1).replace("/", "-")
            if len(raw_d.split("-")[0]) == 2:
                parts = raw_d.split("-")
                target_do_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
            else:
                target_do_date = raw_d

        for t in tools:
            if t.get("name") == "get_delivery_orders":
                t_args = t.setdefault("args", {})
                if target_do_date:
                    t_args["date"] = target_do_date
                if target_gudang:
                    t_args["id_gudang"] = target_gudang

                # Status filter
                if re.search(r"\b(selesai|terkirim|delivered)\b", text):
                    t_args["status"] = "S"
                elif re.search(r"\b(jalan|transit|perjalanan|released)\b", text):
                    t_args["status"] = "R"

                # DO number search
                do_num = re.search(r"\b(\d+[/]DO[/][A-Za-z0-9/]+)\b", text)
                if do_num:
                    t_args["search"] = do_num.group(1)

        # 7. Extract Customer Name / Code for AR, Invoices, Customer details
        target_cust = None
        pt_match = re.search(r'([A-Za-z0-9\s\-]+,\s*(?:PT|CV)|(?:PT|CV)\.?\s+[A-Za-z0-9\s\-]+)', text, re.IGNORECASE)
        if pt_match:
            candidate = pt_match.group(1).strip()
        else:
            cust_match = re.search(r'\b(?:customer|pelanggan|ar|piutang|faktur|invoice)\s+(?:dari\s+|milik\s+|untuk\s+)?([A-Za-z0-9\.\,\s\-]+)', text, re.IGNORECASE)
            candidate = cust_match.group(1).strip() if cust_match else None

        if candidate:
            stop_words = r'^(?:coba|cek|tolong|lihat|posisi|ar|piutang|aging|faktur|invoice|status|dari|customer|pelanggan|milik|untuk|dong|mohon|ya|tarik|detail)\s+'
            while re.search(stop_words, candidate, re.IGNORECASE):
                candidate = re.sub(stop_words, '', candidate, flags=re.IGNORECASE).strip()
            if len(candidate) >= 2 and candidate.lower() not in ('ini', 'itu', 'semua', 'terbaru', 'berjalan'):
                target_cust = candidate

        if target_cust:
            for t in tools:
                if t.get("name") == "get_ar_piutang_aging":
                    t.setdefault("args", {})["customer"] = target_cust
                elif t.get("name") in ["get_invoices", "get_sales_orders", "get_delivery_orders"]:
                    t.setdefault("args", {})["search"] = target_cust
                elif t.get("name") == "get_customer_detail":
                    t.setdefault("args", {})["query"] = target_cust


# ─── Singleton & Functional API ───────────────────────────────────────────────

_default_router = IntentRouter()

def route_intent(user_message: str) -> Dict[str, Any]:
    """
    Public convenience API for the Intent Router:
    route(user_message) -> {"route": "mcp"} or {"route": "llm"}
    """
    result = _default_router.route(user_message)
    return result.to_dict()
