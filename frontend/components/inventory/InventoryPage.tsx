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
  total_nilai?: number | null;
  fast_count?: number;
  medium_count?: number;
  slow_count?: number;
  deadstock_count?: number;
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
  hpp?: number;
  batch: string;
  demand?: number;
  last_call?: string | null;
  movement_category?: "Fast" | "Medium" | "Slow" | "Deadstock";
  stock_status: "ok" | "low_stock" | "overstock" | "zero";
}

interface WarehouseStock {
  id_gudang: string;
  nama_gudang: string;
  total_on_hand: number;
  total_available: number;
  total_nilai?: number | null;
  low_stock_count: number;
  zero_stock_count: number;
}

interface Transaction {
  tipe: string;
  tipe_label: string;
  nomor: string;
  tanggal: string;
  id_gudang: string;
  nama_gudang: string;
  referensi: string;
  keterangan: string;
  kode_user: string;
  total_qty: number;
  total_nilai?: number | null;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: "Normal", cls: "badge-status badge-ok" },
  low_stock: { label: "Low Stock", cls: "badge-status badge-danger" },
  overstock: { label: "Overstock", cls: "badge-status badge-warning" },
  zero: { label: "Kosong", cls: "badge-status badge-danger" },
};

const MOVEMENT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  Fast:      { label: "⚡ Fast",      color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  Medium:    { label: "🔄 Medium",    color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
  Slow:      { label: "⏳ Slow",      color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  Deadstock: { label: "🛑 Deadstock", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
};

const TIPE_BADGE: Record<string, { label: string; color: string }> = {
  penerimaan_barang:  { label: "Penerimaan",        color: "hsl(142,76%,45%)" },
  receipt_internal:   { label: "Receipt Transfer",   color: "hsl(217,91%,60%)" },
  penambahan:         { label: "Penambahan",         color: "hsl(262,83%,58%)" },
  decanting:          { label: "Decanting",          color: "hsl(38,92%,50%)" },
  packing_list:       { label: "Packing List",       color: "hsl(0,84%,60%)" },
  internal_transfer:  { label: "Internal Transfer",  color: "hsl(200,91%,55%)" },
  pemakaian:          { label: "Pemakaian",          color: "hsl(310,70%,55%)" },
};

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

// ─── Transaction Table Component ──────────────────────────────────────────────
function TransactionTable({
  direction,
  typeOptions,
}: {
  direction: "inbound" | "outbound";
  typeOptions: { key: string; label: string }[];
}) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [tipeFilter, setTipeFilter] = useState<string>("");
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = direction === "inbound" ? apiInventory.inbound : apiInventory.outbound;
      const res = await fn({
        date_from: dateFrom,
        date_to: dateTo,
        tipe: tipeFilter || undefined,
        page,
        limit: LIMIT,
      });
      setData(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [direction, dateFrom, dateTo, tipeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const isInbound = direction === "inbound";
  const accentColor = isInbound ? "hsl(142,76%,45%)" : "hsl(0,84%,60%)";

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: "flex", gap: "0.75rem", alignItems: "center",
        flexWrap: "wrap", marginBottom: "1rem",
        padding: "0.75rem 1rem",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--bg-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Dari:</span>
          <input
            type="date" className="input" style={{ width: 140 }}
            value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Sampai:</span>
          <input
            type="date" className="input" style={{ width: 140 }}
            value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${tipeFilter === "" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setTipeFilter(""); setPage(1); }}
          >Semua</button>
          {typeOptions.map((opt) => (
            <button
              key={opt.key}
              className={`btn btn-sm ${tipeFilter === opt.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setTipeFilter(opt.key); setPage(1); }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {total.toLocaleString("id")} transaksi
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Nomor</th>
                <th>Tanggal</th>
                <th>Gudang</th>
                <th>Referensi / Tujuan</th>
                <th>Keterangan</th>
                <th style={{ textAlign: "right" }}>Total Qty</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    Tidak ada transaksi pada periode ini
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const badge = TIPE_BADGE[row.tipe];
                  return (
                    <tr key={`${row.nomor}-${idx}`}>
                      <td>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          background: badge ? `${badge.color}20` : "var(--bg-surface)",
                          color: badge?.color || "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}>
                          {row.tipe_label}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: "0.75rem", color: accentColor, fontWeight: 600 }}>
                        {row.nomor}
                      </td>
                      <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{fmtDate(row.tanggal)}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{row.nama_gudang || row.id_gudang}</td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 140 }}>
                        <div className="truncate" title={row.referensi}>{row.referensi || "—"}</div>
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 180 }}>
                        <div className="truncate" title={row.keterangan}>{row.keterangan || "—"}</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {Number(row.total_qty || 0).toLocaleString("id")}
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.kode_user || "—"}</td>
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
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total.toLocaleString("id")} transaksi
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"stock" | "inbound" | "outbound">("stock");

  // Stock filters
  const [activeTab, setActiveTab] = useState<"all" | "fast" | "medium" | "slow" | "deadstock" | "low_stock" | "overstock" | "zero">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const loadStock = useCallback(async () => {
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

  useEffect(() => { loadStock(); }, [loadStock]);

  const minMaxChartData = [
    { name: "Fast (≥9)", count: summary?.fast_count || 0, fill: "#10b981" },
    { name: "Medium (4-8)", count: summary?.medium_count || 0, fill: "#06b6d4" },
    { name: "Slow (1-3)", count: summary?.slow_count || 0, fill: "#f59e0b" },
    { name: "Deadstock (0)", count: summary?.deadstock_count || 0, fill: "#ef4444" },
  ];

  const INBOUND_TYPES = [
    { key: "penerimaan_barang", label: "Penerimaan Barang" },
    { key: "receipt_internal",  label: "Receipt Internal Transfer" },
    { key: "penambahan",        label: "Penambahan Barang" },
    { key: "decanting",         label: "Decanting" },
  ];

  const OUTBOUND_TYPES = [
    { key: "packing_list",      label: "Packing List" },
    { key: "internal_transfer", label: "Internal Transfer" },
    { key: "pemakaian",         label: "Pemakaian Barang" },
    { key: "decanting",         label: "Decanting" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Inventory Monitoring</h1>
        <p className="page-subtitle">Status stok, pengkategorian Min-Max, transaksi inbound & outbound real-time</p>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid" style={{ marginBottom: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">📦</div>
          <div className="kpi-value">{summary?.total_sku ?? "—"}</div>
          <div className="kpi-label">Total SKU</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            {fmt(summary?.total_on_hand)} on-hand
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "3px solid #10b981" }}>
          <div className="kpi-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>⚡</div>
          <div className="kpi-value" style={{ color: "#10b981" }}>{summary?.fast_count ?? "—"}</div>
          <div className="kpi-label">Fast Moving</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Demand ≥ 9 unit</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "3px solid #06b6d4" }}>
          <div className="kpi-icon" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>🔄</div>
          <div className="kpi-value" style={{ color: "#06b6d4" }}>{summary?.medium_count ?? "—"}</div>
          <div className="kpi-label">Medium Moving</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Demand 4–8 unit</div>
        </div>
        <div className="kpi-card warning" style={{ borderLeft: "3px solid #f59e0b" }}>
          <div className="kpi-icon warning">⏳</div>
          <div className="kpi-value" style={{ color: "hsl(38,92%,65%)" }}>{summary?.slow_count ?? "—"}</div>
          <div className="kpi-label">Slow Moving</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Demand 1–3 unit</div>
        </div>
        <div className="kpi-card danger" style={{ borderLeft: "3px solid #ef4444" }}>
          <div className="kpi-icon danger">🛑</div>
          <div className="kpi-value" style={{ color: "hsl(0,84%,70%)" }}>{summary?.deadstock_count ?? "—"}</div>
          <div className="kpi-label">Deadstock</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Demand 0 / Pasif</div>
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
        <div className="kpi-card primary">
          <div className="kpi-icon primary">🏭</div>
          <div className="kpi-value">{summary?.total_gudang ?? "—"}</div>
          <div className="kpi-label">Gudang Aktif</div>
        </div>
      </div>

      {/* ── MAIN TAB NAVIGATION ── */}
      <div style={{
        display: "flex", gap: "0.25rem", marginBottom: "1.25rem",
        borderBottom: "2px solid var(--bg-border)",
        paddingBottom: "0",
      }}>
        {[
          { key: "stock",    label: "📦 Stok" },
          { key: "inbound",  label: "⬇️ Inbound" },
          { key: "outbound", label: "⬆️ Outbound" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as typeof mainTab)}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: mainTab === tab.key ? 700 : 500,
              background: "transparent",
              border: "none",
              borderBottom: mainTab === tab.key
                ? "2px solid var(--color-primary)"
                : "2px solid transparent",
              color: mainTab === tab.key ? "var(--color-primary)" : "var(--text-muted)",
              cursor: "pointer",
              marginBottom: "-2px",
              transition: "all 0.15s",
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── STOCK TAB ── */}
      {mainTab === "stock" && (
        <>
          {/* Stock Status — Breakdown & Min-Max Distribution */}
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

            {/* Min-Max Category Bar Chart */}
            <div className="chart-container">
              <div className="card-header">
                <div className="card-title">Distribusi Kategori Min-Max (Pergerakan Stok)</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={minMaxChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 8 }}
                    formatter={(v: any) => [`${v} SKU/Item`, "Jumlah"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {minMaxChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter Tabs + Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {[
                { key: "all", label: "Semua" },
                { key: "fast", label: "⚡ Fast" },
                { key: "medium", label: "🔄 Medium" },
                { key: "slow", label: "⏳ Slow" },
                { key: "deadstock", label: "🛑 Deadstock" },
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
                    <th style={{ textAlign: "right" }}>Demand</th>
                    <th>Kategori Min-Max</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 12 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        {activeTab === "all" && !search ? "Belum ada data. Jalankan sync worker terlebih dahulu." : "Tidak ada data yang cocok."}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const badge = STATUS_BADGE[item.stock_status] || STATUS_BADGE.ok;
                      const mov = item.movement_category || "Deadstock";
                      const mBadge = MOVEMENT_BADGE[mov] || MOVEMENT_BADGE.Deadstock;
                      return (
                        <tr key={`${item.id_barang}-${item.id_gudang}-${idx}`}>
                          <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {item.id_barang}
                          </td>
                          <td style={{ maxWidth: 220 }}>
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
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--text-primary)" }}>
                            {Number(item.demand || 0).toLocaleString("id")}
                          </td>
                          <td>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: mBadge.color,
                              background: mBadge.bg,
                              border: `1px solid ${mBadge.color}35`,
                              whiteSpace: "nowrap"
                            }}>
                              {mBadge.label}
                            </span>
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
        </>
      )}

      {/* ── INBOUND TAB ── */}
      {mainTab === "inbound" && (
        <div>
          {/* Legend */}
          <div style={{
            display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem",
          }}>
            {INBOUND_TYPES.map((t) => {
              const badge = TIPE_BADGE[t.key];
              return (
                <div key={t.key} style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  background: `${badge.color}15`,
                  border: `1px solid ${badge.color}40`,
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.75rem", color: badge.color, fontWeight: 600,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: badge.color, display: "inline-block" }} />
                  {t.label}
                </div>
              );
            })}
          </div>
          <TransactionTable direction="inbound" typeOptions={INBOUND_TYPES} />
        </div>
      )}

      {/* ── OUTBOUND TAB ── */}
      {mainTab === "outbound" && (
        <div>
          {/* Legend */}
          <div style={{
            display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem",
          }}>
            {OUTBOUND_TYPES.map((t) => {
              const badge = TIPE_BADGE[t.key];
              return (
                <div key={t.key} style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  background: `${badge.color}15`,
                  border: `1px solid ${badge.color}40`,
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.75rem", color: badge.color, fontWeight: 600,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: badge.color, display: "inline-block" }} />
                  {t.label}
                </div>
              );
            })}
          </div>
          <TransactionTable direction="outbound" typeOptions={OUTBOUND_TYPES} />
        </div>
      )}
    </div>
  );
}
