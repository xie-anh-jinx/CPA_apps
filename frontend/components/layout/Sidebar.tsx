"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PieChart, 
  Radar, 
  ScanBarcode, 
  Network, 
  CandlestickChart, 
  Route, 
  HeartHandshake, 
  ScrollText, 
  SlidersHorizontal,
  BellRing,
  LogOut,
  ReceiptText,
  BookOpen, GitGraph, Boxes,
  TrendingUp,
  Gauge,
  Award,
  Users,
  History
} from "lucide-react";
import { apiAuth } from "@/lib/api";
import { useTheme } from "@/components/providers/ThemeProvider";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isSubItem?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/", icon: <Radar size={18} strokeWidth={1.5} />, label: "Executive Dashboard" },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { href: "/main-dashboard", icon: <Gauge size={18} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
      { href: "/intelligence/analytics", icon: <PieChart size={15} strokeWidth={1.5} />, label: "Analytics (Picture of Success)", isSubItem: true },
      { href: "/intelligence/sales-performance", icon: <Award size={15} strokeWidth={1.5} />, label: "Sales Performance", isSubItem: true },
      { href: "/intelligence/customers", icon: <Users size={15} strokeWidth={1.5} />, label: "Customer Dashboard", isSubItem: true },
      { href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecasting" },
    ],
  },
  {
    label: "Inventori",
    items: [
      { href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok" },
      { href: "/warehouses", icon: <Network size={18} strokeWidth={1.5} />, label: "Multi Gudang" },
      { href: "/inventory/aging", icon: <History size={15} strokeWidth={1.5} />, label: "Stock Aging", isSubItem: true },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/sales", icon: <CandlestickChart size={18} strokeWidth={1.5} />, label: "Sales Monitoring" },
      { href: "/sales/orders", icon: <ReceiptText size={15} strokeWidth={1.5} />, label: "Sales Order", isSubItem: true },
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

const SALES_NAV_GROUPS: NavGroup[] = [
  {
    label: "Penjualan",
    items: [
      { href: "/sales/orders", icon: <ReceiptText size={18} strokeWidth={1.5} />, label: "Sales Order" },
      { href: "/distributions", icon: <Route size={18} strokeWidth={1.5} />, label: "Distribusi" },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { href: "/main-dashboard", icon: <Gauge size={18} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
      { href: "/intelligence/analytics", icon: <PieChart size={15} strokeWidth={1.5} />, label: "Analytics", isSubItem: true },
      { href: "/intelligence/sales-performance", icon: <Award size={15} strokeWidth={1.5} />, label: "Sales Performance", isSubItem: true },
      { href: "/intelligence/customers", icon: <Users size={15} strokeWidth={1.5} />, label: "Customer Dashboard", isSubItem: true },
      { href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecast" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/crm", icon: <HeartHandshake size={18} strokeWidth={1.5} />, label: "CRM & Customer 360" },
    ],
  },
  {
    label: "Inventori",
    items: [
      { href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok Cabang" },
      { href: "/inventory/aging", icon: <History size={15} strokeWidth={1.5} />, label: "Stock Aging", isSubItem: true },
    ],
  },
];

const WAREHOUSE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Inventori & Gudang",
    items: [
      { href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok" },
      { href: "/warehouses", icon: <Network size={18} strokeWidth={1.5} />, label: "Multi Gudang" },
      { href: "/inventory/aging", icon: <History size={15} strokeWidth={1.5} />, label: "Stock Aging", isSubItem: true },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { href: "/main-dashboard", icon: <Gauge size={18} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
      { href: "/intelligence/analytics", icon: <PieChart size={15} strokeWidth={1.5} />, label: "Analytics", isSubItem: true },
      { href: "/intelligence/sales-performance", icon: <Award size={15} strokeWidth={1.5} />, label: "Sales Performance", isSubItem: true },
      { href: "/intelligence/customers", icon: <Users size={15} strokeWidth={1.5} />, label: "Customer Dashboard", isSubItem: true },
      { href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecast" },
    ],
  },
  {
    label: "Distribusi",
    items: [
      { href: "/distributions", icon: <Route size={18} strokeWidth={1.5} />, label: "Distribusi Cabang" },
    ],
  },
];

const FINANCE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/", icon: <Radar size={18} strokeWidth={1.5} />, label: "Executive Dashboard" },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { href: "/main-dashboard", icon: <Gauge size={18} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
      { href: "/intelligence/analytics", icon: <PieChart size={15} strokeWidth={1.5} />, label: "Analytics", isSubItem: true },
      { href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecast" },
    ],
  },
  {
    label: "Penjualan & Piutang",
    items: [
      { href: "/sales", icon: <CandlestickChart size={18} strokeWidth={1.5} />, label: "Sales & Invoicing" },
      { href: "/sales/orders", icon: <ReceiptText size={15} strokeWidth={1.5} />, label: "Monitoring Rilis Kirim", isSubItem: true },
    ],
  },
  {
    label: "CRM & Credit",
    items: [
      { href: "/crm", icon: <HeartHandshake size={18} strokeWidth={1.5} />, label: "CRM Credit Health" },
    ],
  },
  {
    label: "Laporan Finansial",
    items: [
      { href: "/reports", icon: <ScrollText size={18} strokeWidth={1.5} />, label: "Laporan Aging AR" },
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        apiAuth.me().then((res) => {
          setCurrentUser(res.data);
          localStorage.setItem("cpa_user", JSON.stringify(res.data));
        }).catch(() => {});
      }
    } catch (e) {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cpa_token");
    localStorage.removeItem("cpa_user");
    router.push("/login");
  };

  const isWarehouse = currentUser?.role === "warehouse_staff" || currentUser?.role === "warehouse";
  const isSalesRep = currentUser?.role === "sales_rep" || currentUser?.role === "sales";
  const isFinance = ["finance_manager", "ar_staff", "credit_control", "finance"].includes(currentUser?.role);
  const activeNavGroups = isWarehouse ? WAREHOUSE_NAV_GROUPS : isSalesRep ? SALES_NAV_GROUPS : isFinance ? FINANCE_NAV_GROUPS : NAV_GROUPS;

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Close button for mobile */}
      <button 
        className="sidebar-close-btn"
        onClick={onClose}
        style={{ display: "none" }}
      >
        ✕
      </button>

      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: "1.5rem 1rem", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "center" }}>
        <img 
          src={theme === "light" ? "/images/logo-cpa.png" : "/images/logo-cpa-white.png"} 
          alt="CPA Logo" 
          style={{ width: "100%", maxWidth: "90px", height: "auto", objectFit: "contain" }} 
        />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {activeNavGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
                style={item.isSubItem ? { 
                  paddingLeft: "2.35rem", 
                  fontSize: "0.825rem",
                  margin: "2px 0 2px 0",
                } : undefined}
              >
                <span style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  color: pathname === item.href ? "var(--primary)" : "var(--text-muted)",
                  transform: item.isSubItem ? "scale(0.95)" : "none"
                }}>
                  {item.icon}
                </span>
                <span style={{ fontWeight: item.isSubItem ? (pathname === item.href ? 600 : 400) : undefined }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}

        {/* Alerts link for non-sales_rep or general */}
        {!isSalesRep && (
          <>
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
          </>
        )}

        {/* Documentation Section */}
        <div className="divider" />
        <div className="nav-group">
          <div className="nav-group-title">Dokumentasi</div>
          <Link
            href="/docs"
            className={`nav-item ${pathname === "/docs" ? "active" : ""}`}
          >
            <span style={{ display: "flex", alignItems: "center", color: pathname === "/docs" ? "var(--primary)" : "var(--text-muted)" }}>
              <BookOpen size={18} strokeWidth={1.5} />
            </span>
            <span>API & Referensi</span>
          </Link>
          <Link
            href="/database/schema"
            className={`nav-item ${pathname === "/database/schema" ? "active" : ""}`}
            style={{ paddingLeft: "2.35rem", fontSize: "0.825rem", margin: "2px 0" }}
          >
            <span style={{ display: "flex", alignItems: "center", color: pathname === "/database/schema" ? "var(--primary)" : "var(--text-muted)" }}>
              <GitGraph size={15} strokeWidth={1.5} />
            </span>
            <span style={{ fontWeight: pathname === "/database/schema" ? 600 : 400 }}>Schema Visualizer</span>
          </Link>
          <Link
            href="/database/warehouse-visualization"
            className={`nav-item ${pathname === "/database/warehouse-visualization" ? "active" : ""}`}
            style={{ paddingLeft: "2.35rem", fontSize: "0.825rem", margin: "2px 0" }}
          >
            <span style={{ display: "flex", alignItems: "center", color: pathname === "/database/warehouse-visualization" ? "var(--primary)" : "var(--text-muted)" }}>
              <Boxes size={15} strokeWidth={1.5} />
            </span>
            <span style={{ fontWeight: pathname === "/database/warehouse-visualization" ? 600 : 400 }}>CPA Warehouse Visualization</span>
          </Link>
        </div>

      </nav>

      {/* User Info Badge */}
      {currentUser && (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--bg-border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#1a1a1a",
            flexShrink: 0
          }}>
            {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : "U"}
          </div>
          <div style={{ overflow: "hidden", lineHeight: 1.2 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {currentUser.full_name || currentUser.username}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 500 }}>
              {currentUser.role === "sales_rep" 
                ? "DSR - Sultanbatara" 
                : isWarehouse 
                ? "Kepala Gudang & Admin Cabang" 
                : currentUser.role === "finance_manager" || currentUser.role === "finance"
                ? "Finance & Accounting Manager"
                : currentUser.role === "ar_staff"
                ? "Account Receivable (AR) Staff"
                : currentUser.role === "credit_control"
                ? "Credit Control Staff"
                : currentUser.role}
            </div>
          </div>
        </div>
      )}

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
          padding: "0.75rem 1rem",
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
