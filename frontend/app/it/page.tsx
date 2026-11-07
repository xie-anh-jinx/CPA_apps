import React from "react";
import Link from "next/link";
import { Cpu, Server, Laptop, Network, Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IT & Infrastruktur | CPA Platform",
  description: "Modul Manajemen Aset IT, Infrastruktur & Helpdesk",
};

export default function ItPage() {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: "3rem" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
            }}
          >
            <Cpu size={20} />
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Divisi IT &amp; Infrastruktur
              </h1>
              <span className="badge-status badge-purple">Dalam Pengembangan</span>
            </div>
            <p
              className="asset-header-subtitle"
              data-text-light="black"
              style={{ margin: "2px 0 0", fontSize: "0.8rem" }}
            >
              PT Cahaya Pengajaran Abadi · Information Technology Management System
            </p>
          </div>
        </div>

        <Link href="/assets/fleet" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", gap: "6px" }}>
          <ArrowLeft size={14} /> Ke Armada Kendaraan
        </Link>
      </div>

      {/* Empty State / Coming Soon Hero */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px dashed var(--bg-border)",
          borderRadius: "14px",
          padding: "3.5rem 1.5rem",
          textAlign: "center",
          maxWidth: "750px",
          margin: "0 auto 2rem",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--bg-purple-subtle)",
            color: "var(--text-purple)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Server size={32} />
        </div>

        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
          Modul IT Sedang Disiapkan
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "560px", margin: "0 auto 1.5rem" }}>
          Halaman ini dikosongkan sementara dan siap untuk dihubungkan dengan modul inventaris aset IT, manajemen lisensi software ERP, monitoring jaringan cabang, serta sistem helpdesk tiket internal.
        </p>

        {/* Feature roadmap pill tags */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            "💻 Aset PC & Laptop",
            "🌐 Network & VPN Cabang",
            "🗄️ Server & Database",
            "🔑 Lisensi ERP & Email",
            "🎫 Helpdesk & Tiket IT",
          ].map((tag, idx) => (
            <span
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--bg-border)",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

