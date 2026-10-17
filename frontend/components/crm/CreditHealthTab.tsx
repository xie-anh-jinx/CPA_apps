"use client";
import { useState, useEffect, useCallback } from "react";
import { apiCustomers } from "@/lib/api";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Search, 
  FileText, 
  RefreshCw, 
  Building2, 
  UserCheck, 
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface CreditHealthItem {
  id_kontak: string;
  nama_customer: string;
  batas_kredit: number;
  top_days: number;
  id_kantor: string;
  telepon?: string;
  email?: string;
  id_sales?: string;
  nama_sales?: string;
  total_piutang: number;
  overdue_amount: number;
  current_amount: number;
  open_invoices: number;
  overdue_count: number;
  max_days_overdue: number;
  utilization_pct: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_label: string;
  risk_color: string;
  delivery_status: "APPROVED" | "HOLD_OVERDUE" | "HOLD_LIMIT" | "WARNING_LIMIT";
  delivery_label: string;
  delivery_color: string;
  delivery_bg: string;
  recommendation: string;
}

interface SummaryData {
  total_monitored_customers: number;
  total_exposure: number;
  total_overdue: number;
  total_credit_limit: number;
  over_limit_count: number;
  hold_delivery_count: number;
  critical_count: number;
}

interface OpenInvoice {
  ar_number: string;
  no_invoice: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  is_overdue: boolean;
  status: string;
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

export default function CreditHealthTab() {
  const [data, setData] = useState<CreditHealthItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("overdue_amount");
  const [sortOrder, setSortOrder] = useState("desc");

  // Customer Invoices Modal
  const [selectedCustomer, setSelectedCustomer] = useState<CreditHealthItem | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<OpenInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCustomers.creditHealth({
        search: search.trim() || undefined,
        risk_level: riskLevel !== "all" ? riskLevel : undefined,
        delivery_status: deliveryStatus !== "ALL" ? deliveryStatus : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        limit: pageSize,
      });

      if (res.data) {
        setData(res.data.items || []);
        setSummary(res.data.summary || null);
        setTotalFiltered(res.data.total_filtered || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error("Gagal memuat data credit health:", err);
    } finally {
      setLoading(false);
    }
  }, [search, riskLevel, deliveryStatus, sortBy, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle open invoices modal
  const handleOpenInvoices = async (cust: CreditHealthItem) => {
    setSelectedCustomer(cust);
    setInvoicesLoading(true);
    try {
      const res = await apiCustomers.creditHealthInvoices(cust.id_kontak);
      const list = Array.isArray(res.data) ? res.data : (res.data?.invoices || []);
      setCustomerInvoices(list);
    } catch (e) {
      console.error("Gagal memuat faktur customer:", e);
      setCustomerInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  return (
    <div className="credit-health-page">
      {/* KPI TOP METRICS */}
      <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi-card" style={{ borderLeft: "4px solid #3B82F6" }}>
          <div className="kpi-icon primary">
            <DollarSign size={20} />
          </div>
          <div className="kpi-value" style={{ fontSize: "1.45rem" }}>
            {summary ? fmtShort(summary.total_exposure) : "—"}
          </div>
          <div className="kpi-label">Total Exposure AR</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Total piutang berjalan di sistem
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: "4px solid #EF4444" }}>
          <div className="kpi-icon danger">
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#EF4444" }}>
            {summary ? fmtShort(summary.total_overdue) : "—"}
          </div>
          <div className="kpi-label">Total Piutang Jatuh Tempo (Overdue)</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {summary && summary.total_exposure > 0
              ? `${((summary.total_overdue / summary.total_exposure) * 100).toFixed(1)}% dari total piutang`
              : "—"}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: "4px solid #F59E0B" }}>
          <div className="kpi-icon warning">
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#F59E0B" }}>
            {summary ? summary.hold_delivery_count.toLocaleString("id-ID") : "—"}
          </div>
          <div className="kpi-label">Customer Tahan Kirim (Hold)</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {summary ? `${summary.over_limit_count} over limit / ada overdue` : "—"}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: "4px solid #DC2626" }}>
          <div className="kpi-icon danger">
            <Clock size={20} />
          </div>
          <div className="kpi-value" style={{ fontSize: "1.45rem", color: "#DC2626" }}>
            {summary ? summary.critical_count.toLocaleString("id-ID") : "—"}
          </div>
          <div className="kpi-label">Customer Risiko Kritis</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Keterlambatan {">"}90 hari / overdue {">"}100jt
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL PANEL */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input"
              placeholder="Cari customer, ID kontak, atau sales..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: "2.25rem", width: "100%" }}
            />
          </div>

          {/* Filter Status Pengiriman */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Rilis Kirim:</span>
            <select
              className="input"
              value={deliveryStatus}
              onChange={(e) => {
                setDeliveryStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
            >
              <option value="ALL">Semua Status Rilis</option>
              <option value="HOLD_OVERDUE">🛑 Tahan: Ada Faktur Overdue</option>
              <option value="HOLD_LIMIT">⚠️ Tahan: Over Plafon Kredit</option>
              <option value="WARNING_LIMIT">⚡ Peringatan: Plafon Tipis (≥85%)</option>
              <option value="APPROVED">✅ Aman Rilis Pengiriman</option>
            </select>
          </div>

          {/* Filter Risiko */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Tingkat Risiko:</span>
            <select
              className="input"
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
            >
              <option value="all">Semua Risiko</option>
              <option value="critical">🔴 Kritis (&gt;90 hr / &gt;100jt)</option>
              <option value="high">🟠 Tinggi (Risiko Kredit)</option>
              <option value="medium">🟡 Waspada</option>
              <option value="low">🟢 Lancar</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Urutkan:</span>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
            >
              <option value="overdue_amount">Overdue Tertinggi</option>
              <option value="total_piutang">Total Piutang Terbesar</option>
              <option value="max_days_overdue">Hari Keterlambatan Terlama</option>
              <option value="utilization">Utilisasi Kredit (%)</option>
              <option value="batas_kredit">Plafon Terbesar</option>
              <option value="nama_customer">Nama Customer (A-Z)</option>
            </select>
            <button
              className="btn btn-ghost"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              title={sortOrder === "desc" ? "Urutan Menurun (Z-A / Besar ke Kecil)" : "Urutan Menaik (A-Z / Kecil ke Besar)"}
              style={{ padding: "0.4rem 0.6rem" }}
            >
              {sortOrder === "desc" ? "⬇️" : "⬆️"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => loadData()}
              title="Segarkan Data"
              style={{ padding: "0.4rem 0.6rem" }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Filter Badges Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid var(--bg-border)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <div>
            Menampilkan <strong style={{ color: "var(--text-primary)" }}>{data.length}</strong> dari <strong style={{ color: "var(--text-primary)" }}>{totalFiltered}</strong> customer terfilter
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {deliveryStatus !== "ALL" && (
              <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6", cursor: "pointer" }} onClick={() => setDeliveryStatus("ALL")}>
                Filter Rilis: {deliveryStatus} ✕
              </span>
            )}
            {riskLevel !== "all" && (
              <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", cursor: "pointer" }} onClick={() => setRiskLevel("all")}>
                Filter Risiko: {riskLevel} ✕
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

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Customer & Kontak</th>
                <th style={{ padding: "0.75rem 0.75rem" }}>Salesman</th>
                <th style={{ padding: "0.75rem 0.75rem", textAlign: "right" }}>Plafon Kredit</th>
                <th style={{ padding: "0.75rem 0.75rem", textAlign: "right" }}>Total Piutang</th>
                <th style={{ padding: "0.75rem 0.75rem", width: "130px" }}>Utilisasi Plafon</th>
                <th style={{ padding: "0.75rem 0.75rem", textAlign: "right" }}>Overdue AR</th>
                <th style={{ padding: "0.75rem 0.75rem", textAlign: "center" }}>Max Hari</th>
                <th style={{ padding: "0.75rem 0.75rem" }}>Status Rilis Pengiriman</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td colSpan={9} style={{ padding: "1rem" }}>
                      <div className="skeleton" style={{ height: 28, borderRadius: "4px" }} />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <ShieldCheck size={40} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                    <div>Tidak ditemukan customer yang cocok dengan kriteria filter saat ini.</div>
                  </td>
                </tr>
              ) : (
                data.map((c) => {
                  // Utilization progress bar color
                  const utilColor = c.utilization_pct > 100 ? "#EF4444" : c.utilization_pct >= 85 ? "#F59E0B" : "#10B981";
                  const utilClamped = Math.min(c.utilization_pct, 100);

                  return (
                    <tr 
                      key={c.id_kontak} 
                      style={{ 
                        borderBottom: "1px solid var(--bg-border)",
                        background: c.risk_level === "critical" ? "rgba(220,38,38,0.03)" : "transparent"
                      }}
                    >
                      {/* Customer Info */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.nama_customer}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem", marginTop: "0.15rem" }}>
                          <span>ID: {c.id_kontak}</span>
                          <span>•</span>
                          <span>Cabang: {c.id_kantor || "HO"}</span>
                          {c.top_days > 0 && (
                            <>
                              <span>•</span>
                              <span>TOP {c.top_days} Hari</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Salesman */}
                      <td style={{ padding: "0.75rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {c.nama_sales ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <UserCheck size={14} style={{ color: "var(--text-muted)" }} />
                            <span>{c.nama_sales}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Plafon Kredit */}
                      <td style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontWeight: 500 }}>
                        {c.batas_kredit > 0 ? fmt(c.batas_kredit) : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.75rem" }}>Tanpa Plafon</span>
                        )}
                      </td>

                      {/* Total Piutang */}
                      <td style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                        {fmt(c.total_piutang)}
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {c.open_invoices} faktur aktif
                        </div>
                      </td>

                      {/* Progress Bar Utilisasi */}
                      <td style={{ padding: "0.75rem 0.75rem" }}>
                        {c.batas_kredit > 0 ? (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                              <span style={{ fontWeight: 600, color: utilColor }}>{c.utilization_pct}%</span>
                              <span style={{ color: "var(--text-muted)" }}>
                                {c.total_piutang > c.batas_kredit ? "Over" : "Limit"}
                              </span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "var(--bg-border)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${utilClamped}%`,
                                  height: "100%",
                                  backgroundColor: utilColor,
                                  borderRadius: "3px",
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Overdue AR */}
                      <td style={{ padding: "0.75rem 0.75rem", textAlign: "right" }}>
                        {c.overdue_amount > 0 ? (
                          <>
                            <div style={{ fontWeight: 700, color: "#EF4444" }}>{fmt(c.overdue_amount)}</div>
                            <div style={{ fontSize: "0.7rem", color: "#DC2626" }}>
                              {c.overdue_count} faktur lewat tempo
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "#10B981", fontSize: "0.75rem", fontWeight: 500 }}>Tidak ada overdue</span>
                        )}
                      </td>

                      {/* Max Hari Overdue */}
                      <td style={{ padding: "0.75rem 0.75rem", textAlign: "center" }}>
                        {c.max_days_overdue > 0 ? (
                          <span
                            className="badge"
                            style={{
                              background: c.max_days_overdue > 90 ? "rgba(185,28,28,0.15)" : c.max_days_overdue > 30 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                              color: c.max_days_overdue > 90 ? "#B91C1C" : c.max_days_overdue > 30 ? "#EF4444" : "#F59E0B",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem"
                            }}
                          >
                            {c.max_days_overdue} hr
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>0 hr</span>
                        )}
                      </td>

                      {/* Delivery Status Badge */}
                      <td style={{ padding: "0.75rem 0.75rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            background: c.delivery_bg,
                            color: c.delivery_color,
                            border: `1px solid ${c.delivery_color}40`,
                          }}
                        >
                          {c.delivery_label}
                        </span>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem", maxWidth: "240px", lineHeight: 1.25 }}>
                          {c.recommendation}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleOpenInvoices(c)}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.35rem 0.65rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <FileText size={14} />
                          <span>Faktur</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* MODAL OPEN INVOICES */}
      {selectedCustomer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "920px",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "1.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              borderRadius: "var(--radius-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Building2 size={20} style={{ color: "var(--color-primary)" }} />
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {selectedCustomer.nama_customer}
                  </h2>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "flex", gap: "0.75rem" }}>
                  <span>ID Kontak: <strong>{selectedCustomer.id_kontak}</strong></span>
                  <span>•</span>
                  <span>Sales: <strong>{selectedCustomer.nama_sales || "—"}</strong></span>
                  <span>•</span>
                  <span>Cabang: <strong>{selectedCustomer.id_kantor || "HO"}</strong></span>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedCustomer(null)}
                style={{ padding: "0.4rem", borderRadius: "50%" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer Risk Summary in Modal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--bg-border)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Batas Kredit (Plafon)</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                  {selectedCustomer.batas_kredit > 0 ? fmt(selectedCustomer.batas_kredit) : "Tanpa Plafon"}
                </div>
              </div>

              <div style={{ padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--bg-border)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Total Piutang Berjalan</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                  {fmt(selectedCustomer.total_piutang)}
                </div>
                <div style={{ fontSize: "0.68rem", color: selectedCustomer.utilization_pct > 100 ? "#EF4444" : "#10B981" }}>
                  Utilisasi: {selectedCustomer.utilization_pct}%
                </div>
              </div>

              <div style={{ padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--bg-border)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Piutang Overdue</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: selectedCustomer.overdue_amount > 0 ? "#EF4444" : "#10B981", marginTop: "0.2rem" }}>
                  {fmt(selectedCustomer.overdue_amount)}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#DC2626" }}>
                  {selectedCustomer.overdue_count} faktur lewat tempo
                </div>
              </div>

              <div style={{ padding: "0.75rem", background: selectedCustomer.delivery_bg, borderRadius: "var(--radius-md)", border: `1px solid ${selectedCustomer.delivery_color}40` }}>
                <div style={{ fontSize: "0.72rem", color: selectedCustomer.delivery_color, fontWeight: 600 }}>Keputusan Rilis Kirim</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: selectedCustomer.delivery_color, marginTop: "0.2rem" }}>
                  {selectedCustomer.delivery_label}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                Daftar Faktur Terbuka ({customerInvoices.length})
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Diurutkan berdasarkan keterlambatan hari
              </span>
            </div>

            <div style={{ border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.75rem" }}>No AR / Faktur</th>
                    <th style={{ padding: "0.6rem 0.75rem" }}>Tgl Faktur</th>
                    <th style={{ padding: "0.6rem 0.75rem" }}>Jatuh Tempo</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Total Faktur</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Sudah Bayar</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Sisa Piutang</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Status & Hari</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                        <td colSpan={7} style={{ padding: "0.75rem" }}>
                          <div className="skeleton" style={{ height: 22, borderRadius: "4px" }} />
                        </td>
                      </tr>
                    ))
                  ) : customerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Tidak ada faktur terbuka untuk customer ini.
                      </td>
                    </tr>
                  ) : (
                    customerInvoices.map((inv) => (
                      <tr
                        key={inv.ar_number}
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          background: inv.is_overdue ? "rgba(239,68,68,0.04)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
                          <div>{inv.ar_number}</div>
                          {inv.no_invoice && inv.no_invoice !== inv.ar_number && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{inv.no_invoice}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>
                          {inv.invoice_date}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", color: inv.is_overdue ? "#EF4444" : "var(--text-secondary)", fontWeight: inv.is_overdue ? 600 : 400 }}>
                          {inv.due_date}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                          {fmt(inv.total_amount)}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#10B981" }}>
                          {fmt(inv.paid_amount)}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700, color: inv.is_overdue ? "#EF4444" : "var(--text-primary)" }}>
                          {fmt(inv.outstanding_amount)}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                          {inv.is_overdue ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.45rem",
                                borderRadius: "4px",
                                background: inv.days_overdue > 90 ? "rgba(185,28,28,0.15)" : "rgba(239,68,68,0.15)",
                                color: inv.days_overdue > 90 ? "#B91C1C" : "#EF4444",
                                fontWeight: 600,
                                fontSize: "0.72rem",
                              }}
                            >
                              Lewat {inv.days_overdue} hr
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.45rem",
                                borderRadius: "4px",
                                background: "rgba(16,185,129,0.15)",
                                color: "#10B981",
                                fontWeight: 500,
                                fontSize: "0.72rem",
                              }}
                            >
                              Belum Jatuh Tempo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button className="btn btn-ghost" onClick={() => setSelectedCustomer(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
