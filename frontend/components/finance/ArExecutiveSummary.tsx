"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
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
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  BellRing,
  Target,
  Award,
  PackageSearch,
  Gauge,
  UserCheck,
  CalendarClock,
  Gift,
  ArrowRight,
  Users,
  FileText,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import { apiFinance } from "@/lib/finance-api";
import { ArExecutiveSummaryData } from "@/types/finance";
import { formatRupiah, formatRupiahShort, formatNumber } from "@/lib/finance-utils";

const SUBMENU_CARDS = [
  {
    href: "/finance/ar-summary/top-20",
    title: "TOP 20 AR",
    subtitle: "Total piutang customer current & AR terbesar",
    desc: "Peringkat 20 eksposur piutang terbesar dikategorikan dalam Top Performance atau Critical berdasarkan overduenya.",
    icon: <Crown size={20} />,
    color: "#F59E0B",
  },
  {
    href: "/finance/ar-summary/collection-alert",
    title: "COLLECTION ALERT",
    subtitle: "Daftar invoice yang memerlukan tindakan segera",
    desc: "Monitoring ketat Upcoming Overdue (7 hari ke depan), Due Today, OD 1-30, OD 31-60, OD 61-90, hingga >90 hari.",
    icon: <BellRing size={20} />,
    color: "#EF4444",
  },
  {
    href: "/finance/ar-summary/weekly-collection",
    title: "WEEKLY COLLECTION ACHIEVEMENT",
    subtitle: "Realisasi pembayaran secara mingguan",
    desc: "Target vs Actual Collection per minggu beserta rincian postingan tiap hari (pembayaran yang masuk) & persentase.",
    icon: <Target size={20} />,
    color: "#10B981",
  },
  {
    href: "/finance/ar-summary/am-performance",
    title: "AM PERFORMANCE",
    subtitle: "Kontribusi DSR / Marketing terhadap penerimaan",
    desc: "Ranking collection berdasarkan Account Manager serta ranking achievement terhadap target penagihan.",
    icon: <Award size={20} />,
    color: "#0D99FF",
  },
  {
    href: "/finance/ar-summary/goods-in-transit",
    title: "GOODS IN TRANSIT TRACKING",
    subtitle: "Monitoring DO keluar gudang belum terbit invoice",
    desc: "Pantau pengiriman (In Transit & Received) yang sudah keluar gudang namun belum diterbitkan faktur penjualan.",
    icon: <PackageSearch size={20} />,
    color: "#8B5CF6",
  },
  {
    href: "/finance/ar-summary/credit-utilization",
    title: "CREDIT LIMIT UTILIZATION",
    subtitle: "Penggunaan fasilitas kredit & kebijakan risiko",
    desc: "Utilisasi ≥80%: Warning, ≥100%: Over Limit, Overdue >60 hari: Credit Review, Overdue >90 hari: pertimbangkan Credit Hold.",
    icon: <Gauge size={20} />,
    color: "#EC4899",
  },
  {
    href: "/finance/ar-summary/customer-performance",
    title: "CUSTOMER PERFORMANCE",
    subtitle: "Range payment customer & Daftar Insentif",
    desc: "Average Payment Days: ≤0d Excellent, 1-30d Good, 31-60d High Risk, >60d Critical — acuan daftar insentif customer.",
    icon: <UserCheck size={20} />,
    color: "#06B6D4",
  },
  {
    href: "/finance/ar-summary/collection-projection",
    title: "COLLECTION PROJECTION",
    subtitle: "Target collection weekly dan monthly",
    desc: "Proyeksi arus kas masuk mingguan & bulanan berdasarkan konfirmasi janji bayar customer (Promise to Pay) dan hari overdue.",
    icon: <CalendarClock size={20} />,
    color: "#14B8A6",
  },
  {
    href: "/finance/ar-summary/icu",
    title: "ICU (INCENTIVE CUSTOMER)",
    subtitle: "Pengajuan Incentive Customer",
    desc: "Daftar pengajuan insentif customer yang masih membutuhkan approval berjenjang dan tindak lanjut pencairan.",
    icon: <Gift size={20} />,
    color: "#F97316",
  },
];

