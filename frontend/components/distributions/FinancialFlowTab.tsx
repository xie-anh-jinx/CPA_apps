"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiDistributions } from "@/lib/api";
import { formatRupiah, formatNumber } from "@/lib/finance-utils";

// ─── 1. INTERFACES ────────────────────────────────────────────────────────────

export interface FlowDocument {
  stage: "PERMINTAAN_DANA" | "TRAVEL_REQUEST" | "DELIVERY_ORDER" | "FRDO" | "INVOICE" | "TRANSFER";
  stage_label: string;
  nomor_dokumen: string | null;
  tanggal: string | null;
  nominal: number | null;
  pic: string | null;
  status: string | null;
  is_available: boolean;
  notes?: string;
}

export interface FinancialFlowItem {
  id: string;
  no_do: string;
  tanggal: string;
  id_gudang?: string;
  nama_gudang?: string;
  customer: string;
  rute: string;
  transporter: string;
  driver?: string;
  permintaan_dana: FlowDocument;
  travel_request: FlowDocument;
  delivery_order: FlowDocument;
  frdo: FlowDocument;
  invoice: FlowDocument;
  transfer: FlowDocument;
  variance_nominal: number;
  variance_pct: number;
  status: "COMPLETE" | "OUTSTANDING" | "NEED_REVIEW";
  status_label: "Complete" | "Outstanding" | "Need Review";
  waiting_reason?: string | null;
}

export interface FinancialFlowKpi {
  total_do: number;
  total_permintaan_dana: number;
  total_frdo: number;
  total_invoice: number;
  total_transfer: number;
  complete_count?: number;
  outstanding_count: number;
  outstanding_amount: number;
  need_review_count?: number;
}

// ─── 2. HELPER STATUS BADGE ───────────────────────────────────────────────────

function StatusBadge({
  status,
  waitingReason,
}: {
  status: "COMPLETE" | "OUTSTANDING" | "NEED_REVIEW";
  waitingReason?: string | null;
}) {
  if (status === "COMPLETE") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "0.2rem 0.55rem",
          borderRadius: "9999px",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(34, 197, 94, 0.15)",
          color: "#22c55e",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Complete
      </span>
    );
  }

  if (status === "NEED_REVIEW") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "0.2rem 0.55rem",
          borderRadius: "9999px",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(239, 68, 68, 0.15)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <AlertTriangle size={12} strokeWidth={2.5} />
        Need Review
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "0.2rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: "rgba(234, 179, 8, 0.15)",
        color: "#eab308",
        border: "1px solid rgba(234, 179, 8, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      <Clock size={12} strokeWidth={2.5} />
      {waitingReason || "Outstanding"}
    </span>
  );
}

// ─── 3. MAIN FINANCIAL FLOW TAB COMPONENT ─────────────────────────────────────

