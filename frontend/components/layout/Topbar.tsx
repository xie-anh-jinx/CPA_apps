"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";

import { Menu } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Executive Dashboard",
  "/inventory": "Inventory Monitoring",
  "/warehouses": "Multi-Warehouse",
  "/sales": "Sales Monitoring",
  "/distributions": "Distribusi",
  "/crm": "CRM & Customer 360",
  "/reports": "Laporan",
  "/settings": "Pengaturan",
  "/alerts": "Notifikasi & Alert",
};

export default function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const { isConnected, lastMessage } = useWebSocket();

  const title = PAGE_TITLES[pathname] || "CPA Platform";

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
        <button 
          className="hamburger-btn"
          onClick={onToggleSidebar}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)" }}
        >
          <Menu size={20} />
        </button>
        <h1
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Search */}
      <div style={{ position: "relative", width: 240 }}>
        <input
          className="input"
          type="text"
          placeholder="Cari produk, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2rem", fontSize: "0.8125rem" }}
        />
        <span
          style={{
            position: "absolute",
            left: "0.6rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
          }}
        >
          🔍
        </span>
      </div>

      {/* Sync Status Indicator */}
      <div
        title={isConnected ? `Terhubung (Live Sync). Pesan terakhir: ${lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleTimeString() : 'Belum ada'}` : "Terputus dari server realtime"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.75rem",
          color: isConnected ? "var(--text-primary)" : "var(--text-muted)",
          padding: "0.4rem 0.75rem",
          background: "var(--bg-surface)",
          borderRadius: "20px",
          border: "1px solid var(--bg-border)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isConnected ? "hsl(142,76%,45%)" : "hsl(0,84%,60%)",
            display: "inline-block",
            animation: isConnected ? "pulse 2s infinite" : "none",
          }}
        />
        {isConnected ? "Live" : "Offline"}
      </div>

      {/* User Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--gradient-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
        title="Admin"
      >
        A
      </div>
    </header>
  );
}
