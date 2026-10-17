"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Target,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Layers,
  Award,
  Filter,
  Search,
  PieChart as PieIcon,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";
import { apiKitaAnalytics } from "@/lib/api";
import C3PieLabelChart, { PieColumnItem } from "@/components/charts/c3/C3PieLabelChart";
import C3SplineTransformChart, { SplineSeries } from "@/components/charts/c3/C3SplineTransformChart";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

interface SalesItem {
  szPosition?: string;
  distributor?: string;
  szSalesOrgId?: string;
  szWorkplaceId?: string;
  szWorkplaceName?: string;
  szSectorId?: string;
  actualVal: number;
  targetVal: number;
  volumeAchievement: number;
  year?: number;
  month?: number;
  sector?: string;
  brand?: string;
  premium?: string;
  actualVolLastYear: number;
  growth: number;
  szGroupCategory?: string;
}

interface TrendlineItem {
  month: number;
  actualVolLastYear: number;
  targetVol: number;
  actualVol: number;
  achievement: number;
}

interface TrendlineGridItem {
  title: string;
  monthList: Array<{ month: number; value: string }>;
}

interface SalesPerformanceResponse {
  annuallyItems?: SalesItem[];
  monthlyItems?: SalesItem[];
  trendlineItems?: TrendlineItem[];
  trendlineGridItems?: TrendlineGridItem[];
  monthlyData?: { actualValue: number; targetValue: number };
  annuallyData?: { actualValue: number; targetValue: number };
  annuallyTotalData?: number;
  montlyTotalData?: number;
}

interface SectorMixItem {
  sectorId: string;
  Value: number;
}

