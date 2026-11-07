"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Check,
  X,
  Banknote,
} from "lucide-react";
import FinanceHeader from "./common/FinanceHeader";
import FinanceKpiCard from "./common/FinanceKpiCard";
import DataTable from "./common/DataTable";
import { apiFinance } from "@/lib/finance-api";
import { IcuSubmissionItem, IcuResponse } from "@/types/finance";
import { formatRupiah, formatRupiahShort, formatNumber } from "@/lib/finance-utils";

export default function IcuIncentivePage() {
  const [resData, setResData] = useState<IcuResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    id_customer: "01000715",
    nama_customer: "LAYANAN PEMELIHARAAN INTEGRASI, PT",
    no_invoice: "4791/INV/CPA/X/2026",
    nama_barang: "Spirax S2 A 80W-90 (Drum 209L)",
    qty: 50,
    bottom_price: 8300000,
    harga_invoice: 9175000,
    tarif_icu_per_unit: 250000,
    ongkos_kirim: 500000,
    penerima_insentif: "Bpk. Hendra (Purchasing Manager)",
    bank_penerima: "Bank Mandiri",
    nomor_rekening: "149-00-9918271-2",
    nama_rekening: "Hendra Wijaya",
    nama_salesman: "Judgeifa Kezia Sumakul",
    catatan_pengajuan: "Pengajuan insentif pelunasan tepat waktu pembelian 50 drum pelumas",
  });

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiFinance.getIcuSubmissions({ status: statusFilter });
      setResData(res);
    } catch (err) {
      console.error("Gagal memuat pengajuan ICU:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: number, action: "APPROVE" | "REJECT" | "MARK_PAID") => {
    try {
      setProcessingId(id);
      await apiFinance.updateIcuApproval(id, {
        action,
        approver_name: "Finance & Accounting Manager",
      });
      await fetchData();
    } catch (err) {
      console.error("Gagal memproses approval ICU:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFinance.createIcuSubmission(form);
      setShowCreateModal(false);
      await fetchData();
    } catch (err) {
      console.error("Gagal membuat pengajuan ICU:", err);
    }
  };

  const summary = resData?.summary;
  const items = resData?.items || [];

  const columns = useMemo<ColumnDef<IcuSubmissionItem>[]>(
    () => [
      {
        accessorKey: "nomor_icu",
        header: "No. Pengajuan ICU & Invoice",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "var(--color-primary)" }}>{row.original.nomor_icu}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Tgl: {row.original.tanggal_pengajuan} • Faktur: <strong>{row.original.no_invoice}</strong>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_customer",
        header: "Customer & Sales",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.nama_customer}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Sales: {row.original.nama_salesman} • Umur Bayar: {row.original.umur_piutang_hari} Hr
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nama_barang",
        header: "Produk & Perhitungan Margin",
        cell: ({ row }) => (
          <div style={{ maxWidth: 250 }}>
            <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--text-primary)" }}>
              {row.original.nama_barang} ({formatNumber(row.original.qty)} unit)
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Bottom: {formatRupiahShort(row.original.bottom_price)} | Inv: {formatRupiahShort(row.original.harga_invoice)} | ICU/u:{" "}
              {formatRupiahShort(row.original.tarif_icu_per_unit)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "total_insentif_net",
        header: "Total Insentif Net (Rp)",
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 800, color: "#10B981", fontSize: "0.86rem" }}>
              {formatRupiah(row.original.total_insentif_net)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Pot. PPh: {formatRupiahShort(row.original.potongan_pph)} • Ongkir: {formatRupiahShort(row.original.ongkos_kirim)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "penerima_insentif",
        header: "Rekening Penerima",
        cell: ({ row }) => (
          <div style={{ fontSize: "0.73rem" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.original.penerima_insentif}</div>
            <div style={{ color: "var(--text-muted)" }}>
              {row.original.bank_penerima} — {row.original.nomor_rekening}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status_approval",
        header: "Status Approval & Tindak Lanjut",
        cell: ({ row }) => {
          const st = row.original.status_approval;
          const color =
            st === "PAID"
              ? "#10B981"
              : st === "APPROVED"
              ? "#0D99FF"
              : st === "REJECTED"
              ? "#EF4444"
              : "#F59E0B";
          return (
            <div style={{ maxWidth: 250 }}>
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  background: `${color}20`,
                  color,
                  display: "inline-block",
                }}
              >
                {st} ({row.original.current_approver_role})
              </span>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.3 }}>
                {row.original.tindak_lanjut}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Tindakan Approval",
        cell: ({ row }) => {
          const st = row.original.status_approval;
          const id = row.original.id;
          const busy = processingId === id;

          if (st === "PAID" || st === "REJECTED") {
            return (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Selesai ({row.original.approved_by || "System"})
              </span>
            );
          }

          return (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {st !== "APPROVED" && (
                <button
                  disabled={busy}
                  onClick={() => handleAction(id, "APPROVE")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(16,185,129,0.4)",
                    background: "rgba(16,185,129,0.15)",
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
                  <span>Approve</span>
                </button>
              )}
              {st === "APPROVED" && (
                <button
                  disabled={busy}
                  onClick={() => handleAction(id, "MARK_PAID")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(13,153,255,0.4)",
                    background: "rgba(13,153,255,0.15)",
                    color: "#0D99FF",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Banknote size={12} />
                  <span>Cairkan (Paid)</span>
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => handleAction(id, "REJECT")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.12)",
                  color: "#EF4444",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <X size={12} />
                <span>Tolak</span>
              </button>
            </div>
          );
        },
      },
    ],
    [processingId]
  );

  return (
    <div className="main-content" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <FinanceHeader
        title="ICU (Pengajuan Incentive Customer)"
        subtitle="Monitoring pengajuan Incentive Customer (ICU) yang masih membutuhkan approval berjenjang dan tindak lanjut pencairan"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {resData?.data_gap && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1.15rem",
            borderRadius: "10px",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: "#F59E0B" }}>Status Tabel Produksi (Data Gap Notice):</strong> {resData.data_gap}
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
          label="Menunggu Approval (Pending)"
          value={isLoading || !summary ? "..." : `${summary.pending_approval_count} Pengajuan`}
          subValue={summary ? `Nilai: ${formatRupiahShort(summary.pending_approval_amount)}` : ""}
          icon={<Clock size={18} />}
          color="warning"
        />
        <FinanceKpiCard
          label="Disetujui — Siap Cair (Approved)"
          value={isLoading || !summary ? "..." : `${summary.approved_waiting_disbursement_count} Pengajuan`}
          subValue={summary ? `Siap transfer: ${formatRupiahShort(summary.approved_waiting_disbursement_amount)}` : ""}
          icon={<CheckCircle2 size={18} />}
          color="primary"
        />
        <FinanceKpiCard
          label="Sudah Dicairkan (Paid)"
          value={isLoading || !summary ? "..." : `${summary.paid_count} Pengajuan`}
          subValue={summary ? `Realisasi cair: ${formatRupiahShort(summary.paid_amount)}` : ""}
          icon={<Gift size={18} />}
          color="success"
        />
        <FinanceKpiCard
          label="Ditolak / Tidak Memenuhi Syarat"
          value={isLoading || !summary ? "..." : `${summary.rejected_count} Pengajuan`}
          subValue={`Dari total ${summary?.total_submissions || 0} pengajuan ICU`}
          icon={<XCircle size={18} />}
          color="danger"
        />
      </div>

      {/* Filter & Tombol Buat Pengajuan */}
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
            { key: "ALL", label: `Semua Pengajuan (${summary?.total_submissions || 0})` },
            {
              key: "NEED_ACTION",
              label: `Butuh Approval & Tindak Lanjut (${
                (summary?.pending_approval_count || 0) + (summary?.approved_waiting_disbursement_count || 0)
              })`,
              color: "#F59E0B",
            },
            { key: "PENDING_FINANCE", label: "Pending Finance Manager", color: "#EA580C" },
            { key: "PENDING_MANAGER", label: "Pending Sales Manager", color: "#F59E0B" },
            { key: "APPROVED", label: "Approved (Siap Transfer)", color: "#0D99FF" },
            { key: "PAID", label: "Paid (Sudah Cair)", color: "#10B981" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: "0.45rem 0.85rem",
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

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.5rem 0.95rem",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "#ffffff",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <PlusCircle size={15} />
          <span>Buat Pengajuan ICU Baru</span>
        </button>
      </div>

      {/* Modal Form Buat Pengajuan ICU Baru */}
      {showCreateModal && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1.25rem",
            borderRadius: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--color-primary)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Form Pengajuan Insentif Customer (ICU) Baru
            </h3>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              ✕ Tutup
            </button>
          </div>
          <form
            onSubmit={handleCreateSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.85rem",
            }}
          >
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Nama Customer</label>
              <input
                type="text"
                value={form.nama_customer}
                onChange={(e) => setForm({ ...form, nama_customer: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Nomor Invoice Lunas</label>
              <input
                type="text"
                value={form.no_invoice}
                onChange={(e) => setForm({ ...form, no_invoice: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Produk / Barang</label>
              <input
                type="text"
                value={form.nama_barang}
                onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Kuantitas (Qty)</label>
              <input
                type="number"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tarif ICU per Unit (Rp)</label>
              <input
                type="number"
                value={form.tarif_icu_per_unit}
                onChange={(e) => setForm({ ...form, tarif_icu_per_unit: Number(e.target.value) })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Penerima Insentif</label>
              <input
                type="text"
                value={form.penerima_insentif}
                onChange={(e) => setForm({ ...form, penerima_insentif: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: 6,
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="submit"
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Simpan & Ajukan Approval
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Cari nomor ICU, nama customer, nomor invoice, atau sales..."
      />
    </div>
  );
}

