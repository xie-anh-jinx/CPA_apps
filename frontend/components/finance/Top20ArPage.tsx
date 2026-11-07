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
  Crown,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Layers,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { Top20ArItem, Top20ArResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function Top20ArPage() {
  const [resData, setResData] = useState<Top20ArResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [scope, setScope] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getTop20Ar({ scope, limit: 20 });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Top 20 AR:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = resData?.items || [];
  const filteredItems = useMemo(() => {
    if (activeCategory === "ALL") return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const chartData = useMemo(
    () =>
      items.slice(0, 10).map((it) => ({
        name: it.nama_customer.length > 22 ? it.nama_customer.slice(0, 22) + "..." : it.nama_customer,
        Current: it.current_ar,
        Overdue: it.overdue_ar,
      })),
    [items]
  );

  const columns = useMemo<ColumnDef<Top20ArItem>[]>(
    () => [
      {
        accessorKey: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: row.original.rank <= 3 ? "linear-gradient(135deg, #F59E0B, #D97706)" : "var(--bg-surface)",
              color: row.original.rank <= 3 ? "#fff" : "var(--text-secondary)",
              fontWeight: 800,
              fontSize: "0.75rem",
            }}
          >
            #{row.original.rank}
          </span>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              ID: {row.original.id_customer} • Cabang: {row.original.id_kantor} • TOP: {row.original.top_days} Hr
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_sales",
        header: "Account Manager",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {row.original.nama_sales}
          </span>
        ),
      },
      {
        accessorKey: "current_ar",
        header: "Piutang Current",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "#10B981" }}>{formatRupiah(row.original.current_ar)}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {row.original.current_ratio_pct}% dari Total AR
            </div>
          </div>
        ),
      },
      {
        accessorKey: "overdue_ar",
        header: "Piutang Overdue",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: row.original.overdue_ar > 0 ? "#EF4444" : "var(--text-muted)" }}>
              {formatRupiah(row.original.overdue_ar)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {row.original.overdue_invoices} faktur ({row.original.overdue_ratio_pct}%)
            </div>
          </div>
        ),
      },
      {
        accessorKey: "total_ar",
        header: "Total AR Terbesar",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{formatRupiah(row.original.total_ar)}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {row.original.open_invoices} total faktur
            </div>
          </div>
        ),
      },
      {
        accessorKey: "max_days_overdue",
        header: "Max Overdue",
        cell: ({ row }) => {
          const d = row.original.max_days_overdue;
          return (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.75rem",
                background: d > 60 ? "rgba(239,68,68,0.15)" : d > 0 ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                color: d > 60 ? "#EF4444" : d > 0 ? "#F59E0B" : "#10B981",
              }}
            >
              {d > 0 ? `${d} Hari` : "0 Hari (Current)"}
            </span>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Kategori Performa / Risiko",
        cell: ({ row }) => {
          const cat = row.original.category;
          const isTop = cat === "TOP_PERFORMANCE";
          const isCrit = cat === "CRITICAL";
          return (
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: isTop
                    ? "rgba(16,185,129,0.15)"
                    : isCrit
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(245,158,11,0.15)",
                  color: isTop ? "#10B981" : isCrit ? "#EF4444" : "#F59E0B",
                }}
              >
                {row.original.category_label}
              </span>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 3 }}>
                {row.original.recommended_action}
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  const summary = resData?.summary;

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="TOP 20 AR (Current & Overdue Categorization)"
        subtitle="Total piutang customer current & Total AR terbesar — Dikategorikan dalam Top Performance atau Critical berdasarkan overduenya"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Filter Scope */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
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
              padding: "0.4rem 0.85rem",
              borderRadius: "8px",
              border: scope === s.id ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
              background: scope === s.id ? "var(--color-primary)" : "var(--bg-surface)",
              color: scope === s.id ? "#ffffff" : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {resData?.data_note && (
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
          {resData.data_note}
        </div>
      )}

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
          label="Total Eksposur Top 20 AR"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.top20_total_ar)}
          subValue="Akumulasi 20 debitur piutang terbesar"
          icon={<Crown size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Total Piutang Customer Current"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.top20_current_ar)}
          subValue="Porsi piutang lancar (belum jatuh tempo)"
          icon={<CheckCircle2 size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="Total Piutang Overdue (Top 20)"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.top20_overdue_ar)}
          subValue="Porsi piutang melewati jatuh tempo"
          icon={<AlertOctagon size={18} />}
          color="danger"
        />
        <FinanceKpiCard
          label="Kategori Top Performance vs Critical"
          value={
            isLoading || !summary
              ? "..."
              : `${summary.top_performance_count} Top / ${summary.critical_count} Critical`
          }
          subValue={`${summary?.watchlist_count || 0} customer dalam Watchlist`}
          icon={<Layers size={18} />}
          color="warning"
        />
      </div>

      {/* Bar Chart Top 10 AR: Current vs Overdue */}
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
            Komposisi Piutang Current vs Overdue (10 Customer Terbesar)
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Perbandingan langsung saldo piutang lancar (hijau) terhadap piutang tertunggak (merah)
          </p>
        </div>
        <div style={{ width: "100%", height: 270 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
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
              <Bar dataKey="Current" name="Piutang Current" stackId="a" fill="#10B981" />
              <Bar dataKey="Overdue" name="Piutang Overdue" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Kategori */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: `Semua Top 20 (${items.length})` },
            {
              key: "TOP_PERFORMANCE",
              label: `Top Performance (${items.filter((x) => x.category === "TOP_PERFORMANCE").length})`,
              color: "#10B981",
            },
            {
              key: "WATCHLIST",
              label: `Watchlist (${items.filter((x) => x.category === "WATCHLIST").length})`,
              color: "#F59E0B",
            },
            {
              key: "CRITICAL",
              label: `Critical Overdue (${items.filter((x) => x.category === "CRITICAL").length})`,
              color: "#EF4444",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: activeCategory === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
                background: activeCategory === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
                color: activeCategory === tab.key ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {tab.color && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: activeCategory === tab.key ? "#fff" : tab.color,
                  }}
                />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        searchPlaceholder="Cari nama customer, kode pelanggan, atau Account Manager..."
      />
    </div>
  );
}

