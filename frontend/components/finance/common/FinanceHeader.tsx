"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDollarSign,
  Milestone,
  Scale,
  Truck,
  FileCheck,
  GitCompare,
  Building2,
  AlertOctagon,
  BarChart3,
  ShieldAlert,
  RefreshCw,
  Calendar,
  Building,
  Download,
  Filter,
  Crown,
  BellRing,
  Target,
  Award,
  PackageSearch,
  Gauge,
  UserCheck,
  CalendarClock,
  Gift,
  Layers,
} from "lucide-react";

import { apiFinance } from "@/lib/finance-api";

interface FinanceHeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const FINANCE_TABS = [
  { href: "/finance", label: "Executive Dashboard", icon: <CircleDollarSign size={15} /> },
  { href: "/finance/ar-summary", label: "AR Executive Summary", icon: <Layers size={15} /> },
];

const AR_SUBMENU_TABS = [
  { href: "/finance/ar-summary", label: "AR Executive Summary", desc: "Total OS x OS Overdue", icon: <Layers size={14} /> },
  { href: "/finance/ar-summary/top-20", label: "TOP 20 AR", desc: "Current & Critical Overdue", icon: <Crown size={14} /> },
  { href: "/finance/ar-summary/collection-alert", label: "COLLECTION ALERT", desc: "H-7, Due Today, OD 1-30+", icon: <BellRing size={14} /> },
  { href: "/finance/ar-summary/weekly-collection", label: "WEEKLY COLLECTION", desc: "Target vs Actual Mingguan", icon: <Target size={14} /> },
  { href: "/finance/ar-summary/am-performance", label: "AM PERFORMANCE", desc: "Ranking DSR / Account Manager", icon: <Award size={14} /> },
  { href: "/finance/ar-summary/goods-in-transit", label: "GOODS IN TRANSIT", desc: "DO Keluar Belum Invoice", icon: <PackageSearch size={14} /> },
  { href: "/finance/ar-summary/credit-utilization", label: "CREDIT UTILIZATION", desc: "Warning >=80%, Over >=100%", icon: <Gauge size={14} /> },
  { href: "/finance/ar-summary/customer-performance", label: "CUSTOMER PERFORMANCE", desc: "Payment Days & Daftar Insentif", icon: <UserCheck size={14} /> },
  { href: "/finance/ar-summary/collection-projection", label: "COLLECTION PROJECTION", desc: "Target Weekly & Monthly", icon: <CalendarClock size={14} /> },
  { href: "/finance/ar-summary/icu", label: "ICU (INCENTIVE)", desc: "Approval Insentif Customer", icon: <Gift size={14} />, badge: 9 },
];

