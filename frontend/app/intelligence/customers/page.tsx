"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  Sparkles,
  Info,
  CreditCard,
  BarChart3,
  Award,
  SlidersHorizontal,
  ExternalLink,
  DollarSign
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { apiKitaAnalytics } from "@/lib/api";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

interface CustomerItem {
  number?: number;
  area?: string;
  workplaceId?: string;
  workplaceName?: string;
  decTotalEstAnnualVolume?: number;
  decYtdSellOut?: number;
  dsrId?: string;
  dsrName?: string;
  retail?: string;
  customerId: string;
  customerName: string;
  szLocation?: string;
  province?: string;
  groupSector?: string;
  sectorIndustry?: string;
  subSectorIndustry?: string;
  supplyPoint?: string;
  customerStatus?: string;
  customerGroup?: string;
  companyType?: string;
  marketingType?: string;
  szAddress?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  szTop?: string;
  szReferenceID?: string;
  custRemark1?: string;
  custRemark2?: string;
  custRemark3?: string;
  custRemark4?: string;
  custRemark5?: string;
  custRemark6?: string;
  custRemark7?: string;
  custRemark8?: string;
  dtmLastTransactionDate?: string;
  validationStatus?: number;
  dtmStart?: string;
  dtmLastUpdated?: string;
}

interface CustomerGraphicItem {
  month: number;
  year: number;
  totalCust: number;
  totalCustPanol: number;
  totalCustVerified: number;
  monthName?: string;
}

interface KeyAccountItem {
  intYear: number;
  szArea: string;
  szDistributionName: string;
  szCustomerId: string;
  szCustomerName: string;
  szCustomerGroup: string;
  szCustomerStatus: string;
  szCustomerType: string;
  szSectorIndustry: string;
  szSubSectorIndustry: string;
  decPotentialVolume: number;
  decMonthlyTargetWin: number;
  decYtdSellOut: number;
  shareOfWallet: number;
  decYtdSoLastYear: number;
}

type CustomerTab = "table" | "pv" | "ka";

