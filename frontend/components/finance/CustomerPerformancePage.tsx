"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  UserCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Gift,
  ArrowRight,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { CustomerPerformanceItem, CustomerPerformanceResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function CustomerPerformancePage() {
  const [resData, setResData] = useState<CustomerPerformanceResponse | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [incentiveOnly, setIncentiveOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getCustomerPerformance({
        tier: tierFilter,
        incentive_only: incentiveOnly,
        limit: 150,
      });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Customer Performance:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tierFilter, incentiveOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = resData?.summary;
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<CustomerPerformanceItem>[]>(
    () => [
      {
        accessorKey: "nama_customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              ID: {row.original.id_customer} • Cabang {row.original.id_kantor} • TOP {row.original.top_days} Hr
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
        accessorKey: "avg_payment_days",
        header: "Average Payment Days",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
              {row.original.avg_payment_days} Hari
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Standar TOP: {row.original.top_days} Hari ({row.original.paid_invoices} faktur lunas)
            </div>
          </div>
        ),
      },
      {
        accessorKey: "avg_overdue_days",
        header: "Rata-Rata Overdue Days",
        cell: ({ row }) => {
          const od = row.original.avg_overdue_days;
          const color = od <= 0 ? "#10B981" : od <= 30 ? "#0D99FF" : od <= 60 ? "#F59E0B" : "#EF4444";
          return (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "0.75rem",
                background: `${color}1A`,
                color,
              }}
            >
              {od <= 0 ? `${od} Hari (On-Time)` : `+${od} Hari Overdue`}
            </span>
          );
        },
      },
      {
        accessorKey: "performance_tier",
        header: "Kategori Payment Customer",
        cell: ({ row }) => {
          const t = row.original.performance_tier;
          const color =
            t === "EXCELLENT"
              ? "#10B981"
              : t === "GOOD"
              ? "#0D99FF"
              : t === "HIGH_RISK"
              ? "#F59E0B"
              : "#EF4444";
          return (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 800,
                background: `${color}20`,
                color,
                display: "inline-block",
              }}
            >
              {row.original.performance_label}
            </span>
          );
        },
      },
      {
        accessorKey: "incentive_program",
        header: "Status Daftar Insentif Customer",
        cell: ({ row }) => (
          <div style={{ maxWidth: 270 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.76rem",
                color: row.original.incentive_eligible ? "#10B981" : "#EF4444",
              }}
            >
              {row.original.incentive_eligible
                ? `✅ Eligible Insentif (${row.original.incentive_rate_pct}% — Est. ${formatRupiahShort(
                    row.original.estimated_incentive_rp
                  )})`
                : "⛔ Tidak Masuk Daftar Insentif"}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
              {row.original.incentive_program}
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
        title="CUSTOMER PERFORMANCE & DAFTAR INSENTIF"
        subtitle="Range payment customer berdasarkan Average Payment Days: ≤0d Overdue (Excellent), 1-30d (Good), 31-60d (High Risk), >60d (Critical) ← Daftar Insentif Customer"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/*KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <FinanceKpiCard
          label="<= 0 Days Overdue (Excellent)"
          value={isLoading || !summary ? "..." : `${summary.excellent_count} Customer`}
          subValue="Prioritas Utama Daftar Insentif (Platinum)"
          icon={<Award size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="1 - 30 Days Overdue (Good)"
          value={isLoading || !summary ? "..." : `${summary.good_count} Customer`}
          subValue="Eligible Daftar Insentif Reguler (Gold)"
          icon={<CheckCircle2 size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="31 - 60 Days Overdue (High Risk)"
          value={isLoading || !summary ? "..." : `${summary.high_risk_count} Customer`}
          subValue="Insentif ditangguhkan sementara"
          icon={<AlertTriangle size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="> 60 Days Overdue (Critical)"
          value={isLoading || !summary ? "..." : `${summary.critical_count} Customer`}
          subValue="Tidak berhak insentif & evaluasi TOP"
          icon={<AlertOctagon size={18} />}
          color="danger"
        />
        <FinanceKpiCard
          label="Estimasi Pool Insentif Customer"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_estimated_incentive_pool)}
          subValue={`${summary?.incentive_eligible_count || 0} customer masuk daftar insentif`}
          icon={<Gift size={18} />}
          color="purple"
        />
      </div>

      {/* Filter & Toggle Daftar Insentif */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: `Semua Customer (${summary?.total_evaluated || 0})` },
            { key: "EXCELLENT", label: `≤ 0d Excellent (${summary?.excellent_count || 0})`, color: "#10B981" },
            { key: "GOOD", label: `1-30d Good (${summary?.good_count || 0})`, color: "#0D99FF" },
            { key: "HIGH_RISK", label: `31-60d High Risk (${summary?.high_risk_count || 0})`, color: "#F59E0B" },
            { key: "CRITICAL", label: `> 60d Critical (${summary?.critical_count || 0})`, color: "#EF4444" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTierFilter(tab.key)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: tierFilter === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
                background: tierFilter === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
                color: tierFilter === tab.key ? "#fff" : "var(--text-secondary)",
                fontSize: "0.78rem",
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
                    background: tierFilter === tab.key ? "#fff" : tab.color,
                  }}
                />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => setIncentiveOnly((prev) => !prev)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: incentiveOnly ? "1px solid #10B981" : "1px solid var(--bg-border)",
              background: incentiveOnly ? "rgba(16,185,129,0.15)" : "var(--bg-surface)",
              color: incentiveOnly ? "#10B981" : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {incentiveOnly ? "✓ Menampilkan Daftar Insentif Customer Saja" : "Filter: Daftar Insentif Customer (Eligible)"}
          </button>

          <Link
            href="/finance/ar-summary/icu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Gift size={14} />
            <span>Buka Pengajuan ICU</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Cari nama customer, kode pelanggan, atau Account Manager..."
      />
    </div>
  );
}

