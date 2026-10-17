"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";

import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

const PAGE_TITLES: Record<string, string> = {
  "/": "Executive Dashboard",
  "/inventory": "Inventory Monitoring",
  "/warehouses": "Multi-Warehouse",
  "/sales": "Sales Monitoring",
  "/sales/orders": "Sales Order",
  "/distributions": "Distribusi",
  "/crm": "CRM & Customer 360",
  "/reports": "Laporan",
  "/settings": "Pengaturan",
  "/alerts": "Notifikasi & Alert",
  "/docs": "Dokumentasi Sistem & Teknis",
  "/docs/database-graph": "Database Graph",
};

export default function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isConnected, lastMessage } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

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
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
          }}
        >
          🔍
        </span>
      </div>

      {/* Connection Status */}
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

      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
        aria-label="Toggle dark/light theme"
      >
        {theme === "dark" ? (
          <Sun size={17} style={{ color: "#F59E0B" }} />
        ) : (
          <Moon size={17} style={{ color: "#0284C7" }} />
        )}
      </button>

      {/* User Avatar & Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        {currentUser ? (
          <>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {currentUser.full_name || currentUser.username}
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 500 }}>
                {currentUser.role === "sales_rep" 
                  ? "DSR - Sultanbatara" 
                  : (currentUser.role === "warehouse_staff" || currentUser.role === "warehouse") 
                  ? "Kepala Gudang & Admin Cabang" 
                  : (currentUser.role || "Admin")}
              </span>
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#1a1a1a",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={currentUser.full_name || "User"}
            >
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : "U"}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              padding: "0.38rem 0.85rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#1a1a1a",
              background: "var(--gradient-primary, #0D99FF)",
              borderRadius: "8px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
            }}
          >
            Masuk / Login
          </Link>
        )}
      </div>
    </header>
  );
}
