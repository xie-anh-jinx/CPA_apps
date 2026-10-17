"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiCustomers } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface CustomerData {
  id_kontak: string;
  nama_customer: string;
  telepon: string;
  email: string;
  nama_kategori?: string;
  isaktif?: boolean;
  id_salesman?: string;
  nama_sales?: string;
  panggilan_sales?: string;
  telepon_sales?: string;
  email_sales?: string;
  id_kantor?: string;
  top?: number;
  batas_kredit?: number;
  total_orders?: number;
  total_revenue?: number;
  last_purchase_date?: string;
  days_since_last_purchase?: number;
  total_piutang?: number;
  segment?: string;
  dim_kategori?: string;
  dim_top?: string;
  dim_credit_limit?: string;
  dim_revenue_tier?: string;
  dim_kantor?: string;
}

interface SalesRelation {
  id_pegawai: string;
  nama_sales: string;
  panggilan: string;
  telepon_sales?: string;
  email_sales?: string;
  is_aktif?: boolean;
  jumlah_customer: number;
  total_omzet: number;
  total_piutang: number;
}

interface SalesCustomer {
  id_kontak: string;
  nama_customer: string;
  telepon?: string;
  email?: string;
  id_kantor?: string;
  isaktif?: boolean;
  total_revenue: number;
  total_orders: number;
  last_purchase_date?: string;
  total_piutang: number;
}

interface SegmentItem {
  segment: string;
  jumlah: number;
  total_revenue: number;
  avg_revenue: number;
  percentage: number;
  revenue_percentage: number;
}

interface DimensionMeta {
  id: string;
  label: string;
  icon: string;
  description: string;
  total_segments: number;
}

const PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#84CC16", // Lime
  "#E11D48", // Rose
];

const SEGMENT_COLORS: Record<string, string> = {
  // Activity / Lifecycle
  active: "#10B981",
  dormant: "#8E8E93",
  at_risk: "#F59E0B",
  churned: "#EF4444",
  lead: "#6366F1",

  // Kategori Entitas
  Perusahaan: "#3B82F6",
  Personal: "#10B981",
  Umum: "#F59E0B",

  // Revenue Tier
  "Platinum (> 10 M)": "#8B5CF6",
  "Gold (1 - 10 M)": "#F59E0B",
  "Silver (100 Jt - 1 M)": "#06B6D4",
  "Bronze (< 100 Jt)": "#D97706",
  "Non-Transaksi": "#64748B",

  // Terms of Payment
  "Cash / COD": "#10B981",
  "14 Hari": "#06B6D4",
  "30 Hari": "#3B82F6",
  "45 Hari": "#8B5CF6",
  "60 Hari": "#EC4899",
  "90 Hari": "#F97316",
  "> 90 Hari": "#EF4444",

  // Plafon Kredit
  "Tanpa Plafon (Rp 0)": "#64748B",
  "< Rp 50 Jt": "#10B981",
  "Rp 50 Jt - 200 Jt": "#3B82F6",
  "Rp 200 Jt - 1 Miliar": "#F59E0B",
  "> Rp 1 Miliar": "#8B5CF6",

  // Wilayah Cabang
  HO: "#3B82F6",
  MKS: "#10B981",
  SMP: "#F59E0B",
  MDO: "#EC4899",
  PLU: "#8B5CF6",
  KDR: "#06B6D4",
  MAPA: "#14B8A6",
  PRJ: "#F97316",
  BMA: "#6366F1",
};

function getSegmentColor(seg: string, index: number = 0): string {
  if (SEGMENT_COLORS[seg]) return SEGMENT_COLORS[seg];
  const lower = seg.toLowerCase().replace(/\s+/g, "_");
  if (SEGMENT_COLORS[lower]) return SEGMENT_COLORS[lower];
  return PALETTE[index % PALETTE.length];
}

function fmtRupiah(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "—";
  if (Math.abs(val) >= 1e12) return `Rp ${(val / 1e12).toFixed(2)} T`;
  if (Math.abs(val) >= 1e9) return `Rp ${(val / 1e9).toFixed(2)} M`;
  if (Math.abs(val) >= 1e6) return `Rp ${(val / 1e6).toFixed(1)} Jt`;
  return `Rp ${Number(val).toLocaleString("id")}`;
}

