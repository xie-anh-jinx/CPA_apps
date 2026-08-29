"use client";
import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { apiAnalytics, apiSales } from "@/lib/api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPIData {
  sales: { total_invoice_bulan_ini: number; omzet_bulan_ini: number; piutang: number; };
  inventory: { total_sku: number; total_nilai_persediaan: number; low_stock_count: number; zero_stock_count: number; overstock_count: number; };
  distribution: { total_do: number; delivered: number; in_transit: number; pending: number; };
  alerts: { critical: number; warning: number; total: number; };
  customers: { total: number; active: number; at_risk: number; churned: number; };
  sync_status: { table_name: string; last_sync_at: string; sync_status: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number | null | undefined, prefix = ""): string {
  if (n == null) return "—";
  return `${prefix}${n.toLocaleString("id")}`;
}

const COLORS = ["#0D99FF", "#3AC977", "#FFB323", "#FF5E5E"];

// ─── Custom UI Components ─────────────────────────────────────────────────────
function Sparkline({ color, data, type = "area" }: { color: string; data: number[]; type?: "area" | "bar" }) {
  const chartData = data.map((v, i) => ({ val: v, i }));
  return (
    <div style={{ width: "100%", height: 50, marginTop: "1rem" }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "area" ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="val" stroke={color} strokeWidth={2} fill={`url(#grad-${color.replace("#","")})`} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <BarChart data={chartData}>
            <Bar dataKey="val" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ title, value, icon, sparklineColor, sparklineData, type }: any) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{title}</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", padding: "0.5rem", borderRadius: "8px", color: sparklineColor, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      {sparklineData && <Sparkline color={sparklineColor} data={sparklineData} type={type} />}
    </div>
  );
}

