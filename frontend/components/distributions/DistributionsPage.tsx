"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { apiDistributions, apiWarehouses } from "@/lib/api";
import FinancialFlowTab from "./FinancialFlowTab";
import MultiSelectFilter, { MultiSelectOption } from "@/components/inventory/MultiSelectFilter";

interface DistributionSummary {
  total_do: number;
  total_volume?: number;
  total_qty?: number;
  send?: number;
  send_volume?: number;
  send_qty?: number;
  received?: number;
  received_volume?: number;
  received_qty?: number;
  return_do?: number;
  return_volume?: number;
  return_qty?: number;
  invoice?: number;
  invoice_volume?: number;
  invoice_qty?: number;
  cancel?: number;
  cancel_volume?: number;
  cancel_qty?: number;
  draft?: number;
  draft_volume?: number;
  draft_qty?: number;
  delivered: number;
  in_transit: number;
  pending: number;
  on_time_delivery_rate: number;
  avg_delivery_days: number;
}

interface DoReceiptHeader {
  no_do: string;
  tgl_do?: string | null;
  tgl_do_str?: string;
  picking_list_no?: string;
  id_customer?: string;
  customer?: string;
  po_no?: string;
  id_gudang?: string;
  gudang?: string;
  gudang_alamat?: string;
  contact_person?: string;
  telpon_no?: string;
  nama_penerima?: string;
  receive_date?: string | null;
  receive_date_str?: string;
  tgl_sampai_tujuan?: string | null;
  tgl_sampai_tujuan_str?: string;
  biaya_pengiriman?: number | string | null;
  return_date?: string | null;
  return_date_str?: string;
  selisih_hari?: number | null;
  durasi_terima_hari?: number | null;
  no_invoice?: string | null;
  tgl_invoice?: string | null;
  durasi_invoice_hari?: number | null;
  delivery_address?: string;
  status?: string;
  status_label?: string;
  driver?: string;
  lic_plate?: string;
  transporter?: string;
  tgl_keluar?: string | null;
  keterangan?: string;
  total_volume_liter?: number;
  total_qty?: number;
  total_volume_diterima_liter?: number;
  total_qty_diterima?: number;
}

interface DoLineItem {
  no: number;
  kode_barang: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  isi_satuan?: number;
  volume_liter?: number;
  packing_number?: string;
  packing_type?: string;
  qty_diterima?: number;
  volume_diterima_liter?: number;
  keterangan?: string;
}

interface DeliveryRecord {
  nomor: string;
  tanggal: string;
  id_customer?: string;
  customer_id?: string;
  nama_customer: string;
  destination?: string;
  origin?: string;
  kota_tujuan?: string;
  status: string;
  status_label?: string;
  waktu_kirim?: string | null;
  tgl_keluar?: string | null;
  waktu_sampai?: string | null;
  received_date?: string | null;
  received_name?: string | null;
  return_date?: string | null;
  selisih_hari?: number | null;
  durasi_terima_hari?: number | null;
  no_invoice?: string | null;
  tgl_invoice?: string | null;
  durasi_invoice_hari?: number | null;
  total_volume_liter?: number;
  total_qty?: number;
  driver?: string;
  plat_nomor?: string;
  lic_plate?: string;
  nama_gudang?: string | null;
  id_gudang?: string | null;
  po_no?: string | null;
  no_pl?: string | null;
}

interface InternalOrderRecord {
  nomor_io: string;
  tanggal: string;
  nama_kantor: string;
  gudang_asal: string;
  gudang_tujuan: string;
  dibuat_oleh: string;
  dibuat_tanggal?: string | null;
  send_date?: string | null;
  send_by_date?: string | null;
  send_oleh?: string | null;
  check_dsm_date?: string | null;
  dsm_oleh?: string | null;
  check_st_date?: string | null;
  st_oleh?: string | null;
  check_whm_date?: string | null;
  whm_oleh?: string | null;
  approve_date?: string | null;
  approve_tanggal?: string | null;
  approve_oleh?: string | null;
  id_ip?: number | string | null;
  status: string;
  status_code?: string | null;
  nama_barang?: string | null;
  kode_barang?: string | null;
  qty?: number | string | null;
  satuan?: string | null;
  keterangan?: string | null;
  it_nomor?: string | null;
  it_tanggal?: string | null;
  it_complete?: string | null;
  order_status?: string | null;
  urut?: number | null;
}

interface InternalTransferRecord {
  nomor: string;
  tanggal: string;
  create_date?: string | null;
  tanggal_kirim?: string | null;
  tanggal_terima?: string | null;
  id_gudang_asal?: string | null;
  id_gudang_tujuan?: string | null;
  gudang_asal: string;
  gudang_tujuan: string;
  nomor_io?: string | null;
  tgl_io_approve?: string | null;
  receive_note?: string | null;
  keterangan?: string | null;
  status: string;
}

interface IoLineItem {
  no: number;
  nama_barang: string;
  kode_barang: string;
  diminta: number;
  diambil: number;
  qty: number;
  satuan: string;
  keterangan: string;
}

interface ItLineItem {
  no: number;
  nama_barang: string;
  kode_barang: string;
  qty: number;
  satuan: string;
  ongkir?: string;
  no_ibc?: string;
  no_skid_tank?: string;
  no_segel?: string;
  keterangan?: string;
}

interface IoApproval {
  stage: string;
  name: string;
  title: string;
  date?: string | null;
  checked: boolean;
}

interface IoHeader {
  nomor_io: string;
  tanggal?: string | null;
  gudang_asal: string;
  gudang_tujuan: string;
  contact_person?: string;
  dibuat_oleh?: string;
  dibuat_tanggal?: string | null;
  send_oleh?: string;
  send_by_date?: string | null;
  approve_oleh?: string;
  approve_tanggal?: string | null;
  id_ip?: string | null;
  tanggal_ip?: string | null;
  it_nomor?: string | null;
  it_tanggal?: string | null;
  it_complete?: string | null;
  ref_no?: string | null;
  status?: string | null;
  telpon?: string | null;
  approvals?: IoApproval[];
}

interface ItHeader {
  nomor: string;
  nomor_io?: string | null;
  tanggal?: string | null;
  tanggal_kirim?: string | null;
  jam_kirim?: string | null;
  gudang_asal: string;
  gudang_tujuan: string;
  contact_person?: string;
  telpon?: string | null;
  sipb?: string | null;
  istransporter?: boolean;
  transporter?: string | null;
  driver?: string | null;
  nopol?: string | null;
  jenis_kendaraan?: string | null;
  biaya?: number;
  total_liter?: number;
  no_po?: string | null;
  status?: string | null;
  keterangan?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  "Draft": { label: "Draft / Pending", cls: "badge-status badge-draft" },
  "In Transit": { label: "In Transit", cls: "badge-status badge-in_transit" },
  "Delivered": { label: "Delivered", cls: "badge-status badge-delivered" },
  "draft": { label: "Draft / Pending", cls: "badge-status badge-draft" },
  "in_transit": { label: "In Transit", cls: "badge-status badge-in_transit" },
  "delivered": { label: "Delivered", cls: "badge-status badge-delivered" },
  "void": { label: "Batal (Void)", cls: "badge-status badge-void" },
  "S": { label: "Send", cls: "badge-status badge-in_transit" },
  "R": { label: "Received", cls: "badge-status badge-delivered" },
  "I": { label: "Invoice", cls: "badge-status badge-info" },
  "C": { label: "Cancel", cls: "badge-status badge-danger" },
  "D": { label: "Draft", cls: "badge-status badge-draft" },
  "Send": { label: "Send", cls: "badge-status badge-in_transit" },
  "Received": { label: "Received", cls: "badge-status badge-delivered" },
  "Invoice": { label: "Invoice", cls: "badge-status badge-info" },
  "Cancel": { label: "Cancel", cls: "badge-status badge-danger" },
  "send": { label: "Send", cls: "badge-status badge-in_transit" },
  "received": { label: "Received", cls: "badge-status badge-delivered" },
  "invoice": { label: "Invoice", cls: "badge-status badge-info" },
  "cancel": { label: "Cancel", cls: "badge-status badge-danger" },
  "return": { label: "Return", cls: "badge-status badge-info" },
  "Return": { label: "Return", cls: "badge-status badge-info" },
};

const DO_STATUS_BADGE: Record<string, { label: string; cls: string; desc: string }> = {
  "S": { label: "Send", cls: "badge-status badge-in_transit", desc: "Send / Dalam Perjalanan" },
  "R": { label: "Received", cls: "badge-status badge-delivered", desc: "Received / Diterima Customer" },
  "I": { label: "Invoice", cls: "badge-status badge-info", desc: "Invoice / Telah Ditagihkan" },
  "C": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel / Batal" },
  "D": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft / Menunggu Kirim" },
  "Send": { label: "Send", cls: "badge-status badge-in_transit", desc: "Send / Dalam Perjalanan" },
  "Received": { label: "Received", cls: "badge-status badge-delivered", desc: "Received / Diterima Customer" },
  "Invoice": { label: "Invoice", cls: "badge-status badge-info", desc: "Invoice / Telah Ditagihkan" },
  "Cancel": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel / Batal" },
  "Draft": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft / Menunggu Kirim" },
  "send": { label: "Send", cls: "badge-status badge-in_transit", desc: "Send / Dalam Perjalanan" },
  "received": { label: "Received", cls: "badge-status badge-delivered", desc: "Received / Diterima Customer" },
  "return": { label: "Return", cls: "badge-status badge-info", desc: "Return / DO Kembali" },
  "Return": { label: "Return", cls: "badge-status badge-info", desc: "Return / DO Kembali" },
  "invoice": { label: "Invoice", cls: "badge-status badge-info", desc: "Invoice / Telah Ditagihkan" },
  "cancel": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel / Batal" },
  "draft": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft / Menunggu Kirim" },
  "in_transit": { label: "Send", cls: "badge-status badge-in_transit", desc: "Send / Dalam Perjalanan" },
  "delivered": { label: "Received", cls: "badge-status badge-delivered", desc: "Received / Diterima Customer" },
};

const IO_STATUS_BADGE: Record<string, { label: string; cls: string; desc: string }> = {
  "D": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft" },
  "S": { label: "Checked DSM", cls: "badge-status badge-info", desc: "Checked DSM (Send IO)" },
  "K": { label: "Reject DSM", cls: "badge-status badge-danger", desc: "Reject DSM" },
  "Y": { label: "Reject ST", cls: "badge-status badge-danger", desc: "Reject ST" },
  "A": { label: "Approve", cls: "badge-status badge-delivered", desc: "Approve" },
  "R": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel" },
  "X": { label: "Cancel", cls: "badge-status badge-void", desc: "Cancel" },
  "P": { label: "IT Process", cls: "badge-status badge-in_transit", desc: "IT Process" },
  "Z": { label: "Partial", cls: "badge-status badge-warning", desc: "Partial" },
  "C": { label: "IT Completed", cls: "badge-status badge-delivered", desc: "IT Completed" },
  "Draft": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft" },
  "Checked DSM": { label: "Checked DSM", cls: "badge-status badge-info", desc: "Checked DSM" },
  "Reject DSM": { label: "Reject DSM", cls: "badge-status badge-danger", desc: "Reject DSM" },
  "Reject ST": { label: "Reject ST", cls: "badge-status badge-danger", desc: "Reject ST" },
  "Approve": { label: "Approve", cls: "badge-status badge-delivered", desc: "Approve" },
  "Cancel": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel" },
  "IT Process": { label: "IT Process", cls: "badge-status badge-in_transit", desc: "IT Process" },
  "Partial": { label: "Partial", cls: "badge-status badge-warning", desc: "Partial" },
  "IT Completed": { label: "IT Completed", cls: "badge-status badge-delivered", desc: "IT Completed" },
  "IT Complete": { label: "IT Completed", cls: "badge-status badge-delivered", desc: "IT Completed" },
};

const IT_STATUS_BADGE: Record<string, { label: string; cls: string; desc: string }> = {
  "D": { label: "Draft", cls: "badge-status badge-draft", desc: "Draft" },
  "S": { label: "Send", cls: "badge-status badge-in_transit", desc: "Send" },
  "R": { label: "Receipt", cls: "badge-status badge-delivered", desc: "Receipt" },
  "C": { label: "Receipt", cls: "badge-status badge-delivered", desc: "Receipt" },
  "X": { label: "Cancel", cls: "badge-status badge-danger", desc: "Cancel" },
};

function formatDisplayDate(val?: string | null) {
  if (!val) return "—";
  if (typeof val === "string" && val.includes("-") && val.length === 10 && val.indexOf("-") === 2) return val;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return val;
  }
}