function fmtNumber(n: number | null | undefined, prefix = ""): string {
  if (n == null || isNaN(n)) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

export default function CustomerTab() {
  const [dimensions, setDimensions] = useState<DimensionMeta[]>([]);
  const [segmentationData, setSegmentationData] = useState<Record<string, SegmentItem[]>>({});
  const [activeDimension, setActiveDimension] = useState<string>("kategori");
  const [activeFilter, setActiveFilter] = useState<{ dim: string; val: string } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"direktori" | "sales">("direktori");

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state (20 rows per page)
  const ITEMS_PER_PAGE = 20;
  const [custPage, setCustPage] = useState(1);
  const [salesCustPage, setSalesCustPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [c360, setC360] = useState<any>(null);
  const [c360Loading, setC360Loading] = useState(false);

  // Sales Relations State
  const [salesList, setSalesList] = useState<SalesRelation[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [selectedSales, setSelectedSales] = useState<SalesRelation | null>(null);
  const [salesCustomers, setSalesCustomers] = useState<SalesCustomer[]>([]);
  const [salesCustLoading, setSalesCustLoading] = useState(false);

  // Reset page when filter or dimension changes
  useEffect(() => {
    setCustPage(1);
  }, [activeFilter, activeDimension]);

  // Load multi-dimensional segmentation once
  const loadSegmentation = useCallback(async () => {
    try {
      const res = await apiCustomers.segmentation({ dim: "all" });
      if (res.data) {
        if (res.data.dimensions) {
          setDimensions(res.data.dimensions);
        }
        if (res.data.data) {
          setSegmentationData(res.data.data);
        } else if (Array.isArray(res.data)) {
          setSegmentationData({ activity: res.data });
        }
      }
    } catch (e) {
      console.error("Failed to load customer segmentation:", e);
    }
  }, []);

  // Load customer directory (supports dimension filter & search by customer or sales/PIC)
  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const params: Record<string, unknown> = {
        limit: 500,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (activeFilter) {
        params.segment_dim = activeFilter.dim;
        params.segment_val = activeFilter.val;
      }
      const res = await apiCustomers.list(params);
      setCustomers(res.data || []);
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setCustomersLoading(false);
    }
  }, [activeFilter, searchQuery]);

  // Paginated data derivations
  const totalCustPages = Math.max(1, Math.ceil(customers.length / ITEMS_PER_PAGE));
  const safeCustPage = Math.min(custPage, totalCustPages);
  const paginatedCustomers = useMemo(() => {
    return customers.slice((safeCustPage - 1) * ITEMS_PER_PAGE, safeCustPage * ITEMS_PER_PAGE);
  }, [customers, safeCustPage]);

  const totalSalesCustPages = Math.max(1, Math.ceil(salesCustomers.length / ITEMS_PER_PAGE));
  const safeSalesCustPage = Math.min(salesCustPage, totalSalesCustPages);
  const paginatedSalesCustomers = useMemo(() => {
    return salesCustomers.slice((safeSalesCustPage - 1) * ITEMS_PER_PAGE, safeSalesCustPage * ITEMS_PER_PAGE);
  }, [salesCustomers, safeSalesCustPage]);

  // Helper render pagination
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (newPage: number) => void
  ) => {
    if (totalItems === 0) return null;
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.85rem 1.25rem",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--bg-border)",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <div>
          Menampilkan <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{startIdx}</span> –{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{endIdx}</span> dari{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{totalItems}</span> data
          <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            (20 data per halaman)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              background: currentPage <= 1 ? "var(--bg-surface)" : "var(--color-primary)",
              color: currentPage <= 1 ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currentPage <= 1 ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "6px",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            <span>&larr;</span> Back
          </button>

          <span
            style={{
              padding: "0.4rem 0.85rem",
              background: "var(--bg-hover)",
              border: "1px solid var(--bg-border)",
              borderRadius: "6px",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
          >
            Halaman {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              background: currentPage >= totalPages ? "var(--bg-surface)" : "var(--color-primary)",
              color: currentPage >= totalPages ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currentPage >= totalPages ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "6px",
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            Next Page <span>&rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadSegmentation();
  }, [loadSegmentation]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const currentSegments = useMemo(() => {
    return segmentationData[activeDimension] || [];
  }, [segmentationData, activeDimension]);

  const activeDimMeta = useMemo(() => {
    return (
      dimensions.find((d) => d.id === activeDimension) || {
        id: activeDimension,
        label: "Segmentasi",
        icon: "📊",
        description: "Segmentasi pelanggan dalam database",
        total_segments: currentSegments.length,
      }
    );
  }, [dimensions, activeDimension, currentSegments.length]);

  const totalCustInDimension = useMemo(() => {
    return currentSegments.reduce((acc, s) => acc + (s.jumlah || 0), 0);
  }, [currentSegments]);

  const totalRevInDimension = useMemo(() => {
    return currentSegments.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  }, [currentSegments]);

  const handleSelectFilter = (dim: string, val: string) => {
    if (activeFilter && activeFilter.dim === dim && activeFilter.val === val) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ dim, val });
    }
  };

  const load360 = async (id: string) => {
    setSelectedId(id);
    setC360Loading(true);
    setC360(null);
    try {
      const res = await apiCustomers.view360(id);
      setC360(res.data);
    } catch {
      // ignore
    } finally {
      setC360Loading(false);
    }
  };

  const loadSalesCustomers = useCallback(async (sales: SalesRelation) => {
    setSelectedSales(sales);
    setSalesCustPage(1);
    setSalesCustLoading(true);
    setSalesCustomers([]);
    try {
      const res = await apiCustomers.salesCustomers(sales.id_pegawai);
      setSalesCustomers(res.data || []);
    } catch {
      // ignore
    } finally {
      setSalesCustLoading(false);
    }
  }, []);

  const loadSalesRelations = useCallback(async () => {
    setSalesLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (salesSearch.trim()) params.search = salesSearch.trim();
      const res = await apiCustomers.salesRelations(params);
      const list: SalesRelation[] = res.data || [];
      setSalesList(list);
      if (list.length === 1) {
        loadSalesCustomers(list[0]);
      }
    } catch (e) {
      console.error("Failed to load sales relations:", e);
    } finally {
      setSalesLoading(false);
    }
  }, [salesSearch, loadSalesCustomers]);

  useEffect(() => {
    if (activeMainTab === "sales") loadSalesRelations();
  }, [activeMainTab, loadSalesRelations]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── MAIN TAB SELECTOR ── */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {[
          { key: "direktori", label: "👥 Direktori & Segmentasi" },
          { key: "sales", label: "🤝 Relasi Sales & Customer" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key as typeof activeMainTab)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeMainTab === tab.key ? "2px solid #3B82F6" : "2px solid transparent",
              color: activeMainTab === tab.key ? "#60A5FA" : "var(--text-muted)",
              fontWeight: activeMainTab === tab.key ? 700 : 500,
              fontSize: "0.95rem",
              padding: "0.65rem 1.25rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── RELASI SALES TAB ── */}
      {activeMainTab === "sales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header */}
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "1.5rem", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🤝</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Relasi Sales & Customer</h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Mapping antara salesperson dengan customer yang menjadi tanggung jawabnya. Klik salesperson untuk melihat daftar customer yang ditangani.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Left: Sales Leaderboard */}
            <div className="card" style={{ borderRadius: "16px", overflow: "hidden", flex: "1 1 400px", minWidth: 0 }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Daftar Salesperson</h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{salesList.length} salesperson aktif</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "0.35rem 0.65rem", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Cari nama sales..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.82rem", width: 160 }}
                  />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Salesperson</th>
                      <th style={{ textAlign: "right" }}>Customer</th>
                      <th style={{ textAlign: "right" }}>Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 4 }).map((_, j) => (
                            <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : salesList.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Tidak ada data.</td></tr>
                    ) : salesList.map((s, idx) => (
                      <tr
                        key={s.id_pegawai}
                        onClick={() => loadSalesCustomers(s)}
                        style={{
                          cursor: "pointer",
                          background: selectedSales?.id_pegawai === s.id_pegawai ? "rgba(59,130,246,0.12)" : "transparent",
                          borderLeft: selectedSales?.id_pegawai === s.id_pegawai ? "3px solid #3B82F6" : "3px solid transparent",
                        }}
                      >
                        <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: 32 }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{s.nama_sales}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.id_pegawai} {s.panggilan ? `· "${s.panggilan}"` : ""}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#60A5FA" }}>{s.jumlah_customer}</td>
                        <td style={{ textAlign: "right", fontSize: "0.82rem", color: "#34D399", fontWeight: 600 }}>{fmtRupiah(s.total_omzet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Customer List for selected Sales */}
            <div className="card" style={{ borderRadius: "16px", overflow: "hidden", flex: "1 1 400px", minWidth: 0 }}>
              {selectedSales ? (
                <>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--bg-border)", background: "rgba(59,130,246,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", color: "#fff", flexShrink: 0 }}>
                        {selectedSales.nama_sales?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{selectedSales.nama_sales}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-primary)" }}>{selectedSales.id_pegawai} · {selectedSales.jumlah_customer} customer · Omzet {fmtRupiah(selectedSales.total_omzet)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Kantor</th>
                          <th style={{ textAlign: "right" }}>Total Order</th>
                          <th style={{ textAlign: "right" }}>Omzet</th>
                          <th>Terakhir Beli</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesCustLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                              {Array.from({ length: 5 }).map((_, j) => (
                                <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                              ))}
                            </tr>
                          ))
                        ) : salesCustomers.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Belum ada data customer.</td></tr>
                        ) : paginatedSalesCustomers.map((c) => (
                          <tr key={c.id_kontak}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{c.nama_customer}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{c.id_kontak}</div>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c.id_kantor || "HO"}</td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: "#60A5FA" }}>{c.total_orders || 0}</td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: "#34D399", fontSize: "0.82rem" }}>{fmtRupiah(c.total_revenue)}</td>
                            <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              {c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString("id") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(safeSalesCustPage, totalSalesCustPages, salesCustomers.length, setSalesCustPage)}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, color: "var(--text-muted)", flexDirection: "column", gap: "0.75rem" }}>
                  <span style={{ fontSize: "2.5rem" }}>👈</span>
                  <div style={{ fontSize: "0.9rem" }}>Klik nama salesperson untuk melihat daftar customer</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIREKTORI TAB ── */}
      {activeMainTab === "direktori" && (
        <>
      {/* ── HEADER & DIMENSION SELECTOR ── */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid var(--bg-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>👥</span>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Customer Segmentation & 360 Analytics
              </h1>
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Analisis segmentasi multi-dimensi database CPA: Kategori Entitas, Siklus Aktivitas, Termin Pembayaran (TOP), Omzet LTV, Plafon Kredit, dan Wilayah Cabang.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              background: "rgba(255,255,255,0.04)",
              padding: "0.6rem 1.25rem",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Pelanggan
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#60A5FA" }}>
                {fmtNumber(totalCustInDimension)}
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Omzet LTV
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34D399" }}>
                {fmtRupiah(totalRevInDimension)}
              </div>
            </div>
          </div>
        </div>

        {/* Dimension Switcher Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {dimensions.map((dim) => {
            const isSelected = activeDimension === dim.id;
            return (
              <button
                key={dim.id}
                onClick={() => {
                  setActiveDimension(dim.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isSelected
                    ? "1px solid rgba(96, 165, 250, 0.8)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15))"
                    : "rgba(255, 255, 255, 0.03)",
                  color: isSelected ? "#93C5FD" : "var(--text-secondary)",
                  boxShadow: isSelected ? "0 0 15px rgba(59, 130, 246, 0.2)" : "none",
                }}
              >
                <span>{dim.icon}</span>
                <span>{dim.label}</span>
                <span
                  style={{
                    background: isSelected ? "rgba(96, 165, 250, 0.3)" : "rgba(255, 255, 255, 0.08)",
                    color: isSelected ? "#fff" : "var(--text-muted)",
                    padding: "1px 7px",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                  }}
                >
                  {dim.total_segments}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VISUALIZATION CHARTS: DUAL VIEW (BAR & DONUT) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Left: Bar Chart */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--bg-border)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                📊 Distribusi Pelanggan & Revenue — {activeDimMeta.label}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {activeDimMeta.description}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.05)",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              Klik bar untuk filter tabel
            </span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={currentSegments}
                margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="segment"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  tickFormatter={(v) => fmtNumber(v)}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SegmentItem;
                      const color = getSegmentColor(data.segment);
                      return (
                        <div
                          style={{
                            background: "rgba(15, 23, 42, 0.95)",
                            backdropFilter: "blur(12px)",
                            border: `1px solid ${color}`,
                            padding: "0.75rem 1rem",
                            borderRadius: "8px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.35rem" }}>
                            {data.segment}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div>
                              Jumlah Pelanggan: <strong style={{ color: "#60A5FA" }}>{fmtNumber(data.jumlah)}</strong> ({data.percentage}%)
                            </div>
                            <div>
                              Total Revenue: <strong style={{ color: "#34D399" }}>{fmtRupiah(data.total_revenue)}</strong> ({data.revenue_percentage}%)
                            </div>
                            <div>
                              Rata-rata / Cust: <strong style={{ color: "#FBBF24" }}>{fmtRupiah(data.avg_revenue)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="jumlah"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => handleSelectFilter(activeDimension, entry.segment || entry.payload?.segment)}
                >
                  {currentSegments.map((entry, index) => {
                    const isFiltered =
                      activeFilter &&
                      activeFilter.dim === activeDimension &&
                      activeFilter.val === entry.segment;
                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={getSegmentColor(entry.segment, index)}
                        opacity={activeFilter && !isFiltered ? 0.35 : 1}
                        stroke={isFiltered ? "#fff" : "none"}
                        strokeWidth={isFiltered ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Donut Share Chart */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--bg-border)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                🍩 Proporsi Pangsa Segmen (%)
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Persentase distribusi jumlah pelanggan per segmen
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: 320, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SegmentItem;
                      const color = getSegmentColor(data.segment);
                      return (
                        <div
                          style={{
                            background: "rgba(15, 23, 42, 0.95)",
                            backdropFilter: "blur(12px)",
                            border: `1px solid ${color}`,
                            padding: "0.6rem 0.85rem",
                            borderRadius: "8px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#fff" }}>{data.segment}</div>
                          <div style={{ fontSize: "0.85rem", color: "#60A5FA" }}>
                            {fmtNumber(data.jumlah)} Pelanggan ({data.percentage}%)
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#34D399" }}>
                            Omzet: {fmtRupiah(data.total_revenue)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={currentSegments}
                  dataKey="jumlah"
                  nameKey="segment"
                  cx="50%"
                  cy="46%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  cursor="pointer"
                  onClick={(entry: any) => handleSelectFilter(activeDimension, entry.segment || entry.payload?.segment)}
                >
                  {currentSegments.map((entry, index) => {
                    const isFiltered =
                      activeFilter &&
                      activeFilter.dim === activeDimension &&
                      activeFilter.val === entry.segment;
                    return (
                      <Cell
                        key={`pie-${index}`}
                        fill={getSegmentColor(entry.segment, index)}
                        opacity={activeFilter && !isFiltered ? 0.35 : 1}
                        stroke={isFiltered ? "#fff" : "none"}
                        strokeWidth={isFiltered ? 2 : 0}
                      />
                    );
                  })}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => {
                    const item = currentSegments.find((s) => s.segment === value);
                    return (
                      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem" }}>
                        {value} ({item?.percentage || 0}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── SEGMENT KPI METRIC CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {currentSegments.map((seg, idx) => {
          const color = getSegmentColor(seg.segment, idx);
          const isSelected =
            activeFilter &&
            activeFilter.dim === activeDimension &&
            activeFilter.val === seg.segment;

          return (
            <div
              key={seg.segment}
              onClick={() => handleSelectFilter(activeDimension, seg.segment)}
              style={{
                background: isSelected
                  ? "rgba(59, 130, 246, 0.12)"
                  : "var(--bg-card)",
                padding: "1rem",
                borderRadius: "12px",
                border: isSelected ? `2px solid ${color}` : "1px solid var(--bg-border)",
                boxShadow: isSelected ? `0 0 16px ${color}30` : "var(--shadow-sm)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                      display: "inline-block",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      maxWidth: "140px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={seg.segment}
                  >
                    {seg.segment}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: `${color}20`,
                    color: color,
                    padding: "2px 7px",
                    borderRadius: "6px",
                  }}
                >
                  {seg.percentage}%
                </span>
              </div>

              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {fmtNumber(seg.jumlah)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>pelanggan</span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "0.4rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Omzet:</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#34D399" }}>
                  {fmtRupiah(seg.total_revenue)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: isSelected ? "#93C5FD" : "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  {isSelected ? "✓ Aktif difilter" : "🔍 Klik untuk filter"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTIVE FILTER BAR (IF APPLIED) ── */}
      {activeFilter && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "12px",
            padding: "0.75rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🎯</span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              Menampilkan filter segmen:{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                {dimensions.find((d) => d.id === activeFilter.dim)?.label || activeFilter.dim}
              </strong>{" "}
              → <strong style={{ color: "#34D399" }}>{activeFilter.val}</strong>
            </span>
          </div>

          <button
            onClick={() => setActiveFilter(null)}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#FCA5A5",
              padding: "0.35rem 0.85rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>✕</span> Reset Filter
          </button>
        </div>
      )}

      {/* ── CUSTOMER DIRECTORY TABLE ── */}
      <div className="card" style={{ borderRadius: "16px", overflow: "hidden" }}>
        <div
          className="card-header"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--bg-border)",
          }}
        >
          <div>
            <h2 className="card-title" style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
              Direktori Pelanggan CPA &amp; Profil LTV
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {activeFilter
                ? `Menampilkan ${customers.length} pelanggan dalam segmen "${activeFilter.val}"`
                : `Menampilkan ${customers.length} pelanggan teratas`}
            </div>
          </div>

          {/* Search box */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "8px",
                padding: "0.4rem 0.75rem",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>🔍</span>
              <input
                type="text"
                placeholder="Cari pelanggan, ID, nama sales, PIC..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCustPage(1);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  width: "250px",
                }}
                title="Pencarian menurut nama pelanggan, ID kontak, nama sales, atau PIC"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCustPage(1);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <th style={{ padding: "0.85rem 1rem" }}>Customer &amp; ID</th>
                <th style={{ padding: "0.85rem 1rem" }}>Kategori &amp; Kantor</th>
                <th style={{ padding: "0.85rem 1rem" }}>Sales</th>
                <th style={{ padding: "0.85rem 1rem" }}>TOP &amp; Plafon</th>
                <th style={{ padding: "0.85rem 1rem" }}>Status Siklus</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Omzet LTV</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Terakhir Transaksi</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customersLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Tidak ada customer ditemukan pada segmen ini.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const actColor = getSegmentColor(c.segment || "lead");
                  const katColor = getSegmentColor(c.dim_kategori || c.nama_kategori || "Umum");

                  return (
                    <tr
                      key={c.id_kontak}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Nama & ID */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${katColor}40, ${katColor}10)`,
                              border: `1px solid ${katColor}80`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: katColor,
                              flexShrink: 0,
                            }}
                          >
                            {c.nama_customer?.charAt(0) || "C"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.875rem" }}>
                              {c.nama_customer}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {c.id_kontak} {c.telepon ? `• ${c.telepon}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kategori & Kantor */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
                          <span
                            style={{
                              background: `${katColor}20`,
                              color: katColor,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {c.dim_kategori || c.nama_kategori || "Umum"}
                          </span>
                          <span
                            style={{
                              background: "var(--bg-hover)",
                              color: "var(--text-secondary)",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                            }}
                          >
                            📍 {c.dim_kantor || c.id_kantor || "HO"}
                          </span>
                        </div>
                      </td>

                      {/* Sales */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {c.nama_sales ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--color-primary)" }}>
                              👤 {c.panggilan_sales || c.nama_sales}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{c.id_salesman}</div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>

                      {/* TOP & Plafon */}
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem" }}>
                        <div style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                          ⏱️ {c.top ? `${c.top} Hari` : "Cash / COD"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Plafon: {c.batas_kredit && c.batas_kredit > 0 ? fmtRupiah(c.batas_kredit) : "Rp 0"}
                        </div>
                      </td>


                      {/* Status Siklus */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            background: `${actColor}20`,
                            color: actColor,
                            border: `1px solid ${actColor}40`,
                            padding: "0.25rem 0.6rem",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "capitalize",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: actColor,
                            }}
                          />
                          {c.segment?.replace("_", " ") || "Lead"}
                        </span>
                      </td>

                      {/* Omzet LTV */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#34D399", fontSize: "0.875rem" }}>
                          {fmtNumber(c.total_revenue, "Rp ")}
                        </div>
                        {c.dim_revenue_tier && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {c.dim_revenue_tier}
                          </div>
                        )}
                      </td>

                      {/* Terakhir Transaksi */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {c.last_purchase_date ? (
                          <div>
                            <div>{new Date(c.last_purchase_date).toLocaleDateString("id")}</div>
                            {c.days_since_last_purchase != null && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {c.days_since_last_purchase} hr lalu
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>Belum ada</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <button
                          onClick={() => load360(c.id_kontak)}
                          style={{
                            background: "rgba(59, 130, 246, 0.12)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "var(--color-primary)",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                          }}
                        >
                          Lihat 360
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(safeCustPage, totalCustPages, customers.length, setCustPage)}
      </div>
      </>
      )}

      {/* ── MODAL CUSTOMER 360 ── */}
      {selectedId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div
            style={{
              width: "640px",
              maxWidth: "92%",
              background: "var(--bg-surface)",
              height: "100%",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid var(--bg-border)",
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-card)",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Customer 360 Profile
                </h2>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  ID Kontak: {selectedId}
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: "var(--bg-hover)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-muted)",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                &times;
              </button>
            </div>

            {/* Content Modal */}
            <div style={{ padding: "1.5rem", flex: 1 }}>
              {c360Loading ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
                  Memuat profil Customer 360...
                </div>
              ) : c360 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Profil Singkat */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      background: "var(--bg-card)",
                      padding: "1.25rem",
                      borderRadius: "14px",
                      border: "1px solid var(--bg-border)",
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #3B82F6, #10B981)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {c360.profile?.nama_customer?.charAt(0) || "C"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {c360.profile?.nama_customer}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {c360.profile?.telepon || "No phone"} • {c360.profile?.email || "No email"}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--color-primary)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600 }}>
                          {c360.profile?.nama_kategori || "Umum"}
                        </span>
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600 }}>
                          TOP: {c360.profile?.top ? `${c360.profile?.top} Hari` : "Cash / COD"}
                        </span>
                        <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#D97706", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600 }}>
                          Plafon: {fmtRupiah(c360.profile?.batas_kredit)}
                        </span>
                        {c360.profile?.id_salesman && (
                          <span style={{ background: "rgba(139, 92, 246, 0.15)", color: "#7C3AED", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600 }}>
                            👤 Sales: {c360.profile?.panggilan_sales || c360.profile?.nama_sales || c360.profile?.id_salesman}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sales Representative Card */}
                  {c360.profile?.id_salesman && (
                    <div
                      style={{
                        padding: "0.85rem 1.1rem",
                        background: "rgba(139, 92, 246, 0.08)",
                        borderRadius: "12px",
                        border: "1px solid rgba(139, 92, 246, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1rem",
                            fontWeight: 700,
                            boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
                          }}
                        >
                          👤
                        </div>
                        <div>
                          <div style={{ fontSize: "0.7rem", color: "#7C3AED", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Sales Representative (Penanggung Jawab)
                          </div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "1px" }}>
                            {c360.profile?.nama_sales || c360.profile?.panggilan_sales || "Sales Person"}
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.45rem", fontWeight: 400 }}>
                              ({c360.profile?.id_salesman})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        {c360.profile?.telepon_sales && (
                          <a
                            href={`tel:${c360.profile?.telepon_sales}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.78rem",
                              color: "#34D399",
                              background: "rgba(16, 185, 129, 0.12)",
                              border: "1px solid rgba(16, 185, 129, 0.25)",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            📞 {c360.profile?.telepon_sales}
                          </a>
                        )}
                        {c360.profile?.email_sales && (
                          <a
                            href={`mailto:${c360.profile?.email_sales}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.78rem",
                              color: "#60A5FA",
                              background: "rgba(59, 130, 246, 0.12)",
                              border: "1px solid rgba(59, 130, 246, 0.25)",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            ✉️ {c360.profile?.email_sales}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Strip */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--bg-card)",
                        padding: "0.85rem",
                        borderRadius: "10px",
                        border: "1px solid var(--bg-border)",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Belanja (LTV)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10B981", marginTop: "2px" }}>
                        {fmtRupiah(c360.profile?.total_revenue)}
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-card)",
                        padding: "0.85rem",
                        borderRadius: "10px",
                        border: "1px solid var(--bg-border)",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Piutang Terbuka</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#EF4444", marginTop: "2px" }}>
                        {fmtRupiah(c360.profile?.total_piutang)}
                      </div>
                    </div>
                  </div>

                  {/* Produk Sering Dibeli */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid var(--bg-border)",
                        paddingBottom: "0.5rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      📦 Produk Sering Dibeli
                    </h3>
                    {c360.top_products?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {c360.top_products.map((p: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.6rem 0.85rem",
                              background: "var(--bg-card)",
                              borderRadius: "8px",
                              border: "1px solid var(--bg-border)",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                {p.nama_barang}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {p.total_qty} unit • {p.order_count} order
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#10B981" }}>
                              {fmtRupiah(p.total_value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Belum ada histori pembelian produk.
                      </div>
                    )}
                  </div>

                  {/* Riwayat Pesanan */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid var(--bg-border)",
                        paddingBottom: "0.5rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      🧾 Riwayat Pesanan (SO)
                    </h3>
                    {c360.recent_orders?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {c360.recent_orders.map((o: any) => (
                          <div
                            key={o.nomor}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.6rem 0.85rem",
                              background: "var(--bg-card)",
                              borderRadius: "8px",
                              border: "1px solid var(--bg-border)",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                {o.nomor}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {new Date(o.tanggal).toLocaleDateString("id")} • {o.status_label}
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-primary)" }}>
                              {fmtRupiah(o.grandtotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Belum ada histori pesanan.
                      </div>
                    )}
                  </div>

                  {/* Aktivitas & CRM */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid var(--bg-border)",
                        paddingBottom: "0.5rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      🤝 Aktivitas & Komunikasi CRM
                    </h3>
                    {c360.crm_activities?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {c360.crm_activities.map((act: any) => (
                          <div
                            key={act.id}
                            style={{
                              background: "var(--bg-card)",
                              padding: "0.75rem",
                              borderRadius: "8px",
                              border: "1px solid var(--bg-border)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                {act.subject} ({act.activity_type})
                              </strong>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {new Date(act.activity_date).toLocaleDateString("id")}
                              </span>
                            </div>
                            {act.description && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {act.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Belum ada riwayat aktivitas CRM.
                      </div>
                    )}
                  </div>

                  {/* Keluhan & Layanan */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid var(--bg-border)",
                        paddingBottom: "0.5rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      ⚠️ Keluhan & Tiket Layanan
                    </h3>
                    {c360.complaints?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {c360.complaints.map((c: any) => (
                          <div
                            key={c.id}
                            style={{
                              background: "var(--bg-card)",
                              padding: "0.75rem",
                              borderRadius: "8px",
                              border: "1px solid var(--bg-border)",
                              borderLeft: `4px solid ${c.status === "resolved" ? "#34D399" : "#EF4444"}`,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{c.subject}</strong>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  background: "var(--bg-surface)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  color: c.status === "resolved" ? "#34D399" : "#EF4444",
                                }}
                              >
                                {c.status}
                              </span>
                            </div>
                            {c.description && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {c.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Tidak ada keluhan pelanggan tercatat.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