export default function FinanceHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
}: FinanceHeaderProps) {
  const pathname = usePathname();
  const [selectedPeriod, setSelectedPeriod] = useState("Bulan Ini (Okt 2026)");
  const [selectedBranch, setSelectedBranch] = useState("Semua Cabang & Gudang");

  const [periods, setPeriods] = useState<Array<{ id: string; label: string }>>([
    { id: "CURRENT_MONTH", label: "Bulan Ini (Okt 2026)" },
    { id: "PREV_MONTH", label: "Bulan Lalu (Sep 2026)" },
    { id: "Q4_2026", label: "Kuartal 4 2026 (Okt - Des)" },
    { id: "Q3_2026", label: "Kuartal 3 2026 (Jul - Sep)" },
    { id: "YTD_2026", label: "Tahun Berjalan (YTD 2026)" },
    { id: "ALL", label: "Semua Periode Transaksi" },
  ]);

  const [branches, setBranches] = useState<Array<{ id: string; label: string }>>([
    { id: "ALL", label: "Semua Cabang & Gudang" },
    { id: "01", label: "Cabang HO - Balikpapan" },
    { id: "02", label: "Cabang Makasar" },
    { id: "03", label: "Cabang Kendari" },
    { id: "04", label: "Cabang Manado" },
    { id: "05", label: "Cabang Palu" },
    { id: "06", label: "Cabang Sampit" },
    { id: "07", label: "Cabang Banjarmasin" },
    { id: "08", label: "Cabang Mapa" },
    { id: "GDG-005", label: "Gudang MAKASSAR" },
    { id: "GDG-001", label: "Gudang BALIKPAPAN" },
    { id: "GDG-007", label: "Gudang KENDARI" },
    { id: "GDG-009", label: "Gudang PALU" },
    { id: "GDG-010", label: "Gudang SAMPIT" },
    { id: "GDG-011", label: "Gudang BANJARMASIN" },
    { id: "GDG-013", label: "Gudang BITUNG" },
    { id: "GDG-014", label: "Gudang SURABAYA" },
  ]);

  useEffect(() => {
    apiFinance.getMetadata().then((res) => {
      if (res?.periods?.length) setPeriods(res.periods);
      if (res?.branches?.length) setBranches(res.branches);
    }).catch(() => {});
  }, []);

  const handleExport = () => {
    alert("Mengekspor laporan finansial ke format Excel (.xlsx)...");
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* Top Bar with Title, Breadcrumbs, & Action Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginBottom: "0.25rem",
            }}
          >
            <span>PADI CPA Analytics</span>
            <span>/</span>
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Finance ERP</span>
            <span>/</span>
            <span style={{ color: "var(--text-primary)" }}>{title}</span>
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0D99FF, #9147FF)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(13, 153, 255, 0.3)",
              }}
            >
              <CircleDollarSign size={18} />
            </span>
            {title}
          </h1>
          <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {subtitle}
          </p>
        </div>

        {/* Global Controls: Period, Branch, Refresh, Export */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Period Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              fontSize: "0.8rem",
              color: "var(--text-primary)",
            }}
          >
            <Calendar size={14} style={{ color: "var(--color-primary)" }} />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              fontSize: "0.8rem",
              color: "var(--text-primary)",
            }}
          >
            <Building size={14} style={{ color: "var(--color-accent)" }} />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Perbarui data"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>{isRefreshing ? "Memuat..." : "Refresh"}</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0D99FF, #0A7ACC)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(13, 153, 255, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Navigation Pills (ERP-level views switcher) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
          scrollbarWidth: "thin",
        }}
      >
        {FINANCE_TABS.map((tab) => {
          const isActive =
            tab.href === "/finance/ar-summary"
              ? pathname.startsWith("/finance/ar-summary")
              : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.785rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                background: isActive
                  ? "linear-gradient(135deg, #0D99FF, #6366F1)"
                  : "var(--bg-surface)",
                border: isActive
                  ? "1px solid rgba(13, 153, 255, 0.4)"
                  : "1px solid var(--bg-border)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 2px 8px rgba(13, 153, 255, 0.25)" : "none",
              }}
            >
              <span style={{ color: isActive ? "#ffffff" : "var(--color-primary)" }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* AR Executive Summary 9 Sub-Menus Bar (muncul otomatis pada halaman AR Executive Summary & sub-menunya) */}
      {pathname.startsWith("/finance/ar-summary") && (
        <div
          style={{
            marginTop: "0.65rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "10px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            overflowX: "auto",
            scrollbarWidth: "thin",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-primary)",
              paddingRight: "0.5rem",
              borderRight: "1px solid var(--bg-border)",
              whiteSpace: "nowrap",
            }}
          >
            AR Sub-Menu:
          </span>
          {AR_SUBMENU_TABS.map((sub) => {
            const isSubActive = pathname === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                title={sub.desc}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.38rem 0.72rem",
                  borderRadius: "7px",
                  fontSize: "0.74rem",
                  fontWeight: isSubActive ? 700 : 500,
                  color: isSubActive ? "#ffffff" : "var(--text-secondary)",
                  background: isSubActive
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "var(--bg-surface)",
                  border: isSubActive
                    ? "1px solid rgba(16, 185, 129, 0.45)"
                    : "1px solid var(--bg-border)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  boxShadow: isSubActive ? "0 2px 6px rgba(16, 185, 129, 0.25)" : "none",
                }}
              >
                <span style={{ color: isSubActive ? "#ffffff" : "#10B981", display: "flex" }}>
                  {sub.icon}
                </span>
                <span>{sub.label}</span>
                {sub.badge && (
                  <span
                    style={{
                      padding: "1px 5px",
                      borderRadius: "8px",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      background: isSubActive ? "#ffffff" : "#EF4444",
                      color: isSubActive ? "#059669" : "#ffffff",
                    }}
                  >
                    {sub.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
