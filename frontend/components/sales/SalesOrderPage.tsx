"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiSales } from "@/lib/api";
import {
  CandlestickChart,
  ReceiptText,
  Search,
  Filter,
  Calendar,
  RotateCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Building2,
  User,
  FileText,
  CreditCard,
  Layers,
  ArrowRight,
  Check,
  XCircle,
  Hash,
  MapPin,
  Phone,
  Mail,
  ShoppingBag
} from "lucide-react";

interface SalesOrderSummaryKPI {
  total_orders: number;
  total_nominal: number;
  diproses_count: number;
  diproses_nominal: number;
  pengiriman_count: number;
  pengiriman_nominal: number;
  menunggu_count: number;
  menunggu_nominal: number;
  selesai_count: number;
  selesai_nominal: number;
  batal_count: number;
  batal_nominal: number;
}

interface SalesOrderItemRow {
  nomor: string;
  tanggal: string;
  id_customer: string;
  nama_customer: string;
  kepada?: string | null;
  referensi?: string | null;
  grandtotal: number;
  total: number;
  total_ppn: number;
  total_discount: number;
  status: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  badge_class: string;
  top?: number | null;
  id_salesman?: string | null;
  nama_sales?: string | null;
  panggilan_sales?: string | null;
  customer_telp?: string | null;
  customer_alamat?: string | null;
  keterangan?: string | null;
  credit_check?: {
    status: string;
    label: string;
    color: string;
    bg: string;
    recommendation: string;
    batas_kredit: number;
    total_piutang: number;
    overdue_amount: number;
    overdue_count: number;
    max_days_overdue: number;
    has_overdue: boolean;
    is_over_limit: boolean;
  };
}

interface SalesOrderDetailItem {
  no_so: string;
  urut: number;
  id_barang: string;
  nama_barang: string;
  satuan: string;
  qty: number;
  harga: number;
  total: number;
  diskonrp: number;
  diskonpersen: number;
  diambil: number;
  sisa: number;
  remark?: string | null;
}

interface SalesOrderDetailResponse {
  order: SalesOrderItemRow & {
    customer_email?: string | null;
    customer_alamat_kirim?: string | null;
    customer_npwp?: string | null;
    telp_sales?: string | null;
    email_sales?: string | null;
    dpp?: number;
    syarat?: string | null;
    deliverypoint?: string | null;
  };
  items: SalesOrderDetailItem[];
  total_items: number;
}

const ITEMS_PER_PAGE = 20;

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function fmtDate(dStr: string | null | undefined): string {
  if (!dStr) return "—";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return Number(n).toLocaleString("id-ID");
}

