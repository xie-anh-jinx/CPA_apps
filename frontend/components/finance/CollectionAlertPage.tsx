"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  BellRing,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  PhoneCall,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { CollectionAlertItem, CollectionAlertResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function CollectionAlertPage() {
  const [resData, setResData] = useState<CollectionAlertResponse | null>(null);
  const [activeBucket, setActiveBucket] = useState<string>("ALL");
  const [scope, setScope] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getCollectionAlerts({
        bucket: activeBucket,
        scope,
        limit: 200,
      });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Collection Alert:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeBucket, scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const bSum = resData?.bucket_summary || {};
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<CollectionAlertItem>[]>(
    () => [
      {
        accessorKey: "no_penjualan",
        header: "No. Invoice / Faktur",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>{row.original.no_penjualan}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Tgl: {row.original.invoice_date} • TOP: {row.original.top_days} Hr
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <PhoneCall size={11} />
              <span>{row.original.telepon || "-"} • Cabang {row.original.id_kantor}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_sales",
        header: "Account Manager",
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {row.original.nama_sales}
          </span>
        ),
      },
      {
        accessorKey: "due_date",
        header: "Jatuh Tempo",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.due_date}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {row.original.days_overdue < 0
                ? `${Math.abs(row.original.days_overdue)} hari lagi`
                : row.original.days_overdue === 0
                ? "Jatuh tempo hari ini!"
                : `Lewat ${row.original.days_overdue} hari`}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "outstanding",
        header: "Sisa Tagihan (OS)",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
              {formatRupiah(row.original.outstanding)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Dari total {formatRupiahShort(row.original.nominal_invoice)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "bucket_code",
        header: "Status Aging Alert",
        cell: ({ row }) => {
          const u = row.original.urgency;
          const color =
            u === "CRITICAL"
              ? "#DC2626"
              : u === "HIGH"
              ? "#EA580C"
              : u === "WARNING"
              ? "#D97706"
              : "#0284C7";
          return (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "0.73rem",
                background: `${color}20`,
                color: color,
                display: "inline-block",
              }}
            >
              {row.original.bucket_label}
            </span>
          );
        },
      },
      {
        accessorKey: "recommended_action",
        header: "Tindakan Segera (Action Plan)",
        cell: ({ row }) => (
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", maxWidth: 290, lineHeight: 1.35 }}>
            {row.original.recommended_action}
          </div>
        ),
      },
    ],
    []
  );

  const upcomingAmt = bSum.UPCOMING_7D?.amount || 0;
  const dueTodayAmt = bSum.DUE_TODAY?.amount || 0;
  const od1_30Amt = bSum.OD_1_30?.amount || 0;
  const od31_60Amt = bSum.OD_31_60?.amount || 0;
  const odGt60Amt = (bSum.OD_61_90?.amount || 0) + (bSum.OD_GT_90?.amount || 0);

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="COLLECTION ALERT"
        subtitle="Daftar invoice yang memerlukan tindakan penagihan segera — Upcoming Overdue (7 hari ke depan), Due Today, OD 1-30, OD 31-60, dst."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

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
          label="Upcoming Overdue (7 Hari Kedepan)"
          value={isLoading ? "..." : formatRupiahShort(upcomingAmt)}
          subValue={`${bSum.UPCOMING_7D?.count || 0} invoice jatuh tempo H-7 s/d H-1`}
          icon={<Calendar size={18} />}
          color="cyan"
        />
        <FinanceKpiCard
          label="Due Today (Jatuh Tempo Hari Ini)"
          value={isLoading ? "..." : formatRupiahShort(dueTodayAmt)}
          subValue={`${bSum.DUE_TODAY?.count || 0} invoice wajib cair hari ini`}
          icon={<BellRing size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="Overdue 1 - 30 Hari"
          value={isLoading ? "..." : formatRupiahShort(od1_30Amt)}
          subValue={`${bSum.OD_1_30?.count || 0} invoice lewat jatuh tempo awal`}
          icon={<Clock size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Overdue 31 - 60 Hari"
          value={isLoading ? "..." : formatRupiahShort(od31_60Amt)}
          subValue={`${bSum.OD_31_60?.count || 0} invoice butuh Surat Peringatan`}
          icon={<AlertTriangle size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="Overdue > 60 Hari (61-90 & >90)"
          value={isLoading ? "..." : formatRupiahShort(odGt60Amt)}
          subValue={`${(bSum.OD_61_90?.count || 0) + (bSum.OD_GT_90?.count || 0)} invoice eskalasi Credit Hold`}
          icon={<AlertOctagon size={18} />}
          color="danger"
        />
      </div>

      {/* Filter Bucket Pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        {[
          { key: "ALL", label: `Semua Alert (${resData?.total_alerts || 0})` },
          { key: "UPCOMING_7D", label: `Upcoming 7 Hari (${bSum.UPCOMING_7D?.count || 0})`, color: "#0284C7" },
          { key: "DUE_TODAY", label: `Due Today (${bSum.DUE_TODAY?.count || 0})`, color: "#F59E0B" },
          { key: "OD_1_30", label: `OD 1-30 Hari (${bSum.OD_1_30?.count || 0})`, color: "#FB923C" },
          { key: "OD_31_60", label: `OD 31-60 Hari (${bSum.OD_31_60?.count || 0})`, color: "#F97316" },
          { key: "OD_61_90", label: `OD 61-90 Hari (${bSum.OD_61_90?.count || 0})`, color: "#EF4444" },
          { key: "OD_GT_90", label: `OD > 90 Hari (${bSum.OD_GT_90?.count || 0})`, color: "#DC2626" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveBucket(tab.key)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              border: activeBucket === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
              background: activeBucket === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
              color: activeBucket === tab.key ? "#ffffff" : "var(--text-secondary)",
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
                  background: activeBucket === tab.key ? "#fff" : tab.color,
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
        searchPlaceholder="Cari nomor invoice, customer, atau Account Manager..."
      />
    </div>
  );
}

