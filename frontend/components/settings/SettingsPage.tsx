"use client";
import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-subtitle">Konfigurasi sistem, notifikasi, dan preferensi</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem" }}>
        {/* Sidebar Nav Settings */}
        <div className="card" style={{ padding: "0.5rem" }}>
          {[
            { id: "general", label: "Umum", icon: "⚙️" },
            { id: "sync", label: "Sinkronisasi", icon: "🔄" },
            { id: "alerts", label: "Rules Notifikasi", icon: "🔔" },
            { id: "users", label: "Manajemen User", icon: "👥" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
                padding: "0.75rem 1rem", border: "none", background: activeTab === tab.id ? "var(--bg-hover)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
                fontWeight: activeTab === tab.id ? 600 : 500, fontSize: "0.875rem"
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="card">
          {activeTab === "general" && (
            <div>
              <div className="card-title" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Pengaturan Umum</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>Nama Perusahaan</label>
                  <input className="input" defaultValue="CPA Enterprise" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>Zona Waktu</label>
                  <select className="input">
                    <option>WIB (Asia/Jakarta)</option>
                    <option>WITA (Asia/Makassar)</option>
                    <option>WIT (Asia/Jayapura)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>Tema Tampilan</label>
                  <select 
                    className="input" 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                  >
                    <option value="dark">🌙 Dark Mode (Figma Dark Theme)</option>
                    <option value="light">☀️ Light Mode (Modern Clean Theme)</option>
                  </select>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <button className="btn btn-primary" onClick={() => alert("Pengaturan berhasil disimpan.")}>Simpan Perubahan</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sync" && (
            <div>
              <div className="card-title" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Konfigurasi Sinkronisasi</div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Pengaturan interval polling dari database operasional existing ke analytics layer.
              </p>
              
              <table className="data-table" style={{ border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)" }}>
                <thead>
                  <tr>
                    <th>Modul Data</th>
                    <th>Interval Default</th>
                    <th>Custom Interval (detik)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Inventory & Stok</td>
                    <td>15s</td>
                    <td><input type="number" className="input" defaultValue="15" style={{ width: 80, padding: "0.2rem 0.5rem" }} /></td>
                    <td><span className="badge-status badge-ok">Active</span></td>
                  </tr>
                  <tr>
                    <td>Sales Orders & Invoices</td>
                    <td>30s</td>
                    <td><input type="number" className="input" defaultValue="30" style={{ width: 80, padding: "0.2rem 0.5rem" }} /></td>
                    <td><span className="badge-status badge-ok">Active</span></td>
                  </tr>
                  <tr>
                    <td>Distribusi & DO</td>
                    <td>60s</td>
                    <td><input type="number" className="input" defaultValue="60" style={{ width: 80, padding: "0.2rem 0.5rem" }} /></td>
                    <td><span className="badge-status badge-ok">Active</span></td>
                  </tr>
                  <tr>
                    <td>Customer Data</td>
                    <td>300s</td>
                    <td><input type="number" className="input" defaultValue="300" style={{ width: 80, padding: "0.2rem 0.5rem" }} /></td>
                    <td><span className="badge-status badge-ok">Active</span></td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn-primary">Update Interval Celery</button>
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div>
              <div className="card-title" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Rules Notifikasi (Alerts)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Peringatan Stok Rendah (Low Stock)", desc: "Trigger ketika stok_available < stok_min", active: true },
                  { label: "Peringatan Overstock", desc: "Trigger ketika stok_available > stok_max", active: true },
                  { label: "Delivery Order Terlambat", desc: "Trigger ketika DO berstatus 'Draft' melebihi 24 jam", active: true },
                  { label: "Piutang Jatuh Tempo", desc: "Trigger ketika Invoice belum lunas setelah due_date", active: false },
                ].map((rule, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rule.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{rule.desc}</div>
                    </div>
                    <div style={{ 
                      width: 40, height: 20, borderRadius: 10, background: rule.active ? "var(--color-primary)" : "var(--bg-border)",
                      position: "relative", cursor: "pointer"
                    }}>
                      <div style={{
                        position: "absolute", top: 2, left: rule.active ? 22 : 2, width: 16, height: 16, 
                        borderRadius: "50%", background: "white", transition: "left 0.2s"
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Manajemen user akan dikelola melalui modul SSO atau RBAC terpusat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