function SectionTitle({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
      {extra && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{extra}</div>}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const defaultParams = { date_from: "2023-01-01", date_to: "2024-12-31" };
      const [kpiRes, trendRes] = await Promise.allSettled([
        apiAnalytics.kpi(defaultParams),
        apiSales.trend({ period: "monthly", months: 24, ...defaultParams }),
      ]);
      
      if (kpiRes.status === "fulfilled") setKpi(kpiRes.value.data);
      if (trendRes.status === "fulfilled") {
        setTrendData(
          (trendRes.value.data as any[]).map((d) => ({
            ...d,
            omzet: Number(d.omzet) || 0,
            period: new Date(d.period).toLocaleDateString("id", { month: "short", year: "2-digit" }),
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !kpi) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Memuat dasbor...</div>;

  const activePercent = kpi?.customers.total ? Math.round((kpi.customers.active / kpi.customers.total) * 100) : 0;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Dashboard</h1>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Home / Dashboard</div>
        </div>
        <button style={{ background: "var(--color-primary)", border: "none", color: "#fff", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
          + Add Task
        </button>
      </div>

      {/* ROW 1: SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        <StatCard 
          title="Total Penjualan" 
          value={fmtNum(kpi?.sales.omzet_bulan_ini, "Rp")} 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          }
          sparklineColor="#0D99FF" 
          sparklineData={[30, 45, 32, 50, 48, 60, 70]} 
          type="area"
        />
        
        {/* CUSTOM PIE CARD */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ width: 80, height: 80, position: "relative", flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: "Active", value: kpi?.customers.active || 0 },
                  { name: "At Risk", value: kpi?.customers.at_risk || 0 },
                  { name: "Churned", value: kpi?.customers.churned || 0 },
                ]} innerRadius={28} outerRadius={40} dataKey="value" stroke="none" isAnimationActive={false}>
                  <Cell fill="#3AC977" />
                  <Cell fill="#0D99FF" />
                  <Cell fill="#FF5E5E" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {activePercent}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>All Customers</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ color: "#3AC977", fontSize: "0.5rem" }}>●</span> Active ({fmtNum(kpi?.customers.active)})
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#FF5E5E", fontSize: "0.5rem" }}>●</span> Churned ({fmtNum(kpi?.customers.churned)})
            </div>
          </div>
        </div>

        <StatCard 
          title="Total Distribusi" 
          value={fmtNum(kpi?.distribution.total_do)} 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          }
          sparklineColor="#FF5E5E" 
          sparklineData={[10, 15, 8, 20, 18, 25, 22]} 
          type="area"
        />
        
        <StatCard 
          title="Stok Rendah" 
          value={fmtNum(kpi?.inventory.low_stock_count)} 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          }
          sparklineColor="#FFB323" 
          sparklineData={[5, 10, 8, 12, 10, 15, 8]} 
          type="bar"
        />
      </div>

      {/* ROW 2: MAIN CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.5rem" }}>
        
        {/* BIG CHART */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)" }}>
          <SectionTitle title="Sales Trend Overview" extra={<div style={{ display: "flex", gap: "0.5rem" }}>
            <span style={{ padding: "0.25rem 0.75rem", background: "#0D99FF", color: "#fff", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>Month</span>
            <span style={{ padding: "0.25rem 0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-muted)" }}>Year</span>
          </div>} />
          
          <div style={{ height: 280, marginTop: "1.5rem" }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3AC977" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3AC977" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444444" />
                  <XAxis dataKey="period" stroke="#828690" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#828690" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtNum(v)} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1E1E1E", borderColor: "#444444", borderRadius: "8px", color: "#fff", fontSize: "0.85rem" }}
                    itemStyle={{ color: "#3AC977" }}
                  />
                  <Area type="monotone" dataKey="omzet" stroke="#3AC977" strokeWidth={2} fillOpacity={1} fill="url(#colorOmzet)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Belum ada data penjualan
              </div>
            )}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: "2rem", borderTop: "1px solid var(--bg-border)", paddingTop: "1.5rem" }}>
            <div style={{ textAlign: "center", borderRight: "1px solid var(--bg-border)" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{fmtNum(kpi?.sales.total_invoice_bulan_ini)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Invoices (Bulan Ini)</div>
            </div>
            <div style={{ textAlign: "center", borderRight: "1px solid var(--bg-border)" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{fmtNum(kpi?.customers.active)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Customers</div>
            </div>
            <div style={{ textAlign: "center", borderRight: "1px solid var(--bg-border)" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{fmtNum(kpi?.inventory.total_sku)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total SKUs</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{fmtNum(kpi?.distribution.delivered)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Distribusi Terkirim</div>
            </div>
          </div>
        </div>

        {/* ALERTS & TO DO PANEL */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)", display: "flex", flexDirection: "column" }}>
          <SectionTitle title="To Do Items" extra={<Link href="/alerts" style={{ color: "#0D99FF", textDecoration: "none" }}>View All +</Link>} />
          
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
            {kpi?.alerts.critical ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", paddingBottom: "1rem", borderBottom: "1px solid var(--bg-border)" }}>
                <span style={{ color: "#FF5E5E" }}>🚨</span>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{kpi.alerts.critical} Critical Alerts</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Requires immediate attention</div>
                </div>
              </div>
            ) : null}
            {kpi?.alerts.warning ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", paddingBottom: "1rem", borderBottom: "1px solid var(--bg-border)" }}>
                <span style={{ color: "#FFB323" }}>⚠️</span>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{kpi.alerts.warning} Warnings</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Review stock levels and payments</div>
                </div>
              </div>
            ) : null}
            {(!kpi?.alerts.critical && !kpi?.alerts.warning) ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", marginTop: "2rem" }}>
                All clear! No alerts today.
              </div>
            ) : null}
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", paddingBottom: "1rem", borderBottom: "1px solid var(--bg-border)" }}>
              <span style={{ color: "#3AC977" }}>✓</span>
              <div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Daily Sync Finished</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      {/* ROW 3: TABLES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Table Placeholder */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)" }}>
          <SectionTitle title="Inventory Alerts (Low Stock)" />
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
            Data inventori akan dimuat di sini.
          </div>
        </div>
        
        {/* Table Placeholder */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "1.25rem", border: "1px solid var(--bg-border)" }}>
          <SectionTitle title="Pending Distributions" />
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
            Data distribusi tertunda akan dimuat di sini.
          </div>
        </div>
      </div>

    </div>
  );
}
