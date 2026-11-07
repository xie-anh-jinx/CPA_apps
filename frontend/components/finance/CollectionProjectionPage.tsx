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
  CalendarClock,
  CheckCircle2,
  Target,
  TrendingUp,
  Check,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { CollectionProjectionItem, CollectionProjectionResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort } from "@/lib/finance-utils";

export default function CollectionProjectionPage() {
  const [resData, setResData] = useState<CollectionProjectionResponse | null>(null);
  const [confirmFilter, setConfirmFilter] = useState<string>("ALL");
  const [scope, setScope] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getCollectionProjection({
        scope,
        confirm_filter: confirmFilter,
      });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Collection Projection:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [scope, confirmFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmStatus = async (item: CollectionProjectionItem, newStatus: string) => {
    try {
      setSavingInvoice(item.no_penjualan);
      await apiFinance.confirmCollectionInvoice({
        no_penjualan: item.no_penjualan,
        id_customer: item.id_customer,
        confirm_status: newStatus,
        promised_date: item.promised_date,
        confirmed_amount: item.outstanding,
        notes: `Dikonfirmasi sebagai ${newStatus} pada dashboard Collection Projection`,
      });
      await fetchData();
    } catch (err) {
      console.error("Gagal menyimpan konfirmasi:", err);
    } finally {
      setSavingInvoice(null);
    }
  };

  const summary = resData?.summary;
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<CollectionProjectionItem>[]>(
    () => [
      {
        accessorKey: "no_penjualan",
        header: "No. Invoice & Target Minggu",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>{row.original.no_penjualan}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Target: <strong>{row.original.target_week}</strong> • Janji Bayar: {row.original.promised_date}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer & AM",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              AM: {row.original.nama_sales} • Cabang {row.original.id_kantor}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "days_overdue",
        header: "Hari Overdue",
        cell: ({ row }) => {
          const d = row.original.days_overdue;
          const color = d <= 0 ? "#10B981" : d <= 30 ? "#F59E0B" : "#EF4444";
          return (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.74rem",
                background: `${color}1A`,
                color,
              }}
            >
              {d <= 0 ? `Current (${Math.abs(d)} hr)` : `OD +${d} Hari`}
            </span>
          );
        },
      },
      {
        accessorKey: "outstanding",
        header: "Nilai Tagihan (OS)",
        cell: ({ row }) => (
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {formatRupiah(row.original.outstanding)}
          </span>
        ),
      },
      {
        accessorKey: "projected_collection",
        header: "Proyeksi Tertimbang",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "#10B981" }}>
              {formatRupiah(row.original.projected_collection)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Probabilitas: {row.original.probability_pct}%
            </div>
          </div>
        ),
      },
      {
        accessorKey: "confirm_status",
        header: "Status Confirm Customer",
        cell: ({ row }) => {
          const st = row.original.confirm_status;
          const color =
            st === "CONFIRMED"
              ? "#10B981"
              : st === "PROMISED"
              ? "#0D99FF"
              : st === "FOLLOW_UP"
              ? "#F59E0B"
              : "#64748B";
          return (
            <div>
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: `${color}20`,
                  color,
                }}
              >
                {st}
              </span>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 3, maxWidth: 210 }}>
                {row.original.notes}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Update Konfirmasi",
        cell: ({ row }) => {
          const inv = row.original.no_penjualan;
          const isSaving = savingInvoice === inv;
          return (
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                disabled={isSaving || row.original.confirm_status === "CONFIRMED"}
                onClick={() => handleConfirmStatus(row.original, "CONFIRMED")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(16,185,129,0.4)",
                  background: "rgba(16,185,129,0.12)",
                  color: "#10B981",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Check size={12} />
                <span>Confirm</span>
              </button>
              <button
                disabled={isSaving || row.original.confirm_status === "PROMISED"}
                onClick={() => handleConfirmStatus(row.original, "PROMISED")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(13,153,255,0.4)",
                  background: "rgba(13,153,255,0.12)",
                  color: "#0D99FF",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Janji Bayar
              </button>
            </div>
          );
        },
      },
    ],
    [savingInvoice]
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="COLLECTION PROJECTION (Weekly & Monthly)"
        subtitle="Target collection weekly dan monthly — Berdasarkan konfirmasi customer (Promise to Pay) dan hari overdue"
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
          label="Total Open AR Dianalisis"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_open_ar_analyzed)}
          subValue="Basis proyeksi tagihan berjalan"
          icon={<Target size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Terkonfirmasi Customer (Confirmed)"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_confirmed_collection)}
          subValue={`${summary?.confirmed_invoice_count || 0} faktur sudah janji bayar`}
          icon={<CheckCircle2 size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="Target Proyeksi Weekly (W1 - W4)"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.weekly_target_total)}
          subValue="Akumulasi target 4 minggu ke depan"
          icon={<CalendarClock size={18} />}
          color="cyan"
        />
        <FinanceKpiCard
          label="Target Proyeksi Monthly (Bulan Ini)"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.monthly_target_m1)}
          subValue="Berdasarkan confirm customer & overdue"
          icon={<TrendingUp size={18} />}
          color="warning"
        />
      </div>

      {/* Dual Charts: Weekly Target vs Monthly Target */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Chart 1: Weekly Projection */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Weekly Collection Projection (Target Mingguan W1 - W4)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Komposisi tagihan Confirmed Customer vs Proyeksi berdasarkan Hari Overdue
            </p>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={resData?.weekly_projection || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
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
                <Bar dataKey="confirmed" name="Confirmed / Janji Bayar" stackId="a" fill="#10B981" />
                <Bar dataKey="projected_overdue" name="Proyeksi Umur Overdue" stackId="a" fill="#0D99FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Projection */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Monthly Collection Projection (3 Bulan Ke Depan)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Target penerimaan kas bulanan berdasarkan jadwal jatuh tempo dan konfirmasi pelanggan
            </p>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={resData?.monthly_projection || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
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
                <Bar dataKey="confirmed" name="Confirmed Customer" stackId="a" fill="#10B981" />
                <Bar dataKey="projected_unconfirmed" name="Proyeksi Overdue & TOP" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter Status Konfirmasi */}
      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          { key: "ALL", label: "Semua Proyeksi Faktur" },
          { key: "CONFIRMED", label: "Confirmed (Sudah Konfirmasi)", color: "#10B981" },
          { key: "PROMISED", label: "Promised (Janji Tanggal Bayar)", color: "#0D99FF" },
          { key: "FOLLOW_UP", label: "Follow-Up Intensif (Overdue)", color: "#F59E0B" },
          { key: "UNCONFIRMED", label: "Belum Konfirmasi (Sesuai TOP)", color: "#64748B" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setConfirmFilter(tab.key)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              border: confirmFilter === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
              background: confirmFilter === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
              color: confirmFilter === tab.key ? "#fff" : "var(--text-secondary)",
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
                  background: confirmFilter === tab.key ? "#fff" : tab.color,
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
        searchPlaceholder="Cari nomor invoice, nama customer, atau Account Manager..."
      />
    </div>
  );
}

