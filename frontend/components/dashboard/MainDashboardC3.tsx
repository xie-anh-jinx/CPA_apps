"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, BarChart3, Layers, Award, ShieldCheck } from "lucide-react";
import { apiAnalytics } from "@/lib/api";
import C3GaugeChart from "@/components/charts/c3/C3GaugeChart";
import C3ComboStockChart, { MonthlyStockData } from "@/components/charts/c3/C3ComboStockChart";
import C3StackedGrowthChart, { GrowthVolumeData } from "@/components/charts/c3/C3StackedGrowthChart";
import C3HorizontalBarChart, { SectoralPerfData } from "@/components/charts/c3/C3HorizontalBarChart";
import C3DonutChart, { DonutSegment } from "@/components/charts/c3/C3DonutChart";
import C3QuadrantChart, { QuadrantPoint } from "@/components/charts/c3/C3QuadrantChart";

interface MainDashboardData {
  title: string;
  last_updated: string;
  gauges: {
    sell_in: { label: string; percentage: number; volume_liters: number; growth_pct: number };
    sell_out: { label: string; percentage: number; volume_liters: number; growth_pct: number };
    gadus_sell_in: { label: string; percentage: number; volume_liters: number; growth_pct: number };
    gadus_sell_out: { label: string; percentage: number; volume_liters: number; growth_pct: number };
    premium_sell_in: { label: string; percentage: number; volume_liters: number; growth_pct: number };
    premium_sell_out: { label: string; percentage: number; volume_liters: number; growth_pct: number };
  };
  stock_summary: {
    month_cover: number;
    stock_kl: number;
    last_3m_run_rate_kl: number;
  };
  si_so_stock: MonthlyStockData[];
  source_of_growth: GrowthVolumeData[];
  kpis: Record<
    string,
    { label: string; value: string; delta: string; color: string; count_nominal?: string }
  >;
  runner_products: Array<{
    rank: number;
    subbrand: string;
    avg_sellout: number;
    dpms_stock: number;
    month_cover: number;
  }>;
  sectoral_performance: SectoralPerfData[];
  sectoral_composition: {
    total: number;
    segments: DonutSegment[];
  };
  brand_composition: {
    total: number;
    segments: DonutSegment[];
  };
  people_quadrant: QuadrantPoint[];
}

