"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiDistributions } from "@/lib/api";
import SupplyChainSimulation from "./SupplyChainSimulation";

interface DistributionSummary {
  total_do: number;
  delivered: number;
  in_transit: number;
  pending: number;
  on_time_delivery_rate: number;
  avg_delivery_days: number;
}

interface DeliveryRecord {
  nomor: string;
  tanggal: string;
  customer_id: string;
  nama_customer: string;
  kota_tujuan: string;
  status: "Draft" | "In Transit" | "Delivered";
  waktu_kirim: string | null;
  waktu_sampai: string | null;
  driver: string;
  plat_nomor: string;
}

interface InternalOrderRecord {
  nomor_io: string;
  tanggal: string;
  nama_kantor: string;
  gudang_asal: string;
  gudang_tujuan: string;
  dibuat_oleh: string;
  send_oleh: string;
  send_by_date?: string | null;
  approve_oleh: string;
  approve_tanggal?: string | null;
  id_ip?: number | string | null;
  status: string;
  order_status?: string | null;
}

interface InternalTransferRecord {
  nomor: string;
  tanggal: string;
  create_date?: string | null;
  tanggal_kirim?: string | null;
  tanggal_terima?: string | null;
  gudang_asal: string;
  gudang_tujuan: string;
  nomor_io?: string | null;
  tgl_io_approve?: string | null;
  receive_note?: string | null;
  status: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  "Draft": { label: "Draft / Pending", cls: "badge-status badge-draft" },
  "In Transit": { label: "In Transit", cls: "badge-status badge-in_transit" },
  "Delivered": { label: "Delivered", cls: "badge-status badge-delivered" },
};

const IO_STATUS_BADGE: Record<string, { label: string; cls: string; desc: string }> = {
  "D": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft" },
  "S": { label: "Send IO", cls: "badge-status badge-info", desc: "Send IO (kontak send)" },
  "K": { label: "Reject send_by", cls: "badge-status badge-danger", desc: "Reject by send_by" },
  "Y": { label: "Reject ST controller", cls: "badge-status badge-danger", desc: "Reject by ST controller" },
  "A": { label: "Approve (final)", cls: "badge-status badge-delivered", desc: "Approve (final)" },
  "R": { label: "Reject (approver)", cls: "badge-status badge-danger", desc: "Reject (approver)" },
  "X": { label: "Cancel", cls: "badge-status badge-void", desc: "Cancel (WHM reject / cancel dialog)" },
  "P": { label: "IT Proses", cls: "badge-status badge-in_transit", desc: "IT Proses" },
  "Z": { label: "IT Partial", cls: "badge-status badge-warning", desc: "IT partial (sisa IO > 0)" },
  "C": { label: "IT Completed", cls: "badge-status badge-delivered", desc: "IT Completed (sisa = 0)" },
};

const IT_STATUS_BADGE: Record<string, { label: string; cls: string; desc: string }> = {
  "D": { label: "Draft", cls: "badge-status badge-draft", desc: "Internal transfer dalam proses input, data masih bisa di revisi" },
  "S": { label: "Send", cls: "badge-status badge-in_transit", desc: "Internal transfer telah di proses, data tidak bisa di revisi, barang keluar dari gudang asal" },
  "R": { label: "Receipt", cls: "badge-status badge-delivered", desc: "Barang telah di receipt di gudang tujuan" },
  "X": { label: "Cancel", cls: "badge-status badge-danger", desc: "Proses Internal transfer di cancel, barang kembali ke gudang asal" },
};

function formatDisplayDate(val?: string | null) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("id-ID");
  } catch {
    return val;
  }
}

