"use client";
import { useState, useEffect, useCallback } from "react";
import { apiCustomers } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CustomerData {
  id_kontak: string;
  nama_customer: string;
  telepon: string;
  email: string;
  segment: string;
  total_orders: number;
  total_revenue: number;
  last_purchase_date: string;
}

interface Segmentation {
  segment: string;
  jumlah: number;
  total_revenue: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  "active": "#3AC977",
  "at_risk": "#FFB323",
  "churned": "#FF5E5E",
  "dormant": "#8E8E93"
};

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

export default function CustomerTab() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [segments, setSegments] = useState<Segmentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [c360, setC360] = useState<any>(null);
  const [c360Loading, setC360Loading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [custList, segList] = await Promise.allSettled([
        apiCustomers.list({ limit: 100 }),
        apiCustomers.segmentation()
      ]);
      if (custList.status === "fulfilled") setCustomers(custList.value.data);
      if (segList.status === "fulfilled") setSegments(segList.value.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const load360 = async (id: string) => {
    setSelectedId(id);
    setC360Loading(true);
    setC360(null);
    try {
      const res = await apiCustomers.view360(id);
      setC360(res.data);
    } catch {
      // ignore
    } finally {
      setC360Loading(false);
    }
  };

  return (
    <div>
      {/* SEGMENTATION CHART & SUMMARY */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* KPI List per segment */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {segments.map((seg) => (
            <div key={seg.segment} style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{seg.segment.replace("_", " ")}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: SEGMENT_COLORS[seg.segment] || "var(--text-primary)" }}>
                  {seg.jumlah} Pelanggan
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Revenue</div>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{fmt(seg.total_revenue, "Rp ")}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--bg-border)" }}>
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Customer Segmentation</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={segments} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} tickFormatter={(v) => fmt(v)} axisLine={false} />
              <YAxis type="category" dataKey="segment" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} tickFormatter={(v) => v.replace("_", " ").toUpperCase()} axisLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: "#4B4F52", border: "none", borderRadius: 4, color: "#FFF" }}
                itemStyle={{ color: "#FFF" }}
                formatter={(v: any) => [fmt(v as number), "Jumlah"]}
              />
              <Bar dataKey="jumlah" radius={[0, 4, 4, 0]} barSize={24}>
                {segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.segment] || "#8884d8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CUSTOMER LIST */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Direktori Pelanggan & LTV</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                <th style={{ padding: "1rem" }}>Nama Customer</th>
                <th style={{ padding: "1rem" }}>Kontak</th>
                <th style={{ padding: "1rem" }}>Segmentasi</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>LTV (Total Revenue)</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Terakhir Transaksi</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id_kontak} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td style={{ padding: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.nama_customer}</td>
                  <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {c.telepon || c.email || "—"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      background: `${SEGMENT_COLORS[c.segment] || "#888"}20`, 
                      color: SEGMENT_COLORS[c.segment] || "#888",
                      padding: "0.25rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
                      textTransform: "capitalize"
                    }}>
                      {c.segment?.replace("_", " ") || "Unknown"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>{fmt(c.total_revenue, "Rp ")}</td>
                  <td style={{ padding: "1rem", textAlign: "right", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString("id") : "—"}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button onClick={() => load360(c.id_kontak)} style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem"
                    }}>
                      Lihat 360
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 360 */}
      {selectedId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "600px", maxWidth: "90%", background: "var(--bg-base)", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
            
            {/* Header Modal */}
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Customer 360 View</h2>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ID: {selectedId}</div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            {/* Content Modal */}
            <div style={{ padding: "1.5rem", flex: 1 }}>
              {c360Loading ? (
                <div style={{ color: "var(--text-muted)" }}>Memuat data Customer 360...</div>
              ) : c360 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-card)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--bg-border)" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
                      {c360.profile?.nama_customer?.charAt(0) || "C"}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>{c360.profile?.nama_customer}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{c360.profile?.telepon} • {c360.profile?.email}</div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>Produk Sering Dibeli</h3>
                    {c360.top_products?.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {c360.top_products.map((p: any, i: number) => (
                          <li key={i} style={{ marginBottom: "0.25rem" }}>
                            <strong style={{ color: "var(--text-primary)" }}>{p.nama_barang}</strong> ({p.total_qty} unit) — {fmt(p.total_value, "Rp ")}
                          </li>
                        ))}
                      </ul>
                    ) : <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Belum ada histori pembelian produk.</div>}
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>Riwayat Pesanan</h3>
                    {c360.recent_orders?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {c360.recent_orders.map((o: any) => (
                          <div key={o.nomor} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{o.nomor}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(o.tanggal).toLocaleDateString("id")}</div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                              {fmt(o.grandtotal, "Rp ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Belum ada histori pesanan.</div>}
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>Aktivitas & Komunikasi</h3>
                    {c360.crm_activities?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {c360.crm_activities.map((act: any) => (
                          <div key={act.id} style={{ background: "var(--bg-card)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{act.subject} ({act.activity_type})</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(act.activity_date).toLocaleDateString("id")}</span>
                            </div>
                            {act.description && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{act.description}</div>}
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Belum ada histori aktivitas.</div>}
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>Keluhan & Tiket Layanan</h3>
                    {c360.complaints?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {c360.complaints.map((c: any) => (
                          <div key={c.id} style={{ background: "var(--bg-card)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)", borderLeft: `4px solid ${c.status === "resolved" ? "#3AC977" : "#FF5E5E"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{c.subject}</strong>
                              <span style={{ fontSize: "0.75rem", background: "var(--bg-surface)", padding: "2px 6px", borderRadius: "4px" }}>{c.status}</span>
                            </div>
                            {c.description && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{c.description}</div>}
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tidak ada keluhan.</div>}
                  </div>

                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