export default function CustomerDashboardPage() {
  const [activeTab, setActiveTab] = useState<CustomerTab>("table");
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(9);
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [customerList, setCustomerList] = useState<CustomerItem[]>([]);
  const [totalData, setTotalData] = useState<number>(0);
  const [syncSource, setSyncSource] = useState<string>("KITA Dashboard (Live API)");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  // Tab 2: Customer Chart (#pv) state
  const [graphicData, setGraphicData] = useState<CustomerGraphicItem[]>([]);
  const [graphicLoading, setGraphicLoading] = useState<boolean>(false);

  // Tab 3: Key Account (#ka) state
  const [keyAccounts, setKeyAccounts] = useState<KeyAccountItem[]>([]);
  const [kaLoading, setKaLoading] = useState<boolean>(false);
  const [kaLimit, setKaLimit] = useState<number>(25);
  const [kaSearch, setKaSearch] = useState<string>("");
  const [selectedKa, setSelectedKa] = useState<KeyAccountItem | null>(null);

  // Hash navigation sync (#pv, #ka, #table)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase() as CustomerTab;
      if (hash === "pv" || hash === "ka" || hash === "table") {
        setActiveTab(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const switchTab = (tab: CustomerTab) => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiKitaAnalytics.customers({
        year,
        month,
        page,
        limit,
        search: search.trim(),
        orderby: "asc",
        column_order_desc: "customerName",
      });

      if (res.data) {
        setCustomerList(res.data.data || []);
        setTotalData(res.data.totalData || (res.data.data ? res.data.data.length : 0));
        if (res.data.source) setSyncSource(res.data.source);
      }
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err) {
      console.error("Failed to load KITA customers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Customer Graphic (#pv)
  useEffect(() => {
    if (activeTab !== "pv") return;
    let isMounted = true;
    const loadGraphic = async () => {
      setGraphicLoading(true);
      try {
        const res = await apiKitaAnalytics.customerGraphic({ year, month });
        if (isMounted && res.data && res.data.data) {
          const raw: CustomerGraphicItem[] = res.data.data;
          const mapped = raw.map((item) => ({
            ...item,
            monthName: SHORT_MONTH_NAMES[(item.month - 1) % 12] || `Bln ${item.month}`,
          }));
          setGraphicData(mapped);
        }
      } catch (err) {
        console.error("Failed to load customer graphic:", err);
      } finally {
        if (isMounted) setGraphicLoading(false);
      }
    };
    loadGraphic();
    return () => {
      isMounted = false;
    };
  }, [activeTab, year, month]);

  // Fetch Key Accounts (#ka)
  useEffect(() => {
    if (activeTab !== "ka") return;
    let isMounted = true;
    const loadKeyAccounts = async () => {
      setKaLoading(true);
      try {
        const res = await apiKitaAnalytics.keyAccounts({
          year,
          month,
          limit: kaLimit,
          search: kaSearch.trim(),
        });
        if (isMounted && res.data && res.data.data) {
          setKeyAccounts(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load key accounts:", err);
      } finally {
        if (isMounted) setKaLoading(false);
      }
    };
    loadKeyAccounts();
    return () => {
      isMounted = false;
    };
  }, [activeTab, year, month, kaLimit, kaSearch]);

  useEffect(() => {
    fetchData();
  }, [year, month, page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchData();
  };

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    customerList.forEach((c) => {
      if (c.workplaceName) set.add(c.workplaceName);
    });
    return Array.from(set);
  }, [customerList]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    customerList.forEach((c) => {
      if (c.customerStatus) set.add(c.customerStatus);
    });
    return Array.from(set);
  }, [customerList]);

  const displayCustomers = useMemo(() => {
    return customerList.filter((c) => {
      if (selectedBranch !== "ALL" && c.workplaceName !== selectedBranch) return false;
      if (selectedStatus !== "ALL" && c.customerStatus !== selectedStatus) return false;
      return true;
    });
  }, [customerList, selectedBranch, selectedStatus]);

  const totalPages = Math.ceil((totalData || 1) / limit);

  const formatVolume = (vol?: number) => {
    if (!vol) return "0 L";
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M L`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K L`;
    return `${vol.toLocaleString("id-ID")} L`;
  };

  const formatNumber = (num?: number, decimals = 1) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="page-container" style={{ padding: "1.5rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* ─── Top Header & Controls ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0284c7, #0d99ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(13, 153, 255, 0.25)",
                flexShrink: 0
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Customer Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Direktori pelanggan 360°, grafik validasi PANOL, dan performa Key Account dari <strong>KITA Dashboard</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action badges & Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Live Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#10b981",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            {syncSource}
          </div>

          {/* Read Only Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#6366f1",
            }}
          >
            <ShieldCheck size={14} />
            Read-Only
          </div>

          {/* Filter Year */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
            }}
          >
            <Calendar size={14} style={{ color: "var(--text-muted)" }} />
            <select
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(0);
              }}
              aria-label="Pilih Tahun"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Filter Month */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
            }}
          >
            <select
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setPage(0);
              }}
              aria-label="Pilih Bulan"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  Bulan {i + 1} ({name})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: refreshing ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ─── CUSTOMER DASHBOARD TABS NAVIGATION (Hash-synced: #table, #pv, #ka) ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        {/* Tab 1: Customer Table */}
        <button
          onClick={() => switchTab("table")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: activeTab === "table" ? "1.5px solid #0284c7" : "1px solid var(--bg-border)",
            background: activeTab === "table" ? "rgba(2, 132, 199, 0.12)" : "var(--bg-card)",
            color: activeTab === "table" ? "#0284c7" : "var(--text-muted)",
            fontWeight: activeTab === "table" ? 700 : 500,
            fontSize: "0.825rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.18s ease",
            boxShadow: activeTab === "table" ? "0 2px 8px rgba(2, 132, 199, 0.25)" : "none",
            flexShrink: 0
          }}
        >
          <Users size={16} />
          <span>CUSTOMER TABLE</span>
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.15rem 0.4rem",
              borderRadius: "4px",
              background: activeTab === "table" ? "#0284c7" : "rgba(0,0,0,0.06)",
              color: activeTab === "table" ? "#fff" : "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {totalData.toLocaleString("id-ID")}
          </span>
        </button>

        {/* Tab 2: Customer Chart (#pv) */}
        <button
          onClick={() => switchTab("pv")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: activeTab === "pv" ? "1.5px solid #a70e13" : "1px solid var(--bg-border)",
            background: activeTab === "pv" ? "rgba(167, 14, 19, 0.12)" : "var(--bg-card)",
            color: activeTab === "pv" ? "#a70e13" : "var(--text-muted)",
            fontWeight: activeTab === "pv" ? 700 : 500,
            fontSize: "0.825rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.18s ease",
            boxShadow: activeTab === "pv" ? "0 2px 8px rgba(167, 14, 19, 0.25)" : "none",
            flexShrink: 0
          }}
        >
          <BarChart3 size={16} />
          <span>CUSTOMER CHART</span>
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.15rem 0.4rem",
              borderRadius: "4px",
              background: activeTab === "pv" ? "#a70e13" : "rgba(0,0,0,0.06)",
              color: activeTab === "pv" ? "#fff" : "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            #pv
          </span>
        </button>

        {/* Tab 3: Key Account (#ka) */}
        <button
          onClick={() => switchTab("ka")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: activeTab === "ka" ? "1.5px solid #f59e0b" : "1px solid var(--bg-border)",
            background: activeTab === "ka" ? "rgba(245, 158, 11, 0.12)" : "var(--bg-card)",
            color: activeTab === "ka" ? "#f59e0b" : "var(--text-muted)",
            fontWeight: activeTab === "ka" ? 700 : 500,
            fontSize: "0.825rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.18s ease",
            boxShadow: activeTab === "ka" ? "0 2px 8px rgba(245, 158, 11, 0.25)" : "none",
            flexShrink: 0
          }}
        >
          <Award size={16} />
          <span>KEY ACCOUNT</span>
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.15rem 0.4rem",
              borderRadius: "4px",
              background: activeTab === "ka" ? "#f59e0b" : "rgba(0,0,0,0.06)",
              color: activeTab === "ka" ? "#fff" : "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            #ka
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 1: CUSTOMER TABLE (Directory) ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "table" && (
        <>
          {/* Top Filter Bar */}
          <div
            style={{
              background: "var(--bg-card)",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid var(--bg-border)",
              marginBottom: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--bg-surface)",
                padding: "0.4rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--bg-border)",
                minWidth: "280px",
                flex: "1 1 300px",
              }}
            >
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Cari nama pelanggan, ID, lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "100%",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#0284c7",
                  border: "none",
                  color: "#fff",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cari
              </button>
            </form>

            {/* Quick Filters */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              {/* Filter Cabang / Workplace */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Cabang:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  aria-label="Filter Cabang"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.65rem",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Semua Cabang</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter Status Pelanggan"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.65rem",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Semua Status</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rows per page */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Baris:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(0);
                  }}
                  aria-label="Jumlah baris per halaman"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.5rem",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Directory Table */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              overflow: "hidden",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={18} style={{ color: "#0284c7" }} />
                <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                  Daftar Pelanggan KITA ({totalData.toLocaleString("id-ID")} Pelanggan)
                </h2>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Halaman {page + 1} dari {totalPages || 1}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Customer Name / ID</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Cabang / Workplace</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Sektor Industri</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Est. Annual Vol</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>YTD Sell Out</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>DSR / Sales</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <RefreshCw size={20} className="spin" style={{ margin: "0 auto 0.5rem" }} />
                        Memuat data direktori pelanggan...
                      </td>
                    </tr>
                  ) : displayCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ada data pelanggan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    displayCustomers.map((cust) => {
                      const statusColor =
                        cust.customerStatus === "Active"
                          ? "#10b981"
                          : cust.customerStatus === "Prospect"
                          ? "#3b82f6"
                          : "#f59e0b";

                      return (
                        <tr
                          key={cust.customerId}
                          style={{
                            borderBottom: "1px solid var(--bg-border)",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cust.customerName}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>ID: {cust.customerId}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                            <div>{cust.workplaceName || "-"}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{cust.area || "-"}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                            <div>{cust.sectorIndustry || cust.groupSector || "-"}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{cust.subSectorIndustry || "-"}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span
                              style={{
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                background: `${statusColor}15`,
                                color: statusColor,
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                            >
                              {cust.customerStatus || "Unknown"}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                            {formatVolume(cust.decTotalEstAnnualVolume)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                            {formatVolume(cust.decYtdSellOut)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                            {cust.dsrName || "-"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "0.35rem 0.65rem",
                                borderRadius: "6px",
                                background: "rgba(2, 132, 199, 0.1)",
                                border: "1px solid rgba(2, 132, 199, 0.25)",
                                color: "#0284c7",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={14} />
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderTop: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Menampilkan {displayCustomers.length} dari {totalData.toLocaleString("id-ID")} pelanggan
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--bg-border)",
                    color: page === 0 ? "var(--text-muted)" : "var(--text-primary)",
                    fontSize: "0.8rem",
                    cursor: page === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0 0.5rem", color: "var(--text-primary)" }}>
                  {page + 1} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--bg-border)",
                    color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-primary)",
                    fontSize: "0.8rem",
                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 2: CUSTOMER CHART (#pv) ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pv" && (
        <div>
          {/* Header & KPI Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #a70e13" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Customer ({MONTH_NAMES[month - 1]})</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#a70e13", marginTop: "0.25rem" }}>312 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>+186% Pertumbuhan dari Jan (109)</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Customer PANOL</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>286 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>91.7% dari Total Pelanggan</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Customer Validation</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6", marginTop: "0.25rem" }}>152 Akun</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>48.7% Validasi Terverifikasi</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Laju Verifikasi (Jan &rarr; Sep)</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>+322%</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Dari 36 menjadi 152 akun</span>
            </div>
          </div>

          {/* Official KITA Notice Banner */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(167, 14, 19, 0.06)",
              border: "1px solid rgba(167, 14, 19, 0.2)",
              marginBottom: "1.25rem",
              fontSize: "0.775rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#a70e13", display: "block", marginBottom: "2px" }}>Catatan Validasi Pelanggan KITA Dashboard:</strong>
            • *Terdapat tombol disebelah ujung kanan untuk melakukan validasi customer.<br />
            • *Remark tidak bisa diupdate jika periode BackDate.
          </div>

          {/* Visualizations (Customer Validity Chart) */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              padding: "1.25rem",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <BarChart3 size={18} color="#a70e13" />
                  Customer Validity Chart (<code style={{ fontSize: "0.8rem", color: "#a70e13" }}>#bar_chart_cp</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Perbandingan Total Customer, Total Customer PANOL, dan Total Customer Validation bulanan
                </p>
              </div>
              <div style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: "rgba(167, 14, 19, 0.1)", color: "#a70e13", fontSize: "0.75rem", fontWeight: 600 }}>
                Tahun {year}
              </div>
            </div>

            <div style={{ height: "350px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphicData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                  <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--bg-border)",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString("id-ID")} Pelanggan`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "8px" }} />
                  <Bar dataKey="totalCust" name="Total Customer" fill="#a70e13" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCustPanol" name="Total Customer PANOL" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCustVerified" name="Total Customer Validation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Validity Breakdown Table */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              overflow: "hidden",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--bg-border)" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                Rincian Bulanan Validasi Pelanggan (Januari - September {year})
              </h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Bulan</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Total Customer</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Total Customer PANOL</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Total Customer Validation</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>% Validasi</th>
                  </tr>
                </thead>
                <tbody>
                  {graphicData.map((row) => {
                    const pct = row.totalCust > 0 ? (row.totalCustVerified / row.totalCust) * 100 : 0;
                    const isSelected = row.month === month;
                    return (
                      <tr
                        key={row.month}
                        style={{
                          borderBottom: "1px solid var(--bg-border)",
                          backgroundColor: isSelected ? "rgba(167, 14, 19, 0.06)" : "transparent",
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: isSelected ? "#a70e13" : "var(--text-primary)" }}>
                          {MONTH_NAMES[(row.month - 1) % 12]} ({row.month})
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {row.totalCust?.toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#f59e0b" }}>
                          {row.totalCustPanol?.toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#3b82f6", fontWeight: 600 }}>
                          {row.totalCustVerified?.toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.5rem",
                              borderRadius: "4px",
                              background: pct >= 45 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                              color: pct >= 45 ? "#10b981" : "#f59e0b",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                          >
                            {formatNumber(pct)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 3: KEY ACCOUNT (#ka) ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ka" && (
        <div>
          {/* Header & KPI Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Key Accounts</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>{keyAccounts.length} Akun</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Akun Industri & Smelter Utama</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Potential Volume</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>44.4M L</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Estimasi Kebutuhan Tahunan</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>YTD Sell Out Key Accounts</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>22.9M L</div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>51.6% Penetrasi Potensi</span>
            </div>
            <div style={{ background: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--bg-border)", borderLeft: "4px solid #8b5cf6" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Rata-rata Share of Wallet</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginTop: "0.25rem" }}>70.7%</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Dominasi pasokan pelumas</span>
            </div>
          </div>

          {/* Official KITA Notice Banner */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              marginBottom: "1.25rem",
              fontSize: "0.775rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#f59e0b", display: "block", marginBottom: "2px" }}>Catatan Modul Key Account:</strong>
            • *Table ini dapat digunakan untuk melihat dan remaking customer.<br />
            • *FY LE (BP) tidak dapat di update jika periode BackDate.
          </div>

          {/* Table Controls (Top N selector & Search) */}
          <div
            style={{
              background: "var(--bg-card)",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid var(--bg-border)",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Search Key Account */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--bg-surface)",
                padding: "0.4rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--bg-border)",
                minWidth: "260px",
                flex: "1 1 280px",
              }}
            >
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Cari akun kunci (nama, ID, sektor)..."
                value={kaSearch}
                onChange={(e) => setKaSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>

            {/* Top N Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Tampilkan:</span>
              <select
                value={kaLimit}
                onChange={(e) => setKaLimit(Number(e.target.value))}
                aria-label="Filter Top Key Accounts"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  outline: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Semua (All)</option>
              </select>
            </div>
          </div>

          {/* DataTable: table-key-account-customer */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "10px",
              border: "1px solid var(--bg-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              overflow: "hidden",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Award size={18} color="#f59e0b" />
                  Tabel Key Account Customer (<code style={{ fontSize: "0.8rem", color: "#f59e0b" }}>#table-key-account-customer</code>)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Monitoring Akun Kunci, Target Win, YTD Sell Out, dan Share of Wallet
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table id="table-key-account-customer" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 0.75rem", fontWeight: 600, width: "40px", textAlign: "center" }}>No</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Customer Name / ID</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Distributor / Branch</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Sektor & Sub-Sektor</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Potential Vol</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Monthly Target Win</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>YTD Sell Out</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "center" }}>Share of Wallet</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>YTD SO Last Year</th>
                  </tr>
                </thead>
                <tbody>
                  {kaLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <RefreshCw size={20} className="spin" style={{ margin: "0 auto 0.5rem" }} />
                        Memuat data Key Account...
                      </td>
                    </tr>
                  ) : keyAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ada data Key Account yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    keyAccounts.map((ka, idx) => {
                      const sowGood = ka.shareOfWallet >= 70.0;
                      return (
                        <tr
                          key={ka.szCustomerId}
                          style={{
                            borderBottom: "1px solid var(--bg-border)",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "0.75rem 0.75rem", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{ka.szCustomerName}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{ka.szCustomerId} • {ka.szCustomerType}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                            <div>{ka.szDistributionName}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{ka.szArea}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                            <div style={{ fontWeight: 600 }}>{ka.szSectorIndustry}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{ka.szSubSectorIndustry}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-primary)" }}>
                            {formatVolume(ka.decPotentialVolume)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#3b82f6", fontWeight: 600 }}>
                            {formatVolume(ka.decMonthlyTargetWin)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                            {formatVolume(ka.decYtdSellOut)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "0.2rem 0.55rem",
                                borderRadius: "4px",
                                background: sowGood ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                color: sowGood ? "#10b981" : "#f59e0b",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                              }}
                            >
                              {formatNumber(ka.shareOfWallet)}%
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-muted)" }}>
                            {formatVolume(ka.decYtdSoLastYear)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Customer 360° Modal ─── */}
      {selectedCustomer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--bg-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <Building2 size={18} color="#0284c7" />
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {selectedCustomer.customerName}
                  </h3>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ID: <strong>{selectedCustomer.customerId}</strong> • Status:{" "}
                  <strong style={{ color: selectedCustomer.customerStatus === "Active" ? "#10b981" : "#f59e0b" }}>
                    {selectedCustomer.customerStatus}
                  </strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              {/* Grid 2 Columns */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                {/* Info Block 1 */}
                <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--bg-border)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Informasi Cabang & Wilayah
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Cabang:</strong> {selectedCustomer.workplaceName || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Wilayah:</strong> {selectedCustomer.area || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Provinsi:</strong> {selectedCustomer.province || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>
                    <strong>Lokasi / Alamat:</strong> {selectedCustomer.szAddress || selectedCustomer.szLocation || "-"}
                  </div>
                </div>

                {/* Info Block 2 */}
                <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--bg-border)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Sektor & Klasifikasi
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Sektor Industri:</strong> {selectedCustomer.sectorIndustry || selectedCustomer.groupSector || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Sub Sektor:</strong> {selectedCustomer.subSectorIndustry || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <strong>Grup Pelanggan:</strong> {selectedCustomer.customerGroup || "-"}
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>
                    <strong>Tipe Perusahaan:</strong> {selectedCustomer.companyType || "-"}
                  </div>
                </div>
              </div>

              {/* Volume & Sales Block */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(99, 102, 241, 0.08))",
                  padding: "1rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(2, 132, 199, 0.2)",
                  marginBottom: "1.25rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Estimasi Potensi Tahunan</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {formatVolume(selectedCustomer.decTotalEstAnnualVolume)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>YTD Sell Out (2026)</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981" }}>
                    {formatVolume(selectedCustomer.decYtdSellOut)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>DSR / Person In Charge</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {selectedCustomer.dsrName || "-"}
                  </div>
                </div>
              </div>

              {/* Kontak & Remarks */}
              <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--bg-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Kontak & Remarks Pelanggan
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "0.825rem" }}>
                  <div>
                    <strong>PIC:</strong> {selectedCustomer.contactPerson || "-"}
                  </div>
                  <div>
                    <strong>Telepon:</strong> {selectedCustomer.phoneNumber || "-"}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedCustomer.email || "-"}
                  </div>
                  <div>
                    <strong>TOP:</strong> {selectedCustomer.szTop || "-"}
                  </div>
                </div>

                {/* Remarks Badges */}
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--bg-border)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Customer Remarks:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {[
                      selectedCustomer.custRemark1,
                      selectedCustomer.custRemark2,
                      selectedCustomer.custRemark3,
                      selectedCustomer.custRemark4,
                      selectedCustomer.custRemark5,
                    ]
                      .filter(Boolean)
                      .map((rem, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "#6366f1",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                          }}
                        >
                          {rem}
                        </span>
                      ))}
                    {![
                      selectedCustomer.custRemark1,
                      selectedCustomer.custRemark2,
                      selectedCustomer.custRemark3,
                      selectedCustomer.custRemark4,
                      selectedCustomer.custRemark5,
                    ].some(Boolean) && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tidak ada remark tercatat.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "0.75rem 1.5rem",
                borderTop: "1px solid var(--bg-border)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  background: "#0284c7",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Notice ─── */}
      <div
        style={{
          padding: "0.85rem 1.25rem",
          borderRadius: "8px",
          background: "rgba(0,0,0,0.02)",
          border: "1px solid var(--bg-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          fontSize: "0.775rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Info size={16} style={{ color: "#0284c7" }} />
          <span>
            Data Customer Dashboard disinkronkan secara langsung dari <strong>KITA Dashboard API</strong> dalam mode <strong>Read-Only</strong>.
            Mendukung navigasi hash langsung untuk <code>#table</code>, <code>#pv</code> (Customer Chart), dan <code>#ka</code> (Key Account).
          </span>
        </div>
        {lastUpdated && (
          <div>
            Pembaruan terakhir: <strong>{lastUpdated}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
