"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  Target, 
  Layers, 
  Flame, 
  Users, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  TableProperties,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  ExternalLink,
  Activity,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart, 
  BarChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { apiKitaAnalytics } from "@/lib/api";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

interface KitaOverviewData {
  pipelineStrengthPersentage: number;
  pipelineStrengthAverage: number;
  lowTouchCustPersentage: number;
  lowTouchCustAverage: number;
  crossSellPersentage: number;
  crossSellAverage: number;
  premiumContributionPersentage: number;
  premiumContributionAverage: number;
  decRunnerRatioPercentage: number;
  decRunnerRatioAverage: number;
}

interface KitaMonthlyItem {
  month: number;
  monthName?: string;
  pipelineStrength: number;
  pStrengthAnnualPotVol: number;
  crossSell: number;
  crossSellCount: number;
  lowTouchRatio: number;
  premiumContribution: number;
  decRunnerRatio: number;
}

type TabKey = "overview" | "ps" | "bff" | "cs" | "pf" | "rr" | "sc";

interface TabConfig {
  key: TabKey;
  hash: string;
  title: string;
  shortTitle: string;
  metricLabel: string;
  target: string;
  color: string;
  icon: any;
}

const TABS: TabConfig[] = [
  {
    key: "overview",
    hash: "#overview",
    title: "OVERVIEW & TRENDS",
    shortTitle: "Overview",
    metricLabel: "Semua Metrik",
    target: "12 Bulan",
    color: "#6366f1",
    icon: Activity
  },
  {
    key: "ps",
    hash: "#ps",
    title: "PIPELINE STRENGTH",
    shortTitle: "Pipeline Strength",
    metricLabel: "19.6%",
    target: "> 15%",
    color: "#3b82f6",
    icon: TrendingUp
  },
  {
    key: "bff",
    hash: "#bff",
    title: "BUYING FREQUENCY FOCUS",
    shortTitle: "Buying Frequency",
    metricLabel: "44.3%",
    target: "> 40%",
    color: "#ec4899",
    icon: Users
  },
  {
    key: "cs",
    hash: "#cs",
    title: "CROSS SELL FOCUS",
    shortTitle: "Cross Sell",
    metricLabel: "2.30",
    target: ">= 2.30",
    color: "#10b981",
    icon: Layers
  },
  {
    key: "pf",
    hash: "#pf",
    title: "PREMIUM FOCUS",
    shortTitle: "Premium Focus",
    metricLabel: "13.4%",
    target: ">= 13%",
    color: "#8b5cf6",
    icon: Sparkles
  },
  {
    key: "rr",
    hash: "#rr",
    title: "RUNNER RATIO",
    shortTitle: "Runner Ratio",
    metricLabel: "53.7%",
    target: ">= 53.7%",
    color: "#f59e0b",
    icon: Flame
  },
  {
    key: "sc",
    hash: "#sc",
    title: "SPECIAL CASE",
    shortTitle: "Special Case",
    metricLabel: "5 Akun/Cabang",
    target: "Intervensi",
    color: "#ef4444",
    icon: AlertCircle
  }
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(9);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<KitaOverviewData | null>(null);
  const [trends, setTrends] = useState<KitaMonthlyItem[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>("");
  const [syncSource, setSyncSource] = useState<string>("KITA Dashboard (Live API)");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Sync hash from URL on mount & on hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase() as TabKey;
      if (["overview", "ps", "bff", "cs", "pf", "rr", "sc"].includes(hash)) {
        setActiveTab(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    window.location.hash = tab === "overview" ? "#overview" : `#${tab}`;
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, trendsRes] = await Promise.all([
        apiKitaAnalytics.overview({ year, month }),
        apiKitaAnalytics.monthlyTrends({ year })
      ]);

      if (overviewRes.data && overviewRes.data.data) {
        setOverview(overviewRes.data.data);
        if (overviewRes.data.source) setSyncSource(overviewRes.data.source);
      }

      if (trendsRes.data && trendsRes.data.data) {
        const rawTrends: KitaMonthlyItem[] = trendsRes.data.data;
        const mappedTrends = rawTrends.map((item) => ({
          ...item,
          monthName: SHORT_MONTH_NAMES[(item.month - 1) % 12] || `Bln ${item.month}`
        }));
        setTrends(mappedTrends);
      }

      setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Failed to load KITA analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch focus table data whenever activeTab, year, or month changes
  useEffect(() => {
    if (activeTab === "overview") return;

    let isMounted = true;
    const loadFocusTable = async () => {
      setTableLoading(true);
      try {
        const res = await apiKitaAnalytics.focusTables({ tab: activeTab, year, month });
        if (isMounted && res.data && res.data.data) {
          setTableData(res.data.data);
        }
      } catch (err) {
        console.error(`Failed to load focus table for ${activeTab}:`, err);
      } finally {
        if (isMounted) setTableLoading(false);
      }
    };

    loadFocusTable();
    return () => {
      isMounted = false;
    };
  }, [activeTab, year, month]);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const formatNumber = (num: number, decimals = 1) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatVolume = (vol: number) => {
    if (!vol) return "0 L";
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)} Juta L`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)} Ribu L`;
    return `${vol.toFixed(0)} L`;
  };

  const renderDelta = (delta: number, isPositiveGood = true) => {
    if (delta === 0 || delta === undefined || delta === null) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 500 }}>
          <Minus size={13} /> 0.0% vs avg
        </span>
      );
    }
    const isGood = isPositiveGood ? delta > 0 : delta < 0;
    const color = isGood ? "#10b981" : "#ef4444";
    const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", color, fontSize: "0.75rem", fontWeight: 600 }}>
        <Icon size={14} />
        {delta > 0 ? `+${formatNumber(delta)}%` : `${formatNumber(delta)}%`} vs avg
      </span>
    );
  };

  // Filtered table data for the active focus tab
  const filteredTableData = useMemo(() => {
    if (!tableSearch.trim()) return tableData;
    const q = tableSearch.toLowerCase();
    return tableData.filter((item) => {
      return (
        (item.distributorName && item.distributorName.toLowerCase().includes(q)) ||
        (item.sectorDetail && item.sectorDetail.toLowerCase().includes(q)) ||
        (item.grade && item.grade.toLowerCase().includes(q)) ||
        (item.status && item.status.toLowerCase().includes(q))
      );
    });
  }, [tableData, tableSearch]);

  return (
    <div className="page-container" style={{ padding: "1.5rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* ─── Top Header & Controls ─── */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.25rem",
        paddingBottom: "1.25rem",
        borderBottom: "1px solid var(--bg-border)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
              flexShrink: 0
            }}>
              <Target size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Picture of Success (Intelligence Analytics)
              </h1>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Metrik efektivitas komersial, pipeline & penetrasi produk terintegrasi langsung dari <strong>KITA Dashboard</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action badges & Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Read Only & Live Badges */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#10b981"
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 8px #10b981"
            }} />
            {syncSource}
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#6366f1"
          }}>
            <ShieldCheck size={14} />
            Read-Only
          </div>

          {/* Filter Year */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-card)", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
            <Calendar size={14} style={{ color: "var(--text-muted)" }} />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Filter Month */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-card)", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
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
            disabled={refreshing}
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
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ─── 6 FOCUS TABS NAVIGATION BAR (KITA Dashboard Exact Hash Mapping) ─── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--bg-border)"
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 0.9rem",
                borderRadius: "8px",
                border: isActive ? `1.5px solid ${tab.color}` : "1px solid var(--bg-border)",
                background: isActive ? `rgba(${tab.color === "#3b82f6" ? "59, 130, 246" : tab.color === "#ec4899" ? "236, 72, 153" : tab.color === "#10b981" ? "16, 185, 129" : tab.color === "#8b5cf6" ? "139, 92, 246" : tab.color === "#f59e0b" ? "245, 158, 11" : tab.color === "#ef4444" ? "239, 68, 68" : "99, 102, 241"}, 0.12)` : "var(--bg-card)",
                color: isActive ? tab.color : "var(--text-muted)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.825rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.18s ease",
                boxShadow: isActive ? `0 2px 8px ${tab.color}25` : "none",
                flexShrink: 0
              }}
            >
              <Icon size={16} />
              <span>{tab.title}</span>
              <span style={{
                fontSize: "0.7rem",
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                background: isActive ? tab.color : "rgba(0,0,0,0.06)",
                color: isActive ? "#fff" : "var(--text-muted)",
                fontWeight: 600,
                marginLeft: "2px"
              }}>
                {tab.metricLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & 12-MONTH TRENDS ─── */}
      {activeTab === "overview" && (
        <>
          {/* Top 5 KPI Cards (Picture of Success) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            {/* Card 1: Pipeline Strength */}
            <div 
              onClick={() => switchTab("ps")}
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
                cursor: "pointer",
                transition: "transform 0.15s ease, border-color 0.15s ease"
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Pipeline Strength (#ps)
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {overview ? `${formatNumber(overview.pipelineStrengthPersentage)}%` : "19.6%"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                {renderDelta(overview?.pipelineStrengthAverage ?? 0.2)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target &gt; 15%</span>
              </div>
            </div>

            {/* Card 2: Dec Runner Ratio */}
            <div 
              onClick={() => switchTab("rr")}
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
                cursor: "pointer"
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Dec Runner Ratio (#rr)
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                  <Flame size={16} />
                </div>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {overview ? `${formatNumber(overview.decRunnerRatioPercentage)}%` : "53.7%"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                {renderDelta(overview?.decRunnerRatioAverage ?? -1.1)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target &gt;= 53.7%</span>
              </div>
            </div>

            {/* Card 3: Cross Sell */}
            <div 
              onClick={() => switchTab("cs")}
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
                cursor: "pointer"
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Cross Sell (#cs)
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Layers size={16} />
                </div>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {overview ? `${formatNumber(overview.crossSellPersentage)}` : "2.30"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                {renderDelta(overview?.crossSellAverage ?? -0.1)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target &gt;= 2.30</span>
              </div>
            </div>

            {/* Card 4: Low Touch Customers */}
            <div 
              onClick={() => switchTab("bff")}
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
                cursor: "pointer"
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #ec4899, #f472b6)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Low Touch Cust. (#bff)
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(236, 72, 153, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ec4899" }}>
                  <Users size={16} />
                </div>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {overview ? `${formatNumber(overview.lowTouchCustPersentage * 100)}%` : "44.3%"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                {renderDelta(overview ? overview.lowTouchCustAverage * 100 : 2.7, true)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target &gt; 40%</span>
              </div>
            </div>

            {/* Card 5: Premium Contribution */}
            <div 
              onClick={() => switchTab("pf")}
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
                cursor: "pointer"
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Premium Contribution (#pf)
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                  <Sparkles size={16} />
                </div>
              </div>
              <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {overview ? `${formatNumber(overview.premiumContributionPersentage * 100)}%` : "13.4%"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                {renderDelta(overview ? overview.premiumContributionAverage * 100 : 0.0)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target &gt;= 13%</span>
              </div>
            </div>
          </div>

          {/* Visualizations Section (2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Chart 1: Pipeline Strength & Potential Volume */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              padding: "1.25rem",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                    Tren Kekuatan Pipeline & Estimasi Potensi Tahunan
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Pipeline Strength (%) vs Annual Potential Volume (Juta Liter)
                  </p>
                </div>
                <div style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: "0.75rem", fontWeight: 600 }}>
                  Tahun {year}
                </div>
              </div>

              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                    <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#3b82f6" 
                      fontSize={11} 
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} 
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#10b981" 
                      fontSize={11} 
                      tickFormatter={(v) => `${v}%`} 
                      domain={[10, 25]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--bg-surface)", 
                        borderColor: "var(--bg-border)", 
                        borderRadius: "8px", 
                        fontSize: "0.8rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === "Annual Pot. Vol") return [`${(Number(value) / 1_000_000).toFixed(2)} Juta Liter`, name];
                        return [`${Number(value).toFixed(1)}%`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "8px" }} />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="pStrengthAnnualPotVol" 
                      name="Annual Pot. Vol" 
                      fill="url(#colorVol)" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="pipelineStrength" 
                      name="Pipeline Strength (%)" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cross Sell vs Low Touch Customers */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              padding: "1.25rem",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                    Dinamika Cross Sell & Rasio Low Touch Customer
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Perbandingan penetrasi multi-produk dan digital touchpoint pelanggan
                  </p>
                </div>
                <div style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontSize: "0.75rem", fontWeight: 600 }}>
                  12 Bulan
                </div>
              </div>

              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                    <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#6366f1" 
                      fontSize={11} 
                      tickFormatter={(v) => `${v}`} 
                      domain={[1.5, 3]}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#ec4899" 
                      fontSize={11} 
                      tickFormatter={(v) => `${v}%`} 
                      domain={[30, 50]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--bg-surface)", 
                        borderColor: "var(--bg-border)", 
                        borderRadius: "8px", 
                        fontSize: "0.8rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                      formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "8px" }} />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="crossSell" 
                      name="Cross Sell (Kategori/Cust)" 
                      stroke="#6366f1" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: "#6366f1" }} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="lowTouchRatio" 
                      name="Low Touch Ratio (%)" 
                      stroke="#ec4899" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: "#ec4899" }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Data Table (Read-Only) */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TableProperties size={18} style={{ color: "var(--primary)" }} />
                <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                  Rincian Tabel Metrik Picture of Success (Bulanan)
                </h2>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                *Baris dengan warna aksen menunjukkan bulan terpilih ({MONTH_NAMES[month - 1]})
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Bulan</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Pipeline Strength</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Annual Pot. Vol</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Cross Sell</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Cross Sell Count</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Low Touch Ratio</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Premium Contrib.</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Dec Runner Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((row) => {
                    const isSelected = row.month === month;
                    return (
                      <tr 
                        key={row.month} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : "transparent",
                          fontWeight: isSelected ? 600 : 400,
                          transition: "background-color 0.15s ease"
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isSelected ? "#3b82f6" : "var(--text-primary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isSelected && <CheckCircle2 size={14} color="#3b82f6" />}
                            {MONTH_NAMES[(row.month - 1) % 12]} ({row.month})
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          <span style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10b981",
                            fontWeight: 600,
                            fontSize: "0.75rem"
                          }}>
                            {formatNumber(row.pipelineStrength)}%
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          {formatVolume(row.pStrengthAnnualPotVol)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          {formatNumber(row.crossSell)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          {row.crossSellCount?.toLocaleString("id-ID") ?? "0"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          {formatNumber(row.lowTouchRatio)}%
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          <span style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            background: "rgba(139, 92, 246, 0.1)",
                            color: "#8b5cf6",
                            fontWeight: 600,
                            fontSize: "0.75rem"
                          }}>
                            {formatNumber(row.premiumContribution)}%
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                          <span style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            background: "rgba(245, 158, 11, 0.1)",
                            color: "#f59e0b",
                            fontWeight: 600,
                            fontSize: "0.75rem"
                          }}>
                            {formatNumber(row.decRunnerRatio)}%
                          </span>
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

      {/* ─── TAB 2: PIPELINE STRENGTH (#ps) ─── */}
      {activeTab === "ps" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Pipeline Strength</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6", marginTop: "0.25rem" }}>19.6%</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Target &gt; 15.0% (Tercapai)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #6366f1" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Annual Potential Volume</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>60.6M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Discoverable Universe Pasar</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Penetrated Volume (YTD)</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>11.9M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>2,051 Pelanggan Terpenetrasi</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Target Universe Outlets</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>2,450 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Penetrasi: 83.7% Akun</span>
            </div>
          </div>

          {/* DataTable: pipelineStrengthDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <TrendingUp size={18} color="#3b82f6" />
                  Tabel Pipeline Strength (<code style={{ fontSize: "0.8rem", color: "#3b82f6" }}>#pipelineStrengthDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Breakdown Discoverable Universe vs YTD Penetrated per Cabang & Sektor
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "var(--bg-surface)",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)"
                }}>
                  <Search size={14} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Cari cabang / sektor..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-primary)",
                      fontSize: "0.8rem",
                      outline: "none",
                      width: "180px"
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="pipelineStrengthDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)", textAlign: "center" }}>
                    <th rowSpan={2} style={{ padding: "0.75rem 1rem", verticalAlign: "middle", textAlign: "left", fontWeight: 600 }}>Distributor Name</th>
                    <th rowSpan={2} style={{ padding: "0.75rem 1rem", verticalAlign: "middle", textAlign: "left", fontWeight: 600 }}>Sector Detail</th>
                    <th colSpan={2} style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--bg-border)", fontWeight: 600 }}>Discoverable Universe</th>
                    <th colSpan={2} style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--bg-border)", fontWeight: 600 }}>YTD ({year})</th>
                    <th rowSpan={2} style={{ padding: "0.75rem 1rem", verticalAlign: "middle", fontWeight: 600, width: "15%" }}>Pipeline Strength</th>
                  </tr>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)", textAlign: "center" }}>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Annual Pot. Vol</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>No Of Cust</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Penetrated Vol</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>No Of Cust</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isOverall = row.distributorName === "Overall Performance";
                    const isAchieved = (row.pipelineStrength ?? 0) >= (row.target ?? 15);
                    return (
                      <tr 
                        key={idx} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isOverall ? "rgba(59, 130, 246, 0.05)" : "transparent",
                          fontWeight: isOverall ? 600 : 400
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isOverall ? "#3b82f6" : "var(--text-primary)" }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                          {row.sectorDetail}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {formatVolume(row.annualPotVol)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {row.noOfCust?.toLocaleString("id-ID") ?? "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                          {formatVolume(row.penetratedVol)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {row.noOfCustYtd?.toLocaleString("id-ID") ?? "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            background: isAchieved ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: isAchieved ? "#10b981" : "#ef4444",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}>
                            {formatNumber(row.pipelineStrength)}%
                            <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>({isAchieved ? "> 15%" : "< 15%"})</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BUYING FREQUENCY FOCUS (#bff) ─── */}
      {activeTab === "bff" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #ec4899" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Low Touch Cust. Ratio</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ec4899", marginTop: "0.25rem" }}>44.3%</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Target &gt; 40.0% (Optimal)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Customer INCLUDED</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>908 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Order rutin / frekuensi tinggi</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grand Total Customer</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>2,051 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Basis pelanggan aktif</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Rata-rata Frekuensi Order</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>5.8x / tahun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Standar minimum: 4x/tahun</span>
            </div>
          </div>

          {/* KITA Specific Rules / Notes Banner */}
          <div style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "rgba(236, 72, 153, 0.06)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
            marginBottom: "1.25rem",
            fontSize: "0.775rem",
            color: "var(--text-muted)",
            lineHeight: 1.5
          }}>
            <strong style={{ color: "#ec4899", display: "block", marginBottom: "2px" }}>Catatan Perhitungan KITA Dashboard:</strong>
            • *Hasil download pada menu buying frequency focus, cross sell focus, premium focus, dan runner ratio sama.<br />
            • *Data sellout yang ditampilkan diluar sector marine, reseller, oil, gas, service.<br />
            • *Pelanggan new customer 3 bulan terakhir tidak masuk dalam perhitungan sellout.
          </div>

          {/* DataTable: lowTouchDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Users size={18} color="#ec4899" />
                  Tabel Buying Frequency Focus (<code style={{ fontSize: "0.8rem", color: "#ec4899" }}>#lowTouchDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Rincian Pelanggan INCLUDED vs Grand Total per Distributor
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="lowTouchDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor Name</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>INCLUDED</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Grand Total Customer</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center", width: "18%" }}>% (Low Touch Ratio)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isOverall = row.distributorName === "Overall Performance";
                    const isGood = (row.percentage ?? 0) >= 40.0;
                    return (
                      <tr 
                        key={idx} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isOverall ? "rgba(236, 72, 153, 0.05)" : "transparent",
                          fontWeight: isOverall ? 600 : 400
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isOverall ? "#ec4899" : "var(--text-primary)" }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "var(--text-primary)" }}>
                          {row.included?.toLocaleString("id-ID") ?? "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {row.grandTotalCustomer?.toLocaleString("id-ID") ?? "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            background: isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            color: isGood ? "#10b981" : "#f59e0b",
                            fontWeight: 700,
                            fontSize: "0.8rem"
                          }}>
                            {formatNumber(row.percentage)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CROSS SELL FOCUS (#cs) ─── */}
      {activeTab === "cs" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Cross Sell Ratio</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>2.30</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Target &gt;= 2.30 (Tercapai)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #6366f1" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Multi-Category Customers</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>1,420 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>69.2% Penetrasi Multi-kategori</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Transaksi Cross-Sell</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>2,051 Trx</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>YTD 2026</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #8b5cf6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Top Cross-Sell Pair</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#8b5cf6", marginTop: "0.25rem" }}>Engine Oil + Gadus</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Kombinasi paling dominan</span>
            </div>
          </div>

          {/* DataTable: crossDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers size={18} color="#10b981" />
                  Tabel Cross Sell Focus (<code style={{ fontSize: "0.8rem", color: "#10b981" }}>#crossDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Rasio Rata-rata Kategori Produk per Pelanggan (Target &gt;= 2.30)
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="crossDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor Name</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Number of Customer</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center", width: "20%" }}>Cross Sell Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isOverall = row.distributorName === "Overall Performance";
                    const isGood = (row.crossSellRatio ?? 0) >= (row.target ?? 2.30);
                    return (
                      <tr 
                        key={idx} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isOverall ? "rgba(16, 185, 129, 0.05)" : "transparent",
                          fontWeight: isOverall ? 600 : 400
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isOverall ? "#10b981" : "var(--text-primary)" }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {row.numberOfCustomer?.toLocaleString("id-ID") ?? "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            background: isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            color: isGood ? "#10b981" : "#f59e0b",
                            fontWeight: 700,
                            fontSize: "0.8rem"
                          }}>
                            {formatNumber(row.crossSellRatio, 2)}
                            <span style={{ fontSize: "0.65rem", opacity: 0.8, marginLeft: "4px" }}>({isGood ? ">= 2.30" : "< 2.30"})</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: PREMIUM FOCUS (#pf) ─── */}
      {activeTab === "pf" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #8b5cf6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Premium Contribution</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginTop: "0.25rem" }}>13.4%</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Target &gt;= 13.0% (Tercapai)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Volume Produk Premium</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>4.03M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tier Margin Tinggi</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Volume Portofolio</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>30.06M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>YTD 2026</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Top Premium Brands</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>Gadus, Rimula R6</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Kontributor utama margin</span>
            </div>
          </div>

          {/* DataTable: premiumDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} color="#8b5cf6" />
                  Tabel Premium Focus (<code style={{ fontSize: "0.8rem", color: "#8b5cf6" }}>#premiumDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Kontribusi Volume Produk Premium terhadap Total Penjualan (Target &gt;= 13.0%)
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="premiumDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Premium Volume (L)</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Total Volume (L)</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center", width: "20%" }}>Premium Contribution Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isOverall = row.distributorName === "Overall Performance";
                    const isGood = (row.premiumContributionRatio ?? 0) >= (row.target ?? 13.0);
                    return (
                      <tr 
                        key={idx} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isOverall ? "rgba(139, 92, 246, 0.05)" : "transparent",
                          fontWeight: isOverall ? 600 : 400
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isOverall ? "#8b5cf6" : "var(--text-primary)" }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#8b5cf6", fontWeight: 600 }}>
                          {formatVolume(row.premiumVolume)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {formatVolume(row.totalVolume)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            background: isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: isGood ? "#10b981" : "#ef4444",
                            fontWeight: 700,
                            fontSize: "0.8rem"
                          }}>
                            {formatNumber(row.premiumContributionRatio)}%
                            <span style={{ fontSize: "0.65rem", opacity: 0.8, marginLeft: "4px" }}>({isGood ? ">= 13%" : "< 13%"})</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: RUNNER RATIO (#rr) ─── */}
      {activeTab === "rr" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Dec Runner Ratio</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>53.7%</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Target &gt;= 53.7% (Tercapai)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Volume Runner SKUs</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>16.14M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Produk cepat laku</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #6366f1" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Volume Non-Runner</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>13.92M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>SKU spesifik & non-core</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grand Total Volume</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>30.06M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>YTD 2026</span>
            </div>
          </div>

          {/* DataTable: runnerRatioDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Flame size={18} color="#f59e0b" />
                  Tabel Runner Ratio (<code style={{ fontSize: "0.8rem", color: "#f59e0b" }}>#runnerRatioDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Distribusi Volume Runner vs No Runner per Distributor (Target &gt;= 53.7%)
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="runnerRatioDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor Name</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>No Runner</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Runner</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Grand Total</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center", width: "18%" }}>Runner Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isOverall = row.distributorName === "Overall Performance";
                    const isGood = (row.runnerRatio ?? 0) >= (row.target ?? 53.7);
                    return (
                      <tr 
                        key={idx} 
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isOverall ? "rgba(245, 158, 11, 0.05)" : "transparent",
                          fontWeight: isOverall ? 600 : 400
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isOverall ? "#f59e0b" : "var(--text-primary)" }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-muted)" }}>
                          {formatVolume(row.noRunner)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                          {formatVolume(row.runner)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {formatVolume(row.grandTotal)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            background: isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: isGood ? "#10b981" : "#ef4444",
                            fontWeight: 700,
                            fontSize: "0.8rem"
                          }}>
                            {formatNumber(row.runnerRatio)}%
                            <span style={{ fontSize: "0.65rem", opacity: 0.8, marginLeft: "4px" }}>({isGood ? ">= 53.7%" : "< 53.7%"})</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: SPECIAL CASE (#sc) ─── */}
      {activeTab === "sc" && (
        <div>
          {/* Header & KPI Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #ef4444" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Cases Tracked</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "0.25rem" }}>5 Entitas</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Evaluasi kinerja komprehensif</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grade A (Optimal)</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>2 Cabang</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>Overall & Manado KA Smelter</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grade B (Attention)</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>2 Cabang</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Makassar & Kendari</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #ef4444" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grade C/D (Intervensi)</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "0.25rem" }}>1 Cabang</div>
              <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>Palu (Perlu Pendampingan)</span>
            </div>
          </div>

          {/* DataTable: specialCasetDt */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--bg-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertCircle size={18} color="#ef4444" />
                  Tabel Special Case (<code style={{ fontSize: "0.8rem", color: "#ef4444" }}>#specialCasetDt</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Monitoring Kinerja Cabang/Distributor Berdasarkan Grade & Matrix Rasio
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="specialCasetDt" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, width: "10%", textAlign: "center" }}>Grade</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Low Touch Customer Ratio</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Cross Sell Ratio</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Premium Contribution Ratio</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, idx: number) => {
                    const isA = row.grade === "Grade A";
                    const isB = row.grade === "Grade B";
                    const gradeBg = isA ? "rgba(16, 185, 129, 0.1)" : isB ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)";
                    const gradeColor = isA ? "#10b981" : isB ? "#f59e0b" : "#ef4444";

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            background: gradeBg,
                            color: gradeColor,
                            fontWeight: 700,
                            fontSize: "0.75rem"
                          }}>
                            {row.grade}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 600 }}>
                          {row.distributorName}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {formatNumber(row.lowTouchRatio)}%
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {formatNumber(row.crossSellRatio, 2)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-primary)" }}>
                          {formatNumber(row.premiumRatio)}%
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {row.actionRequired}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Compliance & Notice ─── */}
      <div style={{
        padding: "0.85rem 1.25rem",
        borderRadius: "8px",
        background: "rgba(0,0,0,0.02)",
        border: "1px solid var(--bg-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
        fontSize: "0.775rem",
        color: "var(--text-muted)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Info size={16} style={{ color: "var(--primary)" }} />
          <span>
            Data Picture of Success disinkronisasikan secara langsung dari <strong>KITA Dashboard API</strong> dalam mode <strong>Read-Only</strong>.
            Navigasi hash (<code>#ps</code>, <code>#bff</code>, <code>#cs</code>, <code>#pf</code>, <code>#rr</code>, <code>#sc</code>) identik dengan struktur KITA Dashboard asli.
          </span>
        </div>
        {lastUpdated && (
          <div>
            Pembaruan terakhir: <strong>{lastUpdated}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
