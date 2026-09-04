"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { apiSales } from "@/lib/api";

interface ArItem {
  ar_number: string;
  no_invoice: string;
  customer_code: string;
  customer_name: string;
  invoice_date: string | null;
  due_date: string | null;
  top_days: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  status_text: string;
}

interface TopBucket {
  top_days: number;
  count: number;
  total_outstanding: number;
  label: string;
}

interface ArSummary {
  total_outstanding: number;
  total_ar: number;
  total_paid: number;
  total_invoices: number;
  avg_top: number;
  top_buckets: TopBucket[];
}

interface ArOutstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${Math.round(n).toLocaleString("id")}`;
}

function fmtDate(dStr: string | null): string {
  if (!dStr) return "—";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTopBadgeStyle(top: number) {
  if (top === 0) {
    return {
      background: "rgba(16, 185, 129, 0.15)",
      border: "1px solid rgba(16, 185, 129, 0.4)",
      color: "#10b981",
      icon: "⚡",
      label: "Cash / COD",
    };
  }
  if (top <= 14) {
    return {
      background: "rgba(20, 184, 166, 0.15)",
      border: "1px solid rgba(20, 184, 166, 0.4)",
      color: "#14b8a6",
      icon: "⏱️",
      label: `${top} Hari`,
    };
  }
  if (top <= 30) {
    return {
      background: "rgba(14, 165, 233, 0.15)",
      border: "1px solid rgba(14, 165, 233, 0.4)",
      color: "#0ea5e9",
      icon: "⏱️",
      label: `${top} Hari`,
    };
  }
  if (top <= 45) {
    return {
      background: "rgba(99, 102, 241, 0.15)",
      border: "1px solid rgba(99, 102, 241, 0.4)",
      color: "#818cf8",
      icon: "⏱️",
      label: `${top} Hari`,
    };
  }
  if (top <= 60) {
    return {
      background: "rgba(245, 158, 11, 0.15)",
      border: "1px solid rgba(245, 158, 11, 0.4)",
      color: "#f59e0b",
      icon: "⏱️",
      label: `${top} Hari`,
    };
  }
  return {
    background: "rgba(168, 85, 247, 0.15)",
    border: "1px solid rgba(168, 85, 247, 0.4)",
    color: "#c084fc",
    icon: "⏱️",
    label: `${top} Hari`,
  };
}

export default function ArOutstandingModal({ isOpen, onClose }: ArOutstandingModalProps) {
  const searchInputId = useId();
  const agingSelectId = useId();
  const sortSelectId = useId();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ArItem[]>([]);
  const [summary, setSummary] = useState<ArSummary | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTop, setSelectedTop] = useState<number | null>(null);
  const [selectedAging, setSelectedAging] = useState<string>("all");
  const [sortBy, setSortBy] = useState("outstanding_amount");
  const [sortOrder, setSortOrder] = useState("desc");

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedTop !== null) params.top = selectedTop;
      if (selectedAging !== "all") params.aging = selectedAging;

      const res = await apiSales.arOutstanding(params);
      const data = res.data;
      setItems(data.items || []);
      setSummary(data.summary || null);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalItems(data.pagination?.total_items || 0);
    } catch (err) {
      console.error("Error fetching AR outstanding data:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, limit, search, selectedTop, selectedAging, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, unknown> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedTop !== null) params.top = selectedTop;
      if (selectedAging !== "all") params.aging = selectedAging;

      const res = await apiSales.exportArExcel(params);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Piutang_Outstanding_AR_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export AR failed:", err);
      alert("Gagal mengunduh file Excel. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "1200px",
          maxWidth: "96vw",
          height: "90vh",
          maxHeight: "880px",
          backgroundColor: "#18181b",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
          animation: "scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            backgroundColor: "#202024",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
              }}
            >
              💳
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                  Piutang Outstanding (Accounts Receivable)
                </h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    fontWeight: 600,
                  }}
                >
                  AR &amp; TOP Detail
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
                Rincian faktur belum lunas, syarat pembayaran (Time of Payment), dan umur piutang
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#34d399",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: isExporting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
              title="Download rincian piutang ke file Excel"
            >
              <span>{isExporting ? "⏳" : "📥"}</span>
              <span>{isExporting ? "Mengekspor..." : "Export Excel"}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1.1rem",
                transition: "all 0.15s ease",
              }}
              aria-label="Tutup pop-up modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem 1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Summary Mini Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {/* Total Outstanding */}
            <div
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.07)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💰 Total Piutang Outstanding
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#fbbf24", marginTop: "0.35rem" }}>
                {fmtCurrency(summary?.total_outstanding)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                Sisa kewajiban dari faktur yang belum lunas
              </div>
            </div>

            {/* Average TOP */}
            <div
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.07)",
                border: "1px solid rgba(14, 165, 233, 0.25)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#38bdf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ⏱️ Rata-Rata TOP (Term of Payment)
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#38bdf8", marginTop: "0.35rem" }}>
                {summary?.avg_top ? `${summary.avg_top} Hari` : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                Tenggat pembayaran rata-rata konsumen
              </div>
            </div>

            {/* Total Invoices Unpaid */}
            <div
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.07)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#c084fc", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📄 Faktur Belum Lunas
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#e9d5ff", marginTop: "0.35rem" }}>
                {Number(summary?.total_invoices || 0).toLocaleString("id")} Faktur
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                Total faktur yang belum selesai dibayar
              </div>
            </div>

            {/* Total Paid */}
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.07)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💵 Total Sudah Dibayar
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#34d399", marginTop: "0.35rem" }}>
                {fmtCurrency(summary?.total_paid)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                Pembayaran masuk untuk faktur terkait
              </div>
            </div>
          </div>

          {/* TOP Filter Pills Bar */}
          <div
            style={{
              backgroundColor: "#202024",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1" }}>
                Filter TOP:
              </span>
            </div>

            {/* "Semua TOP" Pill */}
            <button
              onClick={() => {
                setSelectedTop(null);
                setPage(1);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "0.78rem",
                fontWeight: 600,
                border: selectedTop === null ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: selectedTop === null ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.03)",
                color: selectedTop === null ? "#38bdf8" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Semua TOP
            </button>

            {/* Bucket Pills from Summary */}
            {summary?.top_buckets?.map((b) => {
              const isSelected = selectedTop === b.top_days;
              const badgeStyle = getTopBadgeStyle(b.top_days);
              return (
                <button
                  key={b.top_days}
                  onClick={() => {
                    setSelectedTop(isSelected ? null : b.top_days);
                    setPage(1);
                  }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    border: isSelected ? `1px solid ${badgeStyle.color}` : "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: isSelected ? badgeStyle.background : "rgba(255, 255, 255, 0.03)",
                    color: isSelected ? badgeStyle.color : "#cbd5e1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{badgeStyle.icon}</span>
                  <span>{b.label}</span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      padding: "1px 5px",
                      borderRadius: "10px",
                      color: "#fff",
                      marginLeft: "2px",
                    }}
                  >
                    {b.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Secondary Filter Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: "280px", position: "relative" }}>
              <label htmlFor={searchInputId} style={{ display: "none" }}>Cari Piutang AR</label>
              <input
                id={searchInputId}
                type="text"
                placeholder="🔍 Cari Customer, No. Faktur / Invoice, No. AR..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem",
                  backgroundColor: "#202024",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {/* Aging Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <label htmlFor={agingSelectId} style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Status:</label>
                <select
                  id={agingSelectId}
                  value={selectedAging}
                  onChange={(e) => {
                    setSelectedAging(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: "#202024",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#cbd5e1",
                    padding: "0.55rem 0.85rem",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                >
                  <option value="all">Semua Status</option>
                  <option value="lancar">Lancar (Belum JT)</option>
                  <option value="overdue">Overdue (Lewat JT)</option>
                  <option value="1-30">Overdue 1 - 30 Hari</option>
                  <option value="31-60">Overdue 31 - 60 Hari</option>
                  <option value="61-90">Overdue 61 - 90 Hari</option>
                  <option value=">90">Overdue &gt; 90 Hari</option>
                </select>
              </div>

              {/* Sort By */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <label htmlFor={sortSelectId} style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Urutkan:</label>
                <select
                  id={sortSelectId}
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sb, so] = e.target.value.split("-");
                    setSortBy(sb);
                    setSortOrder(so);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: "#202024",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#cbd5e1",
                    padding: "0.55rem 0.85rem",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                >
                  <option value="outstanding_amount-desc">Sisa Piutang (Terbesar)</option>
                  <option value="outstanding_amount-asc">Sisa Piutang (Terkecil)</option>
                  <option value="top_days-desc">TOP Terlama</option>
                  <option value="top_days-asc">TOP Tercepat</option>
                  <option value="invoice_date-desc">Tgl Faktur (Terbaru)</option>
                  <option value="due_date-asc">Jatuh Tempo (Terdekat)</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              {(search || selectedTop !== null || selectedAging !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedTop(null);
                    setSelectedAging("all");
                    setPage(1);
                  }}
                  style={{
                    padding: "0.55rem 0.85rem",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              backgroundColor: "#202024",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              overflow: "hidden",
              position: "relative",
              minHeight: "300px",
            }}
          >
            {loading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(24, 24, 27, 0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#38bdf8", fontWeight: 600 }}>
                  <span className="spinner" style={{ display: "inline-block", width: "20px", height: "20px", border: "2px solid #38bdf8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></span>
                  Memuat Data AR &amp; TOP...
                </div>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.84rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#1b1b1e",
                      borderBottom: "2px solid rgba(255, 255, 255, 0.08)",
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <th style={{ padding: "0.85rem 1rem", width: "160px" }}>No. Faktur / AR</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Customer</th>
                    <th style={{ padding: "0.85rem 1rem", width: "110px" }}>Tgl. Faktur</th>
                    <th style={{ padding: "0.85rem 1rem", width: "135px", textAlign: "center" }}>
                      TOP (Payment Terms)
                    </th>
                    <th style={{ padding: "0.85rem 1rem", width: "110px" }}>Jatuh Tempo</th>
                    <th style={{ padding: "0.85rem 1rem", width: "130px", textAlign: "right" }}>Total AR</th>
                    <th style={{ padding: "0.85rem 1rem", width: "120px", textAlign: "right" }}>Sudah Bayar</th>
                    <th style={{ padding: "0.85rem 1rem", width: "150px", textAlign: "right" }}>Piutang Outstanding</th>
                    <th style={{ padding: "0.85rem 1rem", width: "130px", textAlign: "center" }}>Status Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: "3rem 1rem",
                          textAlign: "center",
                          color: "#94a3b8",
                        }}
                      >
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
                        <div style={{ fontWeight: 600, color: "#cbd5e1" }}>Tidak ada data Piutang Outstanding</div>
                        <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Coba sesuaikan kata kunci pencarian atau filter TOP</div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const topBadge = getTopBadgeStyle(item.top_days);
                      const isOverdue = item.days_overdue > 0;
                      return (
                        <tr
                          key={item.ar_number || idx}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                            backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                            transition: "background-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)")}
                        >
                          {/* No. Faktur / AR */}
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.84rem" }}>
                              {item.no_invoice || item.ar_number}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                              {item.ar_number}
                            </div>
                          </td>

                          {/* Customer */}
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "#f1f5f9" }}>
                              {item.customer_name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              Kode: {item.customer_code}
                            </div>
                          </td>

                          {/* Tgl Faktur */}
                          <td style={{ padding: "0.85rem 1rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                            {fmtDate(item.invoice_date)}
                          </td>

                          {/* Time of Payment (TOP) Highlight */}
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                backgroundColor: topBadge.background,
                                border: topBadge.border,
                                color: topBadge.color,
                              }}
                              title={`Syarat pembayaran: ${topBadge.label}`}
                            >
                              <span>{topBadge.icon}</span>
                              <span>{topBadge.label}</span>
                            </div>
                          </td>

                          {/* Jatuh Tempo */}
                          <td style={{ padding: "0.85rem 1rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                            {fmtDate(item.due_date)}
                          </td>

                          {/* Total AR */}
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "#94a3b8" }}>
                            {fmtCurrency(item.total_amount)}
                          </td>

                          {/* Sudah Bayar */}
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: item.paid_amount > 0 ? "#34d399" : "#64748b" }}>
                            {fmtCurrency(item.paid_amount)}
                          </td>

                          {/* Piutang Outstanding */}
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ fontWeight: 800, color: "#fbbf24", fontSize: "0.9rem" }}>
                              {fmtCurrency(item.outstanding_amount)}
                            </div>
                          </td>

                          {/* Status Aging */}
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                backgroundColor: isOverdue ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                border: isOverdue ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.35)",
                                color: isOverdue ? "#f87171" : "#34d399",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.status_text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0",
              color: "#94a3b8",
              fontSize: "0.82rem",
            }}
          >
            <div>
              Menampilkan {totalItems > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, totalItems)} dari {Number(totalItems).toLocaleString("id")} faktur
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  backgroundColor: "#202024",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: page <= 1 ? "#475569" : "#cbd5e1",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  fontSize: "0.8rem",
                }}
              >
                ◀ Sebelumnya
              </button>

              <span style={{ padding: "0 0.5rem", fontWeight: 600, color: "#fff" }}>
                Halaman {page} dari {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  backgroundColor: "#202024",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: page >= totalPages ? "#475569" : "#cbd5e1",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Berikutnya ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
