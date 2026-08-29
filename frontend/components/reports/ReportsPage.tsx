"use client";
import { useState } from "react";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("inventory");
  const [dateRange, setDateRange] = useState("this_month");
  
  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Laporan</h1>
        <p className="page-subtitle">Pusat ekspor laporan dan analytics</p>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Tipe Laporan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { id: "inventory", label: "Stok Gudang", desc: "Posisi stok, HPP, nilai persediaan" },
              { id: "sales", label: "Penjualan & Piutang", desc: "Omzet, per salesman, invoice open" },
              { id: "distributions", label: "Pengiriman (DO)", desc: "Status DO, SLA pengiriman" },
              { id: "crm", label: "CRM & Prospek", desc: "Pipeline, aktivitas, komplain" }
            ].map(type => (
              <label 
                key={type.id} 
                style={{
                  display: "flex", gap: "0.75rem", padding: "1rem", 
                  border: `1px solid ${reportType === type.id ? "var(--color-primary)" : "var(--bg-border)"}`,
                  background: reportType === type.id ? "rgba(59,130,246,0.1)" : "var(--bg-surface)",
                  borderRadius: "var(--radius-md)", cursor: "pointer"
                }}
              >
                <input 
                  type="radio" 
                  name="reportType" 
                  value={type.id} 
                  checked={reportType === type.id}
                  onChange={(e) => setReportType(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{type.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{type.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Periode</div>
          <select 
            className="input" 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: "100%", maxWidth: 300 }}
          >
            <option value="today">Hari Ini</option>
            <option value="this_week">Minggu Ini</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_month">Bulan Lalu</option>
            <option value="this_year">Tahun Ini</option>
            <option value="custom">Pilih Tanggal...</option>
          </select>
        </div>

        <div className="divider" />

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button className="btn btn-primary" onClick={() => alert("Fitur PDF sedang dalam pengembangan")}>
            <span>📄</span> Export PDF
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ background: "rgba(34,197,94,0.1)", color: "hsl(142,76%,55%)", border: "1px solid rgba(34,197,94,0.2)" }}
            onClick={() => {
              const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/export/csv?report_type=${reportType}&date_range=${dateRange}`;
              window.open(url, '_blank');
            }}
          >
            <span>📊</span> Export Excel (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
