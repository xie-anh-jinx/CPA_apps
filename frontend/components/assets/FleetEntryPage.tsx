"use client";

import React from "react";
import dynamic from "next/dynamic";

const FleetLogbookApp = dynamic(() => import("@/components/assets/FleetLogbookApp"), {
  ssr: false,
  loading: () => (
    <div className="fleet-logbook-root" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📝</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
        Memuat Formulir Armada...
      </div>
    </div>
  ),
});

export default function FleetEntryPage() {
  return <FleetLogbookApp initialView="vehicle" />;
}
