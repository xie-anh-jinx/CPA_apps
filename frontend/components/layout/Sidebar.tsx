"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PieChart,
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
  LogIn,
  ReceiptText,
  BookOpen,
  GitGraph,
  Boxes,
  TrendingUp,
  Gauge,
  Award,
  Users,
  History,
  CircleDollarSign,
  Milestone,
  Scale,
  Truck,
  FileCheck,
  GitCompare,
  Building2,
  AlertOctagon,
  BarChart3,
  Receipt,
  Users2,
  Briefcase,
  CalendarClock,
  CalendarOff,
  PackageCheck,
  Cpu,
  ChevronDown,
  FilePlus2,
  ShieldAlert,
  Layers,
  Crown,
  Target,
  PackageSearch,
  UserCheck,
  Gift
} from "lucide-react";
import { apiAuth } from "@/lib/api";
import { useTheme } from "@/components/providers/ThemeProvider";

export interface SidebarSubItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  subItems?: SidebarSubItem[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
  subItems?: SidebarSubItem[];
  isSpecialButton?: boolean;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

const PadiAIIcon = ({ size = 18 }: { size?: number }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "4px",
      background: "rgba(255, 255, 255, 0.95)",
      padding: "1px 2px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      flexShrink: 0,
    }}
  >
    <img
      src="/images/logo-padi-ai.png"
      alt="PADI AI"
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        display: "block",
      }}
    />
  </span>
);

const NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Dashboard",
    items: [
      { id: "exec-dashboard", href: "/", icon: <Radar size={18} strokeWidth={1.5} />, label: "Executive Dashboard" },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { id: "tanya-ai", href: "#tanya-cpa-ai", icon: <PadiAIIcon size={18} />, label: "Tanya CPA AI", isSpecialButton: true },
      {
        id: "main-dashboard-menu",
        icon: <Gauge size={18} strokeWidth={1.5} />,
        label: "Main Dashboard (C3)",
        subItems: [
          { href: "/main-dashboard", icon: <Gauge size={14} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
          { href: "/intelligence/analytics", icon: <PieChart size={14} strokeWidth={1.5} />, label: "Analytics (Picture of Success)" },
          { href: "/intelligence/sales-performance", icon: <Award size={14} strokeWidth={1.5} />, label: "Sales Performance" },
          { href: "/intelligence/customers", icon: <Users size={14} strokeWidth={1.5} />, label: "Customer Dashboard" },
        ]
      },
      { id: "forecast", href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecasting" },
    ],
  },
  {
    label: "Inventori",
    items: [
      { id: "inventory", href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok" },
      {
        id: "distributions-menu",
        icon: <Route size={18} strokeWidth={1.5} />,
        label: "Distribusi",
        subItems: [
          { href: "/distributions", icon: <Route size={14} strokeWidth={1.5} />, label: "Monitoring DO, IO, IT" },
          { href: "/distributions/financial-flow", icon: <Receipt size={14} strokeWidth={1.5} />, label: "Financial Flow" },
        ]
      },
      { id: "warehouses", href: "/warehouses", icon: <Network size={18} strokeWidth={1.5} />, label: "Multi Gudang" },
      { id: "aging", href: "/inventory/aging", icon: <History size={18} strokeWidth={1.5} />, label: "Stock Aging" },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        id: "finance-menu",
        icon: <CircleDollarSign size={18} strokeWidth={1.5} />,
        label: "Finance & Akuntansi",
        badge: 9,
        subItems: [
          { href: "/finance", icon: <CircleDollarSign size={14} strokeWidth={1.5} />, label: "Executive Dashboard" },
          {
            href: "/finance/ar-summary",
            icon: <Layers size={14} strokeWidth={1.5} />,
            label: "AR EXECUTIVE SUMMARY",
            subItems: [
              { href: "/finance/ar-summary/top-20", icon: <Crown size={13} strokeWidth={1.5} />, label: "TOP 20 AR" },
              { href: "/finance/ar-summary/collection-alert", icon: <BellRing size={13} strokeWidth={1.5} />, label: "COLLECTION ALERT" },
              { href: "/finance/ar-summary/weekly-collection", icon: <Target size={13} strokeWidth={1.5} />, label: "WEEKLY COLLECTION ACHIEVEMENT" },
              { href: "/finance/ar-summary/am-performance", icon: <Award size={13} strokeWidth={1.5} />, label: "AM PERFORMANCE" },
              { href: "/finance/ar-summary/goods-in-transit", icon: <PackageSearch size={13} strokeWidth={1.5} />, label: "GOODS IN TRANSIT TRACKING" },
              { href: "/finance/ar-summary/credit-utilization", icon: <Gauge size={13} strokeWidth={1.5} />, label: "CREDIT LIMIT UTILIZATION" },
              { href: "/finance/ar-summary/customer-performance", icon: <UserCheck size={13} strokeWidth={1.5} />, label: "CUSTOMER PERFORMANCE" },
              { href: "/finance/ar-summary/collection-projection", icon: <CalendarClock size={13} strokeWidth={1.5} />, label: "COLLECTION PROJECTION" },
              { href: "/finance/ar-summary/icu", icon: <Gift size={13} strokeWidth={1.5} />, label: "ICU" },
            ],
          },
        ]
      },
    ],
  },
  {
    label: "Penjualan",
    items: [
      {
        id: "sales-menu",
        icon: <CandlestickChart size={18} strokeWidth={1.5} />,
        label: "Penjualan",
        subItems: [
          { href: "/sales", icon: <CandlestickChart size={14} strokeWidth={1.5} />, label: "Sales Monitoring" },
          { href: "/sales/orders", icon: <ReceiptText size={14} strokeWidth={1.5} />, label: "Sales Order" },
        ]
      },
    ],
  },
  {
    label: "CRM",
    items: [
      { id: "crm", href: "/crm", icon: <HeartHandshake size={18} strokeWidth={1.5} />, label: "CRM & Customer 360" },
    ],
  },
  {
    label: "Human Resource (HRM)",
    items: [
      {
        id: "hrm-menu",
        icon: <Users2 size={18} strokeWidth={1.5} />,
        label: "Human Resource (HRM)",
        badge: 10,
        subItems: [
          { href: "/hrm", icon: <Users2 size={14} strokeWidth={1.5} />, label: "Employee Dashboard" },
          {
            href: "/hrm/hr-legal",
            icon: <Scale size={14} strokeWidth={1.5} />,
            label: "HR & Legal Dashboard",
            badge: 10,
            subItems: [
              { href: "/hrm/hr-legal/attendance-ratio", icon: <CalendarClock size={13} strokeWidth={1.5} />, label: "1. Ratio Kehadiran" },
              { href: "/hrm/hr-legal/disciplinary", icon: <ShieldAlert size={13} strokeWidth={1.5} />, label: "2. Pelanggaran Tata Tertib" },
              { href: "/hrm/hr-legal/payroll-process", icon: <CircleDollarSign size={13} strokeWidth={1.5} />, label: "3. Proses Payroll (21-20)" },
              { href: "/hrm/hr-legal/bpjs-insurance", icon: <HeartHandshake size={13} strokeWidth={1.5} />, label: "4. Proses BPJS & Sinar Mas" },
              { href: "/hrm/hr-legal/kpi-personal", icon: <Award size={13} strokeWidth={1.5} />, label: "5. KPI Personal" },
              { href: "/hrm/hr-legal/man-power", icon: <Users size={13} strokeWidth={1.5} />, label: "6. Man Power" },
              { href: "/hrm/hr-legal/recruitment", icon: <UserCheck size={13} strokeWidth={1.5} />, label: "7. Recruitment" },
              { href: "/hrm/hr-legal/training-coaching", icon: <BookOpen size={13} strokeWidth={1.5} />, label: "8. Training & Coaching" },
              { href: "/hrm/hr-legal/employee-benefits", icon: <Gift size={13} strokeWidth={1.5} />, label: "9. Benefit Karyawan" },
              { href: "/hrm/hr-legal/legality", icon: <FileCheck size={13} strokeWidth={1.5} />, label: "10. Legalitas" },
            ],
          },
          { href: "/hrm/employees", icon: <Briefcase size={14} strokeWidth={1.5} />, label: "Data Karyawan & Org" },
          { href: "/hrm/attendance", icon: <CalendarClock size={14} strokeWidth={1.5} />, label: "Absensi & Lembur" },
          { href: "/hrm/leaves", icon: <CalendarOff size={14} strokeWidth={1.5} />, label: "Cuti & Izin" },
        ]
      },
    ],
  },
  {
    label: "Asset, IT & GA",
    items: [
      {
        id: "fleet-menu",
        icon: <Truck size={18} strokeWidth={1.5} />,
        label: "Armada Kendaraan",
        subItems: [
          { href: "/assets/fleet", icon: <Truck size={14} strokeWidth={1.5} />, label: "Dashboard Armada" },
          { href: "/assets/fleet/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook Armada" },
        ]
      },
      { id: "it", href: "/it", icon: <Cpu size={18} strokeWidth={1.5} />, label: "IT" },
      {
        id: "ga-menu",
        icon: <Building2 size={18} strokeWidth={1.5} />,
        label: "General Affairs (GA)",
        subItems: [
          { href: "/ga", icon: <Building2 size={14} strokeWidth={1.5} />, label: "Dashboard GA" },
          { href: "/ga/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook GA" },
        ]
      },
    ],
  },
  {
    label: "Laporan",
    items: [
      { id: "reports", href: "/reports", icon: <ScrollText size={18} strokeWidth={1.5} />, label: "Laporan" },
      { id: "settings", href: "/settings", icon: <SlidersHorizontal size={18} strokeWidth={1.5} />, label: "Pengaturan" },
    ],
  },
];

