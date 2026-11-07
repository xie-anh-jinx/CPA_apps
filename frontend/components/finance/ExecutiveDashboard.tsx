"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Truck,
  CircleDollarSign,
  Scale,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  Award,
  Building2,
  PackageCheck,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import { apiFinance } from "@/lib/finance-api";
import { ExecutiveDashboardKPI, ExecutiveChartsData } from "@/types/finance";
import { formatRupiah, formatRupiahShort, formatNumber, formatPercent } from "@/lib/finance-utils";

export default function ExecutiveDashboard() {
  const [kpi, setKpi] = useState<ExecutiveDashboardKPI | null>(null);
  const [charts, setCharts] = useState<ExecutiveChartsData | null>(null);
  const [dataNote, setDataNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getExecutiveDashboard();
      setKpi(res.kpi);
      setCharts(res.charts);
      setDataNote(res.data_note || "");
    } catch (err) {
      console.error("Gagal memuat data executive dashboard:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customTooltipFormatter = (value: any, name: any) => {
    if (typeof value === "number") {
      if (value > 100000) return [formatRupiah(value), name];
      return [value, name];
    }
    return [value, name];
  };

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="Executive Finance Dashboard"
        subtitle="Monitoring Realisasi Biaya Pengiriman (public.do_tbl), Pengajuan Kas (public.acc_kas), & SLA Logistik"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {dataNote && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.7rem 1rem",
            borderRadius: "8px",
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.25)",
            fontSize: "0.76rem",
            color: "var(--text-secondary)",
          }}
        >
          <strong>Sumber Data Produksi:</strong> {dataNote}
        </div>
      )}

      {/* Alert Banner for Pending Verifications */}
      {kpi && kpi.pending_verification > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(255, 94, 94, 0.12), rgba(255, 179, 35, 0.08))",
            border: "1px solid rgba(255, 94, 94, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255, 94, 94, 0.2)",
                color: "#FF5E5E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={18} />
            </span>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {kpi.pending_verification} Dokumen DO / Kas Memerlukan Tindak Lanjut Faktur
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Terdapat Delivery Order berstatus Shipped/Received yang belum diterbitkan Invoice (Goods In Transit) atau pengajuan kas berstatus Pending.
              </div>
            </div>
          </div>
          <Link
            href="/finance/ar-summary/goods-in-transit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              background: "#FF5E5E",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(255, 94, 94, 0.3)",
            }}
          >
            <span>Tinjau Goods in Transit</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ─── 11 KPI Cards Grid ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        {/* 1. Total Delivery Order */}
        <FinanceKpiCard
          label="Total Delivery Order"
          value={isLoading ? "..." : formatNumber(kpi?.total_delivery_order)}
          subValue="DO dengan biaya kirim > Rp 0"
          icon={<PackageCheck size={18} />}
          color="primary"
        />

        {/* 2. Total Shipping Cost */}
        <FinanceKpiCard
          label="Total Shipping Cost"
          value={isLoading ? "..." : formatRupiahShort(kpi?.total_shipping_cost)}
          subValue="Total realisasi ongkos kirim (do_tbl)"
          icon={<Truck size={18} />}
          color="cyan"
        />

        {/* 3. Total Transport Cost */}
        <FinanceKpiCard
          label="Biaya Ekspedisi Pihak Ke-3"
          value={isLoading ? "..." : formatRupiahShort(kpi?.total_transport_cost)}
          subValue="Pengiriman via vendor transporter"
          icon={<CircleDollarSign size={18} />}
          color="purple"
        />

        {/* 4. Total Budget Request */}
        <FinanceKpiCard
          label="Total Voucher Kas (acc_kas)"
          value={isLoading ? "..." : formatRupiahShort(kpi?.total_budget_request)}
          subValue="Akumulasi transaksi kas tercatat"
          icon={<FileSpreadsheet size={18} />}
          color="warning"
        />

        {/* 5. Total Actual Cost */}
        <FinanceKpiCard
          label="Total Actual Freight"
          value={isLoading ? "..." : formatRupiahShort(kpi?.total_actual_cost)}
          subValue="Realisasi biaya kirim DO"
          icon={<CircleDollarSign size={18} />}
          color="danger"
        />

        {/* 6. Porsi Armada Internal */}
        <FinanceKpiCard
          label="Biaya Armada Internal"
          value={isLoading ? "..." : formatRupiahShort(kpi?.total_variance)}
          subValue={`Porsi internal ${kpi?.total_variance_pct || 0}% dari total ongkir`}
          icon={<Scale size={18} />}
          color="danger"
        />

        {/* 7. Pending Verification */}
        <FinanceKpiCard
          label="DO Belum Terbit Invoice"
          value={isLoading ? "..." : `${kpi?.pending_verification || 0} Dok`}
          subValue="DO Unbilled (GIT) + Kas Pending"
          icon={<AlertTriangle size={18} />}
          color="warning"
        />

        {/* 8. Average Lead Time */}
        <FinanceKpiCard
          label="Average Lead Time"
          value={isLoading ? "..." : `${kpi?.average_lead_time_days || 0} Hari`}
          subValue="Target SLA: 3.0 Hari"
          icon={<Clock size={18} />}
          color="success"
        />

        {/* 9. Top Customer */}
        <FinanceKpiCard
          label="Top Customer (Freight)"
          value={isLoading ? "..." : (kpi?.top_customer?.name || "-").replace("PT ", "").slice(0, 16) + (kpi?.top_customer?.name && kpi.top_customer.name.length > 16 ? "..." : "")}
          subValue={`${formatRupiahShort(kpi?.top_customer?.total_cost)} (${kpi?.top_customer?.do_count || 0} DO)`}
          icon={<Users size={18} />}
          color="primary"
        />

        {/* 10. Top Sales */}
        <FinanceKpiCard
          label="Top Sales (Freight)"
          value={isLoading ? "..." : kpi?.top_sales?.name || "-"}
          subValue={`${formatRupiahShort(kpi?.top_sales?.total_cost)} (${kpi?.top_sales?.do_count || 0} DO)`}
          icon={<Award size={18} />}
          color="success"
        />

        {/* 11. Top Vendor */}
        <FinanceKpiCard
          label="Top Vendor Transporter"
          value={isLoading ? "..." : (kpi?.top_vendor?.name || "-").replace("PT ", "")}
          subValue={`${kpi?.top_vendor?.shipment_count || 0} Kiriman (OTD: ${kpi?.top_vendor?.on_time_rate || 0}%)`}
          icon={<Building2 size={18} />}
          color="cyan"
        />
      </div>

      {/* ─── 7 CHARTS SECTION ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "1.25rem",
        }}
      >
        {/* Chart 1: Shipping Cost Trend (Estimasi vs Budget vs Realisasi) (Col 8) */}
        <div
          className="card"
          style={{
            gridColumn: "span 8",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Shipping Cost Trend
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Perbandingan Estimasi Sales vs Budget Request Logistik vs Actual Cost (12 Bulan)
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#3DABFF" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3DABFF" }} />
                Estimasi Sales
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#FFB323" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFB323" }} />
                Budget Request
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#FF5E5E" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5E5E" }} />
                Actual Cost
              </span>
            </div>
          </div>

          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.shipping_cost_trend || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5E5E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF5E5E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB323" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FFB323" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={11} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)} Jt`}
                />
                <Tooltip
                  formatter={customTooltipFormatter}
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="actual_cost"
                  name="Actual Cost"
                  stroke="#FF5E5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorActual)"
                />
                <Area
                  type="monotone"
                  dataKey="budget_request"
                  name="Budget Request"
                  stroke="#FFB323"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBudget)"
                />
                <Line
                  type="monotone"
                  dataKey="estimasi_sales"
                  name="Estimasi Sales"
                  stroke="#3DABFF"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Variance Trend (Nominal & %) (Col 4) */}
        <div
          className="card"
          style={{
            gridColumn: "span 4",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Variance Trend (%)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Persentase deviasi biaya aktual vs anggaran bulanan
            </p>
          </div>

          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.variance_trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Variance %"]}
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="variance_pct" name="Variance %" radius={[4, 4, 0, 0]}>
                  {(charts?.variance_trend || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.variance_pct > 5 ? "#FF5E5E" : entry.variance_pct > 3 ? "#FFB323" : "#3AC977"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Top Customer (Shipping Cost Spend) (Col 6) */}
        <div
          className="card"
          style={{
            gridColumn: "span 6",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Top Customer by Freight Spend
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Alokasi total biaya pengiriman berdasarkan akun pelanggan
              </p>
            </div>
            <Link
              href="/finance/ar-summary/goods-in-transit"
              style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}
            >
              Lihat GIT &rarr;
            </Link>
          </div>

          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts?.top_customers || []}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis
                  type="number"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)} Jt`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  width={110}
                  tickFormatter={(n) => n.replace("PT ", "")}
                />
                <Tooltip
                  formatter={customTooltipFormatter}
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="shipping_cost" name="Biaya Kirim" fill="#0D99FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Top Sales (Estimasi vs Realisasi) (Col 6) */}
        <div
          className="card"
          style={{
            gridColumn: "span 6",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Top Sales: Estimasi vs Realisasi
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Akurasi estimasi biaya kirim per sales representative
              </p>
            </div>
            <Link
              href="/finance/ar-summary/am-performance"
              style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}
            >
              AM Performance &rarr;
            </Link>
          </div>

          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.top_sales || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)} Jt`}
                />
                <Tooltip
                  formatter={customTooltipFormatter}
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="estimasi" name="Estimasi Sales" fill="#3DABFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi Aktual" fill="#9147FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Top Vendor Performance (Col 4) */}
        <div
          className="card"
          style={{
            gridColumn: "span 4",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Top Vendor by Volume
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Jumlah pengiriman per mitra ekspedisi / transporter
            </p>
          </div>

          <div style={{ height: "240px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts?.top_vendors || []}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  width={90}
                  tickFormatter={(n) => n.replace("PT ", "")}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="shipment_count" name="Jumlah DO" fill="#3AC977" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Shipment per Month (On-Time vs Delayed) (Col 4) */}
        <div
          className="card"
          style={{
            gridColumn: "span 4",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Shipment per Month
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Ketepatan waktu pengiriman (On-Time vs Terlambat)
            </p>
          </div>

          <div style={{ height: "240px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(charts?.shipment_per_month || []).slice(-6)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="on_time" name="Tepat Waktu" stackId="a" fill="#3AC977" />
                <Bar dataKey="delayed" name="Terlambat" stackId="a" fill="#FF5E5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Average Lead Time vs SLA Target (Col 4) */}
        <div
          className="card"
          style={{
            gridColumn: "span 4",
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Average Lead Time (Hari)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Realisasi waktu pengiriman vs SLA Target (3.0 Hari)
            </p>
          </div>

          <div style={{ height: "240px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.average_lead_time || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.5} />
                <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={10} domain={[1.5, 4.0]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--bg-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="lead_time_days"
                  name="Realisasi (Hari)"
                  stroke="#0D99FF"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="target_sla_days"
                  name="SLA Target"
                  stroke="#FFB323"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
