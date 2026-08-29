"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiWarehouses } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface WarehouseData {
  id_gudang: string;
  nama_gudang: string;
  nama_kantor: string;
  lokasi: string;
  kapasitas_max: number;
  total_on_hand: number;
  total_available: number;
  total_nilai: number;
  low_stock_count: number;
  zero_stock_count: number;
}

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

export default function WarehousePage() {
  const [data, setData] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiWarehouses.comparison();
      setData(res.data || []);
    } catch {
      // API error handled via interceptor / quiet fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalNilai = data.reduce((acc, curr) => acc + (curr.total_nilai || 0), 0);
  const totalItem = data.reduce((acc, curr) => acc + (curr.total_available || 0), 0);

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
      map[area].total_nilai += d.total_nilai || 0;
    });
    return Object.values(map);
  }, [data]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Multi-Warehouse</h1>
        <p className="page-subtitle">Komparasi stok dan performa antargudang</p>
      </div>

      <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">🏭</div>
          <div className="kpi-value">{data.length || "—"}</div>
          <div className="kpi-label">Gudang Aktif</div>
        </div>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">💰</div>
          <div className="kpi-value">{fmt(totalNilai, "Rp ")}</div>
          <div className="kpi-label">Total Nilai Persediaan</div>
        </div>
        <div className="kpi-card primary">
          <div className="kpi-icon primary">📦</div>
          <div className="kpi-value">{fmt(totalItem)}</div>
          <div className="kpi-label">Total Item Tersedia</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Kapasitas Chart */}
        <div className="chart-container">
          <div className="card-header">
            <div className="card-title">Kapasitas vs On Hand (Unit) per Area</div>
          </div>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(400, areaData.length * 45)}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} />
                <YAxis type="category" dataKey="nama_gudang" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} width={200} />
                <Tooltip
                  contentStyle={{ background: "#4B4F52", border: "none", borderRadius: 4, color: "#FFF", boxShadow: "0px 0px 12px rgba(0,0,0,0.2)" }}
                  itemStyle={{ color: "#FFF" }}
                  formatter={(v: any, name: any) => [fmt(v as number), name === "kapasitas_max" ? "Kapasitas Max" : "On Hand"]}
                />
                <Bar dataKey="kapasitas_max" fill="url(#colorKapasitas)" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="total_on_hand" fill="url(#colorOnHand)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {loading ? "Memuat..." : "Belum ada data"}
            </div>
          )}
        </div>

        {/* Nilai Persediaan Chart */}
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="nama_gudang" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 9, angle: -45, textAnchor: "end" }} height={60} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#4B4F52", border: "none", borderRadius: 4, color: "#FFF", boxShadow: "0px 0px 12px rgba(0,0,0,0.2)" }}
                  itemStyle={{ color: "#FFF" }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  formatter={(v: any) => [fmt(v as number, "Rp "), "Nilai"]}
                />
                <Bar dataKey="total_nilai" radius={[4, 4, 0, 0]} fill="url(#colorNilai)" barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {loading ? "Memuat..." : "Belum ada data"}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Gudang</th>
                <th>Lokasi</th>
                <th style={{ textAlign: "right" }}>Kapasitas Max</th>
                <th style={{ textAlign: "right" }}>On Hand</th>
                <th style={{ textAlign: "right" }}>Available</th>
                <th style={{ textAlign: "right" }}>Nilai (Rp)</th>
                <th style={{ textAlign: "right" }}>Low Stock</th>
                <th style={{ textAlign: "right" }}>Stok Kosong</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    Tidak ada data gudang.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id_gudang}>
                    <td style={{ fontWeight: 600 }}>{row.nama_gudang}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{row.lokasi || "—"}</td>
                    <td style={{ textAlign: "right" }}>{Number(row.kapasitas_max || 0).toLocaleString("id")}</td>
                    <td style={{ textAlign: "right" }}>{Number(row.total_on_hand || 0).toLocaleString("id")}</td>
                    <td style={{ textAlign: "right", color: "var(--color-primary)", fontWeight: 600 }}>
                      {Number(row.total_available || 0).toLocaleString("id")}
                    </td>
                    <td style={{ textAlign: "right" }}>{fmt(row.total_nilai, "Rp ")}</td>
                    <td style={{ textAlign: "right", color: row.low_stock_count > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                      {row.low_stock_count}
                    </td>
                    <td style={{ textAlign: "right", color: row.zero_stock_count > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                      {row.zero_stock_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