const SALES_NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Penjualan",
    items: [
      { id: "sales-orders", href: "/sales/orders", icon: <ReceiptText size={18} strokeWidth={1.5} />, label: "Sales Order" },
    ],
  },
  {
    label: "Intelligence & AI",
    items: [
      { id: "tanya-ai", href: "#tanya-cpa-ai", icon: <PadiAIIcon size={18} />, label: "Tanya CPA AI", isSpecialButton: true },
      {
        id: "main-dashboard-menu",
        icon: <Gauge size={18} strokeWidth={1.5} />,
        label: "Main Dashboard (C3)",
        subItems: [
          { href: "/main-dashboard", icon: <Gauge size={14} strokeWidth={1.5} />, label: "Main Dashboard (C3)" },
          { href: "/intelligence/analytics", icon: <PieChart size={14} strokeWidth={1.5} />, label: "Analytics" },
          { href: "/intelligence/sales-performance", icon: <Award size={14} strokeWidth={1.5} />, label: "Sales Performance" },
          { href: "/intelligence/customers", icon: <Users size={14} strokeWidth={1.5} />, label: "Customer Dashboard" },
        ]
      },
      { id: "forecast", href: "/forecast", icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Demand Forecast" },
    ],
  },
  {
    label: "CRM",
    items: [
      { id: "crm", href: "/crm", icon: <HeartHandshake size={18} strokeWidth={1.5} />, label: "CRM & Customer 360" },
    ],
  },
  {
    label: "Inventori",
    items: [
      { id: "inventory", href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok Cabang" },
      {
        id: "distributions-menu",
        icon: <Route size={18} strokeWidth={1.5} />,
        label: "Distribusi",
        subItems: [
          { href: "/distributions", icon: <Route size={14} strokeWidth={1.5} />, label: "Distribusi" },
          { href: "/distributions/financial-flow", icon: <Receipt size={14} strokeWidth={1.5} />, label: "Financial Flow" },
        ]
      },
      { id: "aging", href: "/inventory/aging", icon: <History size={18} strokeWidth={1.5} />, label: "Stock Aging" },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        id: "finance-menu",
        icon: <CircleDollarSign size={18} strokeWidth={1.5} />,
        label: "Finance & Akuntansi",
        badge: 9,
        subItems: [
          { href: "/finance", icon: <CircleDollarSign size={14} strokeWidth={1.5} />, label: "Executive Dashboard" },
          {
            href: "/finance/ar-summary",
            icon: <Layers size={14} strokeWidth={1.5} />,
            label: "AR EXECUTIVE SUMMARY",
            subItems: [
              { href: "/finance/ar-summary/top-20", icon: <Crown size={13} strokeWidth={1.5} />, label: "TOP 20 AR" },
              { href: "/finance/ar-summary/collection-alert", icon: <BellRing size={13} strokeWidth={1.5} />, label: "COLLECTION ALERT" },
              { href: "/finance/ar-summary/weekly-collection", icon: <Target size={13} strokeWidth={1.5} />, label: "WEEKLY COLLECTION ACHIEVEMENT" },
              { href: "/finance/ar-summary/am-performance", icon: <Award size={13} strokeWidth={1.5} />, label: "AM PERFORMANCE" },
              { href: "/finance/ar-summary/goods-in-transit", icon: <PackageSearch size={13} strokeWidth={1.5} />, label: "GOODS IN TRANSIT TRACKING" },
              { href: "/finance/ar-summary/credit-utilization", icon: <Gauge size={13} strokeWidth={1.5} />, label: "CREDIT LIMIT UTILIZATION" },
              { href: "/finance/ar-summary/customer-performance", icon: <UserCheck size={13} strokeWidth={1.5} />, label: "CUSTOMER PERFORMANCE" },
              { href: "/finance/ar-summary/collection-projection", icon: <CalendarClock size={13} strokeWidth={1.5} />, label: "COLLECTION PROJECTION" },
              { href: "/finance/ar-summary/icu", icon: <Gift size={13} strokeWidth={1.5} />, label: "ICU" },
            ],
          },
        ]
      },
    ],
  },
  {
    label: "Asset, IT & GA",
    items: [
      {
        id: "fleet-menu",
        icon: <Truck size={18} strokeWidth={1.5} />,
        label: "Armada Kendaraan",
        subItems: [
          { href: "/assets/fleet", icon: <Truck size={14} strokeWidth={1.5} />, label: "Dashboard Armada" },
          { href: "/assets/fleet/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook Armada" },
        ]
      },
      { id: "it", href: "/it", icon: <Cpu size={18} strokeWidth={1.5} />, label: "IT" },
      {
        id: "ga-menu",
        icon: <Building2 size={18} strokeWidth={1.5} />,
        label: "General Affairs (GA)",
        subItems: [
          { href: "/ga", icon: <Building2 size={14} strokeWidth={1.5} />, label: "Dashboard GA" },
          { href: "/ga/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook GA" },
        ]
      },
    ],
  },
];