export default function SalesOrderPage() {
  // Filter States
  const [activeTabStatus, setActiveTabStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Data States
  const [orders, setOrders] = useState<SalesOrderItemRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // KPI States
  const [kpi, setKpi] = useState<SalesOrderSummaryKPI | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(true);

  // Detail Modal States
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<SalesOrderDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load KPIs
  const loadKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiSales.ordersKpi(params);
      if (res.data) {
        setKpi(res.data);
      }
    } catch (e) {
      console.error("Failed to load SO KPI:", e);
    } finally {
      setLoadingKpi(false);
    }
  }, [searchQuery, dateFrom, dateTo]);

  // Load Orders with 20 items per page
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (activeTabStatus && activeTabStatus !== "all") {
        params.status = activeTabStatus;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }

      const res = await apiSales.orders(params);
      if (res.data) {
        setOrders(res.data.items || []);
        setTotalOrders(res.data.total || 0);
        setTotalPages(res.data.total_pages || Math.max(1, Math.ceil((res.data.total || 0) / ITEMS_PER_PAGE)));
      }
    } catch (e) {
      console.error("Failed to load Sales Orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  }, [activeTabStatus, searchQuery, dateFrom, dateTo, currentPage]);

  // Load Detail when an order is selected
  const openDetailModal = async (nomor: string) => {
    setSelectedOrderNo(nomor);
    setLoadingDetail(true);
    try {
      const res = await apiSales.orderDetail(nomor);
      setOrderDetail(res.data);
    } catch (e) {
      console.error("Failed to load order detail:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedOrderNo(null);
    setOrderDetail(null);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    loadKpi();
  }, [loadKpi]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusTabChange = (statusKey: string) => {
    setActiveTabStatus(statusKey);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveTabStatus("all");
    setSearchInput("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // Helper render pagination
  const renderPagination = (
    currPage: number,
    totPages: number,
    totItems: number,
    onPageChange: (newPage: number) => void
  ) => {
    if (totItems === 0) return null;
    const startIdx = (currPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx = Math.min(currPage * ITEMS_PER_PAGE, totItems);

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.95rem 1.25rem",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--bg-border)",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <div>
          Menampilkan <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{startIdx.toLocaleString("id-ID")}</span> –{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{endIdx.toLocaleString("id-ID")}</span> dari{" "}
          <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{totItems.toLocaleString("id-ID")}</span> data Sales Order
          <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            (20 data per halaman)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => onPageChange(Math.max(1, currPage - 1))}
            disabled={currPage <= 1 || loadingOrders}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.45rem 0.95rem",
              background: currPage <= 1 ? "var(--bg-hover)" : "var(--color-primary)",
              color: currPage <= 1 ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currPage <= 1 ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "8px",
              cursor: currPage <= 1 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <span
            style={{
              padding: "0.45rem 0.95rem",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.82rem",
              color: "var(--text-primary)",
            }}
          >
            Halaman {currPage.toLocaleString("id-ID")} / {totPages.toLocaleString("id-ID")}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totPages, currPage + 1))}
            disabled={currPage >= totPages || loadingOrders}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.45rem 0.95rem",
              background: currPage >= totPages ? "var(--bg-hover)" : "var(--color-primary)",
              color: currPage >= totPages ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currPage >= totPages ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "8px",
              cursor: currPage >= totPages ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            Next Page <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── TOP HEADER ── */}
      <div className="page-header" style={{ marginBottom: "0.5rem" }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <ReceiptText className="text-primary" size={26} />
          Sales Order
        </h1>
        <p className="page-subtitle">
          Manajemen dan pemantauan data pesanan penjualan (SO), pipeline pemrosesan, pengiriman, dan verifikasi faktur
        </p>
      </div>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--bg-border)",
          marginBottom: "0.5rem",
        }}
      >
        <Link
          href="/sales"
          style={{
            background: "none",
            border: "none",
            borderBottom: "2px solid transparent",
            color: "var(--text-muted)",
            fontWeight: 500,
            fontSize: "0.95rem",
            padding: "0.65rem 1.25rem",
            cursor: "pointer",
            marginBottom: "-1px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s ease",
          }}
        >
          <CandlestickChart size={16} />
          <span>Sales Monitoring</span>
        </Link>
        <Link
          href="/sales/orders"
          style={{
            background: "none",
            border: "none",
            borderBottom: "2px solid #3B82F6",
            color: "#60A5FA",
            fontWeight: 700,
            fontSize: "0.95rem",
            padding: "0.65rem 1.25rem",
            cursor: "pointer",
            marginBottom: "-1px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ReceiptText size={16} />
          <span>Sales Order</span>
        </Link>
      </div>

      {/* ── 4 KPI SUMMARY CARDS (Interoly UI Kit Style) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Card 1: Total Orders */}
        <div
          className="kpi-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Total Sales Order
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {loadingKpi ? "..." : fmtNumber(kpi?.total_orders)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
              }}
            >
              <ReceiptText size={22} />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-primary)" }}>
              {loadingKpi ? "..." : fmtCurrency(kpi?.total_nominal)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• Total Nilai Pesanan</span>
          </div>
        </div>

        {/* Card 2: Diproses */}
        <div
          className="kpi-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Order Diproses
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#6366f1", marginTop: "0.25rem" }}>
                {loadingKpi ? "..." : fmtNumber(kpi?.diproses_count)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
              }}
            >
              <Layers size={22} />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1" }}>
              {loadingKpi ? "..." : fmtCurrency(kpi?.diproses_nominal)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• Status P (Proses)</span>
          </div>
        </div>

        {/* Card 3: Dalam Pengiriman */}
        <div
          className="kpi-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Dalam Pengiriman
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706", marginTop: "0.25rem" }}>
                {loadingKpi ? "..." : fmtNumber(kpi?.pengiriman_count)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706",
              }}
            >
              <Truck size={22} />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#d97706" }}>
              {loadingKpi ? "..." : fmtCurrency(kpi?.pengiriman_nominal)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• Status S & R</span>
          </div>
        </div>

        {/* Card 4: Menunggu (Waiting/Pending) */}
        <div
          className="kpi-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "14px",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Menunggu (Pending)
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#b45309", marginTop: "0.25rem" }}>
                {loadingKpi ? "..." : fmtNumber(kpi?.menunggu_count)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(234, 179, 8, 0.15)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#b45309",
              }}
            >
              <Clock size={22} />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#b45309" }}>
              {loadingKpi ? "..." : fmtCurrency(kpi?.menunggu_nominal)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• Status W (Waiting)</span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER SECTION (Interoly Style Pills + Search Bar) ── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Filter Status Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "Semua Status", count: kpi?.total_orders, color: "#94a3b8" },
            { key: "diproses", label: "Diproses", count: kpi?.diproses_count, color: "#818cf8" },
            { key: "pengiriman", label: "Pengiriman", count: kpi?.pengiriman_count, color: "#fbbf24" },
            { key: "menunggu", label: "Menunggu", count: kpi?.menunggu_count, color: "#facc15" },
            { key: "selesai", label: "Selesai", count: kpi?.selesai_count, color: "#34d399" },
            { key: "batal", label: "Batal", count: kpi?.batal_count, color: "#f87171" },
          ].map((tab) => {
            const isActive = activeTabStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusTabChange(tab.key)}
                style={{
                  background: isActive ? "rgba(59, 130, 246, 0.15)" : "var(--bg-surface)",
                  border: "1px solid",
                  borderColor: isActive ? "var(--color-primary)" : "var(--bg-border)",
                  color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                  borderRadius: "20px",
                  padding: "0.4rem 0.95rem",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      background: isActive ? "#2563eb" : "rgba(255, 255, 255, 0.1)",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      borderRadius: "10px",
                      padding: "0.1rem 0.45rem",
                    }}
                  >
                    {tab.count.toLocaleString("id-ID")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Date Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 450 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Cari No SO, Customer, Sales PIC, Ref PO..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "8px",
                padding: "0.55rem 0.85rem 0.55rem 2.4rem",
                fontSize: "0.85rem",
                color: "var(--text-primary)",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--bg-border)")}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Range Controls & Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <Calendar size={15} />
              <span>Tanggal:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
              <span>s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                }}
              />
            </div>

            {(searchInput || dateFrom || dateTo || activeTabStatus !== "all") && (
              <button
                onClick={handleResetFilters}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                  borderRadius: "6px",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset Filter
              </button>
            )}

            <button
              onClick={() => {
                loadKpi();
                loadOrders();
              }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
                borderRadius: "6px",
                padding: "0.45rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
              title="Muat ulang data"
            >
              <RotateCw size={14} className={loadingOrders ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN DATA TABLE (Strictly 20 items per page with Back/Next) ── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", width: 50, color: "var(--text-muted)", fontWeight: 600 }}>No</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>No. Sales Order</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", width: 110, color: "var(--text-muted)", fontWeight: 600 }}>Tanggal</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Customer & Kontak</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Ref. PO / Memo</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Salesperson PIC</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", width: 95, color: "var(--text-muted)", fontWeight: 600 }}>TOP</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>Nilai Order</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", width: 120, color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", width: 140, color: "var(--text-muted)", fontWeight: 600 }}>Rilis Kirim (Credit)</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", width: 100, color: "var(--text-muted)", fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr>
                  <td colSpan={11} style={{ padding: "3.5rem", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <RotateCw size={28} className="animate-spin text-primary" />
                      <span>Memuat 20 data Sales Order...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "3.5rem", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <AlertCircle size={32} style={{ color: "#eab308" }} />
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>Tidak ada data Sales Order yang ditemukan</span>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Coba sesuaikan kata kunci pencarian, rentang tanggal, atau tab status.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((so, idx) => {
                  const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr
                      key={so.nomor}
                      style={{
                        borderBottom: "1px solid var(--border-table-row)",
                        transition: "background 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => openDetailModal(so.nomor)}
                    >
                      <td style={{ padding: "0.8rem 1rem", textAlign: "center", color: "var(--text-muted)", fontWeight: 500 }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                        {so.nomor}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", color: "var(--text-secondary)" }}>
                        {fmtDate(so.tanggal)}
                      </td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{so.nama_customer}</div>
                        {so.kepada && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: 2 }}>
                            <User size={12} /> {so.kepada}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {so.referensi ? (
                          <span style={{ background: "var(--bg-hover)", border: "1px solid var(--bg-border)", padding: "0.2rem 0.5rem", borderRadius: 4, fontFamily: "monospace", color: "var(--text-primary)" }}>
                            {so.referensi}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {so.nama_sales || so.panggilan_sales || "—"}
                        </div>
                        {so.id_salesman && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            ID: {so.id_salesman}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: so.top === 0 ? "rgba(16, 185, 129, 0.15)" : "var(--bg-hover)",
                            color: so.top === 0 ? "#10b981" : "var(--text-secondary)",
                            border: "1px solid",
                            borderColor: so.top === 0 ? "rgba(16, 185, 129, 0.3)" : "var(--bg-border)",
                          }}
                        >
                          {so.top === 0 ? "Cash" : `${so.top || 0} Hari`}
                        </span>
                      </td>
                      <td style={{ padding: "0.8rem 1rem", textAlign: "right", fontWeight: 700, color: "#10b981", fontSize: "0.9rem" }}>
                        {fmtCurrency(so.grandtotal)}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.65rem",
                            borderRadius: "16px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: so.status_bg || "rgba(148, 163, 184, 0.15)",
                            color: so.status_color || "#94a3b8",
                            border: `1px solid ${so.status_color || "#94a3b8"}40`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: so.status_color || "#94a3b8",
                            }}
                          />
                          {so.status_label}
                        </span>
                      </td>
                      <td style={{ padding: "0.8rem 1rem", textAlign: "center" }}>
                        {so.credit_check ? (
                          <span
                            title={so.credit_check.recommendation}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "16px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: so.credit_check.bg,
                              color: so.credit_check.color,
                              border: `1px solid ${so.credit_check.color}40`,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: so.credit_check.color,
                              }}
                            />
                            {so.credit_check.label}
                          </span>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", textAlign: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(so.nomor);
                          }}
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            color: "#60a5fa",
                            borderRadius: "6px",
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#2563eb";
                            e.currentTarget.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                            e.currentTarget.style.color = "#60a5fa";
                          }}
                        >
                          <Eye size={13} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 20 Items Pagination Controls */}
        {renderPagination(currentPage, totalPages, totalOrders, setCurrentPage)}
      </div>

      {/* ── ORDER DETAIL MODAL (Interoly Style) ── */}
      {selectedOrderNo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={closeDetailModal}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "1000px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--bg-border)",
                background: "var(--bg-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                  }}
                >
                  <ReceiptText size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {selectedOrderNo}
                    </h2>
                    {orderDetail && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "14px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: orderDetail.order.status_bg,
                          color: orderDetail.order.status_color,
                          border: `1px solid ${orderDetail.order.status_color}40`,
                        }}
                      >
                        {orderDetail.order.status_label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Tanggal Order: {fmtDate(orderDetail?.order.tanggal)}
                  </div>
                </div>
              </div>

              <button
                onClick={closeDetailModal}
                style={{
                  background: "var(--bg-hover)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "8px",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {loadingDetail || !orderDetail ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
                  <RotateCw size={32} className="animate-spin text-primary" style={{ margin: "0 auto 1rem" }} />
                  <div>Memuat detail lengkap Sales Order...</div>
                </div>
              ) : (
                <>
                  {/* Credit Control Pre-Delivery Check Card */}
                  {orderDetail.order.credit_check && (
                    <div
                      style={{
                        background:
                          orderDetail.order.credit_check.status === "APPROVED"
                            ? "rgba(16, 185, 129, 0.08)"
                            : orderDetail.order.credit_check.status === "HOLD_OVERDUE"
                            ? "rgba(239, 68, 68, 0.08)"
                            : "rgba(245, 158, 11, 0.08)",
                        border: `1px solid ${orderDetail.order.credit_check.color}60`,
                        borderRadius: "12px",
                        padding: "1rem 1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <CreditCard size={18} style={{ color: orderDetail.order.credit_check.color }} />
                          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>
                            Analisis Risiko Kredit Sebelum Rilis Pengiriman
                          </span>
                        </div>
                        <span
                          style={{
                            padding: "0.3rem 0.8rem",
                            borderRadius: "20px",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            background: orderDetail.order.credit_check.bg,
                            color: orderDetail.order.credit_check.color,
                            border: `1px solid ${orderDetail.order.credit_check.color}60`,
                          }}
                        >
                          {orderDetail.order.credit_check.label}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: "0.75rem",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--bg-border)",
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Plafon Kredit (Batas):</div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {orderDetail.order.credit_check.batas_kredit > 0
                              ? fmtCurrency(orderDetail.order.credit_check.batas_kredit)
                              : "Tanpa Plafon (Cash)"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Total Piutang Berjalan:</div>
                          <div
                            style={{
                              fontSize: "0.92rem",
                              fontWeight: 700,
                              color: orderDetail.order.credit_check.total_piutang > 0 ? "#f59e0b" : "#34d399",
                            }}
                          >
                            {fmtCurrency(orderDetail.order.credit_check.total_piutang)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Faktur Jatuh Tempo (Overdue):</div>
                          <div
                            style={{
                              fontSize: "0.92rem",
                              fontWeight: 700,
                              color: orderDetail.order.credit_check.overdue_amount > 0 ? "#ef4444" : "#10b981",
                            }}
                          >
                            {fmtCurrency(orderDetail.order.credit_check.overdue_amount)}
                            {orderDetail.order.credit_check.overdue_count > 0 && (
                              <span style={{ fontSize: "0.75rem", fontWeight: 500, marginLeft: "0.35rem", opacity: 0.85 }}>
                                ({orderDetail.order.credit_check.overdue_count} faktur)
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Keterlambatan Terlama:</div>
                          <div
                            style={{
                              fontSize: "0.92rem",
                              fontWeight: 700,
                              color: orderDetail.order.credit_check.max_days_overdue > 0 ? "#f87171" : "#10b981",
                            }}
                          >
                            {orderDetail.order.credit_check.max_days_overdue > 0
                              ? `${orderDetail.order.credit_check.max_days_overdue} Hari`
                              : "Tidak ada"}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, color: orderDetail.order.credit_check.color }}>
                          Rekomendasi Finance:
                        </span>
                        <span>{orderDetail.order.credit_check.recommendation}</span>
                      </div>
                    </div>
                  )}

                  {/* 3 Overview Cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {/* Customer Info Card */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "12px",
                        padding: "1rem 1.15rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--color-primary)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.65rem" }}>
                        <Building2 size={16} />
                        <span>Informasi Pelanggan</span>
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                        {orderDetail.order.nama_customer}
                      </div>
                      {orderDetail.order.kepada && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <User size={13} style={{ color: "var(--text-muted)" }} /> Kontak: {orderDetail.order.kepada}
                        </div>
                      )}
                      {orderDetail.order.customer_telp && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Phone size={13} /> {orderDetail.order.customer_telp}
                        </div>
                      )}
                      {orderDetail.order.customer_alamat && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.45rem", lineHeight: 1.4 }}>
                          <span style={{ color: "var(--text-muted)" }}>Alamat Tagih: </span>{orderDetail.order.customer_alamat}
                        </div>
                      )}
                      {orderDetail.order.deliverypoint && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.45rem",
                            lineHeight: 1.4,
                            background: "var(--bg-hover)",
                            border: "1px solid var(--bg-border)",
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                          }}
                          dangerouslySetInnerHTML={{ __html: orderDetail.order.deliverypoint }}
                        />
                      )}
                    </div>

                    {/* Sales & Contract Info */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "12px",
                        padding: "1rem 1.15rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#6366f1", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.65rem" }}>
                        <User size={16} />
                        <span>Salesperson & Kontrak</span>
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                        {orderDetail.order.nama_sales || orderDetail.order.panggilan_sales || "Tidak ditentukan"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.45rem" }}>
                        ID Sales: {orderDetail.order.id_salesman || "—"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Ref PO:</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", background: "var(--bg-hover)", border: "1px solid var(--bg-border)", padding: "0.15rem 0.45rem", borderRadius: 4 }}>
                          {orderDetail.order.referensi || "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.45rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Term (TOP):</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {orderDetail.order.top === 0 ? "Cash" : `${orderDetail.order.top || 0} Hari`}
                        </span>
                      </div>
                      {orderDetail.order.keterangan && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
                          Catatan: {orderDetail.order.keterangan}
                        </div>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "12px",
                        padding: "1rem 1.15rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--color-success)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.65rem" }}>
                          <CreditCard size={16} />
                          <span>Ringkasan Nilai Order</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                          <span>Subtotal:</span>
                          <span style={{ color: "var(--text-primary)" }}>{fmtCurrency(orderDetail.order.total)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                          <span>Diskon:</span>
                          <span style={{ color: "#ef4444" }}>- {fmtCurrency(orderDetail.order.total_discount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                          <span>PPN:</span>
                          <span style={{ color: "var(--text-primary)" }}>+ {fmtCurrency(orderDetail.order.total_ppn)}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          borderTop: "1px solid var(--bg-border)",
                          paddingTop: "0.65rem",
                          marginTop: "0.65rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Grand Total:</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-success)" }}>
                          {fmtCurrency(orderDetail.order.grandtotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <ShoppingBag size={17} className="text-primary" />
                        Rincian Item Produk ({orderDetail.total_items} Barang)
                      </h3>
                    </div>

                    <div
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "center", width: 40, color: "var(--text-muted)" }}>No</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "left", width: 120, color: "var(--text-muted)" }}>Kode</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "left", color: "var(--text-muted)" }}>Nama Barang</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "center", width: 70, color: "var(--text-muted)" }}>Satuan</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 75, color: "var(--text-muted)" }}>Qty</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 125, color: "var(--text-muted)" }}>Harga</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 100, color: "var(--text-muted)" }}>Diskon</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 135, color: "var(--text-muted)" }}>Total</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 75, color: "var(--text-muted)" }}>Diambil</th>
                            <th style={{ padding: "0.65rem 0.85rem", textAlign: "right", width: 75, color: "var(--text-muted)" }}>Sisa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetail.items.map((it, idx) => (
                            <tr
                              key={`${it.id_barang}-${idx}`}
                              style={{
                                borderBottom: "1px solid var(--border-table-row)",
                              }}
                            >
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "center", color: "var(--text-muted)" }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                                {it.id_barang}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                {it.nama_barang}
                                {it.remark && (
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                    {it.remark}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "center", color: "var(--text-muted)" }}>
                                {it.satuan}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                                {fmtNumber(it.qty)}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: "var(--text-secondary)" }}>
                                {fmtCurrency(it.harga)}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: it.diskonrp > 0 ? "#ef4444" : "var(--text-muted)" }}>
                                {it.diskonrp > 0 ? fmtCurrency(it.diskonrp) : "0"}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 700, color: "var(--color-success)" }}>
                                {fmtCurrency(it.total)}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: "#d97706" }}>
                                {fmtNumber(it.diambil)}
                              </td>
                              <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: it.sisa > 0 ? "#ef4444" : "var(--color-success)", fontWeight: 600 }}>
                                {fmtNumber(it.sisa)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--bg-border)",
                background: "var(--bg-surface)",
              }}
            >
              <button
                onClick={closeDetailModal}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-primary)",
                  borderRadius: "8px",
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.85rem",
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
    </div>
  );
}
