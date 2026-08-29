"use client";
import { useState, useEffect, useCallback } from "react";
import { apiInventory } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InventorySummary {
  total_sku: number;
  total_on_hand: number;
  total_available: number;
  total_nilai: number;
  low_stock_count: number;
  zero_stock_count: number;
  overstock_count: number;
  total_gudang: number;
}

interface InventoryItem {
  id_barang: string;
  nama_barang: string;
  nama_kategori: string;
  nama_brand: string;
  id_gudang: string;
  nama_gudang: string;
  on_hand: number;
  reserved: number;
  available: number;
  damaged: number;
  quarantine: number;
  stok_min: number;
  stok_max: number;
  hpp: number;
  nilai_persediaan: number;
  batch: string;
  stock_status: "ok" | "low_stock" | "overstock" | "zero";
}

interface WarehouseStock {
  id_gudang: string;
  nama_gudang: string;
  total_on_hand: number;
  total_available: number;
  total_nilai: number;
  low_stock_count: number;
  zero_stock_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "badge-status badge-ok" },
  low_stock: { label: "Low Stock", cls: "badge-status badge-danger" },
  overstock: { label: "Overstock", cls: "badge-status badge-warning" },
  zero: { label: "Kosong", cls: "badge-status badge-danger" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "low_stock" | "overstock" | "zero">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    try {
      const [summaryRes, itemsRes, whRes] = await Promise.allSettled([
        apiInventory.summary(),
        apiInventory.byProduct({
          status: activeTab === "all" ? undefined : activeTab,
          search: search || undefined,
          page,
          limit: LIMIT,
        }),
        apiInventory.byWarehouse(),
      ]);

      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data);
      if (itemsRes.status === "fulfilled") {
        setItems(itemsRes.value.data.data || []);
        setTotal(itemsRes.value.data.pagination?.total || 0);
      }
      if (whRes.status === "fulfilled") setWarehouseData(whRes.value.data || []);
    } catch { /* API not ready */ }
    finally { setLoading(false); }
  }, [activeTab, search, page]);

  useEffect(() => { load(); }, [load]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Inventory Monitoring</h1>
        <p className="page-subtitle">Status stok real-time per produk dan per gudang</p>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">📦</div>
          <div className="kpi-value">{summary?.total_sku ?? "—"}</div>
          <div className="kpi-label">Total SKU</div>
        </div>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">💰</div>
          <div className="kpi-value">{fmt(summary?.total_nilai, "Rp ")}</div>
          <div className="kpi-label">Nilai Persediaan</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            {fmt(summary?.total_available)} unit tersedia
          </div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger">⚠️</div>
          <div className="kpi-value" style={{ color: "hsl(0,84%,70%)" }}>
            {summary?.low_stock_count ?? "—"}
          </div>
          <div className="kpi-label">Low Stock</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger">🚫</div>
          <div className="kpi-value" style={{ color: "hsl(0,84%,70%)" }}>
            {summary?.zero_stock_count ?? "—"}
          </div>
          <div className="kpi-label">Stok Habis</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning">📈</div>
          <div className="kpi-value" style={{ color: "hsl(38,92%,65%)" }}>
            {summary?.overstock_count ?? "—"}
          </div>
          <div className="kpi-label">Overstock</div>
        </div>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">🏭</div>
          <div className="kpi-value">{summary?.total_gudang ?? "—"}</div>
          <div className="kpi-label">Gudang Aktif</div>
        </div>
      </div>

      {/* Stock Status — Available Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {/* Stok formula */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Komposisi Stok Tersedia</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "On Hand", value: fmt(summary?.total_on_hand), color: "var(--color-primary)" },
              { label: "Reserved", value: "—", color: "hsl(262,83%,58%)" },
              { label: "Available", value: fmt(summary?.total_available), color: "var(--color-accent)" },
              { label: "Damaged / QC", value: "—", color: "var(--color-danger)" },
            ].map((item) => (
              <div key={item.label} style={{
                padding: "0.75rem",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                borderLeft: `3px solid ${item.color}`,
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: "0.75rem", padding: "0.6rem 0.75rem",
            background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius-md)",
            fontSize: "0.75rem", color: "var(--text-secondary)",
          }}>
            <strong>Available</strong> = On Hand − Reserved − Damaged − Quarantine − Pending Transfer
          </div>
        </div>

        {/* Per gudang bar chart */}
        <div className="chart-container">
          <div className="card-header">
            <div className="card-title">Nilai Persediaan Per Gudang</div>
          </div>
          {warehouseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={warehouseData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} />
                <YAxis type="category" dataKey="nama_gudang" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} axisLine={false} width={55} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 8 }}
                  formatter={(v: any) => [fmt(v as number, "Rp "), "Nilai"]}
                />
                <Bar dataKey="total_nilai" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]}>
                  {warehouseData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${217 - i * 15},91%,${60 - i * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {loading ? "Memuat..." : "Belum ada data"}
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[
            { key: "all", label: "Semua" },
            { key: "low_stock", label: "⚠️ Low Stock" },
            { key: "zero", label: "🚫 Habis" },
            { key: "overstock", label: "📈 Overstock" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as typeof activeTab); setPage(1); }}
              className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ width: 240 }}
          placeholder="Cari produk atau kode..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Barang</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Gudang</th>
                <th style={{ textAlign: "right" }}>On Hand</th>
                <th style={{ textAlign: "right" }}>Reserved</th>
                <th style={{ textAlign: "right" }}>Available</th>
                <th style={{ textAlign: "right" }}>Min</th>
                <th style={{ textAlign: "right" }}>Max</th>
                <th style={{ textAlign: "right" }}>Nilai (Rp)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    {activeTab === "all" && !search ? "Belum ada data. Jalankan sync worker terlebih dahulu." : "Tidak ada data yang cocok."}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const badge = STATUS_BADGE[item.stock_status] || STATUS_BADGE.ok;
                  return (
                    <tr key={`${item.id_barang}-${item.id_gudang}-${idx}`}>
                      <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.id_barang}
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="truncate" title={item.nama_barang}>{item.nama_barang}</div>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.nama_kategori || "—"}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.nama_gudang}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {Number(item.on_hand).toLocaleString("id")}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--color-warning)", fontVariantNumeric: "tabular-nums" }}>
                        {Number(item.reserved || 0).toLocaleString("id")}
                      </td>
                      <td style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: item.stock_status === "zero" ? "var(--color-danger)"
                          : item.stock_status === "low_stock" ? "hsl(38,92%,65%)"
                          : "var(--color-accent)",
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {Number(item.available).toLocaleString("id")}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {Number(item.stok_min || 0).toLocaleString("id")}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {Number(item.stok_max || 0).toLocaleString("id")}
                      </td>
                      <td style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {fmt(item.nilai_persediaan, "Rp ")}
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

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0.75rem 1rem", borderTop: "1px solid var(--bg-border)",
          }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} item
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