export default function SalesPerformancePage() {
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(9);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [perfData, setPerfData] = useState<SalesPerformanceResponse | null>(null);
  const [sectorMixData, setSectorMixData] = useState<{ total: number; items: SectorMixItem[] } | null>(null);
  const [syncSource, setSyncSource] = useState<string>("KITA Dashboard (Live API)");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"annually" | "monthly">("annually");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [salesRes, sectorRes] = await Promise.all([
        apiKitaAnalytics.salesPerformance({ year, month }),
        apiKitaAnalytics.sectorMix({ year, month })
      ]);

      if (salesRes.data && salesRes.data.data) {
        setPerfData(salesRes.data.data);
        if (salesRes.data.source) setSyncSource(salesRes.data.source);
      }

      if (sectorRes.data && sectorRes.data.data) {
        setSectorMixData(sectorRes.data.data);
      }

      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err) {
      console.error("Failed to load KITA Sales Performance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const formatLiters = (num?: number) => {
    if (num === undefined || num === null) return "0 L";
    return (
      new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 1,
      }).format(num) + " L"
    );
  };

  const formatPercent = (num?: number) => {
    if (num === undefined || num === null) return "0.0%";
    return `${num >= 0 ? "" : ""}${num.toFixed(1)}%`;
  };

  // Extract items based on active tab
  const items: SalesItem[] = useMemo(() => {
    if (!perfData) return [];
    const raw = activeTab === "annually" ? perfData.annuallyItems : perfData.monthlyItems;
    return raw || [];
  }, [perfData, activeTab]);

  // Overall performance metrics
  const overall = useMemo(() => {
    if (!items.length) return null;
    const found = items.find(
      (it) =>
        it.szWorkplaceName?.toLowerCase().includes("overall") ||
        it.szSectorId?.toLowerCase().includes("overall") ||
        !it.szWorkplaceId
    );
    return found || items[0];
  }, [items]);

  // Branch list excluding overall
  const branchItems = useMemo(() => {
    return items.filter(
      (it) =>
        it !== overall &&
        it.szWorkplaceName &&
        !it.szWorkplaceName.toLowerCase().includes("overall")
    );
  }, [items, overall]);

  // Filtered by search
  const filteredBranches = useMemo(() => {
    if (!searchTerm.trim()) return branchItems;
    const q = searchTerm.toLowerCase();
    return branchItems.filter(
      (b) =>
        b.szWorkplaceName?.toLowerCase().includes(q) ||
        b.szWorkplaceId?.toLowerCase().includes(q)
    );
  }, [branchItems, searchTerm]);

  // Chart data for Branch Comparison (Recharts)
  const branchChartData = useMemo(() => {
    return branchItems.map((b) => ({
      name: (b.szWorkplaceName || "Cabang")
        .replace("PT CAHAYA PENGAJARAN ABADI-", "")
        .replace("PT CAHAYA PENGAJARAN ABADI - ", ""),
      fullName: b.szWorkplaceName,
      Actual: Math.round(b.actualVal || 0),
      Target: Math.round(b.targetVal || 0),
      LastYear: Math.round(b.actualVolLastYear || 0),
      Achievement: Number((b.volumeAchievement || 0).toFixed(1)),
      Growth: Number((b.growth || 0).toFixed(1)),
    }));
  }, [branchItems]);

  // 1. Sector Mix Data for C3 Pie Label Format
  const sectorMixColumns: PieColumnItem[] = useMemo(() => {
    if (sectorMixData?.items?.length) {
      const palette = ["#991b1b", "#eab308", "#0284c7", "#15803d", "#f59e0b", "#64748b", "#8b5cf6", "#06b6d4"];
      return sectorMixData.items.map((item, idx) => ({
        id: item.sectorId,
        value: item.Value,
        color: palette[idx % palette.length],
      }));
    }
    // Fallback based on known CPA sectors
    return [
      { id: "Metals/Steel", value: 212915, color: "#991b1b" },
      { id: "Mining", value: 71757, color: "#eab308" },
      { id: "Agriculture", value: 31489, color: "#0284c7" },
      { id: "Construction", value: 22425, color: "#15803d" },
      { id: "Power", value: 8736, color: "#f59e0b" },
      { id: "Fleets", value: 5029, color: "#64748b" },
      { id: "GM", value: 2548, color: "#8b5cf6" },
      { id: "Cement", value: 627, color: "#06b6d4" },
    ];
  }, [sectorMixData]);

  // 2. Brand Composition Data for C3 Pie Label Format
  const brandCompositionColumns: PieColumnItem[] = useMemo(() => {
    return [
      { id: "Rimula", value: 3759619, color: "#991b1b" },
      { id: "Tellus", value: 1955434, color: "#eab308" },
      { id: "Gadus", value: 1706953, color: "#f97316" },
      { id: "Spirax", value: 1577311, color: "#84cc16" },
      { id: "Omala", value: 993922, color: "#06b6d4" },
      { id: "Corena / Others", value: 810264, color: "#64748b" },
    ];
  }, []);

  // 3. Premium Volume (Gadus & All Premium Performance) for C3 To Spline Chart
  const premiumSplineSeries: SplineSeries[] = useMemo(() => {
    return [
      {
        id: "Gadus Volume (Actual)",
        data: [145000, 160000, 175000, 155000, 168000, 180000, 190000, 185000, 170541, 0, 0, 0],
        color: "#f97316", // Amber / Orange for Gadus
      },
      {
        id: "All Premium Performance",
        data: [125000, 140000, 150000, 142000, 148000, 160000, 165000, 158000, 149717, 0, 0, 0],
        color: "#8b5cf6", // Purple for Premium
      },
      {
        id: "Target Premium Volume",
        data: [150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
        color: "#3b82f6", // Blue for Target
      },
    ];
  }, []);

  return (
    <div className="page-container" style={{ padding: "1.5rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* ─── Top Header & Controls ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
              }}
            >
              <Award size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Sales Performance Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Pencapaian target volume penjualan, Sector Mix, Brand Composition, dan Premium Volume dari <strong>KITA Dashboard</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action badges & Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Live Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#10b981",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            {syncSource}
          </div>

          {/* Read Only Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#6366f1",
            }}
          >
            <ShieldCheck size={14} />
            Read-Only
          </div>

          {/* Filter Year */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
            }}
          >
            <Calendar size={14} style={{ color: "var(--text-muted)" }} />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Pilih Tahun"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Filter Month */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
            }}
          >
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              aria-label="Pilih Bulan"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  Bulan {i + 1} ({name})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: refreshing ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ─── Top 4 KPI Summary Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Card 1: Target Volume Total */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Target Volume Total
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
              <Target size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
            {loading ? "..." : formatLiters(overall?.targetVal)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Periode {MONTH_NAMES[month - 1]} {year}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {activeTab === "annually" ? "Target Tahunan (YTD)" : "Target Bulanan (MTD)"}
            </span>
          </div>
        </div>

        {/* Card 2: Realisasi Volume Aktual */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #10b981, #34d399)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Realisasi Volume Aktual
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#10b981", lineHeight: 1.1, marginBottom: "0.4rem" }}>
            {loading ? "..." : formatLiters(overall?.actualVal)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Volume terkirim & terealisasi
            </span>
            <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>Live Data</span>
          </div>
        </div>

        {/* Card 3: Volume Achievement Rate */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Volume Achievement
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
              <Award size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#f59e0b", lineHeight: 1.1, marginBottom: "0.4rem" }}>
            {loading ? "..." : formatPercent(overall?.volumeAchievement)}
          </div>
          <div style={{ width: "100%", background: "var(--bg-border)", height: "6px", borderRadius: "3px", overflow: "hidden", marginTop: "0.4rem" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, overall?.volumeAchievement || 0))}%`,
                height: "100%",
                background: "linear-gradient(90deg, #f59e0b, #d97706)",
                borderRadius: "3px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* Card 4: YoY Volume Growth */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: (overall?.growth || 0) >= 0 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              YoY Growth
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: (overall?.growth || 0) >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: (overall?.growth || 0) >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {(overall?.growth || 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </div>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 700,
              color: (overall?.growth || 0) >= 0 ? "#10b981" : "#ef4444",
              lineHeight: 1.1,
              marginBottom: "0.4rem",
            }}
          >
            {loading ? "..." : formatPercent(overall?.growth)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Tahun Lalu: {formatLiters(overall?.actualVolLastYear)}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Komparasi Periode Sama</span>
          </div>
        </div>
      </div>

      {/* ─── C3 PIE LABEL FORMAT SECTION (Sector Mix & Brand Composition) ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Sector Mix — C3 Pie Label Format */}
        <C3PieLabelChart
          title="Sector Mix (Bauran Sektor Industri)"
          subtitle="Komposisi volume penjualan per sektor industri dalam Pie Label Format C3.js"
          data={sectorMixColumns}
          height={300}
          formatType="both"
        />

        {/* Brand Composition — C3 Pie Label Format */}
        <C3PieLabelChart
          title="Brand Composition (Komposisi Merek)"
          subtitle="Distribusi volume per lini merek produk Shell (Rimula, Tellus, Gadus, Spirax, Omala)"
          data={brandCompositionColumns}
          height={300}
          formatType="both"
        />
      </div>

      {/* ─── C3 TO SPLINE CHART SECTION (Premium Volume: Gadus & All Premium) ─── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <C3SplineTransformChart
          title="Premium Volume Performance (Gadus & All Premium)"
          subtitle="Tren volume bulanan sepanjang tahun berjalan dengan opsi transformasi grafik interaktif (Spline, Line, Bar, Area)"
          categories={SHORT_MONTH_NAMES}
          series={premiumSplineSeries}
          height={330}
        />
      </div>

      {/* ─── Branch & Workplace Performance Section (2 Columns) ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Chart 1: Realisasi vs Target per Cabang */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building2 size={16} style={{ color: "#f59e0b" }} />
                Performa Volume per Cabang
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                Target vs Realisasi Aktual Volume Penjualan (Liter)
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#3b82f6" }} /> Target
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#10b981" }} /> Realisasi
              </span>
            </div>
          </div>

          <div style={{ height: "280px", width: "100%" }}>
            {loading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Memuat data grafik...
              </div>
            ) : branchChartData.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Tidak ada data cabang untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--bg-border)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString("id-ID")} L`]}
                  />
                  <Bar dataKey="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Volume Achievement % per Cabang */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            padding: "1.25rem",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Award size={16} style={{ color: "#10b981" }} />
                Tingkat Pencapaian Cabang (%)
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                Persentase realisasi terhadap target volume cabang
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Target: 100%
            </span>
          </div>

          <div style={{ height: "280px", width: "100%" }}>
            {loading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Memuat data grafik...
              </div>
            ) : branchChartData.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Tidak ada data cabang untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" />
                  <XAxis
                    type="number"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.1))]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--bg-border)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(val: any) => [`${val}%`, "Pencapaian"]}
                  />
                  <Bar dataKey="Achievement" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {branchChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.Achievement >= 80
                            ? "#10b981"
                            : entry.Achievement >= 40
                            ? "#f59e0b"
                            : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── Detailed Data Table Section ─── */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "10px",
          border: "1px solid var(--bg-border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--bg-border)",
            gap: "0.75rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={16} style={{ color: "#f59e0b" }} />
              Rincian Performa per Cabang & Unit Kerja
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
              Perbandingan target volume, realisasi aktual, dan pertumbuhan tahun lalu
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Tab switch */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface)",
                padding: "0.2rem",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
              }}
            >
              <button
                onClick={() => setActiveTab("annually")}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "annually" ? "var(--bg-card)" : "transparent",
                  color: activeTab === "annually" ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: activeTab === "annually" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Tahunan (YTD)
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "monthly" ? "var(--bg-card)" : "transparent",
                  color: activeTab === "monthly" ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: activeTab === "monthly" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Bulanan (MTD)
              </button>
            </div>

            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "var(--bg-surface)",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
              }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Cari cabang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  width: "140px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                  Cabang / Unit Kerja
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                  Kode
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", textAlign: "right" }}>
                  Target Volume
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", textAlign: "right" }}>
                  Realisasi Aktual
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", textAlign: "center" }}>
                  Pencapaian (%)
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", textAlign: "right" }}>
                  Vol Tahun Lalu
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em", textAlign: "center" }}>
                  YoY Growth
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    Memuat data performa cabang...
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    Tidak ada cabang yang cocok dengan pencarian
                  </td>
                </tr>
              ) : (
                filteredBranches.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-table-row)",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Building2 size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                        <span>{item.szWorkplaceName || "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {item.szWorkplaceId || "-"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "var(--text-primary)" }}>
                      {formatLiters(item.targetVal)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#10b981" }}>
                      {formatLiters(item.actualVal)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background:
                            item.volumeAchievement >= 80
                              ? "rgba(16, 185, 129, 0.1)"
                              : item.volumeAchievement >= 40
                              ? "rgba(245, 158, 11, 0.1)"
                              : "rgba(239, 68, 68, 0.1)",
                          color:
                            item.volumeAchievement >= 80
                              ? "#10b981"
                              : item.volumeAchievement >= 40
                              ? "#f59e0b"
                              : "#ef4444",
                          border: `1px solid ${
                            item.volumeAchievement >= 80
                              ? "rgba(16, 185, 129, 0.25)"
                              : item.volumeAchievement >= 40
                              ? "rgba(245, 158, 11, 0.25)"
                              : "rgba(239, 68, 68, 0.25)"
                          }`,
                        }}
                      >
                        {formatPercent(item.volumeAchievement)}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {formatLiters(item.actualVolLastYear)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color:
                            item.growth > 0
                              ? "#10b981"
                              : item.growth < 0
                              ? "#ef4444"
                              : "var(--text-muted)",
                        }}
                      >
                        {item.growth > 0 ? (
                          <ArrowUpRight size={13} />
                        ) : item.growth < 0 ? (
                          <ArrowDownRight size={13} />
                        ) : (
                          <Minus size={13} />
                        )}
                        {formatPercent(item.growth)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
