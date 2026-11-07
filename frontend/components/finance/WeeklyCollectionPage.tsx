"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Receipt,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import {
  WeeklyCollectionResponse,
  WeeklyCollectionSeriesItem,
  DailyPaymentPostingItem,
} from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function WeeklyCollectionPage() {
  const [resData, setResData] = useState<WeeklyCollectionResponse | null>(null);
  const [viewMode, setViewMode] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getWeeklyCollection({ weeks: 12 });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Weekly Collection Achievement:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = resData?.summary;
  const weeklySeries = resData?.weekly_series || [];
  const dailyPostings = resData?.daily_postings || [];

  const weeklyColumns = useMemo<ColumnDef<WeeklyCollectionSeriesItem>[]>(
    () => [
      {
        accessorKey: "week_label",
        header: "Minggu Collection",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.week_label}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {row.original.voucher_count} postingan • {row.original.customer_count} customer
            </div>
          </div>
        ),
      },
      {
        accessorKey: "target_collection",
        header: "Target Mingguan",
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            {formatRupiah(row.original.target_collection)}
          </span>
        ),
      },
      {
        accessorKey: "actual_collection",
        header: "Actual Collection (Masuk)",
        cell: ({ row }) => (
          <span style={{ fontWeight: 800, color: "#10B981" }}>
            {formatRupiah(row.original.actual_collection)}
          </span>
        ),
      },
      {
        accessorKey: "daily_breakdown",
        header: "Postingan Harian (Sen - Jum)",
        cell: ({ row }) => {
          const d = row.original.daily_breakdown;
          return (
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              <span>Sen: {formatRupiahShort(d.Senin)}</span> • <span>Sel: {formatRupiahShort(d.Selasa)}</span> •{" "}
              <span>Rab: {formatRupiahShort(d.Rabu)}</span> • <span>Kam: {formatRupiahShort(d.Kamis)}</span> •{" "}
              <span>Jum: {formatRupiahShort(d.Jumat)}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "achievement_pct",
        header: "Achievement (%)",
        cell: ({ row }) => {
          const pct = row.original.achievement_pct;
          const color = pct >= 100 ? "#10B981" : pct >= 85 ? "#F59E0B" : "#EF4444";
          return (
            <div style={{ minWidth: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color, fontSize: "0.78rem" }}>
                <span>{pct}%</span>
                <span style={{ fontSize: "0.68rem" }}>
                  {pct >= 100 ? "Tercapai" : pct >= 85 ? "On Track" : "Under"}
                </span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--bg-base)", borderRadius: 3, marginTop: 3 }}>
                <div
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    height: "100%",
                    background: color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  const dailyColumns = useMemo<ColumnDef<DailyPaymentPostingItem>[]>(
    () => [
      {
        accessorKey: "payment_date_label",
        header: "Tanggal Posting",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.payment_date_label}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 600 }}>
              Voucher: {row.original.no_voucher}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer Pembayar",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              ID: {row.original.id_customer} • Cabang: {row.original.id_kantor}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "account_manager",
        header: "Account Manager",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {row.original.account_manager}
          </span>
        ),
      },
      {
        accessorKey: "daftar_invoice",
        header: "Faktur yang Dilunasi",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.76rem", color: "var(--text-primary)" }}>
              {row.original.daftar_invoice}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {row.original.jumlah_faktur_lunas} faktur terkait
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nominal_masuk",
        header: "Pembayaran Masuk (Rp)",
        cell: ({ row }) => (
          <span style={{ fontWeight: 800, color: "#10B981", fontSize: "0.88rem" }}>
            +{formatRupiah(row.original.nominal_masuk)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="WEEKLY COLLECTION ACHIEVEMENT"
        subtitle="Mengukur realisasi pembayaran secara mingguan — Target vs Actual Collection per minggu, postingan tiap hari (pembayaran masuk), & persentase"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <FinanceKpiCard
          label="Total Target Collection (12 Minggu)"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_target_period)}
          subValue="Akumulasi target penerimaan kas mingguan"
          icon={<Target size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Total Actual Collection Masuk"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_actual_period)}
          subValue="Realisasi pembayaran terposting"
          icon={<CheckCircle2 size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="Persentase Achievement Rata-rata"
          value={isLoading || !summary ? "..." : `${summary.overall_achievement_pct}%`}
          subValue={`${summary?.weeks_achieved || 0} dari ${summary?.total_weeks || 12} minggu mencapai >=100%`}
          icon={<TrendingUp size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="Postingan Pembayaran Harian"
          value={isLoading ? "..." : `${dailyPostings.length} Voucher`}
          subValue="Pembayaran piutang masuk terverifikasi"
          icon={<Receipt size={18} />}
          color="cyan"
        />
      </div>

      {/* Chart Target vs Actual Collection per Minggu */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          borderRadius: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Tren Mingguan: Target vs Actual Collection & Persentase Achievement (%)
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Perbandingan target penagihan mingguan dengan realisasi pembayaran masuk beserta garis % pencapaian
          </p>
        </div>
        <div style={{ width: "100%", height: 290 }}>
          <ResponsiveContainer>
            <ComposedChart data={weeklySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)}M`}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 140]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#F59E0B" }}
              />
              <Tooltip
                formatter={(val: any, name: any) =>
                  String(name).includes("%") ? `${val}%` : formatRupiah(Number(val))
                }
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="target_collection" name="Target Mingguan" fill="#64748B" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="actual_collection" name="Actual Collection" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="achievement_pct"
                name="Achievement (%)"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mode Switcher: Postingan Harian vs Ringkasan Mingguan */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setViewMode("DAILY")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: viewMode === "DAILY" ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
            background: viewMode === "DAILY" ? "var(--color-primary)" : "var(--bg-surface)",
            color: viewMode === "DAILY" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Postingan Pembayaran Tiap Hari ({dailyPostings.length})
        </button>
        <button
          onClick={() => setViewMode("WEEKLY")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: viewMode === "WEEKLY" ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
            background: viewMode === "WEEKLY" ? "var(--color-primary)" : "var(--bg-surface)",
            color: viewMode === "WEEKLY" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Tabel Target vs Actual per Minggu ({weeklySeries.length})
        </button>
      </div>

      {viewMode === "DAILY" ? (
        <DataTable
          columns={dailyColumns}
          data={dailyPostings}
          isLoading={isLoading}
          searchPlaceholder="Cari nomor voucher, customer pembayar, atau nomor invoice..."
        />
      ) : (
        <DataTable
          columns={weeklyColumns}
          data={weeklySeries}
          isLoading={isLoading}
          searchPlaceholder="Cari minggu collection..."
        />
      )}
    </div>
  );
}