function formatDisplayDateTime(val?: string | null) {
  if (!val) return "—";
  if (typeof val === "string" && val.includes("WIB")) return val;
  try {
    const cleanStr = String(val).replace(" ", "T");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes} WIB`;
  } catch {
    return val;
  }
}

function formatDibuatDate(val?: string | null) {
  if (!val) return "—";
  if (typeof val === "string" && val.includes("WIB")) return val;
  try {
    const cleanStr = String(val).replace(" ", "T");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return val;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayName = days[d.getDay()];
    const monName = months[d.getMonth()];
    const dateNum = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const secs = String(d.getSeconds()).padStart(2, "0");
    const year = d.getFullYear();
    return `${dayName} ${monName} ${dateNum} ${hours}:${mins}:${secs} WIB ${year}`;
  } catch {
    return val;
  }
}

/**
 * Parses an ISO date string to a local-timezone Date (avoids UTC midnight shift).
 * Supports "YYYY-MM-DD" (pure date) or any full ISO datetime string.
 */
function parseDateLocal(val: string | null | undefined): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Compute elapsed days + hours from startStr to now. Returns null if start is invalid. */
function getLiveTrackingInfo(startStr: string | null | undefined): {
  days: number; hours: number; label: string;
} | null {
  const start = parseDateLocal(startStr);
  if (!start) return null;
  const diffMs = Math.max(0, Date.now() - start.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const label = days === 0 ? `< 24 Jam (${hours}j)` : `${days} Hari ${hours} Jam`;
  return { days, hours, label };
}

/** Color theme for receive-date live tracking */
function getReceiveLiveTheme(days: number) {
  if (days <= 2) return { color: "#38bdf8", bgColor: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.35)" };
  if (days <= 5) return { color: "#eab308", bgColor: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.35)" };
  return { color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" };
}

/** Color theme for return-date live tracking */
function getReturnLiveTheme(days: number) {
  if (days <= 3) return { color: "#22c55e", bgColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)" };
  if (days <= 7) return { color: "#eab308", bgColor: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.35)" };
  return { color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" };
}

function getCurrentMonthDates() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  } catch {
    return { from: "2026-09-01", to: "2026-09-07" };
  }
}

export default function DistributionsPage({ initialTab = "DO" }: { initialTab?: "DO" | "IO" | "IT" | "FINANCIAL_FLOW" } = {}) {
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  
  const [ioItems, setIoItems] = useState<InternalOrderRecord[]>([]);
  const [itItems, setItItems] = useState<InternalTransferRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const isWarehouse = currentUser?.role === "warehouse" || currentUser?.role === "warehouse_staff";
  const isAsset = ["asset", "asset_staff", "ga", "it"].includes(currentUser?.role);
  const canSeeFinancialFlow = !isWarehouse && !isAsset && currentUser?.role !== "sales_rep" && currentUser?.role !== "sales";
  const [mainTab, setMainTab] = useState<"DO" | "IO" | "IT" | "FINANCIAL_FLOW">(initialTab);

  useEffect(() => {
    if (!canSeeFinancialFlow && mainTab === "FINANCIAL_FLOW") {
      setMainTab("DO");
    }
  }, [canSeeFinancialFlow, mainTab]);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [ioStatusFilter, setIoStatusFilter] = useState<"all" | "draft" | "dsm" | "approve" | "it_process" | "partial" | "it_complete" | "cancel">("all");
  const [itStatusFilter, setItStatusFilter] = useState<"all" | "draft" | "send" | "receipt" | "cancel">("all");

  // Calendar Date Range Filter (Default: Bulan Berjalan) & Excel Export States
  const [calendarDateFrom, setCalendarDateFrom] = useState<string>(() => getCurrentMonthDates().from);
  const [calendarDateTo, setCalendarDateTo] = useState<string>(() => getCurrentMonthDates().to);
  const [isDownloading, setIsDownloading] = useState(false);

  // Warehouse Filter for DO
  const [warehouses, setWarehouses] = useState<{ id_gudang: string; nama_gudang: string }[]>([]);
  const [selectedDoWarehouse, setSelectedDoWarehouse] = useState<string>("ALL");

  // Multi-Filter States across DO, IO, and IT
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDoNumbers, setSelectedDoNumbers] = useState<string[]>([]);
  const [selectedDoDates, setSelectedDoDates] = useState<string[]>([]);
  const [selectedIoNumbers, setSelectedIoNumbers] = useState<string[]>([]);
  const [selectedItNumbers, setSelectedItNumbers] = useState<string[]>([]);
  const [selectedOriginWarehouses, setSelectedOriginWarehouses] = useState<string[]>([]);
  const [selectedDestinationWarehouses, setSelectedDestinationWarehouses] = useState<string[]>([]);
  const [selectedDoStatuses, setSelectedDoStatuses] = useState<string[]>([]);
  const [selectedIoStatuses, setSelectedIoStatuses] = useState<string[]>([]);
  const [selectedItStatuses, setSelectedItStatuses] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedIoKantors, setSelectedIoKantors] = useState<string[]>([]);
  const [selectedIoCreators, setSelectedIoCreators] = useState<string[]>([]);

  // Active filter chip styling (matching Stock Aging style)
  const activeChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: "14px",
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    fontSize: "0.75rem",
    fontWeight: 600,
  };

  // Checkbox row selection states ("Pilihan dari beberapa transaksi")
  const [selectedDoIds, setSelectedDoIds] = useState<Set<string>>(new Set());
  const [selectedIoIds, setSelectedIoIds] = useState<Set<string>>(new Set());
  const [selectedItIds, setSelectedItIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    apiDistributions.warehouses()
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          setWarehouses(res.data);
        }
      })
      .catch(() => {
        apiWarehouses.list()
          .then((res) => {
            if (isMounted && res.data && Array.isArray(res.data)) {
              setWarehouses(res.data);
            }
          })
          .catch((err) => console.error("Gagal memuat gudang:", err));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Live clock — refreshes every 60s so live tracking badges re-compute
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  // Keep TypeScript happy — liveNow is intentionally read in JSX cells below
  void liveNow;

  // Pagination States (20 records per page)
  const ITEMS_PER_PAGE = 20;
  const [doPage, setDoPage] = useState(1);
  const [ioPage, setIoPage] = useState(1);
  const [itPage, setItPage] = useState(1);

  // Modal State for Daftar Barang (DO, IO & IT)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDocType, setModalDocType] = useState<"DO" | "IO" | "IT">("DO");
  const [modalDocNumber, setModalDocNumber] = useState("");
  const [modalIoItems, setModalIoItems] = useState<IoLineItem[]>([]);
  const [modalItItems, setModalItItems] = useState<ItLineItem[]>([]);
  const [modalIoHeader, setModalIoHeader] = useState<IoHeader | null>(null);
  const [modalItHeader, setModalItHeader] = useState<ItHeader | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State untuk DO Receipt Modal & Inline Box
  const [expandedDoId, setExpandedDoId] = useState<string | null>(null);
  const [doModalHeader, setDoModalHeader] = useState<DoReceiptHeader | null>(null);
  const [doModalItems, setDoModalItems] = useState<DoLineItem[]>([]);
  const [doModalLoading, setDoModalLoading] = useState(false);

  // State untuk Modal Box langsung di bawah baris / teks yang di-click
  const [expandedIoId, setExpandedIoId] = useState<string | null>(null);
  const [expandedItId, setExpandedItId] = useState<string | null>(null);

  const handleToggleDo = async (nomor_do: string) => {
    if (expandedDoId === nomor_do) {
      setExpandedDoId(null);
      return;
    }
    setExpandedDoId(nomor_do);
    setModalDocType("DO");
    setModalDocNumber(nomor_do);
    setDoModalLoading(true);
    setDoModalHeader(null);
    setDoModalItems([]);
    try {
      const res = await apiDistributions.deliveryOrderReceipt(nomor_do);
      if (res && res.data) {
        setDoModalHeader(res.data.header || null);
        setDoModalItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat receipt DO:", err);
    } finally {
      setDoModalLoading(false);
    }
  };

  const handleOpenDoReceipt = async (nomor_do: string) => {
    setModalDocType("DO");
    setModalDocNumber(nomor_do);
    setModalOpen(true);
    setDoModalLoading(true);
    setDoModalHeader(null);
    setDoModalItems([]);
    try {
      const res = await apiDistributions.deliveryOrderReceipt(nomor_do);
      if (res && res.data) {
        setDoModalHeader(res.data.header || null);
        setDoModalItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat receipt DO:", err);
    } finally {
      setDoModalLoading(false);
    }
  };

  const handleToggleIo = async (nomor_io: string) => {
    if (expandedIoId === nomor_io) {
      setExpandedIoId(null);
      return;
    }
    setExpandedIoId(nomor_io);
    setModalDocType("IO");
    setModalDocNumber(nomor_io);
    setModalLoading(true);
    setModalIoHeader(null);
    setModalIoItems([]);
    try {
      const res = await apiDistributions.internalOrderItems(nomor_io);
      if (res && res.data) {
        setModalIoHeader(res.data.header || null);
        setModalIoItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat item IO:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleIt = async (nomor: string) => {
    if (expandedItId === nomor) {
      setExpandedItId(null);
      return;
    }
    setExpandedItId(nomor);
    setModalDocType("IT");
    setModalDocNumber(nomor);
    setModalLoading(true);
    setModalItHeader(null);
    setModalItItems([]);
    try {
      const res = await apiDistributions.transferOrderItems(nomor);
      if (res && res.data) {
        setModalItHeader(res.data.header || null);
        setModalItItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat item IT:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenIoItems = async (nomor_io: string) => {
    setModalDocType("IO");
    setModalDocNumber(nomor_io);
    setModalOpen(true);
    setModalLoading(true);
    setModalIoHeader(null);
    setModalIoItems([]);
    try {
      const res = await apiDistributions.internalOrderItems(nomor_io);
      if (res && res.data) {
        setModalIoHeader(res.data.header || null);
        setModalIoItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat item IO:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenItItems = async (nomor: string) => {
    setModalDocType("IT");
    setModalDocNumber(nomor);
    setModalOpen(true);
    setModalLoading(true);
    setModalItHeader(null);
    setModalItItems([]);
    try {
      const res = await apiDistributions.transferOrderItems(nomor);
      if (res && res.data) {
        setModalItHeader(res.data.header || null);
        setModalItItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat item IT:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Dynamically extract customer and driver list from DO records
  const availableCustomers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((d) => {
      if (d.nama_customer) s.add(d.nama_customer.trim());
    });
    return Array.from(s).sort();
  }, [items]);

  const availableDrivers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((d) => {
      if (d.driver) s.add(d.driver.trim());
    });
    return Array.from(s).sort();
  }, [items]);

  // MultiSelect Options for Table Headers: DO
  const customerOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((r) => {
      if (r.nama_customer) {
        counts[r.nama_customer] = (counts[r.nama_customer] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((c) => ({
        label: c,
        value: c,
        count: counts[c],
      }));
  }, [items]);

  const driverOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((r) => {
      if (r.driver) {
        counts[r.driver] = (counts[r.driver] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((d) => ({
        label: d,
        value: d,
        count: counts[d],
      }));
  }, [items]);

  const doNumberOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((r) => {
      if (r.nomor) {
        counts[r.nomor] = (counts[r.nomor] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((no) => ({
        label: no,
        value: no,
        subLabel: items.find((d) => d.nomor === no)?.nama_customer || undefined,
        count: counts[no],
      }));
  }, [items]);

  const doDateOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((r) => {
      const d = r.tanggal;
      if (d) {
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort((a, b) => b.localeCompare(a))
      .map((d) => ({
        label: formatDisplayDate(d),
        value: d,
        subLabel: d,
        count: counts[d],
      }));
  }, [items]);

  const warehouseDoOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((r) => {
      const g = r.nama_gudang || r.id_gudang;
      if (g) {
        counts[g] = (counts[g] || 0) + 1;
      }
    });

    const knownNames = new Set<string>();
    const options: MultiSelectOption[] = [];

    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        const name = w.nama_gudang || w.id_gudang;
        if (!knownNames.has(name.toLowerCase())) {
          knownNames.add(name.toLowerCase());
          options.push({
            label: name,
            value: name,
            subLabel: w.id_gudang && w.nama_gudang !== w.id_gudang ? `Kode: ${w.id_gudang}` : undefined,
            count: counts[name] || (w.id_gudang ? counts[w.id_gudang] : 0) || 0,
          });
        }
      });
    }

    Object.keys(counts).forEach((g) => {
      if (!knownNames.has(g.toLowerCase())) {
        knownNames.add(g.toLowerCase());
        options.push({
          label: g,
          value: g,
          count: counts[g],
        });
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses, items]);

  const doStatusOptions: MultiSelectOption[] = useMemo(() => {
    let send = 0, received = 0, ret = 0, invoice = 0, draft = 0, cancel = 0;
    items.forEach((row) => {
      const isRowInvoice = row.status === "I" || row.status_label === "invoice" || Boolean(row.tgl_invoice);
      const isRowReturn = !isRowInvoice && (row.status === "R" || row.status_label === "Received") && Boolean(row.return_date);
      const isRowReceived = !isRowInvoice && !isRowReturn && (row.status === "R" || row.status_label === "Received");
      const isRowSend = row.status === "S" || row.status_label === "Send" || row.status_label === "in_transit";
      const isRowDraft = row.status === "D" || row.status_label === "Draft";
      const isRowCancel = row.status === "C" || row.status_label === "Cancel";
      if (isRowInvoice) invoice++;
      else if (isRowReturn) ret++;
      else if (isRowReceived) received++;
      else if (isRowSend) send++;
      else if (isRowDraft) draft++;
      else if (isRowCancel) cancel++;
    });
    return [
      { label: "Send (Kirim)", value: "send", badge: "🚛", color: "#38bdf8", count: send },
      { label: "Received (Sampai)", value: "received", badge: "✅", color: "#22c55e", count: received },
      { label: "Return (Kembali)", value: "return", badge: "🔄", color: "#06b6d4", count: ret },
      { label: "Invoice (Faktur)", value: "invoice", badge: "📄", color: "#818cf8", count: invoice },
      { label: "Draft", value: "draft", badge: "⏳", color: "#94a3b8", count: draft },
      { label: "Cancel (Batal)", value: "cancel", badge: "❌", color: "#ef4444", count: cancel },
    ];
  }, [items]);

  // Base DO Items matching warehouse, search, customer, driver, and date filters (WITHOUT status filter)
  // Single Source of Truth for computing responsive DO KPI cards when filters are active
  const baseDoItems = useMemo(() => {
    return items.filter((row) => {
      // 1. Text Search Input
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          (row.nomor || "").toLowerCase().includes(term) ||
          (row.nama_customer || "").toLowerCase().includes(term) ||
          (row.driver || "").toLowerCase().includes(term) ||
          (row.lic_plate || "").toLowerCase().includes(term) ||
          (row.po_no || "").toLowerCase().includes(term) ||
          (row.no_pl || "").toLowerCase().includes(term) ||
          (row.no_invoice || "").toLowerCase().includes(term) ||
          (row.destination || "").toLowerCase().includes(term) ||
          (row.origin || "").toLowerCase().includes(term) ||
          (row.nama_gudang || "").toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. DO Number Selection (Search / Multi-Select No. DO)
      if (selectedDoNumbers.length > 0) {
        if (!row.nomor || !selectedDoNumbers.includes(row.nomor)) return false;
      }

      // 2b. DO Date Selection (Multi-Select Tanggal DO)
      if (selectedDoDates.length > 0) {
        if (!row.tanggal || !selectedDoDates.includes(row.tanggal)) return false;
      }

      // 3. Origin Warehouse Selection (Mendukung 1 atau beberapa gudang)
      if (selectedOriginWarehouses.length > 0) {
        const matches = selectedOriginWarehouses.some((wh) => {
          const target = wh.toLowerCase().trim();
          const rowGudang = (row.nama_gudang || "").toLowerCase().trim();
          const rowId = (row.id_gudang || "").toLowerCase().trim();
          return (
            rowGudang === target ||
            rowId === target ||
            rowGudang.includes(target) ||
            target.includes(rowGudang) ||
            rowId.includes(target) ||
            target.includes(rowId)
          );
        });
        if (!matches) return false;
      }

      // 4. Customer Selection
      if (selectedCustomers.length > 0) {
        if (!row.nama_customer || !selectedCustomers.includes(row.nama_customer)) return false;
      }

      // 5. Driver Selection
      if (selectedDrivers.length > 0) {
        if (!row.driver || !selectedDrivers.includes(row.driver)) return false;
      }

      return true;
    });
  }, [items, searchTerm, selectedDoNumbers, selectedDoDates, selectedOriginWarehouses, selectedCustomers, selectedDrivers]);

  // Filtered Delivery Order (DO) List (Base DO Items + Status Filter / Active Tab)
  const filteredDoItems = useMemo(() => {
    if (selectedDoStatuses.length === 0 && activeTab === "all") {
      return baseDoItems;
    }
    return baseDoItems.filter((row) => {
      const isRowInvoice = row.status === "I" || row.status_label === "invoice" || Boolean(row.tgl_invoice);
      const isRowReturn = !isRowInvoice && (row.status === "R" || row.status_label === "Received") && Boolean(row.return_date);
      const isRowReceived = !isRowInvoice && !isRowReturn && (row.status === "R" || row.status_label === "Received");
      const isRowSend = row.status === "S" || row.status_label === "Send" || row.status_label === "in_transit";
      const isRowDraft = row.status === "D" || row.status_label === "Draft";
      const isRowCancel = row.status === "C" || row.status_label === "Cancel";

      if (selectedDoStatuses.length > 0) {
        return selectedDoStatuses.some((st) => {
          if (st === "invoice") return isRowInvoice;
          if (st === "return") return isRowReturn;
          if (st === "received") return isRowReceived;
          if (st === "send") return isRowSend;
          if (st === "draft") return isRowDraft;
          if (st === "cancel") return isRowCancel;
          return false;
        });
      }

      if (activeTab === "invoice") return isRowInvoice;
      if (activeTab === "return") return isRowReturn;
      if (activeTab === "received") return isRowReceived;
      if (activeTab === "send") return isRowSend;
      if (activeTab === "cancel") return isRowCancel;
      return true;
    });
  }, [baseDoItems, selectedDoStatuses, activeTab]);

  // Dynamic KPI Metrics for DO:
  // Menyesuaikan total DO, DO send, DO received, return, invoice, cancel, volume & qty saat user memilih gudang atau filter aktif
  const isDoWarehouseOrFilterActive =
    selectedOriginWarehouses.length > 0 ||
    selectedCustomers.length > 0 ||
    selectedDrivers.length > 0 ||
    selectedDoNumbers.length > 0 ||
    selectedDoDates.length > 0 ||
    Boolean(searchTerm.trim());

  const doKpiMetrics = useMemo(() => {
    if (!isDoWarehouseOrFilterActive && summary) {
      return {
        totalDo: summary.total_do ?? 0,
        totalVol: summary.total_volume ?? 0,
        totalQty: summary.total_qty ?? 0,
        sendCount: summary.send ?? summary.in_transit ?? 0,
        sendVol: summary.send_volume ?? 0,
        sendQty: summary.send_qty ?? 0,
        recvCount: summary.received ?? summary.delivered ?? 0,
        recvVol: summary.received_volume ?? 0,
        recvQty: summary.received_qty ?? 0,
        returnCount: summary.return_do ?? 0,
        returnVol: summary.return_volume ?? 0,
        returnQty: summary.return_qty ?? 0,
        invCount: summary.invoice ?? 0,
        invVol: summary.invoice_volume ?? 0,
        invQty: summary.invoice_qty ?? 0,
        cancelCount: summary.cancel ?? 0,
        cancelVol: summary.cancel_volume ?? 0,
        cancelQty: summary.cancel_qty ?? 0,
      };
    }

    let totalVol = 0;
    let totalQty = 0;
    let sendCount = 0;
    let sendVol = 0;
    let sendQty = 0;
    let recvCount = 0;
    let recvVol = 0;
    let recvQty = 0;
    let returnCount = 0;
    let returnVol = 0;
    let returnQty = 0;
    let invCount = 0;
    let invVol = 0;
    let invQty = 0;
    let cancelCount = 0;
    let cancelVol = 0;
    let cancelQty = 0;

    baseDoItems.forEach((r) => {
      const vol = Number(r.total_volume_liter) || 0;
      const qty = Number(r.total_qty) || 0;
      totalVol += vol;
      totalQty += qty;

      const isRowInvoice = r.status === "I" || r.status_label === "invoice" || Boolean(r.tgl_invoice);
      const isRowReturn = !isRowInvoice && (r.status === "R" || r.status_label === "Received") && Boolean(r.return_date);
      const isRowReceived = !isRowInvoice && !isRowReturn && (r.status === "R" || r.status_label === "Received");
      const isRowSend = r.status === "S" || r.status_label === "Send" || r.status_label === "in_transit";
      const isRowCancel = r.status === "C" || r.status === "X" || r.status_label === "Cancel";

      if (isRowInvoice) {
        invCount++;
        invVol += vol;
        invQty += qty;
      } else if (isRowReturn) {
        returnCount++;
        returnVol += vol;
        returnQty += qty;
      } else if (isRowReceived) {
        recvCount++;
        recvVol += vol;
        recvQty += qty;
      } else if (isRowSend) {
        sendCount++;
        sendVol += vol;
        sendQty += qty;
      } else if (isRowCancel) {
        cancelCount++;
        cancelVol += vol;
        cancelQty += qty;
      }
    });

    return {
      totalDo: baseDoItems.length,
      totalVol,
      totalQty,
      sendCount,
      sendVol,
      sendQty,
      recvCount,
      recvVol,
      recvQty,
      returnCount,
      returnVol,
      returnQty,
      invCount,
      invVol,
      invQty,
      cancelCount,
      cancelVol,
      cancelQty,
    };
  }, [isDoWarehouseOrFilterActive, summary, baseDoItems]);

  // Filtered Internal Order (IO) List
  const filteredIoItems = useMemo(() => {
    return ioItems.filter((i: InternalOrderRecord) => {
      // 1. Text Search Input
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          (i.nomor_io || "").toLowerCase().includes(term) ||
          (i.dibuat_oleh || "").toLowerCase().includes(term) ||
          (i.gudang_asal || "").toLowerCase().includes(term) ||
          (i.gudang_tujuan || "").toLowerCase().includes(term) ||
          (i.nama_kantor || "").toLowerCase().includes(term) ||
          (i.keterangan || "").toLowerCase().includes(term) ||
          (i.nama_barang || "").toLowerCase().includes(term) ||
          (i.kode_barang || "").toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. IO Number Selection (Search / Multi-Select No. IO)
      if (selectedIoNumbers.length > 0) {
        if (!i.nomor_io || !selectedIoNumbers.includes(i.nomor_io)) return false;
      }

      // 3. Status IO Selection
      if (selectedIoStatuses.length > 0) {
        const code = (i.status_code || "").trim();
        const st = (i.status || "").trim().toLowerCase();
        const matches = selectedIoStatuses.some((filterKey) => {
          if (filterKey === "draft") return code === "D" || st === "draft";
          if (filterKey === "dsm") return code === "S" || st === "checked dsm";
          if (filterKey === "approve") return code === "A" || st === "approve";
          if (filterKey === "it_process") return code === "P" || st.includes("process");
          if (filterKey === "partial") return code === "Z" || st.includes("partial");
          if (filterKey === "it_complete") return code === "C" || st.includes("complete");
          if (filterKey === "cancel") return ["X", "R", "K", "Y"].includes(code) || st.includes("cancel") || st.includes("reject");
          return false;
        });
        if (!matches) return false;
      } else if (ioStatusFilter !== "all") {
        const code = (i.status_code || "").trim();
        const st = (i.status || "").trim().toLowerCase();
        if (ioStatusFilter === "draft" && !(code === "D" || st === "draft")) return false;
        if (ioStatusFilter === "dsm" && !(code === "S" || st === "checked dsm")) return false;
        if (ioStatusFilter === "approve" && !(code === "A" || st === "approve")) return false;
        if (ioStatusFilter === "it_process" && !(code === "P" || st.includes("process"))) return false;
        if (ioStatusFilter === "partial" && !(code === "Z" || st.includes("partial"))) return false;
        if (ioStatusFilter === "it_complete" && !(code === "C" || st.includes("complete"))) return false;
        if (ioStatusFilter === "cancel" && !(["X", "R", "K", "Y"].includes(code) || st.includes("cancel") || st.includes("reject"))) return false;
      }

      // 3. Origin Warehouse Selection
      if (selectedOriginWarehouses.length > 0) {
        const matches = selectedOriginWarehouses.some((wh) =>
          (i.gudang_asal || "").toLowerCase().includes(wh.toLowerCase())
        );
        if (!matches) return false;
      }

      // 4. Destination Warehouse Selection
      if (selectedDestinationWarehouses.length > 0) {
        const matches = selectedDestinationWarehouses.some((wh) =>
          (i.gudang_tujuan || "").toLowerCase().includes(wh.toLowerCase())
        );
        if (!matches) return false;
      }

      // 5. Kantor Selection
      if (selectedIoKantors.length > 0) {
        if (!i.nama_kantor || !selectedIoKantors.includes(i.nama_kantor)) return false;
      }

      // 6. Creator Selection
      if (selectedIoCreators.length > 0) {
        if (!i.dibuat_oleh || !selectedIoCreators.includes(i.dibuat_oleh)) return false;
      }

      return true;
    });
  }, [ioItems, searchTerm, selectedIoNumbers, selectedIoStatuses, ioStatusFilter, selectedOriginWarehouses, selectedDestinationWarehouses, selectedIoKantors, selectedIoCreators]);

  const ioNumberOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    ioItems.forEach((row) => {
      if (row.nomor_io) {
        counts[row.nomor_io] = (counts[row.nomor_io] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((no) => ({
        label: no,
        value: no,
        subLabel: ioItems.find((i) => i.nomor_io === no)?.nama_kantor || undefined,
        count: counts[no],
      }));
  }, [ioItems]);

  const ioStatusCounts = useMemo(() => {
    let draft = 0, dsm = 0, approve = 0, it_process = 0, partial = 0, it_complete = 0, cancel = 0;
    ioItems.forEach((i: InternalOrderRecord) => {
      const code = (i.status_code || "").trim();
      const st = (i.status || "").trim().toLowerCase();
      if (code === "D" || st === "draft") draft++;
      else if (code === "S" || st === "checked dsm") dsm++;
      else if (code === "A" || st === "approve") approve++;
      else if (code === "P" || st.includes("process")) it_process++;
      else if (code === "Z" || st.includes("partial")) partial++;
      else if (code === "C" || st.includes("complete")) it_complete++;
      else if (["X", "R", "K", "Y"].includes(code) || st.includes("cancel") || st.includes("reject")) cancel++;
    });
    return { all: ioItems.length, draft, dsm, approve, it_process, partial, it_complete, cancel };
  }, [ioItems]);

  // MultiSelect Options for Table Headers: IO
  const ioStatusOptions: MultiSelectOption[] = useMemo(() => {
    return [
      { label: "Draft", value: "draft", badge: "⏳", color: "#94a3b8", count: ioStatusCounts.draft },
      { label: "Checked DSM", value: "dsm", badge: "📑", color: "#38bdf8", count: ioStatusCounts.dsm },
      { label: "Approve", value: "approve", badge: "📤", color: "#10b981", count: ioStatusCounts.approve },
      { label: "IT Process", value: "it_process", badge: "⚙️", color: "#f59e0b", count: ioStatusCounts.it_process },
      { label: "Partial", value: "partial", badge: "📦", color: "#06b6d4", count: ioStatusCounts.partial },
      { label: "IT Complete", value: "it_complete", badge: "✅", color: "#8b5cf6", count: ioStatusCounts.it_complete },
      { label: "Cancel", value: "cancel", badge: "❌", color: "#ef4444", count: ioStatusCounts.cancel },
    ];
  }, [ioStatusCounts]);

  const ioGudangAsalOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    ioItems.forEach((i) => {
      const g = i.gudang_asal || "—";
      counts[g] = (counts[g] || 0) + 1;
    });
    const knownNames = new Set<string>();
    const options: MultiSelectOption[] = [];
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        const name = w.nama_gudang || w.id_gudang;
        if (!knownNames.has(name.toLowerCase())) {
          knownNames.add(name.toLowerCase());
          options.push({
            label: name,
            value: name,
            subLabel: w.id_gudang && w.nama_gudang !== w.id_gudang ? `Kode: ${w.id_gudang}` : undefined,
            count: counts[name] || (w.id_gudang ? counts[w.id_gudang] : 0) || 0,
          });
        }
      });
    }
    Object.keys(counts).forEach((g) => {
      if (!knownNames.has(g.toLowerCase())) {
        knownNames.add(g.toLowerCase());
        options.push({ label: g, value: g, count: counts[g] });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses, ioItems]);

  const ioGudangTujuanOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    ioItems.forEach((i) => {
      const g = i.gudang_tujuan || "—";
      counts[g] = (counts[g] || 0) + 1;
    });
    const knownNames = new Set<string>();
    const options: MultiSelectOption[] = [];
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        const name = w.nama_gudang || w.id_gudang;
        if (!knownNames.has(name.toLowerCase())) {
          knownNames.add(name.toLowerCase());
          options.push({
            label: name,
            value: name,
            subLabel: w.id_gudang && w.nama_gudang !== w.id_gudang ? `Kode: ${w.id_gudang}` : undefined,
            count: counts[name] || (w.id_gudang ? counts[w.id_gudang] : 0) || 0,
          });
        }
      });
    }
    Object.keys(counts).forEach((g) => {
      if (!knownNames.has(g.toLowerCase())) {
        knownNames.add(g.toLowerCase());
        options.push({ label: g, value: g, count: counts[g] });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses, ioItems]);

  const ioKantorOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    ioItems.forEach((i) => {
      const k = i.nama_kantor || "—";
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.keys(counts)
      .sort()
      .map((k) => ({
        label: k,
        value: k,
        count: counts[k],
      }));
  }, [ioItems]);

  const ioDibuatOlehOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    ioItems.forEach((i) => {
      const u = i.dibuat_oleh || "—";
      counts[u] = (counts[u] || 0) + 1;
    });
    return Object.keys(counts)
      .sort()
      .map((u) => ({
        label: u,
        value: u,
        count: counts[u],
      }));
  }, [ioItems]);

  // Filtered Internal Transfer (IT) List
  const filteredItItems = useMemo(() => {
    return itItems.filter((i) => {
      // 1. Text Search Input
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          (i.nomor || "").toLowerCase().includes(term) ||
          (i.nomor_io || "").toLowerCase().includes(term) ||
          (i.gudang_asal || "").toLowerCase().includes(term) ||
          (i.gudang_tujuan || "").toLowerCase().includes(term) ||
          (i.receive_note || "").toLowerCase().includes(term) ||
          (i.keterangan || "").toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. IT Number Selection (Search / Multi-Select No. IT)
      if (selectedItNumbers.length > 0) {
        if (!i.nomor || !selectedItNumbers.includes(i.nomor)) return false;
      }

      // 3. Status IT Selection
      if (selectedItStatuses.length > 0) {
        const code = (i.status || "").trim();
        const matches = selectedItStatuses.some((filterKey) => {
          if (filterKey === "draft") return code === "D";
          if (filterKey === "send") return code === "S";
          if (filterKey === "receipt") return ["R", "C"].includes(code);
          if (filterKey === "cancel") return code === "X";
          return false;
        });
        if (!matches) return false;
      } else if (itStatusFilter !== "all") {
        const code = (i.status || "").trim();
        if (itStatusFilter === "draft" && code !== "D") return false;
        if (itStatusFilter === "send" && code !== "S") return false;
        if (itStatusFilter === "receipt" && !["R", "C"].includes(code)) return false;
        if (itStatusFilter === "cancel" && code !== "X") return false;
      }

      // 3. Origin Warehouse Selection
      if (selectedOriginWarehouses.length > 0) {
        const matches = selectedOriginWarehouses.some((wh) =>
          (i.gudang_asal || "").toLowerCase().includes(wh.toLowerCase()) ||
          (i.id_gudang_asal || "").toLowerCase().includes(wh.toLowerCase())
        );
        if (!matches) return false;
      }

      // 4. Destination Warehouse Selection
      if (selectedDestinationWarehouses.length > 0) {
        const matches = selectedDestinationWarehouses.some((wh) =>
          (i.gudang_tujuan || "").toLowerCase().includes(wh.toLowerCase()) ||
          (i.id_gudang_tujuan || "").toLowerCase().includes(wh.toLowerCase())
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [itItems, searchTerm, selectedItNumbers, selectedItStatuses, itStatusFilter, selectedOriginWarehouses, selectedDestinationWarehouses]);

  const itNumberOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    itItems.forEach((row) => {
      if (row.nomor) {
        counts[row.nomor] = (counts[row.nomor] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((no) => ({
        label: no,
        value: no,
        subLabel: itItems.find((t) => t.nomor === no)?.gudang_asal
          ? `${itItems.find((t) => t.nomor === no)?.gudang_asal} → ${itItems.find((t) => t.nomor === no)?.gudang_tujuan}`
          : undefined,
        count: counts[no],
      }));
  }, [itItems]);

  const itStatusCounts = useMemo(() => {
    let draft = 0, send = 0, receipt = 0, cancel = 0;
    itItems.forEach((i) => {
      const code = (i.status || "").trim();
      if (code === "D") draft++;
      else if (code === "S") send++;
      else if (["R", "C"].includes(code)) receipt++;
      else if (code === "X") cancel++;
    });
    return { all: itItems.length, draft, send, receipt, cancel };
  }, [itItems]);

  // MultiSelect Options for Table Headers: IT
  const itStatusOptions: MultiSelectOption[] = useMemo(() => {
    return [
      { label: "Draft", value: "draft", badge: "⏳", color: "#94a3b8", count: itStatusCounts.draft },
      { label: "Send (Kirim)", value: "send", badge: "📤", color: "#38bdf8", count: itStatusCounts.send },
      { label: "Receipt (Selesai)", value: "receipt", badge: "✅", color: "#10b981", count: itStatusCounts.receipt },
      { label: "Cancel (Batal)", value: "cancel", badge: "❌", color: "#ef4444", count: itStatusCounts.cancel },
    ];
  }, [itStatusCounts]);

  const itGudangAsalOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    itItems.forEach((i) => {
      const g = i.gudang_asal || "—";
      counts[g] = (counts[g] || 0) + 1;
    });
    const knownNames = new Set<string>();
    const options: MultiSelectOption[] = [];
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        const name = w.nama_gudang || w.id_gudang;
        if (!knownNames.has(name.toLowerCase())) {
          knownNames.add(name.toLowerCase());
          options.push({
            label: name,
            value: name,
            subLabel: w.id_gudang && w.nama_gudang !== w.id_gudang ? `Kode: ${w.id_gudang}` : undefined,
            count: counts[name] || (w.id_gudang ? counts[w.id_gudang] : 0) || 0,
          });
        }
      });
    }
    Object.keys(counts).forEach((g) => {
      if (!knownNames.has(g.toLowerCase())) {
        knownNames.add(g.toLowerCase());
        options.push({ label: g, value: g, count: counts[g] });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses, itItems]);

  const itGudangTujuanOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    itItems.forEach((i) => {
      const g = i.gudang_tujuan || "—";
      counts[g] = (counts[g] || 0) + 1;
    });
    const knownNames = new Set<string>();
    const options: MultiSelectOption[] = [];
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        const name = w.nama_gudang || w.id_gudang;
        if (!knownNames.has(name.toLowerCase())) {
          knownNames.add(name.toLowerCase());
          options.push({
            label: name,
            value: name,
            subLabel: w.id_gudang && w.nama_gudang !== w.id_gudang ? `Kode: ${w.id_gudang}` : undefined,
            count: counts[name] || (w.id_gudang ? counts[w.id_gudang] : 0) || 0,
          });
        }
      });
    }
    Object.keys(counts).forEach((g) => {
      if (!knownNames.has(g.toLowerCase())) {
        knownNames.add(g.toLowerCase());
        options.push({ label: g, value: g, count: counts[g] });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses, itItems]);

  // Reset page when search or any filter changes
  useEffect(() => { setDoPage(1); }, [calendarDateFrom, calendarDateTo, activeTab, searchTerm, selectedDoNumbers, selectedDoDates, selectedDoStatuses, selectedOriginWarehouses, selectedCustomers, selectedDrivers]);
  useEffect(() => { setIoPage(1); }, [calendarDateFrom, calendarDateTo, ioStatusFilter, searchTerm, selectedIoNumbers, selectedIoStatuses, selectedOriginWarehouses, selectedDestinationWarehouses, selectedIoKantors, selectedIoCreators]);
  useEffect(() => { setItPage(1); }, [calendarDateFrom, calendarDateTo, itStatusFilter, searchTerm, selectedItNumbers, selectedItStatuses, selectedOriginWarehouses, selectedDestinationWarehouses]);

  // Derived pagination slices
  const totalDoPages = Math.max(1, Math.ceil(filteredDoItems.length / ITEMS_PER_PAGE));
  const safeDoPage = Math.min(doPage, totalDoPages);
  const paginatedDoItems = filteredDoItems.slice((safeDoPage - 1) * ITEMS_PER_PAGE, safeDoPage * ITEMS_PER_PAGE);

  const totalIoPages = Math.max(1, Math.ceil(filteredIoItems.length / ITEMS_PER_PAGE));
  const safeIoPage = Math.min(ioPage, totalIoPages);
  const paginatedIoItems = filteredIoItems.slice((safeIoPage - 1) * ITEMS_PER_PAGE, safeIoPage * ITEMS_PER_PAGE);

  const totalItPages = Math.max(1, Math.ceil(filteredItItems.length / ITEMS_PER_PAGE));
  const safeItPage = Math.min(itPage, totalItPages);
  const paginatedItItems = filteredItItems.slice((safeItPage - 1) * ITEMS_PER_PAGE, safeItPage * ITEMS_PER_PAGE);

  // Computed metrics for selected items
  const selectedDoVolume = useMemo(() => {
    return items
      .filter((d) => selectedDoIds.has(d.nomor))
      .reduce((acc, curr) => acc + (Number(curr.total_volume_liter || 0)), 0);
  }, [items, selectedDoIds]);

  // Helper: toggle all rows on current page
  const handleToggleSelectAll = (tab: "DO" | "IO" | "IT") => {
    if (tab === "DO") {
      const allPageIds = paginatedDoItems.map((d) => d.nomor);
      const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedDoIds.has(id));
      setSelectedDoIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          allPageIds.forEach((id) => next.delete(id));
        } else {
          allPageIds.forEach((id) => next.add(id));
        }
        return next;
      });
    } else if (tab === "IO") {
      const allPageIds = paginatedIoItems.map((i) => i.nomor_io);
      const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIoIds.has(id));
      setSelectedIoIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          allPageIds.forEach((id) => next.delete(id));
        } else {
          allPageIds.forEach((id) => next.add(id));
        }
        return next;
      });
    } else if (tab === "IT") {
      const allPageIds = paginatedItItems.map((t) => t.nomor);
      const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedItIds.has(id));
      setSelectedItIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          allPageIds.forEach((id) => next.delete(id));
        } else {
          allPageIds.forEach((id) => next.add(id));
        }
        return next;
      });
    }
  };

  // Helper: copy selected transaction numbers
  const handleCopyNumbers = (tab: "DO" | "IO" | "IT") => {
    let ids: string[] = [];
    if (tab === "DO") ids = Array.from(selectedDoIds);
    else if (tab === "IO") ids = Array.from(selectedIoIds);
    else if (tab === "IT") ids = Array.from(selectedItIds);
    if (ids.length > 0) {
      navigator.clipboard.writeText(ids.join(", "));
    }
  };

  // Helper: export selected rows to CSV file
  const handleExportSelected = (tab: "DO" | "IO" | "IT") => {
    let csvContent = "";
    let filename = "";

    if (tab === "DO") {
      const selectedRows = items.filter((d) => selectedDoIds.has(d.nomor));
      if (selectedRows.length === 0) return;
      const headers = ["No. DO", "Tanggal DO", "Customer", "Kota Tujuan", "Volume (Liter)", "Driver", "Plat Nomor", "Status", "No. PO", "No. Invoice"];
      const rows = selectedRows.map((r) => [
        `"${r.nomor || ""}"`,
        `"${formatDisplayDate(r.tanggal)}"`,
        `"${(r.nama_customer || "").replace(/"/g, '""')}"`,
        `"${(r.destination || "").replace(/"/g, '""')}"`,
        `"${r.total_volume_liter || 0}"`,
        `"${(r.driver || "").replace(/"/g, '""')}"`,
        `"${(r.lic_plate || "").replace(/"/g, '""')}"`,
        `"${r.status || ""}"`,
        `"${r.po_no || ""}"`,
        `"${r.no_invoice || ""}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      filename = `PADI_DO_Selected_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (tab === "IO") {
      const selectedRows = ioItems.filter((i) => selectedIoIds.has(i.nomor_io));
      if (selectedRows.length === 0) return;
      const headers = ["Nomor IO", "Tanggal", "Kantor", "Gudang Asal", "Gudang Tujuan", "Dibuat Oleh", "Status", "Keterangan"];
      const rows = selectedRows.map((r) => [
        `"${r.nomor_io || ""}"`,
        `"${r.tanggal || ""}"`,
        `"${(r.nama_kantor || "").replace(/"/g, '""')}"`,
        `"${(r.gudang_asal || "").replace(/"/g, '""')}"`,
        `"${(r.gudang_tujuan || "").replace(/"/g, '""')}"`,
        `"${(r.dibuat_oleh || "").replace(/"/g, '""')}"`,
        `"${r.status || r.status_code || ""}"`,
        `"${(r.keterangan || "").replace(/"/g, '""')}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      filename = `PADI_IO_Selected_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (tab === "IT") {
      const selectedRows = itItems.filter((t) => selectedItIds.has(t.nomor));
      if (selectedRows.length === 0) return;
      const headers = ["IT No", "Tanggal", "Gudang Asal", "Gudang Tujuan", "Nomor IO Ref", "Status", "Keterangan"];
      const rows = selectedRows.map((r) => [
        `"${r.nomor || ""}"`,
        `"${formatDisplayDate(r.tanggal)}"`,
        `"${(r.gudang_asal || "").replace(/"/g, '""')}"`,
        `"${(r.gudang_tujuan || "").replace(/"/g, '""')}"`,
        `"${r.nomor_io || ""}"`,
        `"${r.status || ""}"`,
        `"${(r.receive_note || "").replace(/"/g, '""')}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      filename = `PADI_IT_Selected_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Helper: check if any multi-filter is active
  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedDoNumbers.length > 0 ||
    selectedDoDates.length > 0 ||
    selectedIoNumbers.length > 0 ||
    selectedItNumbers.length > 0 ||
    selectedDoStatuses.length > 0 ||
    selectedIoStatuses.length > 0 ||
    selectedItStatuses.length > 0 ||
    selectedOriginWarehouses.length > 0 ||
    selectedDestinationWarehouses.length > 0 ||
    selectedCustomers.length > 0 ||
    selectedDrivers.length > 0 ||
    selectedIoKantors.length > 0 ||
    selectedIoCreators.length > 0 ||
    selectedDoWarehouse !== "ALL" ||
    activeTab !== "all" ||
    ioStatusFilter !== "all" ||
    itStatusFilter !== "all"
  );

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setSelectedDoNumbers([]);
    setSelectedDoDates([]);
    setSelectedIoNumbers([]);
    setSelectedItNumbers([]);
    setSelectedDoStatuses([]);
    setSelectedIoStatuses([]);
    setSelectedItStatuses([]);
    setSelectedOriginWarehouses([]);
    setSelectedDestinationWarehouses([]);
    setSelectedCustomers([]);
    setSelectedDrivers([]);
    setSelectedIoKantors([]);
    setSelectedIoCreators([]);
    setSelectedDoWarehouse("ALL");
    setActiveTab("all");
    setIoStatusFilter("all");
    setItStatusFilter("all");
    const curr = getCurrentMonthDates();
    setCalendarDateFrom(curr.from);
    setCalendarDateTo(curr.to);
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (newPage: number) => void
  ) => {
    if (totalItems === 0) return null;
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.85rem 1.25rem",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--bg-border)",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
        }}
      >
        <div>
          Menampilkan <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{startIdx}</span> –{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{endIdx}</span> dari{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{totalItems}</span> data
          <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            (20 data per halaman)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              background: currentPage <= 1 ? "var(--bg-surface)" : "var(--color-primary)",
              color: currentPage <= 1 ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currentPage <= 1 ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "6px",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            <span>&larr;</span> Back
          </button>

          <span
            style={{
              padding: "0.4rem 0.75rem",
              background: "var(--bg-surface)",
              borderRadius: "6px",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "0.82rem",
              border: "1px solid var(--bg-border)",
              minWidth: "110px",
              textAlign: "center",
            }}
          >
            Halaman {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              background: currentPage >= totalPages ? "var(--bg-surface)" : "var(--color-primary)",
              color: currentPage >= totalPages ? "var(--text-muted)" : "#ffffff",
              border: "1px solid",
              borderColor: currentPage >= totalPages ? "var(--bg-border)" : "var(--color-primary)",
              borderRadius: "6px",
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "0.82rem",
              transition: "all 0.15s ease",
            }}
          >
            Next Page <span>&rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  const renderDoReceiptModalBox = (docNumber: string, onClose: () => void) => {
    const isModalReturn = (doModalHeader?.status === "R" || doModalHeader?.status_label === "Received") && Boolean(doModalHeader?.return_date);
    const statusKey = isModalReturn ? "return" : (doModalHeader?.status || doModalHeader?.status_label || "S");
    const badge = DO_STATUS_BADGE[statusKey] || { label: statusKey, cls: "badge-status badge-info", desc: statusKey };

    const renderAddress = (addr?: string) => {
      if (!addr) return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>— Belum ada alamat pengiriman —</span>;
      if (addr.includes("<p>") || addr.includes("<br") || addr.includes("<div>")) {
        return (
          <div
            dangerouslySetInnerHTML={{ __html: addr }}
            style={{
              margin: 0,
              fontSize: "0.85rem",
              lineHeight: "1.45",
              color: "var(--text-primary)",
            }}
          />
        );
      }
      return (
        <div style={{ whiteSpace: "pre-line", fontSize: "0.85rem", lineHeight: "1.45", color: "var(--text-primary)" }}>
          {addr}
        </div>
      );
    };

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(56, 189, 248, 0.45)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-md)",
          padding: "1.5rem 1.75rem",
          animation: "fadeInDown 0.2s ease-out",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            paddingBottom: "0.85rem",
            borderBottom: "1px solid var(--bg-border)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🚛
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Form Receipt Delivery Order
                </h2>
                <span className={badge.cls} title={badge.desc} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}>
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace", marginTop: "0.2rem" }}>
                No. DO: <span style={{ color: "#38bdf8", fontWeight: 700 }}>{docNumber}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              padding: "0.4rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.85)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.borderColor = "var(--bg-border)";
            }}
          >
            <span>✕</span>
            <span>Tutup Form</span>
          </button>
        </div>

        {doModalLoading ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>🔄</div>
            <div style={{ fontSize: "0.9rem" }}>Memuat Form Receipt Delivery Order...</div>
          </div>
        ) : (
          <>
            {/* Form Fields: Two Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                gap: "1.25rem 2.5rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "10px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* No. DO */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    No. DO.
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    {doModalHeader?.no_do || docNumber}
                  </div>
                </div>

                {/* Picking List No */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Picking List No.
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      fontFamily: "monospace",
                    }}
                  >
                    {doModalHeader?.picking_list_no || "—"}
                  </div>
                </div>

                {/* PO No */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    PO No.
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {doModalHeader?.po_no || "—"}
                  </div>
                </div>

                {/* Contact Person */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Contact Person
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {doModalHeader?.contact_person || "—"}
                  </div>
                </div>

                {/* Nama Penerima * */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Nama Penerima <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      minHeight: "26px",
                    }}
                  >
                    {doModalHeader?.nama_penerima || ""}
                  </div>
                </div>

                {/* Tgl.Sampai Tujuan */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Tgl.Sampai Tujuan
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      minHeight: "26px",
                    }}
                  >
                    {doModalHeader?.tgl_sampai_tujuan_str || formatDisplayDate(doModalHeader?.tgl_sampai_tujuan) || ""}
                  </div>
                </div>

                {/* Delivery Addres */}
                <div style={{ display: "flex", alignItems: "flex-start", marginTop: "0.25rem" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500, paddingTop: "0.35rem" }}>
                    Delivery Addres
                  </div>
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid var(--bg-border)",
                      borderRadius: "6px",
                      background: "var(--bg-card)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Rich Text Toolbar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.35rem 0.65rem",
                        borderBottom: "1px solid var(--bg-border)",
                        background: "rgba(255, 255, 255, 0.03)",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span style={{ fontWeight: 800, cursor: "default", padding: "0 3px" }} title="Bold">B</span>
                      <span style={{ fontStyle: "italic", cursor: "default", padding: "0 3px" }} title="Italic">I</span>
                      <span style={{ textDecoration: "underline", cursor: "default", padding: "0 3px" }} title="Underline">U</span>
                      <span style={{ textDecoration: "line-through", cursor: "default", padding: "0 3px" }} title="Strikethrough">S</span>
                    </div>
                    {/* Address Content */}
                    <div style={{ padding: "0.6rem 0.75rem", minHeight: "75px" }}>
                      {renderAddress(doModalHeader?.delivery_address)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* Tgl DO */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Tgl DO
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {doModalHeader?.tgl_do_str || formatDisplayDate(doModalHeader?.tgl_do) || "—"}
                  </div>
                </div>

                {/* Customer : */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Customer :
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {doModalHeader?.customer || "—"}
                  </div>
                </div>

                {/* Gudang */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Gudang
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{doModalHeader?.gudang || "—"}</span>
                    <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>▼</span>
                  </div>
                </div>

                {/* Telpon No. */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Telpon No.
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {doModalHeader?.telpon_no || "—"}
                  </div>
                </div>

                {/* Receive Date * */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Receive Date <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      minHeight: "26px",
                    }}
                  >
                    {doModalHeader?.receive_date_str || formatDisplayDate(doModalHeader?.receive_date) || ""}
                  </div>
                </div>

                {/* Biaya Pengiriman * */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Biaya Pengiriman <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      minHeight: "26px",
                    }}
                  >
                    {doModalHeader?.biaya_pengiriman !== undefined && doModalHeader?.biaya_pengiriman !== null && doModalHeader?.biaya_pengiriman !== ""
                      ? (Number(doModalHeader.biaya_pengiriman) === 0 ? "0" : Number(doModalHeader.biaya_pengiriman).toLocaleString("id-ID"))
                      : ""}
                  </div>
                </div>

                {/* Return Date */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Return Date
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      minHeight: "26px",
                    }}
                  >
                    {doModalHeader?.return_date_str || formatDisplayDate(doModalHeader?.return_date) || ""}
                  </div>
                </div>

                {/* Selisih Return & Receive Date */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "150px", flexShrink: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Selisih Hari
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px solid var(--bg-border)",
                      padding: "0.2rem 0.25rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      minHeight: "26px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {(() => {
                      const selisih = doModalHeader?.selisih_hari ?? (
                        doModalHeader?.return_date && doModalHeader?.receive_date
                          ? Math.round((new Date(doModalHeader.return_date).getTime() - new Date(doModalHeader.receive_date).getTime()) / (1000 * 60 * 60 * 24))
                          : null
                      );

                      if (selisih !== null && selisih !== undefined && !isNaN(selisih)) {
                        const isSame = selisih === 0;
                        const isFast = selisih > 0 && selisih <= 3;
                        const isLate = selisih > 7;
                        const color = isSame || isFast ? "#22c55e" : isLate ? "#ef4444" : "#eab308";
                        return (
                          <span style={{ color, fontWeight: 700 }}>
                            {isSame ? "0 Hari" : `${selisih} Hari`}
                          </span>
                        );
                      }
                      if (doModalHeader?.receive_date && !doModalHeader?.return_date) {
                        return <span style={{ color: "#eab308", fontSize: "0.78rem" }}>Belum Kembali (Menunggu FRDO)</span>;
                      }
                      return <span style={{ color: "var(--text-muted)" }}>—</span>;
                    })()}
                  </div>
                </div>

                {/* Transport / Driver info */}
                {(doModalHeader?.driver || doModalHeader?.lic_plate || doModalHeader?.transporter) && (
                  <div
                    style={{
                      marginTop: "0.4rem",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    {doModalHeader?.driver && (
                      <div>Driver: <strong style={{ color: "var(--text-primary)" }}>{doModalHeader.driver}</strong></div>
                    )}
                    {doModalHeader?.lic_plate && (
                      <div>Plat: <strong style={{ color: "var(--text-primary)" }}>{doModalHeader.lic_plate}</strong></div>
                    )}
                    {doModalHeader?.transporter && (
                      <div>Transporter: <strong style={{ color: "var(--text-primary)" }}>{doModalHeader.transporter}</strong></div>
                    )}
                  </div>
                )}

                {/* Invoice Status & Lead Time */}
                {(doModalHeader?.no_invoice || doModalHeader?.tgl_invoice || doModalHeader?.status === "I") && (
                  <div
                    style={{
                      marginTop: "0.4rem",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div>📄 No. Invoice: <strong style={{ color: "#818cf8", fontFamily: "monospace" }}>{doModalHeader.no_invoice || "—"}</strong></div>
                    {doModalHeader.tgl_invoice && (
                      <div>Tgl Terbit: <strong style={{ color: "var(--text-primary)" }}>{formatDisplayDate(doModalHeader.tgl_invoice)}</strong></div>
                    )}
                    {doModalHeader.durasi_invoice_hari !== undefined && doModalHeader.durasi_invoice_hari !== null && (
                      <div style={{ color: "#818cf8", fontWeight: 700 }}>
                        ⚡ Durasi DO ke Invoice: {doModalHeader.durasi_invoice_hari === 0 ? "0 Hari" : `${doModalHeader.durasi_invoice_hari} Hari`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📦</span> Daftar Barang (Delivery Order Detail)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Item: <strong style={{ color: "#38bdf8" }}>{doModalItems.length}</strong> SKU
                </span>
                {(() => {
                  const totalModalQty = doModalItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
                  const totalModalVol = doModalItems.reduce((acc, it) => acc + (Number(it.volume_liter != null ? it.volume_liter : (Number(it.qty || 0) * (it.isi_satuan || 1)))), 0);
                  return (
                    <>
                      <span style={{ color: "var(--text-secondary)" }}>
                        Total Qty: <strong style={{ color: "var(--text-primary)" }}>{totalModalQty.toLocaleString("id-ID")}</strong> kemasan
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        Total Volume: <strong style={{ color: "#22c55e", fontSize: "0.82rem" }}>{totalModalVol.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr</strong>
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {doModalItems.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--bg-border)", borderRadius: "8px" }}>
                Tidak ada rincian barang untuk Delivery Order ini.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)" }}>
                      <th style={{ padding: "0.6rem 0.6rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", width: "40px" }}>No</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Kode Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Nama Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Qty</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Satuan</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Volume (Liter)</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Packing Number</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Qty Diterima</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Vol. Diterima (Liter)</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doModalItems.map((item: DoLineItem, idx: number) => {
                      const itemVol = item.volume_liter != null ? item.volume_liter : (Number(item.qty || 0) * (item.isi_satuan || 1));
                      const itemVolDiterima = item.volume_diterima_liter != null ? item.volume_diterima_liter : (item.qty_diterima != null ? Number(item.qty_diterima) * (item.isi_satuan || 1) : null);
                      return (
                        <tr
                          key={`do-detail-${item.kode_barang}-${idx}`}
                          style={{
                            borderBottom: idx < doModalItems.length - 1 ? "1px solid var(--bg-border)" : "none",
                            background: idx % 2 === 1 ? "var(--bg-surface)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "0.55rem 0.6rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {item.no || idx + 1}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                            {item.kode_barang}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontWeight: 500 }}>
                            {item.nama_barang}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                            {item.qty ? Number(item.qty).toLocaleString("id-ID") : 0}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "center", color: "var(--text-secondary)" }}>
                            <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", background: "var(--bg-hover)", fontSize: "0.72rem" }}>
                              {item.satuan || "Drum"}
                            </span>
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontWeight: 700, color: "#38bdf8" }}>
                            {`${Number(itemVol).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr`}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {item.packing_number || "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#10B981" }}>
                            {item.qty_diterima !== undefined && item.qty_diterima !== null ? Number(item.qty_diterima).toLocaleString("id-ID") : "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#10B981" }}>
                            {itemVolDiterima !== null && itemVolDiterima !== undefined
                              ? `${Number(itemVolDiterima).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr`
                              : "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {item.keterangan || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {doModalItems.length > 0 && (() => {
                    const totalQty = doModalItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
                    const totalVol = doModalItems.reduce((acc, it) => acc + (Number(it.volume_liter != null ? it.volume_liter : (Number(it.qty || 0) * (it.isi_satuan || 1)))), 0);
                    const totalQtyRecv = doModalItems.reduce((acc, it) => acc + (it.qty_diterima != null ? Number(it.qty_diterima) : 0), 0);
                    const totalVolRecv = doModalItems.reduce((acc, it) => acc + (it.volume_diterima_liter != null ? Number(it.volume_diterima_liter) : (it.qty_diterima != null ? Number(it.qty_diterima) * (it.isi_satuan || 1) : 0)), 0);
                    return (
                      <tfoot>
                        <tr style={{ background: "rgba(56, 189, 248, 0.08)", borderTop: "2px solid var(--bg-border)", fontWeight: 700 }}>
                          <td colSpan={3} style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontSize: "0.75rem", color: "var(--text-primary)" }}>
                            TOTAL:
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--text-primary)", fontSize: "0.8rem" }}>
                            {totalQty.toLocaleString("id-ID")}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }} />
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#38bdf8", fontSize: "0.8rem" }}>
                            {`${totalVol.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr`}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }} />
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#10B981", fontSize: "0.8rem" }}>
                            {totalQtyRecv > 0 ? totalQtyRecv.toLocaleString("id-ID") : "—"}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#10B981", fontSize: "0.8rem" }}>
                            {totalVolRecv > 0 ? `${totalVolRecv.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr` : "—"}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }} />
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderIoModalBox = (docNumber: string, onClose: () => void) => {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(16, 185, 129, 0.45)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-md)",
          padding: "1.25rem 1.5rem",
          animation: "fadeInDown 0.2s ease-out",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
              }}
            >
              📑
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  Modal Box — Detail Internal Order (IO)
                </span>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#10B981",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                  }}
                >
                  IO
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "monospace", marginTop: "0.1rem" }}>
                {docNumber}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.85)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.borderColor = "var(--bg-border)";
            }}
          >
            <span>✕</span>
            <span>Tutup Box</span>
          </button>
        </div>

        {modalLoading ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.6rem" }}>🔄</div>
            <div style={{ fontSize: "0.85rem" }}>Memuat rincian Internal Order...</div>
          </div>
        ) : (
          <>
            {/* IO Header Grid */}
            {modalIoHeader && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#10B981",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>📋</span> Informasi Dokumen IO
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "0.6rem 1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>IO No</div>
                    <div style={{ fontSize: "0.85rem", color: "#10B981", fontWeight: 700, fontFamily: "monospace" }}>{modalIoHeader.nomor_io}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Date</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{formatDisplayDate(modalIoHeader.tanggal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Gudang Asal</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{modalIoHeader.gudang_asal || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Gudang Tujuan</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{modalIoHeader.gudang_tujuan || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Nomor IP</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalIoHeader.id_ip || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Tanggal IP</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalIoHeader.tanggal_ip ? formatDisplayDate(modalIoHeader.tanggal_ip) : "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Daftar Barang Section */}
            <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📦</span> Daftar Barang
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Total: <strong style={{ color: "#10B981" }}>{modalIoItems.length}</strong> item
              </span>
            </div>

            {modalIoItems.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--bg-border)", borderRadius: "8px" }}>
                Tidak ada rincian barang untuk dokumen IO ini.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)" }}>
                      <th style={{ padding: "0.6rem 0.6rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", width: "40px" }}>No</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Nama Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Kode Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Diminta</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>diambil</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Qty</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Satuan</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalIoItems.map((item: IoLineItem, idx: number) => (
                      <tr
                        key={`sub-io-${item.kode_barang}-${idx}`}
                        style={{
                          borderBottom: idx < modalIoItems.length - 1 ? "1px solid var(--bg-border)" : "none",
                          background: idx % 2 === 1 ? "var(--bg-surface)" : "transparent"
                        }}
                      >
                        <td style={{ textAlign: "center", color: "var(--text-muted)", padding: "0.6rem 0.5rem" }}>{item.no ?? idx + 1}</td>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)", padding: "0.6rem 0.75rem" }}>{item.nama_barang}</td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                          <span style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {item.kode_barang}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>
                          {Number(item.diminta ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "right", padding: "0.6rem 0.75rem", color: (item.diambil ?? 0) > 0 ? "#10B981" : "var(--text-muted)", fontWeight: (item.diambil ?? 0) > 0 ? 600 : 400 }}>
                          {Number(item.diambil ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "right", padding: "0.6rem 0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {Number(item.qty ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center", padding: "0.6rem 0.75rem" }}>
                          <span style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", padding: "0.12rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600 }}>
                            {item.satuan || "Drum"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem", padding: "0.6rem 0.75rem" }}>{item.keterangan || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tanda Tangan Alur Persetujuan / Signatures matching Ultima view */}
            {modalIoHeader?.approvals && modalIoHeader.approvals.length > 0 && (
              <div
                style={{
                  marginTop: "1.25rem",
                  padding: "1rem",
                  borderRadius: "10px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {modalIoHeader.approvals.map((app, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.45rem",
                        padding: "0.85rem 1rem",
                        borderRadius: "8px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--bg-border)",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                        {app.stage}
                      </div>
                      <div style={{ height: "26px", display: "flex", alignItems: "center" }}>
                        {app.checked ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10B981",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                        )}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "4px",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--bg-border)",
                          color: "var(--text-primary)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {app.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        {app.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontFamily: "monospace", marginTop: "0.15rem" }}>
                        {app.date ? formatDisplayDateTime(app.date) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderItModalBox = (docNumber: string, onClose: () => void) => {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(56, 189, 248, 0.45)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-md)",
          padding: "1.25rem 1.5rem",
          animation: "fadeInDown 0.2s ease-out",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
              }}
            >
              🔄
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  Modal Box — Detail Internal Transfer (IT)
                </span>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    background: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                  }}
                >
                  IT
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "monospace", marginTop: "0.1rem" }}>
                {docNumber}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.85)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.borderColor = "var(--bg-border)";
            }}
          >
            <span>✕</span>
            <span>Tutup Box</span>
          </button>
        </div>

        {modalLoading ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.6rem" }}>🔄</div>
            <div style={{ fontSize: "0.85rem" }}>Memuat rincian Internal Transfer...</div>
          </div>
        ) : (
          <>
            {/* IT Header Cards - matching the 19 user fields */}
            {modalItHeader && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
                {/* Section 1: Transfer Document Info */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "10px",
                    padding: "0.9rem 1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span>📋</span> Informasi Dokumen Transfer
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "0.6rem 1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>IT No</div>
                      <div style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>{modalItHeader.nomor}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>IO Number</div>
                      <div style={{ fontSize: "0.85rem", color: "#10B981", fontWeight: 600, fontFamily: "monospace" }}>
                        {modalItHeader.nomor_io && modalItHeader.nomor_io !== "—" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenIoItems(modalItHeader.nomor_io!)}
                            title="Klik untuk membuka IO ini"
                            style={{ background: "none", border: "none", padding: 0, color: "#10B981", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontWeight: "inherit" }}
                          >
                            {modalItHeader.nomor_io}
                          </button>
                        ) : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Date*</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{formatDisplayDate(modalItHeader.tanggal)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Contact Person</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{modalItHeader.contact_person || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Gudang Asal</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{modalItHeader.gudang_asal || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Gudang Tujuan</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{modalItHeader.gudang_tujuan || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>SIPB No</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalItHeader.sipb || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Telpon</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalItHeader.telpon || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Delivery Date</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{formatDisplayDate(modalItHeader.tanggal_kirim)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Delivery time</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalItHeader.jam_kirim || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Ekspedisi / Transporter */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "10px",
                    padding: "0.9rem 1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#f59e0b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span>🚚</span> Ekspedisi & Pengiriman
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "0.6rem 1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>External Transporter</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "4px", background: modalItHeader.istransporter ? "#10B981" : "rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.65rem", fontWeight: 700 }}>
                          {modalItHeader.istransporter ? "✓" : ""}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: modalItHeader.istransporter ? "#10B981" : "var(--text-secondary)" }}>
                          {modalItHeader.istransporter ? "Ya (Aktif)" : "Internal"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Nomor PO</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{modalItHeader.no_po || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.2rem" }}>Type External</div>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600, background: "var(--bg-card)", border: "1px solid var(--bg-border)", color: "var(--text-primary)" }}>
                          LCL
                        </span>
                        <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600, background: "var(--bg-card)", border: "1px solid var(--bg-border)", color: "var(--text-primary)" }}>
                          Charter/FCL/Sewa
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Driver</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{modalItHeader.driver || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Transporter</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{modalItHeader.transporter || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Jenis Kendaraan</div>
                      <div style={{ fontSize: "0.82rem", color: modalItHeader.jenis_kendaraan ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {modalItHeader.jenis_kendaraan || "Pilih Jenis Kendaraan"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Nopol</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{modalItHeader.nopol || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Biaya</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        {Number(modalItHeader.biaya ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.15rem" }}>Total Liter</div>
                      <div style={{ fontSize: "0.9rem", color: "#38bdf8", fontWeight: 700 }}>
                        {Number(modalItHeader.total_liter ?? 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IT Items Table */}
            <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📦</span> Daftar Barang
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Total: <strong style={{ color: "#38bdf8" }}>{modalItItems.length}</strong> item
              </span>
            </div>

            {modalItItems.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--bg-border)", borderRadius: "8px" }}>
                Tidak ada rincian barang untuk dokumen IT ini.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)" }}>
                      <th style={{ padding: "0.6rem 0.6rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", width: "40px" }}>No</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Nama Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Kode Barang</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Qty</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Satuan</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Ongkir</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>No IBC/No Skid Tank</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>No Segel</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalItItems.map((item: ItLineItem, idx: number) => (
                      <tr
                        key={`sub-it-${item.kode_barang}-${idx}`}
                        style={{
                          borderBottom: idx < modalItItems.length - 1 ? "1px solid var(--bg-border)" : "none",
                          background: idx % 2 === 1 ? "var(--bg-surface)" : "transparent"
                        }}
                      >
                        <td style={{ textAlign: "center", color: "var(--text-muted)", padding: "0.6rem 0.5rem" }}>{item.no ?? idx + 1}</td>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)", padding: "0.6rem 0.75rem" }}>{item.nama_barang}</td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                          <span style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {item.kode_barang}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", padding: "0.6rem 0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {Number(item.qty ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center", padding: "0.6rem 0.75rem" }}>
                          <span style={{ background: "rgba(13,153,255,0.12)", color: "#38bdf8", border: "1px solid rgba(13,153,255,0.25)", padding: "0.12rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600 }}>
                            {item.satuan || "Drum"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{item.ongkir || ""}</td>
                        <td style={{ textAlign: "center", padding: "0.6rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                          {[item.no_ibc, item.no_skid_tank].filter(Boolean).join(" / ") || ""}
                        </td>
                        <td style={{ textAlign: "center", padding: "0.6rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                          {item.no_segel || ""}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem", padding: "0.6rem 0.75rem" }}>{item.keterangan || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const handleDownloadExcel = async (type: "IO" | "IT" | "DO") => {
    try {
      setIsDownloading(true);
      let whParam: string | undefined = undefined;
      if (type === "DO") {
        if (selectedOriginWarehouses.length > 0) {
          whParam = selectedOriginWarehouses.join(",");
        } else if (selectedDoWarehouse !== "ALL") {
          whParam = selectedDoWarehouse;
        }
      } else if (type === "IO" || type === "IT") {
        if (selectedOriginWarehouses.length > 0) {
          whParam = selectedOriginWarehouses.join(",");
        }
      }

      const res = await apiDistributions.exportExcel({
        type,
        date_from: calendarDateFrom || undefined,
        date_to: calendarDateTo || undefined,
        id_gudang: whParam,
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let label = "Delivery_Order";
      if (type === "IO") label = "Internal_Order";
      else if (type === "IT") label = "Internal_Transfer";
      const whSuffix = whParam ? `_${whParam.replace(/,/g, "_")}` : "";
      const dateSuffix = `${calendarDateFrom || "all"}_sd_${calendarDateTo || "all"}`.replace(/-/g, "");
      a.download = `${label}${whSuffix}_${dateSuffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh file Excel:", err);
      alert("Gagal mengunduh file Excel. Silakan coba kembali.");
    } finally {
      setIsDownloading(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const dateFilter = {
        date_from: calendarDateFrom || undefined,
        date_to: calendarDateTo || undefined,
      };
      
      if (mainTab === "DO") {
        const whParam =
          selectedOriginWarehouses.length > 0
            ? selectedOriginWarehouses.join(",")
            : selectedDoWarehouse !== "ALL"
            ? selectedDoWarehouse
            : undefined;
        const doStatusParam =
          selectedDoStatuses.length > 0
            ? selectedDoStatuses.join(",")
            : activeTab === "all"
            ? undefined
            : activeTab;

        const [sumRes, itemsRes] = await Promise.allSettled([
          apiDistributions.summary({ ...dateFilter, id_gudang: whParam }),
          apiDistributions.list({
            status: doStatusParam,
            q: searchTerm.trim() || undefined,
            limit: 5000,
            id_gudang: whParam,
            ...dateFilter,
          }),
        ]);

        if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
        if (itemsRes.status === "fulfilled") setItems(itemsRes.value.data.data || []);
      } else if (mainTab === "IO") {
        const whAsalParam = selectedOriginWarehouses.length > 0 ? selectedOriginWarehouses.join(",") : undefined;
        const whTujuanParam = selectedDestinationWarehouses.length > 0 ? selectedDestinationWarehouses.join(",") : undefined;
        const ioStatusParam =
          selectedIoStatuses.length > 0
            ? selectedIoStatuses.join(",")
            : ioStatusFilter === "all"
            ? undefined
            : ioStatusFilter;

        const res = await apiDistributions.internalOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          q: searchTerm.trim() || undefined,
          status: ioStatusParam,
          id_gudang_asal: whAsalParam,
          id_gudang_tujuan: whTujuanParam,
          limit: 10000,
        });
        setIoItems(res.data.data || []);
      } else if (mainTab === "IT") {
        const whAsalParam = selectedOriginWarehouses.length > 0 ? selectedOriginWarehouses.join(",") : undefined;
        const whTujuanParam = selectedDestinationWarehouses.length > 0 ? selectedDestinationWarehouses.join(",") : undefined;
        const itStatusParam =
          selectedItStatuses.length > 0
            ? selectedItStatuses.join(",")
            : itStatusFilter === "all"
            ? undefined
            : itStatusFilter;

        const res = await apiDistributions.transferOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          q: searchTerm.trim() || undefined,
          status: itStatusParam,
          id_gudang_asal: whAsalParam,
          id_gudang_tujuan: whTujuanParam,
          limit: 10000,
        });
        setItItems(res.data.data || []);
      }
    } catch {
      // API error handled
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    mainTab,
    calendarDateFrom,
    calendarDateTo,
    selectedDoWarehouse,
    selectedOriginWarehouses,
    selectedDestinationWarehouses,
    selectedDoStatuses,
    selectedIoStatuses,
    selectedItStatuses,
    ioStatusFilter,
    itStatusFilter,
    searchTerm,
  ]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Monitoring Distribusi</h1>
        <p className="page-subtitle">
          {isWarehouse
            ? "Tracking Delivery Order (DO), Internal Order (IO), dan Internal Transfer (IT)"
            : "Tracking Delivery Order (DO), Internal Order (IO), Internal Transfer (IT), dan Financial Flow"}
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem" }}>
        {[
          { key: "DO", label: "Surat Jalan (DO)" },
          { key: "IO", label: "Internal Order (IO)" },
          { key: "IT", label: "Internal Transfer (IT)" },
          ...(canSeeFinancialFlow ? [{ key: "FINANCIAL_FLOW", label: "Financial Flow" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as typeof mainTab)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: mainTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: mainTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: mainTab === tab.key ? 600 : 400,
              cursor: "pointer",
              fontSize: "1rem"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab !== "FINANCIAL_FLOW" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "16px",
          }}
        >
          {/* Quick Date Presets & Date Picker */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              📅 Periode:
            </span>
            <button
              type="button"
              onClick={() => {
                const curr = getCurrentMonthDates();
                setCalendarDateFrom(curr.from);
                setCalendarDateTo(curr.to);
              }}
              style={{
                fontSize: "0.75rem",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Tampilkan data Bulan Berjalan"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const past = new Date();
                past.setDate(past.getDate() - 7);
                setCalendarDateFrom(past.toISOString().slice(0, 10));
                setCalendarDateTo(new Date().toISOString().slice(0, 10));
              }}
              style={{
                fontSize: "0.75rem",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
              title="7 Hari Terakhir"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarDateFrom("");
                setCalendarDateTo(new Date().toISOString().slice(0, 10));
              }}
              style={{
                fontSize: "0.75rem",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
              title="Semua Periode"
            >
              Semua
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "var(--bg-card)",
                border: "1px solid var(--bg-border)",
                borderRadius: "6px",
                padding: "3px 8px",
              }}
            >
              <input
                type="date"
                value={calendarDateFrom}
                onChange={(e) => setCalendarDateFrom(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>s/d</span>
              <input
                type="date"
                value={calendarDateTo}
                onChange={(e) => setCalendarDateTo(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Warehouse Multi-Select Filter & Export Excel */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap", flexShrink: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  display: "inline-flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  lineHeight: "normal",
                }}
              >
                🏢 Gudang:
              </span>
              <MultiSelectFilter
                title="Gudang"
                placeholder="Semua Gudang"
                searchPlaceholder="Cari gudang..."
                options={mainTab === "IO" ? ioGudangAsalOptions : mainTab === "IT" ? itGudangAsalOptions : warehouseDoOptions}
                selectedValues={selectedOriginWarehouses}
                onChange={setSelectedOriginWarehouses}
                popoverWidth={260}
                compact={false}
              />
            </div>

            {mainTab === "DO" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    display: "inline-flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "5px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    lineHeight: "normal",
                  }}
                >
                  📅 Tanggal DO:
                </span>
                <MultiSelectFilter
                  title="Tanggal DO"
                  placeholder="Semua Tanggal DO"
                  searchPlaceholder="Cari tanggal..."
                  options={doDateOptions}
                  selectedValues={selectedDoDates}
                  onChange={setSelectedDoDates}
                  popoverWidth={240}
                  compact={false}
                />
              </div>
            )}

            <button
              onClick={() => handleDownloadExcel(mainTab as "DO" | "IO" | "IT")}
              disabled={isDownloading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: isDownloading ? "#065f46" : "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: isDownloading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                whiteSpace: "nowrap",
              }}
              title={`Download ${mainTab}.xlsx`}
            >
              {isDownloading ? (
                <>
                  <span>⏳</span>
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Export {mainTab}.xlsx</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary Bar (Stock Aging style) */}
      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            background: "rgba(56, 189, 248, 0.05)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Filter Aktif:
            </span>

            {searchTerm.trim() && (
              <span style={activeChipStyle}>
                <span>🔍 &ldquo;{searchTerm}&rdquo;</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSearchTerm("")} />
              </span>
            )}

            {mainTab === "DO" && selectedDoNumbers.length > 0 && (
              <span style={activeChipStyle}>
                <span>📦 No. DO: {selectedDoNumbers.length > 2 ? `${selectedDoNumbers.length} nomor` : selectedDoNumbers.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedDoNumbers([])} />
              </span>
            )}

            {mainTab === "DO" && selectedDoDates.length > 0 && (
              <span style={activeChipStyle}>
                <span>📅 Tgl DO: {selectedDoDates.length > 2 ? `${selectedDoDates.length} tanggal` : selectedDoDates.map((d) => formatDisplayDate(d)).join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedDoDates([])} />
              </span>
            )}

            {mainTab === "IO" && selectedIoNumbers.length > 0 && (
              <span style={activeChipStyle}>
                <span>📋 No. IO: {selectedIoNumbers.length > 2 ? `${selectedIoNumbers.length} nomor` : selectedIoNumbers.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedIoNumbers([])} />
              </span>
            )}

            {mainTab === "IT" && selectedItNumbers.length > 0 && (
              <span style={activeChipStyle}>
                <span>🔄 No. IT: {selectedItNumbers.length > 2 ? `${selectedItNumbers.length} nomor` : selectedItNumbers.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedItNumbers([])} />
              </span>
            )}

            {mainTab === "DO" && selectedDoStatuses.length > 0 && (
              <span style={activeChipStyle}>
                <span>Status DO: {selectedDoStatuses.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedDoStatuses([])} />
              </span>
            )}

            {mainTab === "IO" && selectedIoStatuses.length > 0 && (
              <span style={activeChipStyle}>
                <span>Status IO: {selectedIoStatuses.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedIoStatuses([])} />
              </span>
            )}

            {mainTab === "IT" && selectedItStatuses.length > 0 && (
              <span style={activeChipStyle}>
                <span>Status IT: {selectedItStatuses.join(", ")}</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedItStatuses([])} />
              </span>
            )}

            {selectedOriginWarehouses.length > 0 && (
              <span style={activeChipStyle}>
                <span>🏢 Gudang Asal: {selectedOriginWarehouses.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedOriginWarehouses([])} />
              </span>
            )}

            {selectedDestinationWarehouses.length > 0 && (
              <span style={activeChipStyle}>
                <span>🎯 Gudang Tujuan: {selectedDestinationWarehouses.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedDestinationWarehouses([])} />
              </span>
            )}

            {selectedCustomers.length > 0 && (
              <span style={activeChipStyle}>
                <span>👥 Customer: {selectedCustomers.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedCustomers([])} />
              </span>
            )}

            {selectedDrivers.length > 0 && (
              <span style={activeChipStyle}>
                <span>🚛 Sopir: {selectedDrivers.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedDrivers([])} />
              </span>
            )}

            {selectedIoKantors.length > 0 && (
              <span style={activeChipStyle}>
                <span>🏢 Kantor: {selectedIoKantors.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedIoKantors([])} />
              </span>
            )}

            {selectedIoCreators.length > 0 && (
              <span style={activeChipStyle}>
                <span>✍️ Pembuat: {selectedIoCreators.length} dipilih</span>
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedIoCreators([])} />
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Menampilkan{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {mainTab === "DO" ? filteredDoItems.length : mainTab === "IO" ? filteredIoItems.length : filteredItItems.length}
              </strong>{" "}
              dari {mainTab === "DO" ? items.length : mainTab === "IO" ? ioItems.length : itItems.length} transaksi
            </span>
            <button
              onClick={handleResetAllFilters}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "3px 8px",
                borderRadius: "5px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Reset semua filter ke kondisi awal"
            >
              <RotateCcw size={12} />
              Reset Semua
            </button>
          </div>
        </div>
      )}

      {mainTab === "DO" && (
        <>
          {(() => {
            const {
              totalDo,
              totalVol,
              totalQty,
              sendCount,
              sendVol,
              sendQty,
              recvCount,
              recvVol,
              recvQty,
              returnCount,
              returnVol,
              returnQty,
              invCount,
              invVol,
              invQty,
              cancelCount,
              cancelVol,
              cancelQty,
            } = doKpiMetrics;

            const sendPct = totalDo > 0 ? ((sendCount / totalDo) * 100).toFixed(1) : "0.0";
            const sendVolPct = totalVol > 0 ? ((sendVol / totalVol) * 100).toFixed(1) : "0.0";

            const recvPct = totalDo > 0 ? ((recvCount / totalDo) * 100).toFixed(1) : "0.0";
            const recvVolPct = totalVol > 0 ? ((recvVol / totalVol) * 100).toFixed(1) : "0.0";

            const returnPct = totalDo > 0 ? ((returnCount / totalDo) * 100).toFixed(1) : "0.0";
            const returnVolPct = totalVol > 0 ? ((returnVol / totalVol) * 100).toFixed(1) : "0.0";

            const invPct = totalDo > 0 ? ((invCount / totalDo) * 100).toFixed(1) : "0.0";
            const invVolPct = totalVol > 0 ? ((invVol / totalVol) * 100).toFixed(1) : "0.0";

            const cancelPct = totalDo > 0 ? ((cancelCount / totalDo) * 100).toFixed(1) : "0.0";
            const cancelVolPct = totalVol > 0 ? ((cancelVol / totalVol) * 100).toFixed(1) : "0.0";

            const formatVol = (val?: number | null) => {
              if (val == null || isNaN(val)) return "0 Ltr";
              return `${Number(val).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr`;
            };
            const formatQty = (val?: number | null) => {
              if (val == null || isNaN(val)) return "0";
              return Number(val).toLocaleString("id-ID");
            };

            return (
              <div className="kpi-grid" style={{ marginBottom: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
                {/* Total DO */}
                <div
                  className="kpi-card primary"
                  onClick={() => setSelectedDoStatuses([])}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.length === 0 ? "2px solid #38bdf8" : "1px solid var(--bg-border)",
                    boxShadow: selectedDoStatuses.length === 0 ? "0 0 12px rgba(56, 189, 248, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk tampilkan Semua Status DO"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon primary" style={{ marginBottom: 0 }}>📦</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                        100%
                      </span>
                    </div>
                    <div className="kpi-value">{totalDo.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">Total DO</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatVol(totalVol)}</span>
                    </div>
                    {totalQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(totalQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DO Send */}
                <div
                  className="kpi-card info"
                  onClick={() => {
                    setSelectedDoStatuses((prev) =>
                      prev.includes("send") ? prev.filter((s) => s !== "send") : [...prev, "send"]
                    );
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.includes("send") ? "2px solid #38bdf8" : "1px solid var(--bg-border)",
                    boxShadow: selectedDoStatuses.includes("send") ? "0 0 12px rgba(56, 189, 248, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk toggle filter DO Send (Kirim)"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon info" style={{ marginBottom: 0 }}>🚛</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                        {sendPct}%
                      </span>
                    </div>
                    <div className="kpi-value">{sendCount.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">DO Send (Kirim)</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatVol(sendVol)}{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({sendVolPct}%)</span>
                      </span>
                    </div>
                    {sendQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(sendQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DO Received */}
                <div
                  className="kpi-card success"
                  onClick={() => {
                    setSelectedDoStatuses((prev) =>
                      prev.includes("received") ? prev.filter((s) => s !== "received") : [...prev, "received"]
                    );
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.includes("received") ? "2px solid #22c55e" : "1px solid var(--bg-border)",
                    boxShadow: selectedDoStatuses.includes("received") ? "0 0 12px rgba(34, 197, 94, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk toggle filter DO Received (Sampai)"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon success" style={{ marginBottom: 0 }}>✅</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80" }}>
                        {recvPct}%
                      </span>
                    </div>
                    <div className="kpi-value">{recvCount.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">DO Received (Sampai)</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatVol(recvVol)}{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({recvVolPct}%)</span>
                      </span>
                    </div>
                    {recvQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(recvQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DO Return */}
                <div
                  className="kpi-card"
                  onClick={() => {
                    setSelectedDoStatuses((prev) =>
                      prev.includes("return") ? prev.filter((s) => s !== "return") : [...prev, "return"]
                    );
                  }}
                  style={{
                    borderLeft: "4px solid #06b6d4",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.includes("return") ? "2px solid #06b6d4" : "1px solid var(--bg-border)",
                    borderLeftWidth: "4px",
                    boxShadow: selectedDoStatuses.includes("return") ? "0 0 12px rgba(6, 182, 212, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk toggle filter DO Return (Kembali)"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4", marginBottom: 0 }}>🔄</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
                        {returnPct}%
                      </span>
                    </div>
                    <div className="kpi-value" style={{ color: "#22d3ee" }}>{returnCount.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">DO Return (Kembali)</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatVol(returnVol)}{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({returnVolPct}%)</span>
                      </span>
                    </div>
                    {returnQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(returnQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DO Invoice */}
                <div
                  className="kpi-card"
                  onClick={() => {
                    setSelectedDoStatuses((prev) =>
                      prev.includes("invoice") ? prev.filter((s) => s !== "invoice") : [...prev, "invoice"]
                    );
                  }}
                  style={{
                    borderLeft: "4px solid #6366f1",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.includes("invoice") ? "2px solid #818cf8" : "1px solid var(--bg-border)",
                    borderLeftWidth: "4px",
                    boxShadow: selectedDoStatuses.includes("invoice") ? "0 0 12px rgba(129, 140, 248, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk toggle filter DO Invoice"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", marginBottom: 0 }}>📄</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                        {invPct}%
                      </span>
                    </div>
                    <div className="kpi-value" style={{ color: "#818cf8" }}>{invCount.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">DO Invoice</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.72rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatVol(invVol)}{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({invVolPct}%)</span>
                      </span>
                    </div>
                    {invQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(invQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DO Cancel */}
                <div
                  className="kpi-card"
                  onClick={() => {
                    setSelectedDoStatuses((prev) =>
                      prev.includes("cancel") ? prev.filter((s) => s !== "cancel") : [...prev, "cancel"]
                    );
                  }}
                  style={{
                    borderLeft: "4px solid #ef4444",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: selectedDoStatuses.includes("cancel") ? "2px solid #ef4444" : "1px solid var(--bg-border)",
                    borderLeftWidth: "4px",
                    boxShadow: selectedDoStatuses.includes("cancel") ? "0 0 12px rgba(239, 68, 68, 0.25)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  title="Klik untuk toggle filter DO Cancel"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div className="kpi-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", marginBottom: 0 }}>❌</div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
                        {cancelPct}%
                      </span>
                    </div>
                    <div className="kpi-value" style={{ color: "#ef4444" }}>{cancelCount.toLocaleString("id-ID")}</div>
                    <div className="kpi-label">DO Cancel</div>
                  </div>
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.45rem", borderTop: "1px solid var(--bg-border)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Volume (Liter):</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatVol(cancelVol)}{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>({cancelVolPct}%)</span>
                      </span>
                    </div>
                    {cancelQty > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Qty Kemasan:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{formatQty(cancelQty)} item</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--bg-border)", overflow: "visible" }}>
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
              <table className="data-table" style={{ width: "100%", minWidth: "1400px" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "170px" }}>
                      <div style={{ marginBottom: "6px" }}>Nomor DO</div>
                      <MultiSelectFilter
                        title="Nomor DO"
                        placeholder="Semua No. DO"
                        searchPlaceholder="Cari nomor DO..."
                        options={doNumberOptions}
                        selectedValues={selectedDoNumbers}
                        onChange={setSelectedDoNumbers}
                        popoverWidth={280}
                        compact={true}
                      />
                    </th>
                    <th style={{ minWidth: "160px" }}>
                      <div style={{ marginBottom: "6px" }}>Gudang</div>
                      <MultiSelectFilter
                        title="Gudang"
                        placeholder="Semua Gudang"
                        searchPlaceholder="Cari gudang..."
                        options={warehouseDoOptions}
                        selectedValues={selectedOriginWarehouses}
                        onChange={setSelectedOriginWarehouses}
                        popoverWidth={240}
                        compact={true}
                      />
                    </th>
                    <th style={{ minWidth: "160px" }}>
                      <div style={{ marginBottom: "6px" }}>Tanggal DO</div>
                      <MultiSelectFilter
                        title="Tanggal DO"
                        placeholder="Semua Tanggal"
                        searchPlaceholder="Cari tanggal (DD-MM-YYYY)..."
                        options={doDateOptions}
                        selectedValues={selectedDoDates}
                        onChange={setSelectedDoDates}
                        popoverWidth={240}
                        compact={true}
                        icon={<span style={{ fontSize: "12px" }}>📅</span>}
                      />
                    </th>
                    <th style={{ minWidth: "220px" }}>
                      <div style={{ marginBottom: "6px" }}>Customer</div>
                      <MultiSelectFilter
                        title="Customer"
                        placeholder="Semua Customer"
                        searchPlaceholder="Cari customer..."
                        options={customerOptions}
                        selectedValues={selectedCustomers}
                        onChange={setSelectedCustomers}
                        popoverWidth={280}
                        compact={true}
                      />
                    </th>
                    <th>Kota Tujuan</th>
                    <th style={{ textAlign: "right" }}>Volume (Liter)</th>
                    <th style={{ minWidth: "140px" }}>Driver / Kendaraan</th>
                    <th>Waktu Kirim</th>
                    <th title="Live tracking dihitung sejak DO dibuat">Receive Date</th>
                    <th title="Live tracking dihitung sejak Receive Date dibuat">Return Date</th>
                    <th style={{ textAlign: "center" }} title="Selisih hari dari barang diterima hingga surat jalan kembali">Selisih FRDO</th>
                    <th style={{ minWidth: "190px" }} title="Status pengiriman dan durasi DO dibuat hingga invoice terbit">
                      <div style={{ marginBottom: "6px" }}>Status DO</div>
                      <MultiSelectFilter
                        title="Status DO"
                        placeholder="Semua Status"
                        searchable={false}
                        options={doStatusOptions}
                        selectedValues={selectedDoStatuses}
                        onChange={setSelectedDoStatuses}
                        popoverWidth={230}
                        compact={true}
                        align="right"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 12 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredDoItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Tidak ada data DO yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedDoItems.map((row) => {
                      const isExpanded = expandedDoId === row.nomor;
                      const isRowInvoice = row.status === "I" || row.status_label === "invoice" || Boolean(row.tgl_invoice);
                      const isRowReturn = !isRowInvoice && (row.status === "R" || row.status_label === "Received") && Boolean(row.return_date);
                      const statusKey = isRowInvoice ? "invoice" : isRowReturn ? "return" : (row.status || row.status_label || "draft");
                      const badge = DO_STATUS_BADGE[statusKey] || STATUS_BADGE[statusKey] || { label: statusKey, cls: "badge-status badge-muted" };
                      return (
                        <React.Fragment key={row.nomor}>
                          <tr style={{ background: isExpanded ? "rgba(56, 189, 248, 0.08)" : undefined }}>
                            {/* 1. Nomor DO */}
                            <td className="font-mono" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleDo(row.nomor)}
                                title={isExpanded ? "Klik untuk menutup Form Receipt DO" : "Klik untuk membuka Form Receipt Delivery Order"}
                                style={{
                                  background: isExpanded ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.08)",
                                  border: `1px solid ${isExpanded ? "#38bdf8" : "rgba(56, 189, 248, 0.3)"}`,
                                  borderRadius: "6px",
                                  padding: "0.22rem 0.5rem",
                                  color: "#38bdf8",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontFamily: "inherit",
                                  fontSize: "0.75rem",
                                  textAlign: "left",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <span style={{ fontSize: "0.7rem", color: isExpanded ? "#38bdf8" : "#94a3b8" }}>
                                  {isExpanded ? "▼" : "▶"}
                                </span>
                                <span>{row.nomor}</span>
                                <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>📋</span>
                              </button>
                            </td>

                            {/* 2. Gudang */}
                            <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                              {row.nama_gudang ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                  <span style={{ opacity: 0.7 }}>🏢</span>
                                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{row.nama_gudang}</span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{formatDisplayDate(row.tanggal)}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{row.nama_customer || "—"}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.id_customer || row.customer_id || "—"}</div>
                            </td>
                            <td style={{ color: "var(--text-secondary)" }}>{row.destination || row.kota_tujuan || "—"}</td>
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 700, color: "#38bdf8" }}>
                                {row.total_volume_liter != null && row.total_volume_liter > 0
                                  ? `${Number(row.total_volume_liter).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ltr`
                                  : "—"}
                              </div>
                              {row.total_qty != null && row.total_qty > 0 && (
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                  {Number(row.total_qty).toLocaleString("id-ID")} kemasan
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ color: "var(--text-secondary)" }}>{row.driver || "—"}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.lic_plate || row.plat_nomor || "—"}</div>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                              {row.tgl_keluar ? formatDisplayDate(row.tgl_keluar) : (row.waktu_kirim ? new Date(row.waktu_kirim).toLocaleString("id") : "—")}
                            </td>
                            <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                              {row.received_date ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                    {formatDisplayDate(row.received_date)}
                                  </div>
                                  {row.received_name && (
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                      {row.received_name}
                                    </div>
                                  )}
                                  {(() => {
                                    let durasiTerima: number | null = row.durasi_terima_hari ?? null;
                                    if (durasiTerima === null && row.received_date && row.tanggal) {
                                      const tRecv = parseDateLocal(row.received_date)?.getTime();
                                      const tDo = parseDateLocal(row.tanggal)?.getTime();
                                      if (tRecv && tDo) {
                                        durasiTerima = Math.round((tRecv - tDo) / (1000 * 60 * 60 * 24));
                                      }
                                    }
                                    if (durasiTerima === null || isNaN(durasiTerima)) return null;
                                    const isFast = durasiTerima <= 2;
                                    const isMid = durasiTerima <= 5;
                                    const color = isFast ? "#22c55e" : isMid ? "#eab308" : "#ef4444";
                                    const bg = isFast ? "rgba(34, 197, 94, 0.12)" : isMid ? "rgba(234, 179, 8, 0.12)" : "rgba(239, 68, 68, 0.12)";
                                    const border = isFast ? "rgba(34, 197, 94, 0.3)" : isMid ? "rgba(234, 179, 8, 0.3)" : "rgba(239, 68, 68, 0.3)";
                                    return (
                                      <div style={{ marginTop: "0.2rem" }}>
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.2rem",
                                            fontSize: "0.68rem",
                                            fontWeight: 600,
                                            color,
                                            background: bg,
                                            border: `1px solid ${border}`,
                                            borderRadius: "4px",
                                            padding: "0.1rem 0.35rem",
                                          }}
                                          title={`DO dibuat: ${formatDisplayDate(row.tanggal)} → Diterima: ${formatDisplayDate(row.received_date)}`}
                                        >
                                          ✓ {durasiTerima} Hari
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (() => {
                                // Live tracking receive date dihitung sejak DO dibuat
                                const startDate = row.tanggal;
                                const info = getLiveTrackingInfo(startDate);
                                const theme = info ? getReceiveLiveTheme(info.days) : null;
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "var(--bg-surface)", padding: "0.15rem 0.45rem", borderRadius: "4px", border: "1px solid var(--bg-border)", display: "inline-block" }}>
                                      Belum Diterima
                                    </span>
                                    {info && theme && (
                                      <span
                                        title={`DO dibuat: ${formatDisplayDate(row.tanggal)} — Live tracking berjalan sejak DO dibuat`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.3rem",
                                          fontSize: "0.68rem",
                                          fontWeight: 600,
                                          color: theme.color,
                                          background: theme.bgColor,
                                          border: `1px solid ${theme.borderColor}`,
                                          borderRadius: "5px",
                                          padding: "0.12rem 0.4rem",
                                          letterSpacing: "0.01em",
                                        }}
                                      >
                                        <span className="live-pulse-dot" style={{ background: theme.color }} />
                                        ⏱ {info.label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                              {row.return_date ? (
                                <div>
                                  <span style={{ fontWeight: 600, color: "#38bdf8" }}>
                                    {formatDisplayDate(row.return_date)}
                                  </span>
                                  {(() => {
                                    let selisih: number | null = row.selisih_hari ?? null;
                                    if (selisih === null && row.return_date && row.received_date) {
                                      const tReturn = parseDateLocal(row.return_date)?.getTime();
                                      const tRecv = parseDateLocal(row.received_date)?.getTime();
                                      if (tReturn && tRecv) {
                                        selisih = Math.round((tReturn - tRecv) / (1000 * 60 * 60 * 24));
                                      }
                                    }
                                    if (selisih === null || isNaN(selisih)) return null;
                                    const isFast = selisih <= 3;
                                    const isMid = selisih <= 7;
                                    const color = isFast ? "#22c55e" : isMid ? "#eab308" : "#ef4444";
                                    const bg = isFast ? "rgba(34, 197, 94, 0.12)" : isMid ? "rgba(234, 179, 8, 0.12)" : "rgba(239, 68, 68, 0.12)";
                                    const border = isFast ? "rgba(34, 197, 94, 0.3)" : isMid ? "rgba(234, 179, 8, 0.3)" : "rgba(239, 68, 68, 0.3)";
                                    return (
                                      <div style={{ marginTop: "0.2rem" }}>
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.2rem",
                                            fontSize: "0.68rem",
                                            fontWeight: 600,
                                            color,
                                            background: bg,
                                            border: `1px solid ${border}`,
                                            borderRadius: "4px",
                                            padding: "0.1rem 0.35rem",
                                          }}
                                          title={`Diterima: ${formatDisplayDate(row.received_date)} → Return: ${formatDisplayDate(row.return_date)}`}
                                        >
                                          ✓ {selisih} Hari
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : row.received_date ? (() => {
                                // Live tracking return date dihitung sejak receive date dibuat
                                const info = getLiveTrackingInfo(row.received_date);
                                const theme = info ? getReturnLiveTheme(info.days) : null;
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                    <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.1)", padding: "0.15rem 0.45rem", borderRadius: "4px", border: "1px solid rgba(234,179,8,0.25)", display: "inline-block" }}>
                                      Belum Kembali
                                    </span>
                                    {info && theme && (
                                      <span
                                        title={`Diterima: ${formatDisplayDate(row.received_date)} — Live tracking berjalan sejak barang diterima`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.3rem",
                                          fontSize: "0.68rem",
                                          fontWeight: 600,
                                          color: theme.color,
                                          background: theme.bgColor,
                                          border: `1px solid ${theme.borderColor}`,
                                          borderRadius: "5px",
                                          padding: "0.12rem 0.4rem",
                                          letterSpacing: "0.01em",
                                        }}
                                      >
                                        <span className="live-pulse-dot" style={{ background: theme.color }} />
                                        ⏱ {info.label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })() : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                  <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.1)", padding: "0.15rem 0.45rem", borderRadius: "4px", border: "1px solid rgba(234,179,8,0.25)", display: "inline-block" }}>
                                    Belum Kembali
                                  </span>
                                  <span style={{ fontSize: "0.63rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                    (Menunggu Terima)
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              {(() => {
                                let selisih: number | null = row.selisih_hari ?? null;
                                if (selisih === null && row.return_date && row.received_date) {
                                  const tReturn = new Date(row.return_date).getTime();
                                  const tRecv = new Date(row.received_date).getTime();
                                  if (!isNaN(tReturn) && !isNaN(tRecv)) {
                                    selisih = Math.round((tReturn - tRecv) / (1000 * 60 * 60 * 24));
                                  }
                                }

                                if (selisih !== null && !isNaN(selisih)) {
                                  const isSameDay = selisih === 0;
                                  const isFast = selisih > 0 && selisih <= 3;
                                  const isLate = selisih > 7;
                                  const color = isSameDay || isFast ? "#22c55e" : isLate ? "#ef4444" : "#eab308";
                                  const bg = isSameDay || isFast ? "rgba(34, 197, 94, 0.15)" : isLate ? "rgba(239, 68, 68, 0.15)" : "rgba(234, 179, 8, 0.15)";
                                  const border = isSameDay || isFast ? "rgba(34, 197, 94, 0.3)" : isLate ? "rgba(239, 68, 68, 0.3)" : "rgba(234, 179, 8, 0.3)";

                                  return (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        background: bg,
                                        color: color,
                                        border: `1px solid ${border}`,
                                      }}
                                      title={`Return: ${row.return_date || '-'} | Receive: ${row.received_date || '-'}`}
                                    >
                                      {isSameDay ? "0 Hari" : `${selisih} Hari`}
                                    </span>
                                  );
                                }

                                if (row.received_date && !row.return_date) {
                                  return (
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                      Menunggu FRDO
                                    </span>
                                  );
                                }

                                return <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>;
                              })()}
                            </td>
                            <td>
                              {(() => {
                                if (isRowInvoice) {
                                  let durasiInvoice: number | null = row.durasi_invoice_hari ?? null;
                                  if (durasiInvoice === null && row.tgl_invoice && row.tanggal) {
                                    const tInv = parseDateLocal(row.tgl_invoice)?.getTime();
                                    const tDo = parseDateLocal(row.tanggal)?.getTime();
                                    if (tInv && tDo) {
                                      durasiInvoice = Math.round((tInv - tDo) / (1000 * 60 * 60 * 24));
                                    }
                                  }

                                  const isFast = durasiInvoice !== null && durasiInvoice <= 3;
                                  const isMid = durasiInvoice !== null && durasiInvoice <= 7;
                                  const leadColor = isFast ? "#22c55e" : isMid ? "#eab308" : "#818cf8";
                                  const leadBg = isFast ? "rgba(34, 197, 94, 0.12)" : isMid ? "rgba(234, 179, 8, 0.12)" : "rgba(99, 102, 241, 0.12)";
                                  const leadBorder = isFast ? "rgba(34, 197, 94, 0.3)" : isMid ? "rgba(234, 179, 8, 0.3)" : "rgba(99, 102, 241, 0.3)";

                                  return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            padding: "0.18rem 0.5rem",
                                            borderRadius: "6px",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            background: "rgba(99, 102, 241, 0.15)",
                                            color: "#818cf8",
                                            border: "1px solid rgba(99, 102, 241, 0.35)",
                                          }}
                                        >
                                          📄 Invoice
                                        </span>
                                      </div>
                                      {durasiInvoice !== null && (
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            color: leadColor,
                                            background: leadBg,
                                            border: `1px solid ${leadBorder}`,
                                            padding: "0.12rem 0.4rem",
                                            borderRadius: "4px",
                                            width: "fit-content",
                                            whiteSpace: "nowrap",
                                          }}
                                          title={`DO dibuat: ${formatDisplayDate(row.tanggal)} → Invoice terbit: ${row.tgl_invoice ? formatDisplayDate(row.tgl_invoice) : '-'}`}
                                        >
                                          ⚡ {durasiInvoice} Hari
                                        </span>
                                      )}
                                      {row.no_invoice && (
                                        <div
                                          style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "0.2rem" }}
                                          title={row.tgl_invoice ? `Invoice Terbit: ${formatDisplayDate(row.tgl_invoice)}` : undefined}
                                        >
                                          <span>№</span>
                                          <span>{row.no_invoice}</span>
                                        </div>
                                      )}
                                      {row.tgl_invoice && !row.no_invoice && (
                                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                          Terbit: {formatDisplayDate(row.tgl_invoice)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (statusKey === "cancel" || row.status === "C") {
                                  return (
                                    <span className="badge-status badge-danger">
                                      Cancel
                                    </span>
                                  );
                                }

                                // Status selain invoice (send, received, return, draft)
                                const elapsedDo = getLiveTrackingInfo(row.tanggal);
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <span className={badge.cls}>{badge.label}</span>
                                    <span
                                      style={{
                                        fontSize: "0.68rem",
                                        color: "var(--text-muted)",
                                        background: "var(--bg-surface)",
                                        padding: "0.1rem 0.35rem",
                                        borderRadius: "4px",
                                        border: "1px solid var(--bg-border)",
                                        width: "fit-content",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.2rem",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={`DO dibuat: ${formatDisplayDate(row.tanggal)} — Menunggu Invoice`}
                                    >
                                      ⏳ {elapsedDo ? `${elapsedDo.days} hr` : "Belum Invoice"}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${row.nomor}-modal-subrow`}>
                              <td colSpan={12} style={{ padding: "0.85rem 1rem 1.4rem", background: "var(--bg-surface)", borderBottom: "2px solid #38bdf8" }}>
                                {renderDoReceiptModalBox(row.nomor, () => setExpandedDoId(null))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(safeDoPage, totalDoPages, filteredDoItems.length, setDoPage)}
          </div>
        </>
      )}

      {mainTab === "IO" && (
        <>
          {/* Filter Status Pills IO */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: `Semua (${ioStatusCounts.all})` },
              { key: "draft", label: `⏳ Draft (${ioStatusCounts.draft})` },
              { key: "dsm", label: `📑 Checked DSM (${ioStatusCounts.dsm})` },
              { key: "approve", label: `📤 Approve (${ioStatusCounts.approve})` },
              { key: "it_process", label: `⚙️ IT Process (${ioStatusCounts.it_process})` },
              { key: "partial", label: `📦 Partial (${ioStatusCounts.partial})` },
              { key: "it_complete", label: `✅ IT Complete (${ioStatusCounts.it_complete})` },
              { key: "cancel", label: `❌ Cancel (${ioStatusCounts.cancel})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setIoStatusFilter(tab.key as typeof ioStatusFilter)}
                className={`btn ${ioStatusFilter === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--bg-border)", overflow: "visible" }}>
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <table className="data-table" style={{ width: "100%", minWidth: "1450px" }}>
              <thead>
                <tr>
                  <th style={{ width: "35px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Nomor IO</div>
                    <MultiSelectFilter
                      title="Nomor IO"
                      placeholder="Semua No. IO"
                      searchPlaceholder="Cari nomor IO..."
                      options={ioNumberOptions}
                      selectedValues={selectedIoNumbers}
                      onChange={setSelectedIoNumbers}
                      popoverWidth={280}
                      compact={true}
                    />
                  </th>
                  <th>Tanggal</th>
                  <th style={{ minWidth: "170px" }}>
                    <div style={{ marginBottom: "6px" }}>Kantor</div>
                    <MultiSelectFilter
                      title="Kantor"
                      placeholder="Semua Kantor"
                      searchPlaceholder="Cari kantor..."
                      options={ioKantorOptions}
                      selectedValues={selectedIoKantors}
                      onChange={setSelectedIoKantors}
                      popoverWidth={230}
                      compact={true}
                    />
                  </th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Gudang Asal</div>
                    <MultiSelectFilter
                      title="Gudang Asal"
                      placeholder="Semua Asal"
                      searchPlaceholder="Cari gudang asal..."
                      options={ioGudangAsalOptions}
                      selectedValues={selectedOriginWarehouses}
                      onChange={setSelectedOriginWarehouses}
                      popoverWidth={240}
                      compact={true}
                    />
                  </th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Gudang Tujuan</div>
                    <MultiSelectFilter
                      title="Gudang Tujuan"
                      placeholder="Semua Tujuan"
                      searchPlaceholder="Cari gudang tujuan..."
                      options={ioGudangTujuanOptions}
                      selectedValues={selectedDestinationWarehouses}
                      onChange={setSelectedDestinationWarehouses}
                      popoverWidth={240}
                      compact={true}
                    />
                  </th>
                  <th style={{ minWidth: "170px" }}>
                    <div style={{ marginBottom: "6px" }}>Dibuat oleh</div>
                    <MultiSelectFilter
                      title="Pembuat"
                      placeholder="Semua Pemohon"
                      searchPlaceholder="Cari pembuat..."
                      options={ioDibuatOlehOptions}
                      selectedValues={selectedIoCreators}
                      onChange={setSelectedIoCreators}
                      popoverWidth={230}
                      compact={true}
                    />
                  </th>
                  <th>Send</th>
                  <th>Check By DSM</th>
                  <th>Dicek ST</th>
                  <th>Dicek WHM</th>
                  <th>Approve</th>
                  <th>No. IP</th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Status</div>
                    <MultiSelectFilter
                      title="Status IO"
                      placeholder="Semua Status"
                      searchable={false}
                      options={ioStatusOptions}
                      selectedValues={selectedIoStatuses}
                      onChange={setSelectedIoStatuses}
                      popoverWidth={230}
                      compact={true}
                      align="right"
                    />
                  </th>
                  <th>Nama Barang</th>
                  <th>Kode Barang</th>
                  <th>Qty</th>
                  <th>Satuan</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 19 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredIoItems.length === 0 ? (
                  <tr>
                    <td colSpan={19} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Tidak ada data Internal Order yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedIoItems.map((row: InternalOrderRecord, idx: number) => {
                    const code = (row.status_code || row.status || "").trim();
                    const badge = IO_STATUS_BADGE[code] || IO_STATUS_BADGE[row.status] || { label: row.status || code || "—", cls: "badge-status badge-muted", desc: code };

                    const isExpanded = expandedIoId === row.nomor_io;

                    return (
                      <React.Fragment key={`${row.nomor_io}-${row.kode_barang || ''}-${idx}`}>
                        <tr style={{ background: isExpanded ? "rgba(16, 185, 129, 0.08)" : undefined }}>
                          <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>{(safeIoPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                          <td className="font-mono" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleIo(row.nomor_io)}
                              title={isExpanded ? "Klik untuk menutup modal box di bawah" : "Klik untuk membuka modal box di bawah"}
                              style={{
                                background: isExpanded ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.08)",
                                border: `1px solid ${isExpanded ? "#10B981" : "rgba(16, 185, 129, 0.3)"}`,
                                borderRadius: "6px",
                                padding: "0.22rem 0.5rem",
                                color: "#10B981",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontFamily: "inherit",
                                fontSize: "0.75rem",
                                textAlign: "left",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span style={{ fontSize: "0.7rem", color: isExpanded ? "#10B981" : "#94a3b8" }}>
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span>{row.nomor_io}</span>
                              <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>📋</span>
                            </button>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{row.tanggal}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.nama_kantor || "—"}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_asal || "—"}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_tujuan || "—"}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.dibuat_oleh || "—"}</td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {row.send_date || (row.send_by_date ? formatDisplayDateTime(row.send_by_date) : "—")}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {row.check_dsm_date ? (row.check_dsm_date.includes("WIB") ? row.check_dsm_date : formatDisplayDateTime(row.check_dsm_date)) : (code === "K" ? "Reject DSM" : "—")}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {row.check_st_date ? (row.check_st_date.includes("WIB") ? row.check_st_date : formatDisplayDateTime(row.check_st_date)) : (code === "Y" ? "Reject ST" : "—")}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {row.check_whm_date ? (row.check_whm_date.includes("WIB") ? row.check_whm_date : formatDisplayDateTime(row.check_whm_date)) : (code === "X" ? "Cancel" : "—")}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {row.approve_date || (row.approve_tanggal ? (row.approve_tanggal.includes("WIB") ? row.approve_tanggal : formatDisplayDateTime(row.approve_tanggal)) : (code === "R" ? "Cancel" : "—"))}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {row.id_ip || "—"}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span className={badge.cls} title={badge.desc}>
                              {row.status || badge.label}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-primary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                            {row.nama_barang || "—"}
                          </td>
                          <td className="font-mono" style={{ color: "var(--text-secondary)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            {row.kode_barang || "—"}
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap", color: "var(--text-primary)", fontWeight: 600 }}>
                            {row.qty !== null && row.qty !== undefined && row.qty !== "" ? Number(row.qty).toLocaleString("id-ID") : "—"}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", color: "#94a3b8", fontSize: "0.75rem" }}>
                            {row.satuan || "—"}
                          </td>
                          <td style={{ color: "#94a3b8", fontSize: "0.75rem", maxWidth: "250px" }}>
                            {row.keterangan || "—"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.nomor_io}-modal-subrow`}>
                            <td colSpan={19} style={{ padding: "0.85rem 1rem 1.4rem", background: "var(--bg-surface)", borderBottom: "2px solid #10B981" }}>
                              {renderIoModalBox(row.nomor_io, () => setExpandedIoId(null))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {renderPagination(safeIoPage, totalIoPages, filteredIoItems.length, setIoPage)}
        </div>
        </>
      )}

      {mainTab === "IT" && (
        <>
          {/* Filter Status Pills IT */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: `Semua (${itStatusCounts.all})` },
              { key: "draft", label: `⏳ Draft (${itStatusCounts.draft})` },
              { key: "send", label: `📤 Send (${itStatusCounts.send})` },
              { key: "receipt", label: `✅ Receipt (${itStatusCounts.receipt})` },
              { key: "cancel", label: `❌ Cancel (${itStatusCounts.cancel})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setItStatusFilter(tab.key as typeof itStatusFilter)}
                className={`btn ${itStatusFilter === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--bg-border)", overflow: "visible" }}>
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <table className="data-table" style={{ width: "100%", minWidth: "1250px" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>IT No</div>
                    <MultiSelectFilter
                      title="No. IT"
                      placeholder="Semua No. IT"
                      searchPlaceholder="Cari nomor IT..."
                      options={itNumberOptions}
                      selectedValues={selectedItNumbers}
                      onChange={setSelectedItNumbers}
                      popoverWidth={280}
                      compact={true}
                    />
                  </th>
                  <th>Date</th>
                  <th>Create Date</th>
                  <th>Delivery Date</th>
                  <th>Receive Date</th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Gudang Asal</div>
                    <MultiSelectFilter
                      title="Gudang Asal"
                      placeholder="Semua Asal"
                      searchPlaceholder="Cari gudang asal..."
                      options={itGudangAsalOptions}
                      selectedValues={selectedOriginWarehouses}
                      onChange={setSelectedOriginWarehouses}
                      popoverWidth={240}
                      compact={true}
                    />
                  </th>
                  <th style={{ minWidth: "180px" }}>
                    <div style={{ marginBottom: "6px" }}>Gudang Tujuan</div>
                    <MultiSelectFilter
                      title="Gudang Tujuan"
                      placeholder="Semua Tujuan"
                      searchPlaceholder="Cari gudang tujuan..."
                      options={itGudangTujuanOptions}
                      selectedValues={selectedDestinationWarehouses}
                      onChange={setSelectedDestinationWarehouses}
                      popoverWidth={240}
                      compact={true}
                    />
                  </th>
                  <th>Nomor IO</th>
                  <th>Tgl. IO Approve</th>
                  <th>Receive Note</th>
                  <th style={{ minWidth: "170px" }}>
                    <div style={{ marginBottom: "6px" }}>Status</div>
                    <MultiSelectFilter
                      title="Status IT"
                      placeholder="Semua Status"
                      searchable={false}
                      options={itStatusOptions}
                      selectedValues={selectedItStatuses}
                      onChange={setSelectedItStatuses}
                      popoverWidth={220}
                      compact={true}
                      align="right"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredItItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Tidak ada data Internal Transfer yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedItItems.map((row: InternalTransferRecord) => {
                    const isExpanded = expandedItId === row.nomor;
                    const code = row.status?.trim() || "";
                    const badge = IT_STATUS_BADGE[code] || { label: code || "—", cls: "badge-status badge-muted", desc: code };
                    return (
                      <React.Fragment key={row.nomor}>
                        <tr style={{ background: isExpanded ? "rgba(56, 189, 248, 0.08)" : undefined }}>
                          <td className="font-mono" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleIt(row.nomor)}
                              title={isExpanded ? "Klik untuk menutup modal box di bawah" : "Klik untuk membuka modal box di bawah"}
                              style={{
                                background: isExpanded ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.08)",
                                border: `1px solid ${isExpanded ? "#38bdf8" : "rgba(56, 189, 248, 0.3)"}`,
                                borderRadius: "6px",
                                padding: "0.22rem 0.5rem",
                                color: "#38bdf8",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontFamily: "inherit",
                                fontSize: "0.75rem",
                                textAlign: "left",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span style={{ fontSize: "0.7rem", color: isExpanded ? "#38bdf8" : "#94a3b8" }}>
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span>{row.nomor}</span>
                              <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>📋</span>
                            </button>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(row.tanggal)}</td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.create_date)}</td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tanggal_kirim)}</td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tanggal_terima)}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_asal || "—"}</td>
                          <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{row.gudang_tujuan || "—"}</td>
                          <td className="font-mono" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            {row.nomor_io && row.nomor_io !== "—" ? (
                              <button
                                type="button"
                                onClick={() => handleOpenIoItems(row.nomor_io!)}
                                title="Klik untuk melihat Detail IO referensi"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  color: "var(--color-primary)",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  fontFamily: "inherit",
                                  fontSize: "inherit",
                                }}
                              >
                                {row.nomor_io}
                              </button>
                            ) : (
                              <span style={{ color: "var(--text-secondary)" }}>—</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDisplayDate(row.tgl_io_approve)}</td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "250px" }}>{row.receive_note || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span className={badge.cls} title={badge.desc}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.nomor}-modal-subrow`}>
                            <td colSpan={11} style={{ padding: "0.85rem 1rem 1.4rem", background: "var(--bg-surface)", borderBottom: "2px solid #38bdf8" }}>
                              {renderItModalBox(row.nomor, () => setExpandedItId(null))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {renderPagination(safeItPage, totalItPages, filteredItItems.length, setItPage)}
        </div>
        </>
      )}

      {canSeeFinancialFlow && mainTab === "FINANCIAL_FLOW" && <FinancialFlowTab />}


      {/* ─── POPUP OVERLAY FALLBACK (jika dibuka dari link detail) ─── */}
      {modalOpen && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem" }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "1160px", maxHeight: "92vh", overflowY: "auto", borderRadius: "16px" }}>
            {modalDocType === "DO"
              ? renderDoReceiptModalBox(modalDocNumber, () => setModalOpen(false))
              : modalDocType === "IO"
              ? renderIoModalBox(modalDocNumber, () => setModalOpen(false))
              : renderItModalBox(modalDocNumber, () => setModalOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}