const WAREHOUSE_NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Intelligence & AI",
    items: [
      { id: "tanya-ai", href: "#tanya-cpa-ai", icon: <PadiAIIcon size={18} />, label: "Tanya CPA AI", isSpecialButton: true },
    ],
  },
  {
    label: "Inventori & Gudang",
    items: [
      { id: "inventory", href: "/inventory", icon: <ScanBarcode size={18} strokeWidth={1.5} />, label: "Monitoring Stok" },
      { id: "distributions", href: "/distributions", icon: <Route size={18} strokeWidth={1.5} />, label: "Distribusi" },
      { id: "warehouses", href: "/warehouses", icon: <Network size={18} strokeWidth={1.5} />, label: "Multi Gudang" },
      { id: "aging", href: "/inventory/aging", icon: <History size={18} strokeWidth={1.5} />, label: "Stock Aging" },
    ],
  },
  {
    label: "Asset, IT & GA",
    items: [
      {
        id: "fleet-menu",
        icon: <Truck size={18} strokeWidth={1.5} />,
        label: "Armada Kendaraan",
        subItems: [
          { href: "/assets/fleet", icon: <Truck size={14} strokeWidth={1.5} />, label: "Dashboard Armada" },
          { href: "/assets/fleet/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook Armada" },
        ]
      },
      { id: "it", href: "/it", icon: <Cpu size={18} strokeWidth={1.5} />, label: "IT" },
      {
        id: "ga-menu",
        icon: <Building2 size={18} strokeWidth={1.5} />,
        label: "General Affairs (GA)",
        subItems: [
          { href: "/ga", icon: <Building2 size={14} strokeWidth={1.5} />, label: "Dashboard GA" },
          { href: "/ga/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook GA" },
        ]
      },
    ],
  },
];