const INITIAL_DASHBOARD_DATA: MainDashboardData = {
  title: "MAIN DASHBOARD",
  last_updated: new Date().toISOString().slice(0, 10),
  gauges: {
    sell_in: { label: "Sell In", percentage: 86.8, volume_liters: 10903292, growth_pct: 1.7 },
    sell_out: { label: "Sell Out", percentage: 86.0, volume_liters: 10803503, growth_pct: -2.7 },
    gadus_sell_in: { label: "Gadus Sell In", percentage: 126.6, volume_liters: 1800748, growth_pct: 39.3 },
    gadus_sell_out: { label: "Gadus Sell Out", percentage: 119.9, volume_liters: 1705414, growth_pct: 37.1 },
    premium_sell_in: { label: "Premium Sell In", percentage: 95.2, volume_liters: 1598308, growth_pct: 10.5 },
    premium_sell_out: { label: "Premium Sell Out", percentage: 89.1, volume_liters: 1497178, growth_pct: 0.5 },
  },
  stock_summary: {
    month_cover: 3.6,
    stock_kl: 3678,
    last_3m_run_rate_kl: 1033,
  },
  si_so_stock: [
    { month: "Jan", dpms_stock: 2830000, siso_stock: 3350000, sell_in: 980000, sell_out: 1220000, stock_level_dpms: 2.1 },
    { month: "Feb", dpms_stock: 2520000, siso_stock: 3380000, sell_in: 1050000, sell_out: 1410000, stock_level_dpms: 2.2 },
    { month: "Mar", dpms_stock: 2840000, siso_stock: 3840000, sell_in: 1240000, sell_out: 1320000, stock_level_dpms: 2.4 },
    { month: "Apr", dpms_stock: 2650000, siso_stock: 3860000, sell_in: 1180000, sell_out: 1440000, stock_level_dpms: 2.1 },
    { month: "May", dpms_stock: 2720000, siso_stock: 3980000, sell_in: 1040000, sell_out: 930000,  stock_level_dpms: 2.4 },
    { month: "Jun", dpms_stock: 3100000, siso_stock: 3910000, sell_in: 1210000, sell_out: 1460000, stock_level_dpms: 2.6 },
    { month: "Jul", dpms_stock: 3450000, siso_stock: 3940000, sell_in: 1150000, sell_out: 1380000, stock_level_dpms: 2.8 },
    { month: "Aug", dpms_stock: 3380000, siso_stock: 3900000, sell_in: 1090000, sell_out: 1395000, stock_level_dpms: 2.5 },
    { month: "Sep", dpms_stock: 3678000, siso_stock: 3520000, sell_in: 120000,  sell_out: 350000,  stock_level_dpms: 3.6 },
    { month: "Oct", dpms_stock: 0,       siso_stock: 0,       sell_in: 0,       sell_out: 0,       stock_level_dpms: 0.3 },
    { month: "Nov", dpms_stock: 0,       siso_stock: 0,       sell_in: 0,       sell_out: 0,       stock_level_dpms: 0.3 },
    { month: "Dec", dpms_stock: 0,       siso_stock: 0,       sell_in: 0,       sell_out: 0,       stock_level_dpms: 0.3 },
  ],
  source_of_growth: [
    { sector: "Agriculture", sell_out_ytd: 950000, opportunity_existing: 2400000, opportunity_new_win: 900000, target_sectoral: 3800000 },
    { sector: "Construction", sell_out_ytd: 1400000, opportunity_existing: 4100000, opportunity_new_win: 2300000, target_sectoral: 7200000 },
    { sector: "Fleets", sell_out_ytd: 450000, opportunity_existing: 950000, opportunity_new_win: 450000, target_sectoral: 1700000 },
    { sector: "GM", sell_out_ytd: 210000, opportunity_existing: 280000, opportunity_new_win: 110000, target_sectoral: 560000 },
    { sector: "Power", sell_out_ytd: 1100000, opportunity_existing: 2400000, opportunity_new_win: 550000, target_sectoral: 3900000 },
    { sector: "Cement", sell_out_ytd: 180000, opportunity_existing: 210000, opportunity_new_win: 90000, target_sectoral: 450000 },
    { sector: "Metals/Steel", sell_out_ytd: 5600000, opportunity_existing: 23200000, opportunity_new_win: 4200000, target_sectoral: 32000000 },
    { sector: "WoodP&P", sell_out_ytd: 90000, opportunity_existing: 120000, opportunity_new_win: 40000, target_sectoral: 220000 },
    { sector: "Mining", sell_out_ytd: 2200000, opportunity_existing: 6000000, opportunity_new_win: 1500000, target_sectoral: 9500000 },
    { sector: "Reseller", sell_out_ytd: 180000, opportunity_existing: 150000, opportunity_new_win: 60000, target_sectoral: 350000 },
    { sector: "Marine", sell_out_ytd: 120000, opportunity_existing: 90000, opportunity_new_win: 40000, target_sectoral: 230000 },
    { sector: "Others", sell_out_ytd: 110000, opportunity_existing: 80000, opportunity_new_win: 30000, target_sectoral: 200000 },
  ],
  kpis: {
    pipeline_strength: { label: "Pipeline Strength", value: "19.5", delta: "+0.1", color: "var(--color-success)" },
    low_touch_ratio: { label: "Low Touch Ratio", value: "44.1%", delta: "+2.5", color: "var(--color-warning)" },
    runner_ratio: { label: "Runner Ratio", value: "53.7%", delta: "-1.1", color: "var(--color-warning)" },
    cross_sell_ratio: { label: "Cross-Sell Ratio", value: "2.30", delta: "-0.1", color: "#f97316" },
    premium_contribution: { label: "Premium Contribution", value: "13.4%", delta: "0", color: "var(--color-success)" },
    churn_rate: { label: "Churn Rate", value: "16%", delta: "2,457,547", color: "var(--color-danger)" },
    new_gain_rate: { label: "New Gain Rate", value: "41%", delta: "6,385,676", color: "var(--color-success)" },
  },
  runner_products: [
    { rank: 1, subbrand: "RimR3MV15W40CI4", avg_sellout: 196260, dpms_stock: 471385, month_cover: 2.4 },
    { rank: 2, subbrand: "Tellus S2 MX 46", avg_sellout: 133757, dpms_stock: 139004, month_cover: 1.0 },
    { rank: 3, subbrand: "Rimula R4 X 15W-40 CI4/E7/DH1", avg_sellout: 128912, dpms_stock: 573538, month_cover: 4.4 },
    { rank: 4, subbrand: "Gadus S1 V220 2", avg_sellout: 76969, dpms_stock: 21906, month_cover: 0.3 },
    { rank: 5, subbrand: "Gadus S2 V220 2", avg_sellout: 47157, dpms_stock: 105770, month_cover: 2.2 },
    { rank: 6, subbrand: "Tellus S2 MX 68", avg_sellout: 42582, dpms_stock: 293982, month_cover: 6.9 },
    { rank: 7, subbrand: "Hydraulic S1 M 46", avg_sellout: 36087, dpms_stock: 7942, month_cover: 0.2 },
    { rank: 8, subbrand: "Spirax S2 A 80W-90", avg_sellout: 35282, dpms_stock: 111045, month_cover: 3.1 },
    { rank: 9, subbrand: "Gadus S3 V220C 2", avg_sellout: 35231, dpms_stock: 212130, month_cover: 6.0 },
    { rank: 10, subbrand: "Gadinia S3 40", avg_sellout: 30653, dpms_stock: 169968, month_cover: 5.5 },
  ],
  sectoral_performance: [
    { sector: "Mining", achievement_pct: 98.5 },
    { sector: "Metals/Steel", achievement_pct: 88.2 },
    { sector: "Power", achievement_pct: 85.0 },
    { sector: "Construction", achievement_pct: 82.1 },
    { sector: "Agriculture", achievement_pct: 75.4 },
    { sector: "Cement", achievement_pct: 65.8 },
    { sector: "GM", achievement_pct: 56.2 },
    { sector: "Fleets", achievement_pct: 46.0 },
    { sector: "WoodP&P", achievement_pct: 1.5 },
  ],
  sectoral_composition: {
    total: 10803503,
    segments: [
      { name: "Mining", value: 5542200, percentage: 51.3, color: "#991b1b" },
      { name: "Metals/Steel", value: 2117486, percentage: 19.6, color: "#eab308" },
      { name: "Power", value: 1091153, percentage: 10.1, color: "#f59e0b" },
      { name: "Construction", value: 939904, percentage: 8.7, color: "#15803d" },
      { name: "Agriculture", value: 561782, percentage: 5.2, color: "#0284c7" },
      { name: "Others", value: 550978, percentage: 5.1, color: "#64748b" },
    ],
  },
  brand_composition: {
    total: 10803503,
    segments: [
      { name: "Rimula", value: 3759619, percentage: 34.8, color: "#991b1b" },
      { name: "Tellus", value: 1955434, percentage: 18.1, color: "#eab308" },
      { name: "Gadus", value: 1706953, percentage: 15.8, color: "#f97316" },
      { name: "Spirax", value: 1577311, percentage: 14.6, color: "#84cc16" },
      { name: "Omala", value: 993922, percentage: 9.2, color: "#06b6d4" },
      { name: "Others", value: 810264, percentage: 7.5, color: "#64748b" },
    ],
  },
  people_quadrant: [
    { name: "Area Timur", x: 84, y: 142, group: "Star Performer", volume: "2.4M L" },
    { name: "Area Tengah", x: 76, y: 110, group: "Steady Growth", volume: "1.8M L" },
    { name: "Area Barat", x: 58, y: 105, group: "High Potential", volume: "1.2M L" },
    { name: "Area Selatan", x: 42, y: 92, group: "Needs Focus", volume: "850K L" },
    { name: "Specialist Key Account", x: 92, y: 155, group: "Key Champion", volume: "3.1M L" },
  ],
};

