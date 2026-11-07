"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  PackageSearch,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileWarning,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { GoodsInTransitItem, GoodsInTransitResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort, formatNumber } from "@/lib/finance-utils";

export default function GoodsInTransitPage() {
  const [resData, setResData] = useState<GoodsInTransitResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getGoodsInTransit({
        status: statusFilter,
        limit: 150,
      });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat Goods in Transit:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = resData?.summary;
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<GoodsInTransitItem>[]>(
    () => [
      {
        accessorKey: "no_do",
        header: "No. DO / Surat Jalan",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>{row.original.no_do}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Keluar: {row.original.tgl_keluar_gudang} • SO: {row.original.no_so}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer & Gudang Asal",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Gudang: {row.original.nama_gudang} • Sales: {row.original.nama_sales}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "ringkasan_barang",
        header: "Rincian Barang Dikirim",
        cell: ({ row }) => (
          <div style={{ maxWidth: 260 }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {row.original.ringkasan_barang}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Total Qty: {formatNumber(row.original.total_qty)} ({row.original.jumlah_item} item) • {row.original.ekspedisi}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "estimasi_nilai",
        header: "Estimasi Nilai Belum Invoice",
        cell: ({ row }) => (
          <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
            {formatRupiah(row.original.estimasi_nilai)}
          </span>
        ),
      },
      {
        accessorKey: "do_status",
        header: "Status Pengiriman",
        cell: ({ row }) => {
          const st = row.original.do_status;
          const color = st === "R" ? "#F59E0B" : st === "S" ? "#0D99FF" : "#8B5CF6";
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
                  display: "inline-block",
                }}
              >
                {row.original.status_label}
              </span>
              {row.original.received_date && (
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                  Diterima: {row.original.received_date} ({row.original.received_name || "Customer"})
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "days_unbilled",
        header: "Umur Belum Invoice",
        cell: ({ row }) => {
          const d = row.original.days_unbilled;
          const color = d > 14 ? "#EF4444" : d > 7 ? "#F59E0B" : "#10B981";
          return (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.75rem",
                background: `${color}1A`,
                color,
              }}
            >
              {d} Hari
            </span>
          );
        },
      },
      {
        accessorKey: "recommended_action",
        header: "Tindak Lanjut Billing / AR",
        cell: ({ row }) => (
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", maxWidth: 260, lineHeight: 1.35 }}>
            {row.original.recommended_action}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="GOODS IN TRANSIT TRACKING"
        subtitle="Monitoring barang yang sudah keluar dari gudang atau dikirim ke customer, tetapi belum diterbitkan invoice"
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
          label="Total DO Belum Terbit Invoice"
          value={isLoading || !summary ? "..." : `${summary.total_git_do} DO`}
          subValue="Surat jalan keluar gudang tanpa faktur"
          icon={<PackageSearch size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Estimasi Nilai Potensi Piutang"
          value={isLoading || !summary ? "..." : formatRupiahShort(summary.total_estimasi_nilai)}
          subValue="Nilai barang yang siap ditagihkan (Unbilled)"
          icon={<FileWarning size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="In Transit (Dalam Perjalanan)"
          value={isLoading || !summary ? "..." : `${summary.in_transit_count} DO`}
          subValue="Status S — Menunggu konfirmasi tiba"
          icon={<Truck size={18} />}
          color="cyan"
        />
        <FinanceKpiCard
          label="Sudah Diterima — Belum Invoice"
          value={isLoading || !summary ? "..." : `${summary.received_unbilled_count} DO`}
          subValue="Status R — Wajib segera terbitkan Invoice!"
          icon={<AlertTriangle size={18} />}
          color="danger"
        />
      </div>

      {/* Filter Status DO */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          { key: "ALL", label: "Semua DO Belum Invoice" },
          { key: "R", label: "Sudah Diterima Customer — Belum Invoice (Status R)", color: "#F59E0B" },
          { key: "S", label: "Sedang Dikirim / In Transit (Status S)", color: "#0D99FF" },
          { key: "D", label: "Keluar Gudang / Stuffing (Status D)", color: "#8B5CF6" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: statusFilter === tab.key ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
              background: statusFilter === tab.key ? "var(--color-primary)" : "var(--bg-surface)",
              color: statusFilter === tab.key ? "#fff" : "var(--text-secondary)",
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
                  background: statusFilter === tab.key ? "#fff" : tab.color,
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
        searchPlaceholder="Cari nomor DO, nomor SO, nama customer, atau ekspedisi..."
      />
    </div>
  );
}