const FINANCE_NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Intelligence & AI",
    items: [
      { id: "tanya-ai", href: "#tanya-cpa-ai", icon: <PadiAIIcon size={18} />, label: "Tanya CPA AI", isSpecialButton: true },
    ],
  },
  {
    label: "Finance & Akuntansi",
    items: [
      {
        id: "finance-menu",
        icon: <CircleDollarSign size={18} strokeWidth={1.5} />,
        label: "Finance & Akuntansi",
        badge: 9,
        subItems: [
          { href: "/finance", icon: <CircleDollarSign size={14} strokeWidth={1.5} />, label: "Executive Dashboard" },
          {
            href: "/finance/ar-summary",
            icon: <Layers size={14} strokeWidth={1.5} />,
            label: "AR EXECUTIVE SUMMARY",
            subItems: [
              { href: "/finance/ar-summary/top-20", icon: <Crown size={13} strokeWidth={1.5} />, label: "TOP 20 AR" },
              { href: "/finance/ar-summary/collection-alert", icon: <BellRing size={13} strokeWidth={1.5} />, label: "COLLECTION ALERT" },
              { href: "/finance/ar-summary/weekly-collection", icon: <Target size={13} strokeWidth={1.5} />, label: "WEEKLY COLLECTION ACHIEVEMENT" },
              { href: "/finance/ar-summary/am-performance", icon: <Award size={13} strokeWidth={1.5} />, label: "AM PERFORMANCE" },
              { href: "/finance/ar-summary/goods-in-transit", icon: <PackageSearch size={13} strokeWidth={1.5} />, label: "GOODS IN TRANSIT TRACKING" },
              { href: "/finance/ar-summary/credit-utilization", icon: <Gauge size={13} strokeWidth={1.5} />, label: "CREDIT LIMIT UTILIZATION" },
              { href: "/finance/ar-summary/customer-performance", icon: <UserCheck size={13} strokeWidth={1.5} />, label: "CUSTOMER PERFORMANCE" },
              { href: "/finance/ar-summary/collection-projection", icon: <CalendarClock size={13} strokeWidth={1.5} />, label: "COLLECTION PROJECTION" },
              { href: "/finance/ar-summary/icu", icon: <Gift size={13} strokeWidth={1.5} />, label: "ICU" },
            ],
          },
        ]
      },
    ],
  },
];

const ASSET_NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Intelligence & AI",
    items: [
      { id: "tanya-ai", href: "#tanya-cpa-ai", icon: <PadiAIIcon size={18} />, label: "Tanya CPA AI", isSpecialButton: true },
    ],
  },
  {
    label: "General Affairs & Aset",
    items: [
      {
        id: "ga-menu",
        href: "/ga",
        icon: <Building2 size={18} strokeWidth={1.5} />,
        label: "General Affairs (GA)",
        subItems: [
          { href: "/ga", icon: <Building2 size={14} strokeWidth={1.5} />, label: "Dashboard GA" },
          { href: "/ga/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook GA" },
        ]
      },
      { 
        id: "fleet-menu",
        href: "/assets/fleet",
        icon: <Truck size={18} strokeWidth={1.5} />, 
        label: "Armada Kendaraan",
        subItems: [
          { href: "/assets/fleet", icon: <Truck size={14} strokeWidth={1.5} />, label: "Dashboard Armada" },
          { href: "/assets/fleet/entry", icon: <FilePlus2 size={14} strokeWidth={1.5} />, label: "Isi Logbook Armada" },
        ]
      },
      { id: "it", href: "/it", icon: <Cpu size={18} strokeWidth={1.5} />, label: "IT & Infrastruktur" },
    ],
  },
];

