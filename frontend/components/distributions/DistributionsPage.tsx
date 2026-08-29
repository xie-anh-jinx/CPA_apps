"use client";
import { useState, useEffect, useCallback } from "react";
import { apiDistributions } from "@/lib/api";

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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  "Draft": { label: "Draft / Pending", cls: "badge-status badge-draft" },
  "In Transit": { label: "In Transit", cls: "badge-status badge-in_transit" },
  "Delivered": { label: "Delivered", cls: "badge-status badge-delivered" },
};

export default function DistributionsPage() {
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "In Transit" | "Delivered">("all");

  const load = useCallback(async () => {
    try {
      const defaultParams = { date_from: "2023-01-01", date_to: "2024-12-31" };
      const [sumRes, itemsRes, mapRes] = await Promise.allSettled([
        apiDistributions.summary(defaultParams),
        apiDistributions.list({ status: activeTab === "all" ? undefined : activeTab, limit: 50, ...defaultParams }),
        apiDistributions.mapData({ status: activeTab === "all" ? undefined : activeTab, ...defaultParams }),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (itemsRes.status === "fulfilled") setItems(itemsRes.value.data.data || []);
      if (mapRes.status === "fulfilled") setMapData(mapRes.value.data || []);
    } catch {
      // API error handled
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Monitoring Distribusi</h1>
        <p className="page-subtitle">Tracking Delivery Order (DO) dan performa pengiriman</p>
      </div>

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
              // Group mapData by destination
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
                      <td>{new Date(row.tanggal).toLocaleDateString("id")}</td>
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
    </div>
  );
}