export default function DistributionsPage() {
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  
  const [ioItems, setIoItems] = useState<InternalOrderRecord[]>([]);
  const [itItems, setItItems] = useState<InternalTransferRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"DO" | "IO" | "IT" | "SIM">("DO");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "In Transit" | "Delivered">("all");

  // Calendar Date Range Filter & Excel Export States for IO & IT
  const [calendarDateFrom, setCalendarDateFrom] = useState<string>("2024-01-01");
  const [calendarDateTo, setCalendarDateTo] = useState<string>("2024-02-13");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadExcel = async (type: "IO" | "IT") => {
    try {
      setIsDownloading(true);
      const res = await apiDistributions.exportExcel({
        type,
        date_from: calendarDateFrom || undefined,
        date_to: calendarDateTo || undefined,
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = type === "IO" ? "Internal_Order" : "Internal_Transfer";
      const dateSuffix = `${calendarDateFrom || "all"}_sd_${calendarDateTo || "all"}`.replace(/-/g, "");
      a.download = `${label}_${dateSuffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh file Excel:", err);
      alert("Gagal mengunduh file Excel. Silakan coba kembali.");
    } finally {
      setIsDownloading(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const defaultParams = { date_from: "2023-01-01", date_to: "2024-12-31" };
      
      if (mainTab === "DO") {
        const [sumRes, itemsRes, mapRes] = await Promise.allSettled([
          apiDistributions.summary(defaultParams),
          apiDistributions.list({ status: activeTab === "all" ? undefined : activeTab, limit: 50, ...defaultParams }),
          apiDistributions.mapData({ status: activeTab === "all" ? undefined : activeTab, ...defaultParams }),
        ]);

        if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
        if (itemsRes.status === "fulfilled") setItems(itemsRes.value.data.data || []);
        if (mapRes.status === "fulfilled") setMapData(mapRes.value.data || []);
      } else if (mainTab === "IO") {
        const res = await apiDistributions.internalOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          limit: 500,
        });
        setIoItems(res.data.data || []);
      } else if (mainTab === "IT") {
        const res = await apiDistributions.transferOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          limit: 500,
        });
        setItItems(res.data.data || []);
      }
    } catch {
      // API error handled
    } finally {
      setLoading(false);
    }
  }, [activeTab, mainTab, calendarDateFrom, calendarDateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Monitoring Distribusi</h1>
        <p className="page-subtitle">Tracking Delivery Order (DO), Internal Order (IO), dan Internal Transfer (IT)</p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem" }}>
        {[
          { key: "DO", label: "Surat Jalan (DO)" },
          { key: "IO", label: "Internal Order (IO)" },
          { key: "IT", label: "Internal Transfer (IT)" },
          { key: "SIM", label: "Simulasi Supply Chain" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as typeof mainTab)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: mainTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: mainTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: mainTab === tab.key ? 600 : 400,
              cursor: "pointer",
              fontSize: "1rem"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "DO" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="kpi-card info">
              <div className="kpi-icon info">🚛</div>
              <div className="kpi-value">{summary?.in_transit || "—"}</div>
              <div className="kpi-label">DO Dalam Perjalanan</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-icon success">✅</div>
              <div className="kpi-value">{summary?.delivered || "—"}</div>
              <div className="kpi-label">DO Terkirim</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-icon warning">⏳</div>
              <div className="kpi-value" style={{ color: "hsl(38,92%,65%)" }}>{summary?.pending || "—"}</div>
              <div className="kpi-label">DO Menunggu Kirim (Draft)</div>
            </div>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">⏱️</div>
              <div className="kpi-value">{summary?.avg_delivery_days ? `${summary.avg_delivery_days.toFixed(1)} Hari` : "—"}</div>
              <div className="kpi-label">Rata-rata Waktu Kirim</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
            {[
              { key: "all", label: "Semua" },
              { key: "In Transit", label: "🚛 In Transit" },
              { key: "Delivered", label: "✅ Delivered" },
              { key: "Draft", label: "⏳ Draft" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <div className="card-title">Aktivitas Rute Pengiriman</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
              {loading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                  Memuat data rute...
                </div>
              ) : mapData.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                  Tidak ada aktivitas pengiriman.
                </div>
              ) : (
                (() => {
                  const routes = mapData.reduce((acc, curr) => {
                    const dest = (curr.destination || "Tidak diketahui").toUpperCase();
                    if (!acc[dest]) {
                      acc[dest] = { name: dest, in_transit: 0, delivered: 0, draft: 0, total: 0 };
                    }
                    acc[dest].total += 1;
                    if (curr.status_label === "in_transit") acc[dest].in_transit += 1;
                    else if (curr.status_label === "delivered") acc[dest].delivered += 1;
                    else acc[dest].draft += 1;
                    return acc;
                  }, {} as Record<string, any>);

                  return Object.values(routes)
                    .sort((a: any, b: any) => b.total - a.total)
                    .slice(0, 8)
                    .map((route: any) => (
                      <div key={route.name} style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--bg-border)" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>📍 Tujuan: {route.name}</div>
                        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem" }}>
                          <span style={{ color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>
                            {route.in_transit} Jalan
                          </span>
                          <span style={{ color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 15%, transparent)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>
                            {route.delivered} Sampai
                          </span>
                        </div>
                      </div>
                    ));
                })()
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. DO</th>
                    <th>Tanggal DO</th>
                    <th>Customer</th>
                    <th>Kota Tujuan</th>
                    <th>Driver / Kendaraan</th>
                    <th>Waktu Kirim</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Tidak ada data DO.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => {
                      const badge = STATUS_BADGE[row.status] || { label: row.status, cls: "badge-status badge-muted" };
                      return (
                        <tr key={row.nomor}>
                          <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.nomor}</td>
                          <td>{formatDisplayDate(row.tanggal)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{row.nama_customer}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.customer_id}</div>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>{row.kota_tujuan || "—"}</td>
                          <td>
                            <div style={{ color: "var(--text-secondary)" }}>{row.driver || "—"}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.plat_nomor || "—"}</div>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {row.waktu_kirim ? new Date(row.waktu_kirim).toLocaleString("id") : "—"}
                          </td>
                          <td>
                            <span className={badge.cls}>{badge.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {mainTab === "IO" && (
        <>
          {/* Action Bar: Calendar Date Filter & Download Excel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.35rem" }}>📑</span>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                Data Internal Order (IO)
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 500 }}>
                Rentang Tanggal:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📅</span>
                <input
                  type="date"
                  value={calendarDateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateFrom(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Mulai"
                />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>s/d</span>
                <input
                  type="date"
                  value={calendarDateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateTo(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Akhir"
                />
              </div>

              <button
                onClick={() => handleDownloadExcel("IO")}
                disabled={isDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: isDownloading ? "#065f46" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.48rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                }}
                title={`Download Internal Order format Excel (.xlsx) untuk rentang tanggal ${calendarDateFrom} s/d ${calendarDateTo}`}
              >
                {isDownloading ? (
                  <>
                    <span>⏳</span>
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem" }}>📥</span>
                    <span>Download Excel (IO.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomor IO</th>
                  <th>Tanggal</th>
                  <th>Kantor</th>
                  <th>Gudang Asal</th>
                  <th>Gudang Tujuan</th>
                  <th>Dibuat oleh</th>
                  <th>Send</th>
                  <th>Check By DSM</th>
                  <th>Dicek ST</th>
                  <th>Dicek WHM</th>
                  <th>Approve</th>
                  <th>No. IP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : ioItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Tidak ada data Internal Order.
                    </td>
                  </tr>
                ) : (
                  ioItems.map((row: InternalOrderRecord) => {
                    const code = row.status?.trim() || "";
                    const badge = IO_STATUS_BADGE[code] || { label: code || "—", cls: "badge-status badge-muted", desc: code };

                    // Evaluasi status alur pengecekan berdasarkan hierarki status
                    const isSent = ["S", "A", "P", "Z", "C", "K", "Y", "X", "R"].includes(code);
                    const isDSM = ["A", "P", "Z", "C", "Y", "X", "R"].includes(code);
                    const isST = ["A", "P", "Z", "C", "X", "R"].includes(code);
                    const isWHM = ["A", "P", "Z", "C"].includes(code);
                    const isApproved = ["A", "P", "Z", "C"].includes(code);

                    return (
                      <tr key={row.nomor_io}>
                        <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{row.nomor_io}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(row.tanggal)}</td>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.nama_kantor || "—"}</td>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_asal || "—"}</td>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_tujuan || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{row.dibuat_oleh || "—"}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {row.send_oleh && row.send_oleh !== "—" ? (
                            <div>
                              <div>{row.send_oleh}</div>
                              {row.send_by_date && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{formatDisplayDate(row.send_by_date)}</div>}
                            </div>
                          ) : isSent ? (
                            <span style={{ color: "var(--color-primary)" }}>✓ Sent</span>
                          ) : "—"}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {isDSM ? (
                            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓</span>
                          ) : code === "K" ? (
                            <span style={{ color: "hsl(0,84%,70%)", fontSize: "0.75rem" }}>Reject</span>
                          ) : "—"}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {isST ? (
                            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓</span>
                          ) : code === "Y" ? (
                            <span style={{ color: "hsl(0,84%,70%)", fontSize: "0.75rem" }}>Reject ST</span>
                          ) : "—"}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {isWHM ? (
                            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓</span>
                          ) : code === "X" ? (
                            <span style={{ color: "hsl(0,84%,70%)", fontSize: "0.75rem" }}>Cancel WHM</span>
                          ) : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {row.approve_oleh && row.approve_oleh !== "—" ? (
                            <div>
                              <div>{row.approve_oleh}</div>
                              {row.approve_tanggal && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{formatDisplayDate(row.approve_tanggal)}</div>}
                            </div>
                          ) : isApproved ? (
                            <span style={{ color: "var(--color-success)" }}>✓ Approved</span>
                          ) : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.8rem" }}>{row.id_ip || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={badge.cls} title={badge.desc}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {mainTab === "IT" && (
        <>
          {/* Action Bar: Calendar Date Filter & Download Excel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.35rem" }}>🔄</span>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                Data Internal Transfer (IT)
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 500 }}>
                Rentang Tanggal:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📅</span>
                <input
                  type="date"
                  value={calendarDateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateFrom(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Mulai"
                />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>s/d</span>
                <input
                  type="date"
                  value={calendarDateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateTo(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Akhir"
                />
              </div>

              <button
                onClick={() => handleDownloadExcel("IT")}
                disabled={isDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: isDownloading ? "#065f46" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.48rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                }}
                title={`Download Internal Transfer format Excel (.xlsx) untuk rentang tanggal ${calendarDateFrom} s/d ${calendarDateTo}`}
              >
                {isDownloading ? (
                  <>
                    <span>⏳</span>
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem" }}>📥</span>
                    <span>Download Excel (IT.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>IT No</th>
                  <th>Date</th>
                  <th>Create Date</th>
                  <th>Delivery Date</th>
                  <th>Receive Date</th>
                  <th>Gudang Asal</th>
                  <th>Gudang Tujuan</th>
                  <th>Nomor IO</th>
                  <th>Tgl. IO Approve</th>
                  <th>Receive Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : itItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Tidak ada data Internal Transfer.
                    </td>
                  </tr>
                ) : (
                  itItems.map((row: InternalTransferRecord) => {
                    const code = row.status?.trim() || "";
                    const badge = IT_STATUS_BADGE[code] || { label: code || "—", cls: "badge-status badge-muted", desc: code };
                    return (
                      <tr key={row.nomor}>
                        <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{row.nomor}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(row.tanggal)}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.create_date)}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tanggal_kirim)}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tanggal_terima)}</td>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_asal || "—"}</td>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_tujuan || "—"}</td>
                        <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.nomor_io || "—"}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tgl_io_approve)}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "250px" }}>{row.receive_note || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={badge.cls} title={badge.desc}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {mainTab === "SIM" && (
        <SupplyChainSimulation />
      )}
    </div>
  );
}