export default function Sidebar({
  alertCount = 0,
  isOpen = false,
  onClose,
  currentUser: propUser,
}: {
  alertCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: any;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(propUser || null);
  const { theme } = useTheme();

  // Accordion state: map of menu itemId -> boolean (GA, Fleet & Finance expanded by default)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "ga-menu": true,
    "fleet-menu": true,
    "finance-menu": true,
    "/finance/ar-summary": true,
  });

  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
      return;
    }
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        const token = localStorage.getItem("cpa_token");
        if (token) {
          apiAuth.me().then((res) => {
            setCurrentUser(res.data);
            localStorage.setItem("cpa_user", JSON.stringify(res.data));
          }).catch(() => { });
        }
      }
    } catch (e) { }
  }, [propUser]);

  const handleLogout = () => {
    localStorage.removeItem("cpa_token");
    localStorage.removeItem("cpa_user");
    router.push("/login");
  };

  const isWarehouse = currentUser?.role === "warehouse_staff" || currentUser?.role === "warehouse";
  const isSalesRep = currentUser?.role === "sales_rep" || currentUser?.role === "sales";
  const isFinance = ["finance_manager", "ar_staff", "credit_control", "finance"].includes(currentUser?.role);
  const isAsset = ["asset_staff", "asset", "ga", "it"].includes(currentUser?.role);
  const activeNavGroups = isAsset
    ? ASSET_NAV_GROUPS
    : isWarehouse 
    ? WAREHOUSE_NAV_GROUPS 
    : isSalesRep 
    ? SALES_NAV_GROUPS 
    : isFinance 
    ? FINANCE_NAV_GROUPS 
    : NAV_GROUPS;

  // Automatically expand parent accordion when current route matches a subItem
  useEffect(() => {
    if (!pathname) return;
    const toOpen: Record<string, boolean> = {};

    activeNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems && item.subItems.length > 0) {
          const isMatching = item.subItems.some(
            (sub) =>
              sub.href === pathname ||
              (sub.subItems && sub.subItems.some((nested) => nested.href === pathname))
          );
          if (isMatching) {
            toOpen[item.id] = true;
          }
          item.subItems.forEach((sub) => {
            if (sub.subItems && sub.subItems.length > 0) {
              const isNestedMatch =
                sub.href === pathname || sub.subItems.some((nested) => nested.href === pathname);
              if (isNestedMatch) {
                toOpen[sub.href] = true;
              }
            }
          });
        }
      });
    });

    // Also check documentation items
    const docPaths = ["/docs", "/database/schema", "/database/warehouse-visualization"];
    if (docPaths.includes(pathname)) {
      toOpen["docs-menu"] = true;
    }

    if (Object.keys(toOpen).length > 0) {
      setOpenMenus((prev) => ({ ...prev, ...toOpen }));
    }
  }, [pathname, activeNavGroups]);

  const toggleAccordion = (id: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
            {group.items.map((item) => {
              // Special Action Button (e.g. Tanya CPA AI)
              if (item.isSpecialButton || item.href === "#tanya-cpa-ai") {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent("open-cpa-ai-chat"));
                      if (onClose) onClose();
                    }}
                    className="nav-item"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "rgba(13, 153, 255, 0.05)",
                      border: "1px solid rgba(13, 153, 255, 0.15)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      borderRadius: "8px",
                      margin: "3px 0",
                      padding: "0.55rem 0.85rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", color: "#0D99FF" }}>
                      {item.icon}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "linear-gradient(135deg, #0D99FF, #9147ff)",
                        color: "#ffffff",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "10px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      AI
                    </span>
                  </button>
                );
              }

              // Menu with Accordion Sub-items
              if (item.subItems && item.subItems.length > 0) {
                const isExpanded = Boolean(openMenus[item.id]);
                const isChildActive = item.subItems.some(
                  (sub) =>
                    sub.href === pathname ||
                    (sub.subItems && sub.subItems.some((nested) => nested.href === pathname))
                );
                const targetHref = item.href || item.subItems[0]?.href;

                return (
                  <div key={item.id} style={{ marginBottom: "2px" }}>
                    <div
                      className={`nav-item-accordion-container ${isChildActive ? "has-active-child" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "var(--radius-md)",
                        background: isChildActive ? "rgba(56, 189, 248, 0.08)" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <Link
                        href={targetHref}
                        onClick={() => {
                          setOpenMenus((prev) => ({ ...prev, [item.id]: true }));
                          if (onClose) onClose();
                          if (pathname !== targetHref) {
                            router.push(targetHref);
                          }
                        }}
                        className="nav-item-accordion-link"
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          padding: "0.6rem 0.75rem",
                          color: isChildActive ? "var(--text-primary)" : "var(--text-secondary)",
                          fontSize: "0.875rem",
                          fontWeight: isChildActive ? 600 : 500,
                          textDecoration: "none",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: isChildActive ? "var(--primary)" : "var(--text-muted)",
                            transition: "color 0.2s ease",
                          }}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>

                      {/* Parent Badge if collapsed */}
                      {!isExpanded && item.badge !== undefined && item.badge > 0 && (
                        <span className="badge" style={{ marginRight: "4px" }}>
                          {item.badge}
                        </span>
                      )}

                      {/* Animated Chevron Indicator Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleAccordion(item.id);
                        }}
                        title={`Klik untuk ${isExpanded ? "menutup" : "membuka"} sub-menu ${item.label}`}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "0.6rem 0.75rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isChildActive ? "var(--primary)" : "var(--text-muted)",
                        }}
                      >
                        <ChevronDown
                          size={15}
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                            opacity: 0.8,
                          }}
                        />
                      </button>
                    </div>

                    {/* Smooth Accordion Body */}
                    <div
                      className="sidebar-submenu-wrapper"
                      style={{
                        gridTemplateRows: isExpanded ? "1fr" : "0fr",
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="sidebar-submenu-inner">
                        <div className="sidebar-submenu-list">
                          {item.subItems.map((sub) => {
                            const hasNested = Boolean(sub.subItems && sub.subItems.length > 0);
                            const isNestedOpen = Boolean(openMenus[sub.href]);
                            const isSubActive =
                              pathname === sub.href ||
                              Boolean(sub.subItems && sub.subItems.some((n) => n.href === pathname));
                            return (
                              <div key={sub.href}>
                                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <Link
                                    href={sub.href}
                                    onClick={() => {
                                      if (hasNested) {
                                        setOpenMenus((prev) => ({ ...prev, [sub.href]: true }));
                                      }
                                      if (onClose) onClose();
                                      if (pathname !== sub.href) {
                                        router.push(sub.href);
                                      }
                                    }}
                                    className={`sub-nav-item ${pathname === sub.href ? "active" : ""}`}
                                    style={{
                                      flex: 1,
                                      fontWeight: isSubActive ? 600 : undefined,
                                    }}
                                  >
                                    {sub.icon && (
                                      <span
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          color: isSubActive ? "var(--primary)" : "var(--text-muted)",
                                          transform: "scale(0.9)",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {sub.icon}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        flex: 1,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {sub.label}
                                    </span>
                                    {sub.badge !== undefined && sub.badge > 0 && (
                                      <span className="badge">{sub.badge}</span>
                                    )}
                                  </Link>
                                  {hasNested && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleAccordion(sub.href);
                                      }}
                                      title={`Buka/tutup sub-menu ${sub.label}`}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: "0.35rem 0.45rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        color: isSubActive ? "var(--primary)" : "var(--text-muted)",
                                      }}
                                    >
                                      <ChevronDown
                                        size={13}
                                        style={{
                                          transform: isNestedOpen ? "rotate(180deg)" : "rotate(0deg)",
                                          transition: "transform 0.2s ease",
                                        }}
                                      />
                                    </button>
                                  )}
                                </div>
                                {hasNested && isNestedOpen && (
                                  <div
                                    style={{
                                      marginLeft: "0.95rem",
                                      paddingLeft: "0.65rem",
                                      borderLeft: "1.5px dashed var(--bg-border)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px",
                                      marginTop: "2px",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {sub.subItems!.map((nested) => {
                                      const isNestedActive = pathname === nested.href;
                                      return (
                                        <Link
                                          key={nested.href}
                                          href={nested.href}
                                          onClick={() => {
                                            if (onClose) onClose();
                                            if (pathname !== nested.href) {
                                              router.push(nested.href);
                                            }
                                          }}
                                          className={`sub-nav-item ${isNestedActive ? "active" : ""}`}
                                          style={{
                                            fontSize: "0.75rem",
                                            padding: "0.35rem 0.55rem",
                                          }}
                                        >
                                          {nested.icon && (
                                            <span
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                color: isNestedActive ? "var(--primary)" : "var(--text-muted)",
                                                transform: "scale(0.85)",
                                                flexShrink: 0,
                                              }}
                                            >
                                              {nested.icon}
                                            </span>
                                          )}
                                          <span
                                            style={{
                                              flex: 1,
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                            }}
                                          >
                                            {nested.label}
                                          </span>
                                          {nested.badge !== undefined && nested.badge > 0 && (
                                            <span className="badge">{nested.badge}</span>
                                          )}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Standalone Direct Link Item
              const isDirectActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href || "#"}
                  onClick={() => {
                    if (onClose) onClose();
                    if (item.href && item.href !== "#" && !item.href.startsWith("#") && pathname !== item.href) {
                      router.push(item.href);
                    }
                  }}
                  className={`nav-item ${isDirectActive ? "active" : ""}`}
                  style={{ marginBottom: "2px" }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: isDirectActive ? "var(--primary)" : "var(--text-muted)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Alerts link for non-sales_rep or general */}
        {!isSalesRep && (
          <>
            <div className="divider" />
            <Link
              href="/alerts"
              onClick={() => {
                if (onClose) onClose();
                if (pathname !== "/alerts") {
                  router.push("/alerts");
                }
              }}
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

        {/* Documentation Section - Accordion (Hide for warehouse) */}
        {!isWarehouse && (() => {
          const docId = "docs-menu";
          const isDocExpanded = Boolean(openMenus[docId]);
          const docItems: SidebarSubItem[] = [
            { href: "/docs", icon: <BookOpen size={14} strokeWidth={1.5} />, label: "API & Referensi" },
            { href: "/database/schema", icon: <GitGraph size={14} strokeWidth={1.5} />, label: "Schema Visualizer" },
            { href: "/database/warehouse-visualization", icon: <Boxes size={14} strokeWidth={1.5} />, label: "CPA Warehouse Visualization" },
          ];
          const isDocActive = docItems.some((sub) => sub.href === pathname);

          return (
            <>
              <div className="divider" />
              <div style={{ marginBottom: "2px" }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion(docId)}
                  className={`nav-item-accordion ${isDocActive ? "has-active-child" : ""}`}
                  title={`Klik untuk ${isDocExpanded ? "menutup" : "membuka"} menu Dokumentasi`}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: isDocActive ? "var(--primary)" : "var(--text-muted)",
                    }}
                  >
                    <BookOpen size={18} strokeWidth={1.5} />
                  </span>
                  <span
                    style={{
                      fontWeight: isDocActive ? 600 : 500,
                      color: isDocActive ? "var(--text-primary)" : "var(--text-secondary)",
                      fontSize: "0.875rem",
                    }}
                  >
                    Dokumentasi
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      marginLeft: "auto",
                      transform: isDocExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                      color: isDocActive ? "var(--primary)" : "var(--text-muted)",
                      opacity: 0.8,
                      flexShrink: 0,
                    }}
                  />
                </button>

                <div
                  className="sidebar-submenu-wrapper"
                  style={{
                    gridTemplateRows: isDocExpanded ? "1fr" : "0fr",
                    opacity: isDocExpanded ? 1 : 0,
                  }}
                >
                  <div className="sidebar-submenu-inner">
                    <div className="sidebar-submenu-list">
                      {docItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              if (onClose) onClose();
                            }}
                            className={`sub-nav-item ${isSubActive ? "active" : ""}`}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                color: isSubActive ? "var(--primary)" : "var(--text-muted)",
                                transform: "scale(0.9)",
                                flexShrink: 0,
                              }}
                            >
                              {sub.icon}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {sub.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

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
                ? "Staff Inventori & Gudang" 
                : currentUser.role === "ga"
                ? "General Affairs (GA)"
                : currentUser.role === "it"
                ? "IT & Infrastruktur"
                : currentUser.role === "all"
                ? "Admin Operasional"
                : (currentUser.role === "asset_staff" || currentUser.role === "asset")
                ? "Asset, IT & GA"
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

      {/* Logout / Login option */}
      <div className="divider" />
      {currentUser ? (
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
      ) : (
        <Link
          href="/login"
          className="nav-item"
          style={{ width: "100%", textDecoration: "none", color: "var(--primary)" }}
        >
          <span style={{ display: "flex", alignItems: "center" }}>
            <LogIn size={18} strokeWidth={1.5} />
          </span>
          <span>Masuk / Login</span>
        </Link>
      )}

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
