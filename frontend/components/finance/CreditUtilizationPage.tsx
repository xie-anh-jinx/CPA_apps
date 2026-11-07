"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Gauge,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  Ban,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { CreditUtilizationItem, CreditUtilizationResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function CreditUtilizationPage() {
  const [resData, setResData] = useState<CreditUtilizationResponse | null>(null);
  const [policyFilter, setPolicyFilter] = useState<string>("ALL");
  const [scope, setScope] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getCreditUtilization({
        policy_filter: policyFilter,
        scope,
        limit: 150,
      });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Credit Limit Utilization:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [policyFilter, scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = resData?.summary;
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<CreditUtilizationItem>[]>(
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
        accessorKey: "credit_limit",
        header: "Plafon Kredit (Limit)",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {formatRupiah(row.original.credit_limit)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {row.original.is_Contract_limit ? "Plafon Kontrak Master" : "Plafon Evaluasi Historis"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "total_os",
        header: "Total OS & Overdue",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
              {formatRupiah(row.original.total_os)}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: row.original.overdue_os > 0 ? "#EF4444" : "#10B981",
                fontWeight: 600,
              }}
            >
              Overdue: {formatRupiahShort(row.original.overdue_os)} ({row.original.max_days_overdue} hr)
            </div>
          </div>
        ),
      },
      {
        accessorKey: "utilization_pct",
        header: "Utilisasi Kredit (%)",
        cell: ({ row }) => {
          const pct = row.original.utilization_pct;
          const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#10B981";
          return (
            <div style={{ minWidth: 130 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color, fontSize: "0.78rem" }}>
                <span>{pct}%</span>
                <span style={{ fontSize: "0.68rem" }}>
                  {pct >= 100 ? "OVER LIMIT" : pct >= 80 ? "WARNING >=80%" : "Normal"}
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
      {
        accessorKey: "policy_status",
        header: "Status Kebijakan Kredit",
        cell: ({ row }) => {
          const st = row.original.policy_status;
          const color =
            st === "CREDIT_HOLD_90"
              ? "#DC2626"
              : st === "OVER_LIMIT"
              ? "#EF4444"
              : st === "CREDIT_REVIEW_60"
              ? "#EA580C"
              : st === "WARNING_80"
              ? "#F59E0B"
              : "#10B981";
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
              {row.original.policy_label}
            </span>
          );
        },
      },
      {
        accessorKey: "policy_recommendation",
        header: "Rekomendasi Kebijakan",
        cell: ({ row }) => (
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", maxWidth: 270, lineHeight: 1.35 }}>
            {row.original.policy_recommendation}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="CREDIT LIMIT UTILIZATION"
        subtitle="Mengukur penggunaan fasilitas kredit: Utilisasi ≥80% Warning, ≥100% Over Limit, Overdue >60 hari Credit Review, Overdue >90 hari pertimbangkan Credit Hold"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Policy Banner */}
      <div
        style={{
          marginBottom: "1.25rem",
          padding: "0.85rem 1.15rem",
          borderRadius: "10px",
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "0.75rem",
          fontSize: "0.76rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
          <span>
            <strong>Utilisasi ≥ 80%:</strong> Warning (Pantau PO baru)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
          <span>
            <strong>Utilisasi ≥ 100%:</strong> Over Limit (Tahan / Naik Plafon)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EA580C", flexShrink: 0 }} />
          <span>
            <strong>Overdue &gt; 60 Hari:</strong> Wajib Credit Review
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
          <span>
            <strong>Overdue &gt; 90 Hari:</strong> Pertimbangkan Credit Hold
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <FinanceKpiCard
          label="Utilisasi Kredit >= 80% (Warning)"
          value={isLoading || !summary ? "..." : `${summary.warning_80_count} Customer`}
          subValue="Mendekati plafon kredit (80% - 99%)"
          icon={<AlertTriangle size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="Utilisasi Kredit >= 100% (Over Limit)"
          value={isLoading || !summary ? "..." : `${summary.over_limit_count} Customer`}
          subValue="Melampaui batas plafon kredit"
          icon={<AlertOctagon size={18} />}
          color="danger"
        />
        <FinanceKpiCard
          label="Overdue > 60 Hari (Credit Review)"
          value={isLoading || !summary ? "..." : `${summary.credit_review_60_count} Customer`}
          subValue="Wajib evaluasi ulang kelayakan kredit"
          icon={<ShieldAlert size={18} />}
          color="purple"
        />
        <FinanceKpiCard
          label="Overdue > 90 Hari (Credit Hold)"
          value={isLoading || !summary ? "..." : `${summary.credit_hold_90_count} Customer`}
          subValue="Pertimbangkan Credit Hold sesuai kebijakan"
          icon={<Ban size={18} />}
          color="danger"
        />
        <FinanceKpiCard
          label="Rata-Rata Utilisasi Kredit"
          value={isLoading || !summary ? "..." : `${summary.overall_utilization_pct}%`}
          subValue={`${summary?.normal_count || 0} customer berstatus sehat`}
          icon={<Gauge size={18} />}
          color="success"
        />
      </div>

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          { key: "ALL", label: `Semua Customer (${summary?.total_customers_evaluated || 0})` },
          { key: "WARNING_80", label: `Warning ≥80% (${summary?.warning_80_count || 0})`, color: "#F59E0B" },
          { key: "OVER_LIMIT", label: `Over Limit ≥100% (${summary?.over_limit_count || 0})`, color: "#EF4444" },
          { key: "CREDIT_REVIEW_60", label: `Credit Review >60 Hr (${summary?.credit_review_60_count || 0})`, color: "#EA580C" },
          { key: "CREDIT_HOLD_90", label: `Credit Hold >90 Hr (${summary?.credit_hold_90_count || 0})`, color: "#DC2626" },
          { key: "NORMAL", label: `Normal / Sehat (${summary?.normal_count || 0})`, color: "#10B981" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPolicyFilter(tab.key)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              border: policyFilter === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
              background: policyFilter === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
              color: policyFilter === tab.key ? "#fff" : "var(--text-secondary)",
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
                  background: policyFilter === tab.key ? "#fff" : tab.color,
                }}
              />
            )}
            <span>{tab.label}</span>
          </button>
        ))}
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

