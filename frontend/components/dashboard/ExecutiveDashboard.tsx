"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Receipt,
  Users,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Gauge,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { apiAnalytics } from "@/lib/api";
import MainDashboardC3 from "./MainDashboardC3";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalesActivity {
  omzet: number;
  omzet_prev: number;
  growth_pct: number;
  piutang: number;
  sparkline: number[];
}

interface InvoiceActivity {
  total_invoices: number;
  prev_invoices: number;
  growth_pct: number;
  sparkline: number[];
}

interface CustomerHealth {
  total: number;
  active: number;
  at_risk: number;
  churned: number;
  active_pct: number;
}

interface TopCategory {
  kategori: string;
  count_sku: number;
  total_nominal: number;
  percentage: number;
}

interface TopProduct {
  nama_barang: string;
  kategori: string;
  total_qty: number;
  total_nominal: number;
}

interface InventoryStockCategory {
  kategori: string;
  total_sku: number;
  total_available: number;
  high_stock: number;
  low_stock: number;
  out_of_stock: number;
}

interface InventoryStocks {
  summary: {
    total_sku: number;
    total_nilai_persediaan: number;
    total_units: number;
    low_stock_count: number;
    zero_stock_count: number;
  };
  categories: InventoryStockCategory[];
}

interface MonthlyTrendPoint {
  period: string;
  omzet: number;
  piutang: number;
  invoices: number;
}

interface RecentTransaction {
  no_faktur: string;
  tanggal: string;
  nama_customer: string;
  grandtotal: number;
  is_lunas: boolean;
  status_label: string;
  no_do: string | null;
}

