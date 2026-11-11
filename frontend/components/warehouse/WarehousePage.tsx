"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { apiWarehouses, apiDistributions } from "@/lib/api";
import { getWarehouseCodeArea, getCodeAreaBadgeStyle } from "@/lib/warehouse_master";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface WarehouseData {
  id_gudang: string;
  nama_gudang: string;
  nama_kantor: string;
  code_area?: string;
  lokasi: string;
  kapasitas_max: number;
  total_on_hand: number;
  total_available: number;
  total_nilai: number | null;
  low_stock_count: number;
  zero_stock_count: number;
  kontak_person?: string;
  dsm?: string;
  telpon?: string;
  alamat?: string;
}

interface TransferRecord {
  nomor: string;
  tanggal: string;
  create_date?: string | null;
  tanggal_kirim?: string | null;
  tanggal_terima?: string | null;
  id_gudang_asal?: string;
  id_gudang_tujuan?: string;
  gudang_asal: string;
  gudang_tujuan: string;
  nomor_io?: string | null;
  tgl_io_approve?: string | null;
  receive_note?: string | null;
  status: string;
  transfer_type?: string;
}

interface TransferItemDetail {
  no: number;
  nama_barang: string;
  kode_barang: string;
  qty: number;
  satuan: string;
  no_ibc?: string;
  no_skid_tank?: string;
  keterangan?: string;
}

interface TransferDetailModalData {
  nomor: string;
  header: Record<string, any>;
  items: TransferItemDetail[];
}

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

