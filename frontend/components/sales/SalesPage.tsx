"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiSales } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import { CandlestickChart, ReceiptText } from "lucide-react";
import ArOutstandingModal from "./ArOutstandingModal";

interface SalesSummary {
  omzet_bulan_ini: number;
  total_invoice_bulan_ini: number;
  piutang_outstanding: number;
  total_so_pending: number;
}

interface TrendData {
  period: string;
  omzet: number;
}

interface TopProduct {
  id_barang: string;
  nama_barang: string;
  total_qty: number;
  total_omzet: number;
}

const COLORS = ["hsl(217,91%,60%)", "hsl(142,76%,45%)", "hsl(38,92%,50%)", "hsl(262,83%,58%)", "hsl(0,84%,60%)"];

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

export default function SalesPage() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isArModalOpen, setIsArModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sumRes, trendRes, prodRes] = await Promise.allSettled([
        apiSales.summary({}),
        apiSales.trend({ period: "monthly", months: 12 }),
        apiSales.byProduct({ limit: 5 })
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (trendRes.status === "fulfilled") {
        setTrend(
          (trendRes.value.data as TrendData[]).map((d) => ({
            ...d,
            period: new Date(d.period).toLocaleDateString("id", { month: "short", year: "2-digit" }),
          }))
        );
      }
      if (prodRes.status === "fulfilled") setTopProducts(prodRes.value.data || []);
    } catch {
      // Handle error quietly
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Sales Monitoring</h1>
        <p className="page-subtitle">Performa penjualan, piutang, dan tren produk</p>
      </div>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--bg-border)", marginBottom: "1.25rem" }}>
        <Link
          href="/sales"
          style={{
            background: "none",
            border: "none",
            borderBottom: "2px solid #3B82F6",
            color: "#60A5FA",
            fontWeight: 700,
            fontSize: "0.95rem",
            padding: "0.65rem 1.25rem",
            cursor: "pointer",
            marginBottom: "-1px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CandlestickChart size={16} />
          <span>Sales Monitoring</span>
        </Link>
        <Link
          href="/sales/orders"
          style={{
            background: "none",
            border: "none",
            borderBottom: "2px solid transparent",
            color: "var(--text-muted)",
            fontWeight: 500,
            fontSize: "0.95rem",
            padding: "0.65rem 1.25rem",
            cursor: "pointer",
            marginBottom: "-1px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s ease",
          }}
        >
          <ReceiptText size={16} />
          <span>Sales Order</span>
        </Link>
      </div>

      <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">💰</div>
          <div className="kpi-value">{fmt(summary?.omzet_bulan_ini, "Rp ")}</div>
          <div className="kpi-label">Omzet Bulan Ini</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success">📄</div>
          <div className="kpi-value">{Number(summary?.total_invoice_bulan_ini || 0).toLocaleString("id")}</div>
          <div className="kpi-label">Total Invoice (Bulan Ini)</div>
        </div>
        <div
          className="kpi-card warning"
          onClick={() => setIsArModalOpen(true)}
          style={{
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.08)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 22px rgba(245, 158, 11, 0.25)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(245, 158, 11, 0.08)";
            e.currentTarget.style.borderColor = "";
          }}
          title="Klik untuk membuka Rincian Piutang AR & Time of Payment (TOP)"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <div className="kpi-icon warning">💳</div>
            <span
              style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: "12px",
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>🔍</span> Detail AR &amp; TOP
            </span>
          </div>
          <div className="kpi-value" style={{ color: "hsl(38,92%,65%)", marginTop: "0.5rem" }}>
            {fmt(summary?.piutang_outstanding, "Rp ")}
          </div>
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span>Piutang Outstanding</span>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>↗</span>
          </div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-icon info">📦</div>
          <div className="kpi-value">{Number(summary?.total_so_pending || 0).toLocaleString("id")}</div>
          <div className="kpi-label">Sales Order Pending</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {/* Trend Area Chart */}
        <div className="chart-container">
          <div className="card-header">
            <div className="card-title">Tren Penjualan 12 Bulan Terakhir</div>
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 20 }}>
                <defs>
                  <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 8 }}
                  formatter={(v: any) => [fmt(v as number, "Rp "), "Omzet"]}
                />
                <Area type="monotone" dataKey="omzet" stroke="hsl(217,91%,60%)" strokeWidth={3} fillOpacity={1} fill="url(#colorOmzet)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              {loading ? "Memuat..." : "Belum ada data tren"}
            </div>
          )}
        </div>

        {/* Top 5 Products */}
        <div className="chart-container">
          <div className="card-header">
            <div className="card-title">Top 5 Produk (Omzet)</div>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total_omzet"
                  nameKey="nama_barang"
                >
                  {topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 8 }}
                  formatter={(v: any) => fmt(v as number, "Rp ")}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              {loading ? "Memuat..." : "Belum ada data"}
            </div>
          )}
        </div>
      </div>

      {/* Pop-Up Modal Data AR & Time of Payment (TOP) */}
      <ArOutstandingModal
        isOpen={isArModalOpen}
        onClose={() => setIsArModalOpen(false)}
      />
    </div>
  );
}

