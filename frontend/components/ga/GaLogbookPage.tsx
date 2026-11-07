"use client";

import React from "react";
import dynamic from "next/dynamic";

const GaLogbookApp = dynamic(() => import("@/components/ga/GaLogbookApp"), {
  ssr: false,
  loading: () => (
    <div className="ga-logbook-root" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📋</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
        Memuat Logbook General Affairs...
      </div>
      <div style={{ fontSize: "0.85rem" }}>Menyiapkan data operasional dan rekap logbook...</div>
    </div>
  ),
});

export default function GaLogbookPage() {
  return <GaLogbookApp initialView="dashboard" />;
}