export default function MainDashboardC3() {
  const [data, setData] = useState<MainDashboardData>(INITIAL_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"ytd" | "mtd" | "12m">("ytd");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiAnalytics.mainDashboard({ period });
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn("Using baseline calibrated data for Main Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const fmt = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingBottom: "2rem" }}>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "12px",
          padding: "0.85rem 1.25rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "10px",
              height: "22px",
              background: "var(--color-primary)",
              borderRadius: "3px",
            }}
          />
          <div>
            <h1
              style={{
                fontSize: "1.2rem",
                fontWeight: 900,
                letterSpacing: "0.5px",
                color: "var(--text-primary)",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              MAIN DASHBOARD
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
              C3.js Interactive Chart Engine & Comprehensive Business Overview
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Period Selector */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              borderRadius: "8px",
              padding: "2px",
              border: "1px solid var(--bg-border)",
            }}
          >
            {(["ytd", "mtd", "12m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: period === p ? "var(--color-primary)" : "transparent",
                  color: period === p ? "#000" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 6 C3 GAUGES + STOCK BOX ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr)) 180px",
          gap: "0.85rem",
          alignItems: "stretch",
        }}
      >
        <C3GaugeChart
          label={data.gauges.sell_in.label}
          percentage={data.gauges.sell_in.percentage}
          volumeLiters={data.gauges.sell_in.volume_liters}
          growthPct={data.gauges.sell_in.growth_pct}
          color="#eab308"
        />
        <C3GaugeChart
          label={data.gauges.sell_out.label}
          percentage={data.gauges.sell_out.percentage}
          volumeLiters={data.gauges.sell_out.volume_liters}
          growthPct={data.gauges.sell_out.growth_pct}
          color="#eab308"
        />
        <C3GaugeChart
          label={data.gauges.gadus_sell_in.label}
          percentage={data.gauges.gadus_sell_in.percentage}
          volumeLiters={data.gauges.gadus_sell_in.volume_liters}
          growthPct={data.gauges.gadus_sell_in.growth_pct}
          max={150}
          color="#10b981"
        />
        <C3GaugeChart
          label={data.gauges.gadus_sell_out.label}
          percentage={data.gauges.gadus_sell_out.percentage}
          volumeLiters={data.gauges.gadus_sell_out.volume_liters}
          growthPct={data.gauges.gadus_sell_out.growth_pct}
          max={150}
          color="#10b981"
        />
        <C3GaugeChart
          label={data.gauges.premium_sell_in.label}
          percentage={data.gauges.premium_sell_in.percentage}
          volumeLiters={data.gauges.premium_sell_in.volume_liters}
          growthPct={data.gauges.premium_sell_in.growth_pct}
          color="#10b981"
        />
        <C3GaugeChart
          label={data.gauges.premium_sell_out.label}
          percentage={data.gauges.premium_sell_out.percentage}
          volumeLiters={data.gauges.premium_sell_out.volume_liters}
          growthPct={data.gauges.premium_sell_out.growth_pct}
          color="#eab308"
        />

        {/* Stock Summary Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "1rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Stock
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-surface)",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Month Cover</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {data.stock_summary.month_cover.toFixed(1)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-surface)",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Stock (in KL)</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {fmt(data.stock_summary.stock_kl)} KL
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-surface)",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Last 3 Month Run Rate
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {fmt(data.stock_summary.last_3m_run_rate_kl)} KL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: SI-SO STOCK & SOURCE OF GROWTH ───────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1rem",
        }}
      >
        <C3ComboStockChart data={data.si_so_stock} height={320} />
        <C3StackedGrowthChart data={data.source_of_growth} height={320} />
      </div>

      {/* ── ROW 3: METRICS, RUNNER TABLE, QUADRANT & SECTORAL DONUTS ────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr 340px",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {/* Left Column: 7 KPI Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* 1. Pipeline Strength */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Pipeline Strength
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#10b981",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              19.5
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: "0.2rem", fontWeight: 600 }}>
              ↗ 0.1
            </div>
          </div>

          {/* 2. Low Touch Ratio */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Low Touch Ratio
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#eab308",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              44.1%
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: "0.2rem", fontWeight: 600 }}>
              ↗ 2.5
            </div>
          </div>

          {/* 3. Runner Ratio */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Runner Ratio
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#eab308",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              53.7%
            </div>
            <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "0.2rem", fontWeight: 600 }}>
              ↘ -1.1
            </div>
          </div>

          {/* 4. Cross-Sell Ratio */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Cross-Sell Ratio
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#f97316",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              2.30
            </div>
            <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "0.2rem", fontWeight: 600 }}>
              ↘ -0.1
            </div>
          </div>

          {/* 5. Premium Contribution */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Premium Contribution
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#10b981",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              13.4%
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", fontWeight: 600 }}>
              0
            </div>
          </div>

          {/* 6. Churn Rate */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Churn Rate
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#ef4444",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              16%
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              2,457,547
            </div>
          </div>

          {/* 7. New Gain Rate */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              New Gain Rate
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#10b981",
                marginTop: "0.15rem",
                lineHeight: 1.1,
              }}
            >
              41%
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              6,385,676
            </div>
          </div>
        </div>

        {/* Center Column: Top 10 Runner Table + People Quadrant */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Top 10 Runner Product Table */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ padding: "0.9rem 1.1rem 0.6rem" }}>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Top 10 Runner Product
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#f59e0b", color: "#000" }}>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", width: "35px" }}>#</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Subbrand</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Avg. Sellout</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>DPMS Stock</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Month Cover</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runner_products.map((row, idx) => (
                    <tr
                      key={row.subbrand}
                      style={{
                        background: idx % 2 === 0 ? "transparent" : "var(--bg-surface)",
                        borderBottom: "1px solid var(--bg-border)",
                      }}
                    >
                      <td style={{ padding: "0.45rem 0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        {row.rank}
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {row.subbrand}
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", fontFamily: "monospace" }}>
                        {fmt(row.avg_sellout)}
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", fontFamily: "monospace" }}>
                        {fmt(row.dpms_stock)}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          textAlign: "right",
                          fontWeight: 700,
                          color: row.month_cover < 1 ? "#ef4444" : "var(--text-primary)",
                        }}
                      >
                        {row.month_cover.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* People Quadrant Chart */}
          <C3QuadrantChart data={data.people_quadrant} height={260} />
        </div>

        {/* Right Column: Sectoral Performance & 2 Donut Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Sectoral Performance Horizontal Bar */}
          <C3HorizontalBarChart data={data.sectoral_performance} height={270} />

          {/* Sectoral Composition Donut */}
          <C3DonutChart
            title="Sectoral Composition"
            total={data.sectoral_composition.total}
            segments={data.sectoral_composition.segments}
            height={190}
          />

          {/* Brand Composition Donut */}
          <C3DonutChart
            title="Brand Composition"
            total={data.brand_composition.total}
            segments={data.brand_composition.segments}
            height={190}
          />
        </div>
      </div>
    </div>
  );
}