function formatDisplayDate(val?: string | null): string {
  if (!val) return "—";
  if (val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${day}-${month}-${year} ${hh}:${mm} WIB`;
    }
  }
  return val;
}

const IT_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  D: { label: "Draft", bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" },
  S: { label: "Send (Terkirim)", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" },
  R: { label: "Receipt (Diterima)", bg: "rgba(52, 211, 153, 0.15)", color: "#34d399" },
  C: { label: "Completed", bg: "rgba(52, 211, 153, 0.15)", color: "#34d399" },
  X: { label: "Cancel", bg: "rgba(248, 113, 113, 0.15)", color: "#f87171" },
};

export default function WarehousePage() {
  const [mainTab, setMainTab] = useState<"overview" | "transfers">("overview");

  // Multi-warehouse Overview state
  const [data, setData] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchWh, setSearchWh] = useState<string>("" );
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [exportingWh, setExportingWh] = useState<boolean>(false);

  // Transfers state
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferDirection, setTransferDirection] = useState<"all" | "in" | "out">("all");
  const [transferStatus, setTransferStatus] = useState<string>("all");
  const [searchTransfer, setSearchTransfer] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 20;

  // Modal detail state
  const [selectedTransfer, setSelectedTransfer] = useState<TransferDetailModalData | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  // Load warehouse summary
  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiWarehouses.comparison();
      setData((res.data || []).map((w: any) => ({
        ...w,
        code_area: w.code_area || getWarehouseCodeArea(w.id_gudang, w.nama_gudang, w.nama_kantor),
        lokasi: w.nama_kantor || w.lokasi || "—",
      })));
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Load transfer orders
  const loadTransfers = useCallback(async (dir = transferDirection) => {
    try {
      setLoadingTransfers(true);
      const params: Record<string, unknown> = { limit: 1000 };
      if (dir !== "all") {
        params.direction = dir;
      }
      const res = await apiDistributions.transferOrders(params);
      setTransfers(res.data?.data || []);
    } catch {
      // quiet fail
    } finally {
      setLoadingTransfers(false);
    }
  }, [transferDirection]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (mainTab === "transfers") {
      loadTransfers();
    }
  }, [mainTab, loadTransfers]);

  // Financial data masking: Total Nilai Persediaan disembunyikan sesuai permintaan operasional
  const hasFinancial = false;

  const totalNilai = useMemo(() => {
    return null;
  }, []);

  const totalOnHand = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.total_on_hand || 0), 0);
  }, [data]);

  const totalItem = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.total_available || 0), 0);
  }, [data]);

  const totalLowStock = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.low_stock_count || 0), 0);
  }, [data]);

  const areaData = useMemo(() => {
    const map: Record<string, any> = {};
    data.forEach((d) => {
      const area = d.nama_kantor || "Lainnya";
      if (!map[area]) {
        map[area] = {
          nama_gudang: area,
          total_on_hand: 0,
          kapasitas_max: 0,
          total_nilai: 0,
        };
      }
      map[area].total_on_hand += d.total_on_hand || 0;
      map[area].kapasitas_max += d.kapasitas_max || ((d.total_on_hand || 0) * 1.5);
      if (hasFinancial) {
        map[area].total_nilai += d.total_nilai || 0;
      }
    });
    return Object.values(map);
  }, [data, hasFinancial]);

  const branchList = useMemo(() => {
    const s = new Set<string>();
    data.forEach(d => { if (d.nama_kantor) s.add(d.nama_kantor); });
    return Array.from(s).sort();
  }, [data]);

  const filteredWarehouses = useMemo(() => {
    return data.filter((row) => {
      if (filterBranch !== "all" && row.nama_kantor !== filterBranch) {
        return false;
      }
      const area = row.code_area || getWarehouseCodeArea(row.id_gudang, row.nama_gudang, row.nama_kantor);
      if (filterArea !== "all" && area !== filterArea) {
        return false;
      }
      if (!searchWh.trim()) return true;
      const q = searchWh.toLowerCase();
      return (
        (row.id_gudang && row.id_gudang.toLowerCase().includes(q)) ||
        (row.nama_gudang && row.nama_gudang.toLowerCase().includes(q)) ||
        (row.nama_kantor && row.nama_kantor.toLowerCase().includes(q)) ||
        (area && area.toLowerCase().includes(q)) ||
        (row.kontak_person && row.kontak_person.toLowerCase().includes(q)) ||
        (row.dsm && row.dsm.toLowerCase().includes(q)) ||
        (row.telpon && row.telpon.toLowerCase().includes(q)) ||
        (row.alamat && row.alamat.toLowerCase().includes(q))
      );
    });
  }, [data, searchWh, filterBranch, filterArea]);

  const handleExportWarehouseExcel = async () => {
    if (exportingWh) return;
    try {
      setExportingWh(true);
      const res = await apiWarehouses.exportExcel({
        code_area: filterArea !== "all" ? filterArea : undefined,
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `Multi_Warehouse_CPA_${dateTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal export excel gudang:", err);
      alert("Gagal mengekspor data gudang. Silakan coba kembali.");
    } finally {
      setExportingWh(false);
    }
  };

  // Transfer metrics & filter
  const transferCounts = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let receiptCount = 0;
    transfers.forEach((t) => {
      const type = t.transfer_type || "";
      if (type.includes("Masuk") || type.includes("IT In")) inCount++;
      if (type.includes("Keluar") || type.includes("IT Out")) outCount++;
      if (t.status === "R" || t.status === "C") receiptCount++;
    });
    return {
      total: transfers.length,
      inCount,
      outCount,
      receiptCount,
    };
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Direction filter
      if (transferDirection === "in") {
        const type = t.transfer_type || "";
        if (!type.includes("Masuk") && !type.includes("IT In")) return false;
      } else if (transferDirection === "out") {
        const type = t.transfer_type || "";
        if (!type.includes("Keluar") && !type.includes("IT Out")) return false;
      }

      // Status filter
      if (transferStatus !== "all") {
        const st = (t.status || "").trim().toUpperCase();
        if (transferStatus === "draft" && st !== "D") return false;
        if (transferStatus === "send" && st !== "S") return false;
        if (transferStatus === "receipt" && st !== "R" && st !== "C") return false;
        if (transferStatus === "cancel" && st !== "X") return false;
      }

      // Search
      if (searchTransfer) {
        const q = searchTransfer.toLowerCase();
        const matchNomor = (t.nomor || "").toLowerCase().includes(q);
        const matchIo = (t.nomor_io || "").toLowerCase().includes(q);
        const matchAsal = (t.gudang_asal || "").toLowerCase().includes(q);
        const matchTujuan = (t.gudang_tujuan || "").toLowerCase().includes(q);
        if (!matchNomor && !matchIo && !matchAsal && !matchTujuan) return false;
      }

      return true;
    });
  }, [transfers, transferDirection, transferStatus, searchTransfer]);

  // Reset pagination ke halaman 1 saat filter arah, status, atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [transferDirection, transferStatus, searchTransfer]);

  // Kalkulasi Pagination (20 baris per page)
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE));

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransfers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransfers, currentPage, ITEMS_PER_PAGE]);

  const startRecord = filteredTransfers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, filteredTransfers.length);

  // Open IT detail modal
  const handleOpenTransferDetail = async (nomor: string) => {
    try {
      setLoadingModal(true);
      const res = await apiDistributions.transferOrderItems(nomor);
      setSelectedTransfer(res.data);
    } catch {
      alert("Gagal memuat rincian Internal Transfer.");
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="page-title">Multi-Warehouse & Tracking Transfer</h1>
            <p className="page-subtitle">
              Monitoring stok cabang & pelacakan mutasi barang masuk (Receipt IT In) dan keluar (IT Out)
            </p>
          </div>

          {/* Tab Pill Selector */}
          <div style={{ display: "flex", background: "var(--bg-surface)", padding: "4px", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
            <button
              type="button"
              onClick={() => setMainTab("overview")}
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: "8px",
                border: "none",
                background: mainTab === "overview" ? "var(--color-primary)" : "transparent",
                color: mainTab === "overview" ? "#000" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <span>🏭</span>
              <span>Ringkasan Multi Gudang</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMainTab("transfers");
                loadTransfers();
              }}
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: "8px",
                border: "none",
                background: mainTab === "transfers" ? "var(--color-primary)" : "transparent",
                color: mainTab === "transfers" ? "#000" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <span>🔄</span>
              <span>Tracking Transfer IT (In / Out)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW MULTI GUDANG ─── */}
      {mainTab === "overview" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">🏭</div>
              <div className="kpi-value">{data.length || "—"}</div>
              <div className="kpi-label">Gudang Aktif</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-icon primary">📦</div>
              <div className="kpi-value">{fmt(totalOnHand)}</div>
              <div className="kpi-label">Total On Hand (Fisik)</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-icon primary">✅</div>
              <div className="kpi-value">{fmt(totalItem)}</div>
              <div className="kpi-label">Total Item Tersedia</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-icon primary">⚠️</div>
              <div className="kpi-value" style={{ color: totalLowStock > 0 ? "var(--color-danger)" : undefined }}>
                {totalLowStock}
              </div>
              <div className="kpi-label">Gudang Stok Rendah</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: hasFinancial ? "1fr 1fr" : "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Kapasitas Chart */}
            <div className="chart-container">
              <div className="card-header">
                <div className="card-title">Kapasitas vs On Hand (Unit) per Area</div>
              </div>
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(350, areaData.length * 40)}>
                  <BarChart data={areaData} layout="vertical" margin={{ left: 10, top: 10, right: 20 }}>
                    <defs>
                      <linearGradient id="colorKapasitas" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#268AFF" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#268AFF" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="colorOnHand" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#36F097" stopOpacity={1} />
                        <stop offset="100%" stopColor="#36F097" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} />
                    <YAxis type="category" dataKey="nama_gudang" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} width={180} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 6, color: "var(--text-primary)" }}
                      itemStyle={{ color: "var(--text-primary)" }}
                      formatter={(v: any, name: any) => [fmt(v as number), name === "kapasitas_max" ? "Kapasitas Max" : "On Hand"]}
                    />
                    <Bar dataKey="kapasitas_max" fill="url(#colorKapasitas)" radius={[0, 4, 4, 0]} barSize={14} />
                    <Bar dataKey="total_on_hand" fill="url(#colorOnHand)" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {loading ? "Memuat..." : "Belum ada data"}
                </div>
              )}
            </div>

            {/* Nilai Persediaan Chart (Only rendered if financial access is allowed) */}
            {hasFinancial && (
              <div className="chart-container">
                <div className="card-header">
                  <div className="card-title">Nilai Persediaan per Area</div>
                </div>
                {areaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={areaData} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorNilai" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#1882FF" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#36EBCA" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                      <XAxis dataKey="nama_gudang" tick={{ fill: "var(--text-secondary)", fontSize: 9, angle: -45, textAnchor: "end" }} height={60} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 6, color: "var(--text-primary)" }}
                        itemStyle={{ color: "var(--text-primary)" }}
                        formatter={(v: any) => [fmt(v as number, "Rp "), "Nilai"]}
                      />
                      <Bar dataKey="total_nilai" radius={[4, 4, 0, 0]} fill="url(#colorNilai)" barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {loading ? "Memuat..." : "Belum ada data"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warehouse Table Section with Search & Branch Filter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Cari ID, Gudang, Kontak, DSM, Telepon, Alamat..."
                  value={searchWh}
                  onChange={(e) => setSearchWh(e.target.value)}
                  style={{
                    padding: "0.55rem 0.75rem 0.55rem 2.2rem",
                    borderRadius: "6px",
                    border: "1px solid var(--bg-border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    minWidth: "300px"
                  }}
                />
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  🔍
                </span>
                {searchWh && (
                  <button
                    onClick={() => setSearchWh("")}
                    style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                style={{
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <option value="all">Semua Cabang ({branchList.length})</option>
                {branchList.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                style={{
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <option value="all">Semua Area</option>
                <option value="CPA01">CPA01</option>
                <option value="CPA02">CPA02</option>
                <option value="CPA03">CPA03</option>
                <option value="HO">HO</option>
              </select>
              <button
                type="button"
                onClick={handleExportWarehouseExcel}
                disabled={exportingWh || loading || filteredWarehouses.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0.55rem 0.9rem",
                  borderRadius: "6px",
                  border: "1px solid #16a34a",
                  background: "#15803d",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: exportingWh || loading || filteredWarehouses.length === 0 ? "not-allowed" : "pointer",
                  opacity: exportingWh || loading || filteredWarehouses.length === 0 ? 0.6 : 1,
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
                title="Download Master Data & Stok Gudang format Excel (.xlsx)"
              >
                {exportingWh ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Mengekspor...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Export Excel</span>
                  </>
                )}
              </button>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Menampilkan <strong style={{ color: "var(--text-primary)" }}>{filteredWarehouses.length}</strong> dari {data.length} gudang
            </div>
          </div>

          {/* Warehouse Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>ID</th>
                    <th>Nama Gudang</th>
                    <th>Kantor / Cabang</th>
                    <th style={{ textAlign: "center" }}>Code Area</th>
                    <th>Kontak Person</th>
                    <th>DSM</th>
                    <th>Telepon</th>
                    <th style={{ textAlign: "right" }}>On Hand</th>
                    <th style={{ textAlign: "right" }}>Available</th>
                    {hasFinancial && <th style={{ textAlign: "right" }}>Nilai (Rp)</th>}
                    <th style={{ textAlign: "right" }}>Low Stock</th>
                    <th style={{ textAlign: "right" }}>Stok Kosong</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: hasFinancial ? 12 : 11 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={hasFinancial ? 12 : 11} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Tidak ada data gudang yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map((row) => {
                      const area = row.code_area || getWarehouseCodeArea(row.id_gudang, row.nama_gudang, row.nama_kantor);
                      const bStyle = getCodeAreaBadgeStyle(area);
                      return (
                      <tr key={row.id_gudang}>
                        <td>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.12)",
                            color: "#60a5fa",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.78rem"
                          }}>
                            {row.id_gudang}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.nama_gudang}</div>
                          {row.alamat && (
                            <div style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              marginTop: "3px",
                              lineHeight: "1.3"
                            }} title={row.alamat}>
                              📍 {row.alamat.split("\n")[0]}
                              {row.alamat.includes("\n") ? "..." : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: "rgba(255, 255, 255, 0.05)",
                            fontSize: "0.78rem",
                            border: "1px solid var(--bg-border)",
                            whiteSpace: "nowrap"
                          }}>
                            {row.nama_kantor || row.lokasi || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            background: bStyle.bg,
                            color: bStyle.color,
                            border: bStyle.border,
                            whiteSpace: "nowrap"
                          }}>
                            {area}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-primary)", fontSize: "0.82rem" }}>
                          {row.kontak_person ? (
                            <span>👤 {row.kontak_person}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-primary)", fontSize: "0.82rem" }}>
                          {row.dsm ? (
                            <span>👔 {row.dsm}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {row.telpon ? (
                            <span style={{ fontFamily: "monospace" }}>📞 {row.telpon}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>{Number(row.total_on_hand || 0).toLocaleString("id")}</td>
                        <td style={{ textAlign: "right", color: "var(--color-primary)", fontWeight: 600 }}>
                          {Number(row.total_available || 0).toLocaleString("id")}
                        </td>
                        {hasFinancial && (
                          <td style={{ textAlign: "right" }}>{fmt(row.total_nilai, "Rp ")}</td>
                        )}
                        <td style={{ textAlign: "right", color: row.low_stock_count > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                          {row.low_stock_count}
                        </td>
                        <td style={{ textAlign: "right", color: row.zero_stock_count > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                          {row.zero_stock_count}
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

      {/* ─── TAB 2: TRACKING BARANG MASUK & KELUAR (IT) ─── */}
      {mainTab === "transfers" && (
        <>
          {/* KPI Mini Grid */}
          <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">🔄</div>
              <div className="kpi-value">{transferCounts.total}</div>
              <div className="kpi-label">Total Mutasi IT</div>
            </div>
            <div className="kpi-card primary">
              <div className="kpi-icon primary" style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34d399" }}>📥</div>
              <div className="kpi-value" style={{ color: "#34d399" }}>{transferCounts.inCount}</div>
              <div className="kpi-label">Receipt IT In (Masuk)</div>
            </div>
            <div className="kpi-card primary">
              <div className="kpi-icon primary" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>📤</div>
              <div className="kpi-value" style={{ color: "#38bdf8" }}>{transferCounts.outCount}</div>
              <div className="kpi-label">IT Out (Keluar)</div>
            </div>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">✅</div>
              <div className="kpi-value">{transferCounts.receiptCount}</div>
              <div className="kpi-label">Status Receipt / Selesai</div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "8px",
            }}
          >
            {/* Direction Filter Pills */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setTransferDirection("all")}
                className={`btn ${transferDirection === "all" ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                Semua Transfer ({transferCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setTransferDirection("in")}
                className={`btn ${transferDirection === "in" ? "btn-primary" : "btn-ghost"} btn-sm`}
                style={transferDirection === "in" ? { background: "#059669", borderColor: "#059669" } : {}}
              >
                📥 Receipt IT In (Masuk) ({transferCounts.inCount})
              </button>
              <button
                type="button"
                onClick={() => setTransferDirection("out")}
                className={`btn ${transferDirection === "out" ? "btn-primary" : "btn-ghost"} btn-sm`}
                style={transferDirection === "out" ? { background: "#0284c7", borderColor: "#0284c7" } : {}}
              >
                📤 IT Out (Keluar) ({transferCounts.outCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "260px" }}>
              <input
                type="text"
                placeholder="Cari No IT, IO, gudang..."
                value={searchTransfer}
                onChange={(e) => setSearchTransfer(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "#94a3b8" }}>
                🔍
              </span>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: "Semua Status" },
              { key: "draft", label: "⏳ Draft" },
              { key: "send", label: "📤 Send" },
              { key: "receipt", label: "✅ Receipt" },
              { key: "cancel", label: "❌ Cancel" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTransferStatus(tab.key)}
                className={`btn ${transferStatus === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Transfers Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IT No</th>
                    <th>Tanggal</th>
                    <th>Arah / Tipe</th>
                    <th>Gudang Asal</th>
                    <th>Gudang Tujuan</th>
                    <th>Nomor IO</th>
                    <th>Receive Note</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTransfers ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        Tidak ditemukan mutasi Internal Transfer (IT).
                      </td>
                    </tr>
                  ) : (
                    paginatedTransfers.map((row) => {
                      const stCode = (row.status || "").trim().toUpperCase();
                      const badge = IT_STATUS_BADGE[stCode] || { label: row.status || "—", bg: "var(--bg-hover)", color: "var(--text-primary)" };
                      const isReceiptIn = row.transfer_type?.includes("Masuk") || row.transfer_type?.includes("IT In");
                      const isItOut = row.transfer_type?.includes("Keluar") || row.transfer_type?.includes("IT Out");

                      return (
                        <tr key={row.nomor}>
                          <td className="font-mono" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                            {row.nomor}
                          </td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{formatDisplayDate(row.tanggal)}</td>
                          <td>
                            <span
                              style={{
                                padding: "0.2rem 0.55rem",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                background: isReceiptIn ? "rgba(52, 211, 153, 0.15)" : isItOut ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.12)",
                                color: isReceiptIn ? "#34d399" : isItOut ? "#38bdf8" : "var(--text-secondary)",
                                border: `1px solid ${isReceiptIn ? "rgba(52, 211, 153, 0.3)" : isItOut ? "rgba(56, 189, 248, 0.3)" : "rgba(148, 163, 184, 0.2)"}`,
                                display: "inline-block",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {row.transfer_type || "Transfer"}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{row.gudang_asal || "—"}</td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{row.gudang_tujuan || "—"}</td>
                          <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>{row.nomor_io || "—"}</td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.receive_note || "—"}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                background: badge.bg,
                                color: badge.color,
                                whiteSpace: "nowrap"
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenTransferDetail(row.nomor)}
                              style={{
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                color: "#38bdf8",
                                borderRadius: "4px",
                                padding: "0.25rem 0.6rem",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: 500
                              }}
                              title="Lihat rincian barang"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination Footer (20 Baris per Page) ─── */}
            {filteredTransfers.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.85rem 1.25rem",
                  borderTop: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  fontSize: "0.82rem",
                }}
              >
                {/* Info Baris */}
                <div style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <span>
                    Menampilkan <strong style={{ color: "var(--text-primary)" }}>{startRecord} - {endRecord}</strong> dari{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{filteredTransfers.length}</strong> mutasi IT
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "4px",
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38bdf8",
                      fontWeight: 600,
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                    }}
                  >
                    20 baris per page
                  </span>
                </div>

                {/* Navigasi Tombol Halaman */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.55rem",
                      opacity: currentPage <= 1 ? 0.35 : 1,
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      border: "1px solid var(--bg-border)",
                    }}
                    title="Halaman Pertama"
                  >
                    « Pertama
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.55rem",
                      opacity: currentPage <= 1 ? 0.35 : 1,
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      border: "1px solid var(--bg-border)",
                    }}
                    title="Halaman Sebelumnya"
                  >
                    ‹ Sebelumnya
                  </button>

                  {/* Angka Halaman Dinamis */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((pageNum, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && pageNum - prev > 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsis && (
                            <span style={{ padding: "0 0.25rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`btn ${isActive ? "btn-primary" : "btn-ghost"} btn-sm`}
                            style={{
                              fontSize: "0.75rem",
                              minWidth: "28px",
                              padding: "0.25rem 0.5rem",
                              fontWeight: isActive ? 700 : 500,
                              background: isActive ? "var(--color-primary)" : "transparent",
                              color: isActive ? "#000" : "var(--text-primary)",
                              border: isActive ? "1px solid var(--color-primary)" : "1px solid var(--bg-border)",
                            }}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.55rem",
                      opacity: currentPage >= totalPages ? 0.35 : 1,
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      border: "1px solid var(--bg-border)",
                    }}
                    title="Halaman Selanjutnya"
                  >
                    Selanjutnya ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.55rem",
                      opacity: currentPage >= totalPages ? 0.35 : 1,
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      border: "1px solid var(--bg-border)",
                    }}
                    title="Halaman Terakhir"
                  >
                    Terakhir »
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── MODAL DETAIL TRANSFER (IT) ─── */}
      {selectedTransfer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => setSelectedTransfer(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
              padding: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>📋</span>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Detail Internal Transfer: {selectedTransfer.nomor}
                  </h3>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Referensi No. IO: <strong style={{ color: "#38bdf8" }}>{selectedTransfer.header?.nomor_io || "—"}</strong> | Tanggal: {formatDisplayDate(selectedTransfer.header?.tanggal)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  padding: "0.2rem 0.5rem"
                }}
              >
                ✕
              </button>
            </div>

            {/* Header Info Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.75rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                fontSize: "0.8rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Gudang Asal:</span>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedTransfer.header?.gudang_asal || "—"}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Gudang Tujuan:</span>
                <div style={{ fontWeight: 600, color: "#38bdf8" }}>{selectedTransfer.header?.gudang_tujuan || "—"}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Driver / Kendaraan:</span>
                <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {selectedTransfer.header?.driver || "—"} {selectedTransfer.header?.nopol ? `(${selectedTransfer.header?.nopol})` : ""}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Transporter:</span>
                <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{selectedTransfer.header?.transporter || "Internal"}</div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Daftar Barang yang Dimutasi
              </div>
              <div style={{ overflowX: "auto", border: "1px solid var(--bg-border)", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)", textAlign: "left" }}>
                      <th style={{ padding: "0.6rem 0.8rem", width: "40px", color: "var(--text-secondary)" }}>No</th>
                      <th style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>Nama Barang</th>
                      <th style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>Kode</th>
                      <th style={{ padding: "0.6rem 0.8rem", textAlign: "right", color: "var(--text-secondary)" }}>Qty</th>
                      <th style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>Satuan</th>
                      <th style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>No IBC / Skid Tank</th>
                      <th style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items && selectedTransfer.items.length > 0 ? (
                      selectedTransfer.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                          <td style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)" }}>{item.no || idx + 1}</td>
                          <td style={{ padding: "0.6rem 0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.nama_barang}</td>
                          <td style={{ padding: "0.6rem 0.8rem", fontFamily: "monospace", color: "#38bdf8" }}>{item.kode_barang}</td>
                          <td style={{ padding: "0.6rem 0.8rem", textAlign: "right", fontWeight: 600, color: "#10B981" }}>
                            {Number(item.qty || 0).toLocaleString("id")}
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>{item.satuan || "Unit"}</td>
                          <td style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)" }}>
                            {item.no_ibc || item.no_skid_tank || "—"}
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem", color: "var(--text-secondary)" }}>{item.keterangan || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Tidak ada rincian barang.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.75rem", borderTop: "1px solid var(--bg-border)" }}>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="btn btn-primary btn-sm"
                style={{ padding: "0.45rem 1.2rem", fontSize: "0.825rem" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