export default function FinancialFlowTab() {
  const [data, setData] = useState<FinancialFlowItem[]>([]);
  const [kpi, setKpi] = useState<FinancialFlowKpi | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters (Server-Side)
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("ALL");
  const [warehouses, setWarehouses] = useState<{ id_gudang: string; nama_gudang: string }[]>([]);
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Drawer detail state
  const [selectedItem, setSelectedItem] = useState<FinancialFlowItem | null>(null);

  // Load master warehouses for filter
  useEffect(() => {
    apiDistributions.warehouses()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setWarehouses(res.data);
        }
      })
      .catch((err) => console.error("Gagal memuat gudang financial flow:", err));
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Live Data from Backend API (cpa_existing)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiDistributions.financialFlow({
        page,
        limit,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        id_gudang: filterWarehouse !== "ALL" ? filterWarehouse : undefined,
        search: debouncedSearch.trim() || undefined,
      });

      const resData = res.data;
      setData(resData.items || []);
      if (resData.kpi) {
        setKpi(resData.kpi);
      }
      if (resData.data_note) {
        setDataNote(resData.data_note);
      }
      if (resData.pagination) {
        setTotalPages(resData.pagination.total_pages || 1);
        setTotalCount(resData.pagination.total || 0);
      }
    } catch (err: any) {
      console.error("Gagal memuat data live financial flow:", err);
      setError(err?.response?.data?.detail || err?.message || "Gagal menghubungi database");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterStatus, filterWarehouse, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tab Filter change
  const handleFilterChange = (statusKey: string) => {
    setFilterStatus(statusKey);
    setPage(1);
  };

  // ── TanStack Table Columns ──
  const columns = useMemo<ColumnDef<FinancialFlowItem>[]>(
    () => [
      {
        accessorKey: "no_do",
        header: "Nomor DO",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedItem(row.original)}
            style={{
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "6px",
              padding: "0.25rem 0.55rem",
              color: "#38bdf8",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.78rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "all 0.15s ease",
            }}
            title="Klik untuk membuka alur timeline dokumen keuangan"
          >
            <span>📦</span>
            <span>{row.original.no_do}</span>
            <ExternalLink size={11} style={{ opacity: 0.8 }} />
          </button>
        ),
      },
      {
        accessorKey: "tanggal",
        header: "Tanggal",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            {row.original.tanggal}
          </span>
        ),
      },
      {
        accessorKey: "nama_gudang",
        header: "Gudang",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {row.original.nama_gudang || "—"}
            </div>
            {row.original.id_gudang && (
              <span style={{
                fontSize: "0.68rem",
                color: "#60a5fa",
                fontFamily: "monospace",
                background: "rgba(59, 130, 246, 0.12)",
                padding: "1px 5px",
                borderRadius: "3px"
              }}>
                Kode: {row.original.id_gudang}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div style={{ maxWidth: "230px" }}>
            <div
              style={{
                fontWeight: 600,
                color: "var(--text-primary)",
                fontSize: "0.825rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={row.original.customer}
            >
              {row.original.customer}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginTop: "1px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={row.original.rute}
            >
              {row.original.rute}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "permintaan_dana",
        header: "Permintaan Dana",
        cell: ({ row }) => {
          const doc = row.original.permintaan_dana;
          return (
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.825rem" }}>
                {formatRupiah(doc.nominal)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {doc.nomor_dokumen || "—"}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "travel_request",
        header: "Travel Request",
        cell: ({ row }) => {
          const doc = row.original.travel_request;
          return doc.is_available ? (
            <div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.1)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                }}
              >
                {doc.nomor_dokumen}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
              }}
            >
              Belum Ada
            </span>
          );
        },
      },
      {
        accessorKey: "frdo",
        header: "FRDO",
        cell: ({ row }) => {
          const doc = row.original.frdo;
          return doc.is_available ? (
            <div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#22c55e",
                  background: "rgba(34, 197, 94, 0.1)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                }}
              >
                {doc.nomor_dokumen}
              </span>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {doc.tanggal}
              </div>
            </div>
          ) : (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
              }}
            >
              Belum Ada
            </span>
          );
        },
      },
      {
        accessorKey: "invoice",
        header: "Invoice",
        cell: ({ row }) => {
          const doc = row.original.invoice;
          return doc.is_available ? (
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.825rem" }}>
                {formatRupiah(doc.nominal)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {doc.nomor_dokumen}
              </div>
            </div>
          ) : (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
              }}
            >
              Belum Ada
            </span>
          );
        },
      },
      {
        accessorKey: "transfer",
        header: "Transfer",
        cell: ({ row }) => {
          const doc = row.original.transfer;
          return doc.is_available ? (
            <div>
              <div style={{ fontWeight: 600, color: "#22c55e", fontSize: "0.825rem" }}>
                {formatRupiah(doc.nominal)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {doc.nomor_dokumen}
              </div>
            </div>
          ) : (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
              }}
            >
              Belum Ada
            </span>
          );
        },
      },
      {
        accessorKey: "variance_nominal",
        header: "Variance",
        cell: ({ row }) => {
          const item = row.original;
          if (!item.invoice.is_available) {
            return <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>;
          }

          if (item.variance_nominal === 0) {
            return (
              <span
                style={{
                  color: "#22c55e",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>Rp 0</span>
                <span style={{ fontSize: "0.68rem", opacity: 0.8 }}>(0%)</span>
              </span>
            );
          }

          const isOverBudget = item.variance_pct > 5;
          return (
            <span
              style={{
                color: isOverBudget ? "#ef4444" : "#eab308",
                fontWeight: 700,
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>+Rp {formatNumber(Math.abs(item.variance_nominal))}</span>
              <span style={{ fontSize: "0.68rem" }}>(+{item.variance_pct}%)</span>
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            waitingReason={row.original.waiting_reason}
          />
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* ── 1. Top Bar Description ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          padding: "0.85rem 1.15rem",
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.35rem" }}>💳</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Financial Flow: Monitoring Alur Dokumen Keuangan DO
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
              Tracking sekuensial: Biaya Pengiriman DO (PL) → Penugasan Ekspedisi → DO → FRDO (Return Date) → Faktur Penjualan → Bukti Pelunasan (Live Database: {kpi ? formatNumber(kpi.total_do) : "..."} DO)
            </div>
            {dataNote && (
              <div style={{ fontSize: "0.7rem", color: "#38bdf8", marginTop: "4px" }}>
                ℹ️ {dataNote}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem" }}
            title="Muat ulang data live"
          >
            <RefreshCw size={13} className={loading ? "spin-animation" : ""} />
            <span>Refresh</span>
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#22c55e" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            Variance 0% (Hijau)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#eab308" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} />
            Outstanding (Kuning)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#ef4444" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
            Variance &gt; 5% (Merah)
          </span>
        </div>
      </div>

      {/* ── 2. KPI Cards Grid (6 Cards Real Database Values) ── */}
      <div
        className="kpi-grid"
        style={{
          marginBottom: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {/* 1. Total DO */}
        <div className="kpi-card primary">
          <div className="kpi-icon primary">📦</div>
          <div className="kpi-value">
            {kpi ? formatNumber(kpi.total_do) : "..."} DO
          </div>
          <div className="kpi-label">Total DO Operasional</div>
        </div>

        {/* 2. Total Permintaan Dana */}
        <div className="kpi-card info">
          <div className="kpi-icon info">💰</div>
          <div className="kpi-value">
            {kpi ? formatRupiah(kpi.total_permintaan_dana) : "..."}
          </div>
          <div className="kpi-label">Total Permintaan Dana</div>
        </div>

        {/* 3. Total FRDO */}
        <div className="kpi-card success">
          <div className="kpi-icon success">📋</div>
          <div className="kpi-value">
            {kpi ? `${formatNumber(kpi.total_frdo)} / ${formatNumber(kpi.total_do)} DO` : "..."}
          </div>
          <div className="kpi-label">Total FRDO Kembali</div>
        </div>

        {/* 4. Total Invoice */}
        <div className="kpi-card" style={{ borderLeft: "4px solid #818cf8" }}>
          <div className="kpi-icon" style={{ background: "rgba(129, 140, 248, 0.15)", color: "#818cf8" }}>
            📄
          </div>
          <div className="kpi-value" style={{ color: "#818cf8" }}>
            {kpi ? formatRupiah(kpi.total_invoice) : "..."}
          </div>
          <div className="kpi-label">Total Invoice Ekspedisi</div>
        </div>

        {/* 5. Total Transfer */}
        <div className="kpi-card" style={{ borderLeft: "4px solid #22c55e" }}>
          <div className="kpi-icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
            💳
          </div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>
            {kpi ? formatRupiah(kpi.total_transfer) : "..."}
          </div>
          <div className="kpi-label">Total Transfer Lunas</div>
        </div>

        {/* 6. Outstanding */}
        <div className="kpi-card warning">
          <div className="kpi-icon warning">⏳</div>
          <div className="kpi-value" style={{ color: "var(--color-warning)" }}>
            {kpi ? `${formatNumber(kpi.outstanding_count)} DO` : "..."}
          </div>
          <div className="kpi-label">
            Outstanding ({kpi ? formatRupiah(kpi.outstanding_amount) : "..."})
          </div>
        </div>
      </div>

      {/* ── 3. Table Toolbar with Search & Filter Tabs ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        {/* Quick Filter Tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {[
            {
              key: "ALL",
              label: `Semua (${kpi ? formatNumber(kpi.total_do) : totalCount})`,
            },
            {
              key: "COMPLETE",
              label: `✓ Complete (${kpi ? formatNumber(kpi.complete_count ?? Math.max(0, kpi.total_do - kpi.outstanding_count - (kpi.need_review_count ?? 0))) : "..."})`,
            },
            {
              key: "OUTSTANDING",
              label: `⏳ Outstanding (${kpi ? formatNumber(kpi.outstanding_count) : "..."})`,
            },
            {
              key: "NEED_REVIEW",
              label: `⚠️ Need Review (${kpi?.need_review_count !== undefined ? formatNumber(kpi.need_review_count) : "..."})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleFilterChange(tab.key)}
              className={`btn ${filterStatus === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.75rem",
                fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls: Warehouse Filter & Search Input */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Warehouse Filter */}
          <select
            value={filterWarehouse}
            onChange={(e) => {
              setFilterWarehouse(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "0.45rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            <option value="ALL">Semua Gudang ({warehouses.length})</option>
            {warehouses.map((w) => (
              <option key={w.id_gudang} value={w.id_gudang}>
                {w.id_gudang} - {w.nama_gudang}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Cari DO, Gudang, Customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 2rem 0.45rem 2.2rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                outline: "none",
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            color: "#ef4444",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4. TanStack Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.25rem", position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              gap: "0.5rem",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <Loader2 size={18} className="spin-animation" />
            <span>Memuat data dari database ({formatNumber(totalCount)} DO)...</span>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {header.isPlaceholder ? null : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    Tidak ditemukan data workflow keuangan DO.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      cursor: "pointer",
                      background: selectedItem?.id === row.original.id ? "rgba(56, 189, 248, 0.08)" : undefined,
                    }}
                    onClick={() => setSelectedItem(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ verticalAlign: "middle" }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            padding: "0.75rem 1.25rem",
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--bg-border)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          <div>
            Menampilkan{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {totalCount === 0 ? 0 : (page - 1) * limit + 1}
            </strong>{" "}
            -{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {Math.min(page * limit, totalCount)}
            </strong>{" "}
            dari total{" "}
            <strong style={{ color: "var(--text-primary)" }}>{formatNumber(totalCount)}</strong> DO
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="btn btn-ghost btn-sm"
              style={{ padding: "0.25rem 0.5rem", cursor: page > 1 ? "pointer" : "not-allowed" }}
              title="Halaman Pertama"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn btn-ghost btn-sm"
              style={{ padding: "0.25rem 0.5rem", cursor: page > 1 ? "pointer" : "not-allowed" }}
              title="Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ margin: "0 0.5rem" }}>
              Halaman{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {page}
              </strong>{" "}
              dari {totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="btn btn-ghost btn-sm"
              style={{ padding: "0.25rem 0.5rem", cursor: page < totalPages ? "pointer" : "not-allowed" }}
              title="Berikutnya"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="btn btn-ghost btn-sm"
              style={{ padding: "0.25rem 0.5rem", cursor: page < totalPages ? "pointer" : "not-allowed" }}
              title="Halaman Terakhir"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. RIGHT SLIDE-IN DRAWER (TIMELINE 6 TAHAPAN) ── */}
      {selectedItem && (
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setSelectedItem(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(3px)",
              zIndex: 1000,
              animation: "fadeIn 0.2s ease-out",
            }}
          />

          {/* Drawer Container */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: "540px",
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--bg-border)",
              boxShadow: "var(--shadow-xl)",
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                background: "var(--bg-surface)",
                borderBottom: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Alur Dokumen Keuangan
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "3px" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    {selectedItem.no_do}
                  </h2>
                  <StatusBadge
                    status={selectedItem.status}
                    waitingReason={selectedItem.waiting_reason}
                  />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span>{selectedItem.customer}</span>
                  {selectedItem.nama_gudang && (
                    <span style={{
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#60a5fa",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px"
                    }}>
                      🏢 {selectedItem.nama_gudang} ({selectedItem.id_gudang})
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "8px",
                  padding: "0.4rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Tutup Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div
              style={{
                padding: "1.5rem",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Variance & Nominal Summary Box */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                  RINGKASAN BIAYA & VARIANCE
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Permintaan Dana:</span>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                      {formatRupiah(selectedItem.permintaan_dana.nominal)}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Nilai Invoice:</span>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                      {selectedItem.invoice.is_available ? formatRupiah(selectedItem.invoice.nominal) : "Belum Ada"}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Realisasi Transfer:</span>
                    <div style={{ fontWeight: 700, color: "#22c55e", fontSize: "0.95rem" }}>
                      {selectedItem.transfer.is_available ? formatRupiah(selectedItem.transfer.nominal) : "Belum Ditransfer"}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Variance (Dana - Invoice):</span>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color:
                          !selectedItem.invoice.is_available
                            ? "var(--text-muted)"
                            : selectedItem.variance_nominal === 0
                            ? "#22c55e"
                            : selectedItem.variance_pct > 5
                            ? "#ef4444"
                            : "#eab308",
                      }}
                    >
                      {!selectedItem.invoice.is_available
                        ? "—"
                        : selectedItem.variance_nominal === 0
                        ? "Rp 0 (0%)"
                        : `+Rp ${formatNumber(Math.abs(selectedItem.variance_nominal))} (+${selectedItem.variance_pct}%)`}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px dashed var(--bg-border)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Rumus: <code>Variance = Permintaan Dana - Nilai Invoice</code>. Variance = 0 (Hijau), &gt; 5% (Merah).
                </div>
              </div>

              {/* Sequential 6-Stage Timeline */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                  Alur Workflow Dokumen Keuangan
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[
                    { doc: selectedItem.permintaan_dana, step: 1, icon: "💰", title: "Permintaan Dana" },
                    { doc: selectedItem.travel_request, step: 2, icon: "🧭", title: "Travel Request" },
                    { doc: selectedItem.delivery_order, step: 3, icon: "📦", title: "Delivery Order (DO)" },
                    { doc: selectedItem.frdo, step: 4, icon: "📋", title: "Form Receipt DO (FRDO)" },
                    { doc: selectedItem.invoice, step: 5, icon: "🧾", title: "Invoice Ekspedisi" },
                    { doc: selectedItem.transfer, step: 6, icon: "💳", title: "Bukti Transfer" },
                  ].map((stageItem, index, arr) => {
                    const doc = stageItem.doc;
                    const isLast = index === arr.length - 1;

                    return (
                      <React.Fragment key={stageItem.title}>
                        {/* Stage Card */}
                        <div
                          style={{
                            background: doc.is_available ? "var(--bg-surface)" : "rgba(255, 255, 255, 0.02)",
                            border: `1px solid ${
                              doc.is_available
                                ? "var(--bg-border)"
                                : "rgba(234, 179, 8, 0.25)"
                            }`,
                            borderRadius: "10px",
                            padding: "0.95rem 1.15rem",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "1.1rem" }}>{stageItem.icon}</span>
                              <div>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                  TAHAP {stageItem.step}
                                </span>
                                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                  {stageItem.title}
                                </h4>
                              </div>
                            </div>

                            {/* Badge Belum Ada vs Status */}
                            {doc.is_available ? (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "#22c55e",
                                  background: "rgba(34, 197, 94, 0.12)",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                }}
                              >
                                {doc.status || "TERSEDIA"}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "#eab308",
                                  background: "rgba(234, 179, 8, 0.12)",
                                  border: "1px solid rgba(234, 179, 8, 0.3)",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                }}
                              >
                                Belum Ada
                              </span>
                            )}
                          </div>

                          {/* Stage Details Grid */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "0.45rem",
                              fontSize: "0.76rem",
                              marginTop: "0.5rem",
                              paddingTop: "0.5rem",
                              borderTop: "1px dashed var(--bg-border)",
                            }}
                          >
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Nomor Dokumen:</span>
                              <div style={{ fontWeight: 600, color: doc.is_available ? "var(--color-primary)" : "var(--text-muted)" }}>
                                {doc.nomor_dokumen || "—"}
                              </div>
                            </div>

                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Tanggal:</span>
                              <div style={{ fontWeight: 500, color: doc.is_available ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {doc.tanggal || "—"}
                              </div>
                            </div>

                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Nominal:</span>
                              <div style={{ fontWeight: 700, color: doc.is_available ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {doc.nominal ? formatRupiah(doc.nominal) : "—"}
                              </div>
                            </div>

                            <div>
                              <span style={{ color: "var(--text-muted)" }}>PIC Penanggung Jawab:</span>
                              <div style={{ fontWeight: 500, color: doc.is_available ? "var(--text-secondary)" : "var(--text-muted)" }}>
                                {doc.pic || "—"}
                              </div>
                            </div>
                          </div>

                          {doc.notes && (
                            <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              Catatan: &ldquo;{doc.notes}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Arrow Connecting Stages */}
                        {!isLast && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              padding: "0.35rem 0",
                              color: doc.is_available ? "var(--color-primary)" : "var(--text-muted)",
                            }}
                          >
                            <ArrowDown size={16} strokeWidth={2.5} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                background: "var(--bg-surface)",
                borderTop: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Status Alur:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {selectedItem.waiting_reason || selectedItem.status_label}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