interface ExecutiveData {
  period: { period: string; date_from: string; date_to: string };
  sales_activity: SalesActivity;
  invoice_activity: InvoiceActivity;
  customer_health: CustomerHealth;
  top_categories: TopCategory[];
  top_products: TopProduct[];
  inventory_stocks: InventoryStocks;
  monthly_trend: MonthlyTrendPoint[];
  recent_transactions: RecentTransaction[];
  sync_status: { table_name: string; last_sync_at: string; sync_status: string }[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtIDR(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return "Rp 0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000_000) {
    return `Rp ${(num / 1_000_000_000_000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T`;
  }
  if (abs >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Jt`;
  }
  return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
}

function fmtFullIDR(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return "Rp 0";
  return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
}

function fmtNum(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return "0";
  return num.toLocaleString("id-ID");
}

function formatDateID(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Mini Sparkline Components ────────────────────────────────────────────────
function AreaSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((v, i) => ({ val: v, i }));
  const gradId = `sparkline-grad-${color.replace("#", "")}`;

  return (
    <div style={{ width: "100%", height: 48, marginTop: "0.75rem" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((v, i) => ({ val: v, i }));

  return (
    <div style={{ width: "100%", height: 48, marginTop: "0.75rem" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <Bar dataKey="val" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const [viewMode, setViewMode] = useState<"c3" | "executive">("c3");
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [period, setPeriod] = useState<string>("ytd");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchData = useCallback(async (selectedPeriod: string) => {
    try {
      setRefreshing(true);
      const res = await apiAnalytics.executiveSummary({ period: selectedPeriod });
      if (res && res.data) {
        setData(res.data);
        setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("Gagal memuat executive summary:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role === "sales_rep" || u.role === "sales") {
          window.location.href = "/sales/orders";
          return;
        } else if (u.role === "warehouse_staff" || u.role === "warehouse") {
          window.location.href = "/inventory";
          return;
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [fetchData, period]);

  // Donut chart segments
  const customerPieData = [
    { name: "Active", value: data?.customer_health.active || 197, color: "#10B981" },
    { name: "At Risk", value: data?.customer_health.at_risk || 192, color: "#0D99FF" },
    { name: "Churned", value: data?.customer_health.churned || 2105, color: "#EF4444" },
  ];

  // Colors for category progress bars
  const categoryColors = ["#10B981", "#0D99FF", "#F59E0B", "#8B5CF6", "#EC4899"];

  if (viewMode === "executive" && loading && !data) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Memuat Executive Dashboard & Live Sync ERP...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1560px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── View Switcher: Main Dashboard (C3) vs Executive Overview ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "4px",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("c3")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 1.15rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: viewMode === "c3" ? "var(--color-primary)" : "transparent",
              color: viewMode === "c3" ? "#000" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <Gauge size={15} />
            <span>Main Dashboard (C3 Analytics)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("executive")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 1.15rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: viewMode === "executive" ? "var(--color-primary)" : "transparent",
              color: viewMode === "executive" ? "#000" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <BarChart3 size={15} />
            <span>Executive Overview (Figma Layout)</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
          <Link
            href="/main-dashboard"
            style={{
              fontSize: "0.78rem",
              color: "var(--color-primary)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: 600,
            }}
          >
            <span>Buka di tab penuh</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {viewMode === "c3" ? (
        <MainDashboardC3 />
      ) : (
        <>
      {/* ─── HEADER BAR (Interoly UI Kit Style) ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "16px",
          padding: "1.25rem 1.75rem",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Executive Dashboard
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse 2s infinite" }} />
              Live ERP Ultima 2026
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Ringkasan performa penjualan, pergerakan stok inventori, dan kesehatan pelanggan real-time.
          </p>
        </div>

        {/* Filter Controls & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.25rem",
              gap: "0.25rem",
            }}
          >
            {[
              { id: "ytd", label: "YTD 2026" },
              { id: "mtd", label: "Bulan Ini" },
              { id: "12m", label: "12 Bulan" },
              { id: "all", label: "Semua Data" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                style={{
                  border: "none",
                  borderRadius: "7px",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8rem",
                  fontWeight: period === tab.id ? 600 : 500,
                  cursor: "pointer",
                  background: period === tab.id ? "#10B981" : "transparent",
                  color: period === tab.id ? "#FFFFFF" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchData(period)}
            disabled={refreshing}
            title="Refresh Data Terkini"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              padding: "0.45rem 0.85rem",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-400" : ""} />
            <span>{refreshing ? "Memperbarui..." : `Refresh ${lastRefreshed ? `(${lastRefreshed})` : ""}`}</span>
          </button>
        </div>
      </div>

      {/* ─── ROW 1: SALES ACTIVITY & TOP PERFORMERS ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem" }}>
        
        {/* Sales Activity Block (7 cols) */}
        <div
          style={{
            gridColumn: "span 7",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
                Sales Activity
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Periode: {data?.period.date_from} s/d {data?.period.date_to}
              </div>
            </div>
            <Link
              href="/sales"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.8rem",
                color: "#10B981",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Lihat Detail Sales <ChevronRight size={14} />
            </Link>
          </div>

          {/* 3 Sub-Cards inside Sales Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            
            {/* Card 1: Total Omzet Penjualan */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "12px",
                padding: "1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Total Penjualan</span>
                  <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: "0.35rem", borderRadius: "8px", color: "#10B981" }}>
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {fmtIDR(data?.sales_activity.omzet)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }} title={fmtFullIDR(data?.sales_activity.omzet)}>
                  {fmtFullIDR(data?.sales_activity.omzet)}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "6px",
                    background: (data?.sales_activity.growth_pct ?? 0) >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: (data?.sales_activity.growth_pct ?? 0) >= 0 ? "#10B981" : "#EF4444",
                  }}
                >
                  {(data?.sales_activity.growth_pct ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {(data?.sales_activity.growth_pct ?? 0) >= 0 ? `+${data?.sales_activity.growth_pct}%` : `${data?.sales_activity.growth_pct}%`}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>vs periode lalu</span>
              </div>

              <AreaSparkline data={data?.sales_activity.sparkline || []} color="#10B981" />
            </div>

            {/* Card 2: Total Faktur Penjualan */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "12px",
                padding: "1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Faktur Terbit</span>
                  <div style={{ background: "rgba(13, 153, 255, 0.12)", padding: "0.35rem", borderRadius: "8px", color: "#0D99FF" }}>
                    <Receipt size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {fmtNum(data?.invoice_activity.total_invoices)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  Dokumen Invoices Penjualan
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "6px",
                    background: "rgba(13, 153, 255, 0.15)",
                    color: "#0D99FF",
                  }}
                >
                  <TrendingUp size={12} /> Live Sync
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>aktif diproses</span>
              </div>

              <BarSparkline data={data?.invoice_activity.sparkline || []} color="#0D99FF" />
            </div>

            {/* Card 3: Customer Health Donut */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "12px",
                padding: "1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Customer Health</span>
                <div style={{ background: "rgba(245, 158, 11, 0.12)", padding: "0.35rem", borderRadius: "8px", color: "#F59E0B" }}>
                  <Users size={16} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
                <div style={{ width: 72, height: 72, position: "relative", flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerPieData}
                        innerRadius={24}
                        outerRadius={34}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {customerPieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {data?.customer_health.active_pct}%
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.72rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ color: "var(--text-muted)" }}>Aktif:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{fmtNum(data?.customer_health.active)}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D99FF" }} />
                    <span style={{ color: "var(--text-muted)" }}>At Risk:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{fmtNum(data?.customer_health.at_risk)}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
                    <span style={{ color: "var(--text-muted)" }}>Dormant:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{fmtNum(data?.customer_health.churned)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.4rem" }}>
                Total Basis: <strong>{fmtNum(data?.customer_health.total)}</strong> Pelanggan
              </div>
            </div>

          </div>
        </div>

        {/* Top Selling Category & Top Products Block (5 cols) */}
        <div
          style={{
            gridColumn: "span 5",
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: "1.25rem",
          }}
        >
          {/* Top Selling Category Card */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "16px",
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Top Selling Category
              </h3>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Distribusi Omzet</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(data?.top_categories || []).map((cat, idx) => (
                <div key={cat.kategori} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {cat.kategori}{" "}
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({cat.count_sku} SKU)</span>
                    </span>
                    <span style={{ fontWeight: 700, color: categoryColors[idx % categoryColors.length] }}>
                      {fmtIDR(cat.total_nominal)}{" "}
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({cat.percentage}%)</span>
                    </span>
                  </div>
                  {/* Custom Progress Bar */}
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                        height: "100%",
                        background: categoryColors[idx % categoryColors.length],
                        borderRadius: 3,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Products Card */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "16px",
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Top Selling Products
              </h3>
              <Link href="/inventory" style={{ fontSize: "0.72rem", color: "#10B981", textDecoration: "none" }}>
                Katalog SKU →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {(data?.top_products || []).slice(0, 4).map((prod, idx) => (
                <div
                  key={prod.nama_barang}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "8px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: idx === 0 ? "#10B981" : "var(--bg-hover)",
                        color: idx === 0 ? "#fff" : "var(--text-muted)",
                        fontSize: "0.68rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={prod.nama_barang}
                      >
                        {prod.nama_barang}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        {prod.kategori} • {fmtNum(prod.total_qty)} units terjual
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#10B981", flexShrink: 0, marginLeft: "0.5rem" }}>
                    {fmtIDR(prod.total_nominal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ─── ROW 2: TOTAL PRODUCT STOCKS & PURCHASE & SALES ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem" }}>
        
        {/* Total Product Stocks (Inventory Health Multi-bar Chart) (7 cols) */}
        <div
          style={{
            gridColumn: "span 7",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
                Total Product Stocks
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Ketersediaan dan level kesehatan stok per kategori produk
              </div>
            </div>

            {/* Top Quick Summary Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--bg-border)", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total SKU: </span>
                <strong style={{ color: "var(--text-primary)" }}>{fmtNum(data?.inventory_stocks.summary.total_sku)}</strong>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--bg-border)", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Nilai Stok: </span>
                <strong style={{ color: "#10B981" }}>{fmtIDR(data?.inventory_stocks.summary.total_nilai_persediaan)}</strong>
              </div>
            </div>
          </div>

          {/* Legends */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1rem", fontSize: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10B981" }} />
              <span style={{ color: "var(--text-primary)" }}>High Stock Items (&gt;100)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#8B5CF6" }} />
              <span style={{ color: "var(--text-primary)" }}>Low Stock Items (1–100)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#EF4444" }} />
              <span style={{ color: "var(--text-primary)" }}>Out of Stock (0)</span>
            </div>
          </div>

          {/* Recharts Multi-Bar Chart */}
          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.inventory_stocks.categories || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="kategori" stroke="#828690" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#828690" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1B1F27",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "0.8rem",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  }}
                  formatter={(val: any, name: any) => {
                    const label = name === "high_stock" ? "Stok Aman" : name === "low_stock" ? "Stok Rendah" : "Stok Kosong";
                    return [`${val} SKU`, label];
                  }}
                />
                <Bar dataKey="high_stock" name="high_stock" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="low_stock" name="low_stock" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="out_of_stock" name="out_of_stock" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Purchase & Sales / Tren Penjualan vs Piutang (5 cols) */}
        <div
          style={{
            gridColumn: "span 5",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
                Purchase &amp; Sales Trend
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Omzet Penjualan vs Piutang (2025 – 2026)
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Omzet</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D99FF" }} />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Faktur</span>
              </div>
            </div>
          </div>

          <div style={{ height: 260, width: "100%", marginTop: "0.5rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.monthly_trend || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSalesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="period"
                  stroke="#828690"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                  tickFormatter={(v) => {
                    const [year, month] = v.split("-");
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis
                  stroke="#828690"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmtIDR(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1B1F27",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "0.8rem",
                  }}
                  formatter={(val: any) => [fmtFullIDR(val), "Omzet"]}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSalesArea)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Footer mini stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: "0.75rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Bulan Terkini (Sep 2026): </span>
              <strong style={{ color: "var(--text-primary)" }}>Rp 3,26 M</strong> (38 Faktur)
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "var(--text-muted)" }}>Puncak Bulanan: </span>
              <strong style={{ color: "#10B981" }}>Rp 88,46 M</strong> (Jul 2026)
            </div>
          </div>
        </div>

      </div>

      {/* ─── ROW 3: RECENT ORDERS & LIVE TRANSACTIONS TABLE ─── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "16px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Recent Orders &amp; Live Transactions
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10B981",
                  fontWeight: 600,
                }}
              >
                10 Transaksi Terkini
              </span>
            </div>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Data faktur penjualan terkonfirmasi terbaru yang tersinkronisasi otomatis dari ERP Ultima.
            </p>
          </div>

          <Link
            href="/sales"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Buka Modul Penjualan Lengkap <ExternalLink size={14} />
          </Link>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--bg-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>No. Faktur / Invoice</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Nama Pelanggan</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Tanggal Transaksi</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Nominal Transaksi</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>Status Pembayaran</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>Surat Jalan (DO)</th>
                <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_transactions || []).map((tx, idx) => {
                // Initial avatar initials
                const initials = (tx.nama_customer || "CU")
                  .split(" ")
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <tr
                    key={tx.no_faktur}
                    style={{
                      borderBottom: idx === (data?.recent_transactions.length ?? 0) - 1 ? "none" : "1px solid var(--bg-border)",
                      background: idx % 2 === 1 ? "var(--bg-surface)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* No Faktur */}
                    <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
                      <span style={{ background: "var(--bg-hover)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                        {tx.no_faktur}
                      </span>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10B981",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {tx.nama_customer}
                        </span>
                      </div>
                    </td>

                    {/* Tanggal */}
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>
                      {formatDateID(tx.tanggal)}
                    </td>

                    {/* Nominal */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: 700, color: "#10B981" }}>
                      {fmtFullIDR(tx.grandtotal)}
                    </td>

                    {/* Status Bayar */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: tx.is_lunas ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: tx.is_lunas ? "#10B981" : "#F59E0B",
                        }}
                      >
                        {tx.is_lunas ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {tx.is_lunas ? "Lunas" : "Belum Lunas"}
                      </span>
                    </td>

                    {/* Surat Jalan */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      {tx.no_do ? (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {tx.no_do}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Terkonfirmasi
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <Link
                        href="/sales"
                        style={{
                          color: "#10B981",
                          fontSize: "0.75rem",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Rincian →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

    </div>
  );
}