export default function ArExecutiveSummary() {
  const [data, setData] = useState<ArExecutiveSummaryData | null>(null);
  const [scope, setScope] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getArExecutiveSummary({ scope });
      setData(res);
    } catch (err) {
      console.error("Gagal memuat AR Executive Summary:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpi = data?.kpi;

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="AR EXECUTIVE SUMMARY"
        subtitle="Gambaran posisi piutang perusahaan secara keseluruhan — Komparasi Total Outstanding (OS) x OS Overdue"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Filter Scope Piutang */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { id: "ACTIVE", label: "Siklus Piutang Aktif (H2 2026)" },
            { id: "YTD_2026", label: "Tahun Berjalan (YTD 2026)" },
            { id: "AR_LEDGER", label: "Buku Besar AR (acc_ar_faktur)" },
            { id: "ALL", label: "Seluruh Histori Piutang" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                border: scope === s.id ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
                background: scope === s.id ? "var(--color-primary)" : "var(--bg-surface)",
                color: scope === s.id ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {kpi && (
          <div
            style={{
              padding: "0.45rem 0.95rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={15} />
            <span>
              Rasio Total OS x OS Overdue: {kpi.current_ratio_pct}% Current vs {kpi.overdue_ratio_pct}% Overdue
            </span>
          </div>
        )}
      </div>

      {data?.data_note && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.65rem 1rem",
            borderRadius: "8px",
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.25)",
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
          }}
        >
          {data.data_note}
        </div>
      )}

      {/* KPI Utama: Total OS x OS Overdue */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(225px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <FinanceKpiCard
          label="Total Outstanding (Total OS)"
          value={isLoading || !kpi ? "..." : formatRupiahShort(kpi.total_os)}
          subValue={kpi ? `${formatNumber(kpi.total_open_invoices)} faktur aktif (${kpi.total_customers_with_ar} customer)` : ""}
          icon={<Layers size={18} />}
          color="primary"
        />

        <FinanceKpiCard
          label="OS Current (Belum Jatuh Tempo)"
          value={isLoading || !kpi ? "..." : formatRupiahShort(kpi.current_os)}
          subValue={kpi ? `${kpi.current_ratio_pct}% dari Total OS (${formatNumber(kpi.current_invoices)} faktur)` : ""}
          icon={<CheckCircle2 size={18} />}
          color="success"
        />

        <FinanceKpiCard
          label="OS Overdue (Lewat Jatuh Tempo)"
          value={isLoading || !kpi ? "..." : formatRupiahShort(kpi.overdue_os)}
          subValue={kpi ? `${kpi.overdue_ratio_pct}% dari Total OS (${formatNumber(kpi.overdue_invoices)} faktur)` : ""}
          icon={<AlertTriangle size={18} />}
          color="danger"
        />

        <FinanceKpiCard
          label="Upcoming Overdue (7 Hari) & Due Today"
          value={
            isLoading || !kpi
              ? "..."
              : formatRupiahShort(kpi.upcoming_7d_os + kpi.due_today_os)
          }
          subValue={
            kpi
              ? `${kpi.upcoming_7d_count} faktur H-7 + ${kpi.due_today_count} faktur Due Today`
              : ""
          }
          icon={<Clock size={18} />}
          color="warning"
        />

        <FinanceKpiCard
          label="Goods In Transit (Belum Invoice)"
          value={isLoading || !kpi ? "..." : `${formatNumber(kpi.git_unbilled_count)} DO`}
          subValue="Barang keluar gudang belum terbit faktur"
          icon={<PackageSearch size={18} />}
          color="purple"
        />

        <FinanceKpiCard
          label="Pengajuan ICU Butuh Approval"
          value={isLoading || !kpi ? "..." : `${kpi.pending_icu_count} Pengajuan`}
          subValue="Insentif customer menunggu tindak lanjut"
          icon={<Gift size={18} />}
          color="cyan"
        />
      </div>

      {/* Visualisasi Utama: Total OS vs OS Overdue per Bulan & Aging Breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Chart 1: Komparasi Total OS x OS Overdue Bulanan */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Posisi Total OS x OS Overdue (Komparasi Current vs Overdue)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Perbandingan piutang lancar (Current) dan piutang jatuh tempo (Overdue) per periode faktur
            </p>
          </div>
          <div style={{ width: "100%", height: 290 }}>
            <ResponsiveContainer>
              <BarChart data={data?.os_vs_overdue_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)}M`}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                  }}
                />
                <Legend />
                <Bar dataKey="current_os" name="OS Current (Lancar)" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="overdue_os" name="OS Overdue (Jatuh Tempo)" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribusi Umur Piutang (Aging Schedule) */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Struktur Umur Piutang (AR Aging Buckets)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Sebaran nilai piutang dari Current, Upcoming 7 Hari, Due Today, hingga Overdue &gt; 90 Hari
            </p>
          </div>
          <div style={{ width: "100%", height: 290 }}>
            <ResponsiveContainer>
              <BarChart data={data?.aging_buckets || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)}M`}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                />
                <YAxis
                  type="category"
                  dataKey="short_label"
                  width={80}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }}
                />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                  }}
                />
                <Bar dataKey="amount" name="Nilai Piutang (Rp)" radius={[0, 6, 6, 0]}>
                  {(data?.aging_buckets || []).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Ringkas Top 8 Eksposur: Total OS x OS Overdue */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          borderRadius: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Matriks Eksposur Terbesar: Total OS x OS Overdue
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              8 pelanggan dengan saldo piutang tertinggi beserta komposisi Current vs Overdue
            </p>
          </div>
          <Link
            href="/finance/ar-summary/top-20"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--color-primary)",
              textDecoration: "none",
            }}
          >
            <span>Lihat Lengkap Top 20 AR</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.65rem 0.75rem" }}>Customer</th>
                <th style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>Faktur Aktif</th>
                <th style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>Total OS</th>
                <th style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>OS Current</th>
                <th style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>OS Overdue</th>
                <th style={{ padding: "0.65rem 0.75rem", width: 180 }}>Komposisi OS x Overdue</th>
                <th style={{ padding: "0.65rem 0.75rem", textAlign: "center" }}>Max Overdue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_os_vs_overdue || []).map((row) => (
                <tr key={row.id_customer} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td style={{ padding: "0.7rem 0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {row.nama_customer}
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      ID: {row.id_customer}
                    </div>
                  </td>
                  <td style={{ padding: "0.7rem 0.75rem", textAlign: "right" }}>{row.open_invoices}</td>
                  <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", fontWeight: 800 }}>
                    {formatRupiah(row.total_os)}
                  </td>
                  <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", color: "#10B981", fontWeight: 600 }}>
                    {formatRupiah(row.current_os)}
                  </td>
                  <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", color: "#EF4444", fontWeight: 700 }}>
                    {formatRupiah(row.overdue_os)}
                  </td>
                  <td style={{ padding: "0.7rem 0.75rem" }}>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 4,
                        background: "#10B981",
                        overflow: "hidden",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: `${100 - row.overdue_ratio_pct}%`,
                          background: "#10B981",
                        }}
                      />
                      <div
                        style={{
                          width: `${row.overdue_ratio_pct}%`,
                          background: "#EF4444",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        marginTop: 3,
                      }}
                    >
                      <span>Cur: {(100 - row.overdue_ratio_pct).toFixed(0)}%</span>
                      <span style={{ color: "#EF4444", fontWeight: 700 }}>OD: {row.overdue_ratio_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.7rem 0.75rem", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background:
                          row.max_days_overdue > 60
                            ? "rgba(239,68,68,0.15)"
                            : row.max_days_overdue > 0
                            ? "rgba(245,158,11,0.15)"
                            : "rgba(16,185,129,0.15)",
                        color:
                          row.max_days_overdue > 60
                            ? "#EF4444"
                            : row.max_days_overdue > 0
                            ? "#F59E0B"
                            : "#10B981",
                      }}
                    >
                      {row.max_days_overdue > 0 ? `${row.max_days_overdue} Hari` : "Lancar (0 Hr)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direktori 9 Sub-Menu AR Executive Summary */}
      <div style={{ marginBottom: "0.85rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Modul & Sub-Menu AR Executive Summary (9 Sub-Menu)
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Pilih sub-menu di bawah ini untuk masuk ke analisis detail piutang, penagihan, fasilitas kredit, dan insentif pelanggan
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: "1rem",
        }}
      >
        {SUBMENU_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: "none",
              padding: "1.15rem 1.25rem",
              borderRadius: "12px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              transition: "all 0.2s ease",
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
                height: 3,
                background: card.color,
              }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  background: `${card.color}1A`,
                  color: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {card.title}
                </div>
                <div style={{ fontSize: "0.74rem", fontWeight: 600, color: card.color, marginTop: 1 }}>
                  {card.subtitle}
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
              {card.desc}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: card.color,
              }}
            >
              <span>Buka Sub-Menu</span>
              <ArrowRight size={13} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

