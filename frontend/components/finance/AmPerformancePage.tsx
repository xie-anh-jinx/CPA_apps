"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Award,
  Trophy,
  Target,
  Users,
  TrendingUp,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { AmPerformanceItem, AmPerformanceResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function AmPerformancePage() {
  const [resData, setResData] = useState<AmPerformanceResponse | null>(null);
  const [sortMode, setSortMode] = useState<"COLLECTION" | "ACHIEVEMENT">("COLLECTION");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getAmPerformance();
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat AM Performance:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = resData?.summary;
  const sortedItems = useMemo(() => {
    const list = [...(resData?.items || [])];
    if (sortMode === "ACHIEVEMENT") {
      list.sort((a, b) => b.achievement_pct - a.achievement_pct);
    } else {
      list.sort((a, b) => b.actual_collection - a.actual_collection);
    }
    return list;
  }, [resData, sortMode]);

  const top10Chart = useMemo(
    () =>
      sortedItems.slice(0, 10).map((it) => ({
        name: it.nama_am.length > 18 ? it.nama_am.slice(0, 18) + "..." : it.nama_am,
        Target: it.target_collection,
        Actual: it.actual_collection,
        AchievementPct: it.achievement_pct,
      })),
    [sortedItems]
  );

  const columns = useMemo<ColumnDef<AmPerformanceItem>[]>(
    () => [
      {
        accessorKey: "collection_rank",
        header: "Rank Collection",
        cell: ({ row }) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px 9px",
              borderRadius: "6px",
              background:
                row.original.collection_rank <= 3
                  ? "linear-gradient(135deg, #0D99FF, #6366F1)"
                  : "var(--bg-surface)",
              color: row.original.collection_rank <= 3 ? "#fff" : "var(--text-secondary)",
              fontWeight: 800,
              fontSize: "0.75rem",
            }}
          >
            #{row.original.collection_rank} Nominal
          </span>
        ),
      },
      {
        accessorKey: "achievement_rank",
        header: "Rank Achievement",
        cell: ({ row }) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px 9px",
              borderRadius: "6px",
              background:
                row.original.achievement_rank <= 3
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : "var(--bg-surface)",
              color: row.original.achievement_rank <= 3 ? "#fff" : "var(--text-secondary)",
              fontWeight: 800,
              fontSize: "0.75rem",
            }}
          >
            #{row.original.achievement_rank} Target %
          </span>
        ),
      },
      {
        accessorKey: "nama_am",
        header: "Account Manager (DSR / Marketing)",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_am}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              ID: {row.original.id_sales} • Cabang {row.original.cabang} • {row.original.paid_customers} Customer Bayar
            </div>
          </div>
        ),
      },
      {
        accessorKey: "target_collection",
        header: "Target Collection",
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            {formatRupiah(row.original.target_collection)}
          </span>
        ),
      },
      {
        accessorKey: "actual_collection",
        header: "Realisasi Collection",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "#10B981" }}>
              {formatRupiah(row.original.actual_collection)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Kontribusi: {row.original.contribution_pct}% dari total perusahaan
            </div>
          </div>
        ),
      },
      {
        accessorKey: "achievement_pct",
        header: "Achievement vs Target",
        cell: ({ row }) => {
          const pct = row.original.achievement_pct;
          const color = pct >= 100 ? "#10B981" : pct >= 85 ? "#F59E0B" : "#EF4444";
          return (
            <div style={{ minWidth: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color, fontSize: "0.78rem" }}>
                <span>{pct}%</span>
                <span style={{ fontSize: "0.68rem" }}>{row.original.performance_label}</span>
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
      {
        accessorKey: "active_os",
        header: "Sisa OS Aktif & Overdue",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {formatRupiahShort(row.original.active_os)}
            </div>
            <div style={{ fontSize: "0.7rem", color: row.original.overdue_os > 0 ? "#EF4444" : "#10B981" }}>
              Overdue: {formatRupiahShort(row.original.overdue_os)} ({row.original.overdue_ratio_pct}%)
            </div>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="AM PERFORMANCE (DSR / Marketing Collection Ranking)"
        subtitle="Peringkat kontribusi DSR / Marketing terhadap penerimaan pembayaran — Ranking collection berdasarkan Account Manager & ranking achievement terhadap target"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(225px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <FinanceKpiCard
          label="Top #1 Nominal Collection"
          value={isLoading || !summary ? "..." : summary.top_collector_name}
          subValue={summary ? `Realisasi: ${formatRupiahShort(summary.top_collector_amount)}` : ""}
          icon={<Trophy size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Top #1 Achievement Target (%)"
          value={isLoading || !summary ? "..." : summary.top_achiever_name}
          subValue={summary ? `Pencapaian: ${summary.top_achiever_pct}% dari target` : ""}
          icon={<Award size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="Total Penerimaan Tim DSR/AM"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_collected)}
          subValue={summary ? `Dari target kolektif ${formatRupiahShort(summary.total_target)}` : ""}
          icon={<Target size={18} />}
          color="cyan"
        />
        <FinanceKpiCard
          label="Rata-Rata Achievement AM"
          value={isLoading || !summary ? "..." : `${summary.avg_achievement_pct}%`}
          subValue={`${summary?.total_am_count || 0} Account Manager aktif dievaluasi`}
          icon={<TrendingUp size={18} />}
          color="warning"
        />
      </div>

      {/* Chart Top 10 Account Manager */}
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
        <div style={{ marginBottom: "0.85rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Top 10 Account Manager: Target vs Realisasi Penerimaan Pembayaran
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Kontribusi penerimaan pembayaran piutang per DSR / Account Manager dibandingkan target penagihan
          </p>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={top10Chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
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
              <Bar dataKey="Target" name="Target Collection" fill="#64748B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" name="Realisasi Collection" fill="#0D99FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mode Urutan Ranking */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setSortMode("COLLECTION")}
          style={{
            padding: "0.45rem 0.95rem",
            borderRadius: "8px",
            border: sortMode === "COLLECTION" ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
            background: sortMode === "COLLECTION" ? "var(--color-primary)" : "var(--bg-surface)",
            color: sortMode === "COLLECTION" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Urutkan berdasarkan Ranking Nominal Collection
        </button>
        <button
          onClick={() => setSortMode("ACHIEVEMENT")}
          style={{
            padding: "0.45rem 0.95rem",
            borderRadius: "8px",
            border: sortMode === "ACHIEVEMENT" ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
            background: sortMode === "ACHIEVEMENT" ? "var(--color-primary)" : "var(--bg-surface)",
            color: sortMode === "ACHIEVEMENT" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Urutkan berdasarkan Ranking Achievement (%) terhadap Target
        </button>
      </div>

      <DataTable
        columns={columns}
        data={sortedItems}
        isLoading={isLoading}
        searchPlaceholder="Cari nama Account Manager / DSR atau kode sales..."
      />
    </div>
  );
}

