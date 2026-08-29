"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Radar, 
  ScanBarcode, 
  Network, 
  CandlestickChart, 
  Route, 
  HeartHandshake, 
  ScrollText, 
  SlidersHorizontal,
  BellRing,
  LogOut
} from "lucide-react";

interface NavGroup {
  label: string;
  items: {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/", icon: <Radar size={18} strokeWidth={1.5} />, label: "Executive Dashboard" },
    ],
  },
  {
    label: "Inventori",
    items: [
      { href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok" },
      { href: "/warehouses", icon: <Network size={18} strokeWidth={1.5} />, label: "Multi Gudang" },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/sales", icon: <CandlestickChart size={18} strokeWidth={1.5} />, label: "Sales Monitoring" },
      { href: "/distributions", icon: <Route size={18} strokeWidth={1.5} />, label: "Distribusi" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/crm", icon: <HeartHandshake size={18} strokeWidth={1.5} />, label: "CRM & Customer 360" },
    ],
  },
  {
    label: "Laporan",
    items: [
      { href: "/reports", icon: <ScrollText size={18} strokeWidth={1.5} />, label: "Laporan" },
      { href: "/settings", icon: <SlidersHorizontal size={18} strokeWidth={1.5} />, label: "Pengaturan" },
    ],
  },
];

export default function Sidebar({ 
  alertCount = 0,
  isOpen = false,
  onClose
}: { 
  alertCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("cpa_token");
    router.push("/login");
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Close button for mobile */}
      <button 
        className="sidebar-close-btn"
        onClick={onClose}
        style={{ display: "none" }} // Hidden by default, shown in CSS
      >
        ✕
      </button>

      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: "1.5rem 1rem", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "center" }}>
        <img 
          src="/images/logo-cpa-white.png" 
          alt="CPA Logo" 
          style={{ width: "100%", maxWidth: "90px", height: "auto", objectFit: "contain" }} 
        />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <span style={{ display: "flex", alignItems: "center", color: pathname === item.href ? "var(--primary)" : "var(--text-muted)" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}

        {/* Alerts link */}
        <div className="divider" />
        <Link
          href="/alerts"
          className={`nav-item ${pathname === "/alerts" ? "active" : ""}`}
        >
          <span style={{ display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
            <BellRing size={18} strokeWidth={1.5} />
          </span>
          <span>Notifikasi</span>
          {alertCount > 0 && (
            <span className="badge">{alertCount > 99 ? "99+" : alertCount}</span>
          )}
        </Link>
      </nav>

      {/* Logout option */}
      <div className="divider" />
      <button 
        onClick={handleLogout}
        className="nav-item"
        style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "var(--text-critical)" }}
      >
        <span style={{ display: "flex", alignItems: "center" }}>
          <LogOut size={18} strokeWidth={1.5} />
        </span>
        <span>Keluar</span>
      </button>

      {/* Footer */}
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--bg-border)",
          fontSize: "0.7rem",
          color: "var(--text-muted)",
        }}
      >
        <div>CPA Platform v1.0</div>
        <div>© 2026</div>
      </div>
    </aside>
  );
}
