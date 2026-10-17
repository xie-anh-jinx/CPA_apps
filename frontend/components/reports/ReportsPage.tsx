"use client";
import { useState, useEffect, useCallback } from "react";
import { apiReports } from "@/lib/api";
import { 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Download, 
  Search, 
  RefreshCw, 
  Filter, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  Building2,
  TrendingDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  pct: number;
  color: string;
}

interface AgingSummary {
  total_invoices: number;
  total_receivables: number;
  total_overdue: number;
  overdue_invoices_count: number;
  overdue_percentage: number;
  avg_days_overdue: number;
  buckets: {
    current: AgingBucket;
    days_1_30: AgingBucket;
    days_31_60: AgingBucket;
    days_61_90: AgingBucket;
    days_over_90: AgingBucket;
  };
}

interface ArAgingItem {
  ar_number: string;
  no_invoice: string;
  customer_code: string;
  customer_name: string;
  id_sales?: string;
  nama_sales?: string;
  id_kantor?: string;
  invoice_date: string;
  due_date: string;
  top: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  is_overdue: boolean;
  aging_bucket: string;
  bucket_label: string;
  bucket_color: string;
}

function fmt(n: number | null | undefined, prefix = "Rp ") {
  if (n == null) return "—";
  return `${prefix}${Math.round(Number(n)).toLocaleString("id-ID")}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return fmt(n);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"ar_aging" | "other_exports">("ar_aging");

  // AR Aging State
  const [items, setItems] = useState<ArAgingItem[]>([]);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<string>("all");
  const [sortBy, setSortBy] = useState("days_overdue");
  const [sortOrder, setSortOrder] = useState("desc");

  // Other Reports State
  const [reportType, setReportType] = useState("inventory");
  const [dateRange, setDateRange] = useState("this_month");

  const loadArAging = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        search: search.trim() || undefined,
        bucket: bucket !== "all" ? bucket : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        limit: pageSize,
      };

      const res = await apiReports.arAging(params);
      if (res.data) {
        setItems(res.data.items || []);
        setSummary(res.data.summary || null);
        setTotalItems(res.data.total_items || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error("Gagal memuat laporan AR Aging:", err);
    } finally {
      setLoading(false);
    }
  }, [search, bucket, sortBy, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    if (activeTab === "ar_aging") {
      loadArAging();
    }
  }, [activeTab, loadArAging]);

  const handleExportCsv = () => {
    const params: Record<string, string> = {
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (search.trim()) params.search = search.trim();
    if (bucket !== "all") params.bucket = bucket;

    const url = apiReports.arAgingExportUrl(params);
    window.open(url, "_blank");
  };

  return (
    <div className="animate-fade-up">
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">
            {activeTab === "ar_aging" ? "Laporan Aging Piutang (AR Aging)" : "Pusat Ekspor Laporan"}
          </h1>
          <p className="page-subtitle">
            {activeTab === "ar_aging"
              ? "Analisis umur piutang usaha (Accounts Receivable), bucket jatuh tempo, dan rincian penagihan"
              : "Ekspor data inventori, transaksi penjualan, dan distribusi"}
          </p>
        </div>
        {activeTab === "ar_aging" && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleExportCsv}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Download size={16} />
              <span>Export Excel (CSV)</span>
            </button>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--bg-border)" }}>
        <button
          onClick={() => setActiveTab("ar_aging")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.75rem 1.25rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: activeTab === "ar_aging" ? "var(--color-primary)" : "var(--text-muted)",
            borderBottom: activeTab === "ar_aging" ? "2px solid var(--color-primary)" : "2px solid transparent",
          }}
        >
          <DollarSign size={18} />
          <span>Laporan Aging AR (Piutang)</span>
        </button>

        <button
          onClick={() => setActiveTab("other_exports")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.75rem 1.25rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: activeTab === "other_exports" ? "var(--color-primary)" : "var(--text-muted)",
            borderBottom: activeTab === "other_exports" ? "2px solid var(--color-primary)" : "2px solid transparent",
          }}
        >
          <FileSpreadsheet size={18} />
          <span>Pusat Ekspor Laporan Lainnya</span>
        </button>
      </div>

      {activeTab === "ar_aging" ? (
        <>
          {/* TOP KPI CARDS */}
          <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">
                <DollarSign size={20} />
              </div>
              <div className="kpi-value" style={{ fontSize: "1.45rem" }}>
                {summary ? fmtShort(summary.total_receivables) : "—"}
              </div>
              <div className="kpi-label">Total Piutang Usaha</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {summary ? `${summary.total_invoices.toLocaleString("id-ID")} faktur aktif terbuka` : "—"}
              </div>
            </div>

            <div className="kpi-card danger">
              <div className="kpi-icon danger">
                <AlertTriangle size={20} />
              </div>
              <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#EF4444" }}>
                {summary ? fmtShort(summary.total_overdue) : "—"}
              </div>
              <div className="kpi-label">Total Piutang Overdue</div>
              <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: "0.25rem" }}>
                {summary ? `${summary.overdue_percentage}% dari total piutang` : "—"}
              </div>
            </div>

            <div className="kpi-card warning">
              <div className="kpi-icon warning">
                <Clock size={20} />
              </div>
              <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#F59E0B" }}>
                {summary ? summary.overdue_invoices_count.toLocaleString("id-ID") : "—"}
              </div>
              <div className="kpi-label">Faktur Lewat Jatuh Tempo</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Perlu tindak lanjut penagihan AR
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>
                <TrendingDown size={20} />
              </div>
              <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#8B5CF6" }}>
                {summary ? `${summary.avg_days_overdue} Hari` : "—"}
              </div>
              <div className="kpi-label">Rata-rata Keterlambatan</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Average Days Past Due
              </div>
            </div>
          </div>

          {/* AGING BUCKETS INTERACTIVE ROW */}
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Layers size={16} style={{ color: "var(--color-primary)" }} />
                <span>Distribusi Umur Piutang (Aging Buckets)</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Klik salah satu bucket untuk memfilter tabel
              </span>
            </div>

            {/* Visual Stacked Progress Bar */}
            {summary && summary.total_receivables > 0 && (
              <div style={{ width: "100%", height: "10px", background: "var(--bg-border)", borderRadius: "5px", overflow: "hidden", display: "flex", marginBottom: "1rem" }}>
                <div style={{ width: `${summary.buckets.current.pct}%`, background: summary.buckets.current.color }} title={`Lancar: ${summary.buckets.current.pct}%`} />
                <div style={{ width: `${summary.buckets.days_1_30.pct}%`, background: summary.buckets.days_1_30.color }} title={`1-30 Hari: ${summary.buckets.days_1_30.pct}%`} />
                <div style={{ width: `${summary.buckets.days_31_60.pct}%`, background: summary.buckets.days_31_60.color }} title={`31-60 Hari: ${summary.buckets.days_31_60.pct}%`} />
                <div style={{ width: `${summary.buckets.days_61_90.pct}%`, background: summary.buckets.days_61_90.color }} title={`61-90 Hari: ${summary.buckets.days_61_90.pct}%`} />
                <div style={{ width: `${summary.buckets.days_over_90.pct}%`, background: summary.buckets.days_over_90.color }} title={`>90 Hari: ${summary.buckets.days_over_90.pct}%`} />
              </div>
            )}

            {/* 5 Bucket Clickable Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              {[
                { key: "current", b: summary?.buckets.current, filterVal: "current" },
                { key: "days_1_30", b: summary?.buckets.days_1_30, filterVal: "1-30" },
                { key: "days_31_60", b: summary?.buckets.days_31_60, filterVal: "31-60" },
                { key: "days_61_90", b: summary?.buckets.days_61_90, filterVal: "61-90" },
                { key: "days_over_90", b: summary?.buckets.days_over_90, filterVal: "over_90" },
              ].map(({ key, b, filterVal }) => {
                const isSelected = bucket === filterVal;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setBucket(isSelected ? "all" : filterVal);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${isSelected ? b?.color || "var(--color-primary)" : "var(--bg-border)"}`,
                      background: isSelected ? `${b?.color}18` : "var(--bg-surface)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: b?.color }}>
                        {b?.label || "—"}
                      </span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: b?.color }}>
                        {b ? `${b.pct}%` : "—"}
                      </span>
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                      {b ? fmtShort(b.amount) : "—"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {b ? `${b.count.toLocaleString("id-ID")} faktur` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: "380px" }}>
                <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Cari No AR, Faktur, atau Customer..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.85rem" }}
                />
              </div>

              {/* Bucket Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bucket:</span>
                <select
                  className="input"
                  value={bucket}
                  onChange={(e) => {
                    setBucket(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ fontSize: "0.85rem", padding: "0.35rem 0.65rem" }}
                >
                  <option value="all">Semua Bucket Aging</option>
                  <option value="current">🟢 Lancar (Belum Jatuh Tempo)</option>
                  <option value="all_overdue">🔴 Semua Overdue (Lewat Tempo)</option>
                  <option value="1-30">🟡 Overdue 1 - 30 Hari</option>
                  <option value="31-60">🟠 Overdue 31 - 60 Hari</option>
                  <option value="61-90">🔴 Overdue 61 - 90 Hari</option>
                  <option value="over_90">🟣 Overdue &gt; 90 Hari (Macet)</option>
                </select>
              </div>

              {/* Sort selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Urutan:</span>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ fontSize: "0.85rem", padding: "0.35rem 0.65rem" }}
                >
                  <option value="days_overdue">Keterlambatan (Hari)</option>
                  <option value="outstanding_amount">Sisa Piutang Terbesar</option>
                  <option value="total_amount">Nilai Faktur Terbesar</option>
                  <option value="due_date">Tanggal Jatuh Tempo</option>
                  <option value="invoice_date">Tanggal Faktur</option>
                  <option value="customer_name">Nama Customer</option>
                </select>

                <button
                  className="btn btn-ghost"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  title={sortOrder === "desc" ? "Menurun (Besar ke Kecil)" : "Menaik (Kecil ke Besar)"}
                  style={{ padding: "0.35rem 0.55rem" }}
                >
                  {sortOrder === "desc" ? "⬇️" : "⬆️"}
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => loadArAging()}
                  title="Segarkan Data"
                  style={{ padding: "0.35rem 0.55rem" }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--bg-border)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <div>
                Menampilkan <strong style={{ color: "var(--text-primary)" }}>{items.length}</strong> dari <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> faktur piutang
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {bucket !== "all" && (
                  <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6", cursor: "pointer" }} onClick={() => setBucket("all")}>
                    Bucket: {bucket} ✕
                  </span>
                )}
                {search && (
                  <span className="badge" style={{ background: "rgba(107,114,128,0.15)", color: "var(--text-primary)", cursor: "pointer" }} onClick={() => setSearch("")}>
                    Pencarian: &quot;{search}&quot; ✕
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AGING DATA TABLE */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 0.85rem" }}>No AR / Faktur</th>
                    <th style={{ padding: "0.75rem 0.85rem" }}>Customer</th>
                    <th style={{ padding: "0.75rem 0.85rem" }}>Sales & Cabang</th>
                    <th style={{ padding: "0.75rem 0.75rem" }}>Tgl Faktur</th>
                    <th style={{ padding: "0.75rem 0.75rem" }}>Jatuh Tempo</th>
                    <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>TOP</th>
                    <th style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>Total Nilai</th>
                    <th style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>Terbayar</th>
                    <th style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>Sisa Piutang</th>
                    <th style={{ padding: "0.75rem 0.85rem", textAlign: "center" }}>Bucket Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                        <td colSpan={10} style={{ padding: "0.75rem" }}>
                          <div className="skeleton" style={{ height: 24, borderRadius: "4px" }} />
                        </td>
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        <CheckCircle2 size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5, color: "#10B981" }} />
                        <div>Tidak ada faktur piutang yang memenuhi kriteria filter.</div>
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={row.ar_number}
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          background: row.days_overdue > 90 ? "rgba(185,28,28,0.03)" : "transparent",
                        }}
                      >
                        {/* No AR / Faktur */}
                        <td style={{ padding: "0.75rem 0.85rem", fontWeight: 600 }}>
                          <div>{row.ar_number}</div>
                          {row.no_invoice && row.no_invoice !== row.ar_number && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.no_invoice}</div>
                          )}
                        </td>

                        {/* Customer */}
                        <td style={{ padding: "0.75rem 0.85rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.customer_name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.customer_code}</div>
                        </td>

                        {/* Sales & Cabang */}
                        <td style={{ padding: "0.75rem 0.85rem", fontSize: "0.78rem" }}>
                          <div style={{ color: "var(--text-secondary)" }}>{row.nama_sales || "—"}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Cabang: {row.id_kantor || "HO"}</div>
                        </td>

                        {/* Tgl Faktur */}
                        <td style={{ padding: "0.75rem 0.75rem", color: "var(--text-secondary)" }}>
                          {row.invoice_date || "—"}
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: "0.75rem 0.75rem", color: row.is_overdue ? "#EF4444" : "var(--text-secondary)", fontWeight: row.is_overdue ? 600 : 400 }}>
                          {row.due_date || "—"}
                        </td>

                        {/* TOP */}
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                          {row.top > 0 ? (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.top} hr</span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>COD</span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>
                          {fmt(row.total_amount)}
                        </td>

                        {/* Paid Amount */}
                        <td style={{ padding: "0.75rem 0.85rem", textAlign: "right", color: "#10B981" }}>
                          {fmt(row.paid_amount)}
                        </td>

                        {/* Outstanding Amount */}
                        <td style={{ padding: "0.75rem 0.85rem", textAlign: "right", fontWeight: 700, color: row.is_overdue ? "#EF4444" : "var(--text-primary)" }}>
                          {fmt(row.outstanding_amount)}
                        </td>

                        {/* Aging Bucket Badge */}
                        <td style={{ padding: "0.75rem 0.85rem", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              background: `${row.bucket_color}20`,
                              color: row.bucket_color,
                              border: `1px solid ${row.bucket_color}40`,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.is_overdue ? `Lewat ${row.days_overdue} hr` : "Lancar"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderTop: "1px solid var(--bg-border)", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Tampilkan:</span>
                <select
                  className="input"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                >
                  <option value={25}>25 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                  <option value={200}>200 per halaman</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: "0.3rem 0.6rem" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: "0.3rem 0.6rem" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: PUSAT EKSPOR LAPORAN LAINNYA */
        <div className="card" style={{ maxWidth: 800 }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: "0.75rem", fontWeight: 600, fontSize: "1rem" }}>Pilih Tipe Laporan Operasional</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { id: "inventory", label: "Stok Gudang", desc: "Posisi stok, HPP, nilai persediaan multi-gudang" },
                { id: "sales", label: "Penjualan & Omzet", desc: "Omzet, performa salesman, rekap transaksi" },
                { id: "distributions", label: "Distribusi & Pengiriman (DO)", desc: "Status DO, SLA pengiriman, tracking armada" },
                { id: "crm", label: "CRM & Prospek", desc: "Pipeline prospek, aktivitas sales, komplain" }
              ].map(type => (
                <label 
                  key={type.id} 
                  style={{
                    display: "flex", gap: "0.75rem", padding: "1rem", 
                    border: `1px solid ${reportType === type.id ? "var(--color-primary)" : "var(--bg-border)"}`,
                    background: reportType === type.id ? "rgba(59,130,246,0.1)" : "var(--bg-surface)",
                    borderRadius: "var(--radius-md)", cursor: "pointer"
                  }}
                >
                  <input 
                    type="radio" 
                    name="reportType" 
                    value={type.id} 
                    checked={reportType === type.id}
                    onChange={(e) => setReportType(e.target.value)}
                    style={{ marginTop: "0.2rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{type.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{type.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Rentang Periode</div>
            <select 
              className="input" 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: "100%", maxWidth: 300 }}
            >
              <option value="today">Hari Ini</option>
              <option value="this_week">Minggu Ini</option>
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="this_year">Tahun Ini</option>
            </select>
          </div>

          <div className="divider" />

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button 
              className="btn btn-ghost" 
              style={{ background: "rgba(34,197,94,0.15)", color: "#10B981", border: "1px solid rgba(34,197,94,0.3)" }}
              onClick={() => {
                const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/export/csv?report_type=${reportType}&date_range=${dateRange}`;
                window.open(url, '_blank');
              }}
            >
              <Download size={16} />
              <span>Unduh File CSV / Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
