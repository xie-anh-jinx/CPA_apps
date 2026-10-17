"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiDistributions } from "@/lib/api";

interface DistributionSummary {
  total_do: number;
  send?: number;
  received?: number;
  invoice?: number;
  cancel?: number;
  draft?: number;
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
  delivery_address?: string;
  status?: string;
  status_label?: string;
  driver?: string;
  lic_plate?: string;
  transporter?: string;
  tgl_keluar?: string | null;
  keterangan?: string;
}

interface DoLineItem {
  no: number;
  kode_barang: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  packing_number?: string;
  packing_type?: string;
  qty_diterima?: number;
  keterangan?: string;
}

interface DeliveryRecord {
  nomor: string;
  tanggal: string;
  id_customer?: string;
  customer_id?: string;
  nama_customer: string;
  destination?: string;
  kota_tujuan?: string;
  status: string;
  status_label?: string;
  waktu_kirim?: string | null;
  tgl_keluar?: string | null;
  waktu_sampai?: string | null;
  received_date?: string | null;
  driver?: string;
  plat_nomor?: string;
  lic_plate?: string;
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
  gudang_asal: string;
  gudang_tujuan: string;
  nomor_io?: string | null;
  tgl_io_approve?: string | null;
  receive_note?: string | null;
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

export default function DistributionsPage() {
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  
  const [ioItems, setIoItems] = useState<InternalOrderRecord[]>([]);
  const [itItems, setItItems] = useState<InternalTransferRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"DO" | "IO" | "IT">("DO");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [ioStatusFilter, setIoStatusFilter] = useState<"all" | "draft" | "dsm" | "approve" | "it_process" | "partial" | "it_complete" | "cancel">("all");
  const [itStatusFilter, setItStatusFilter] = useState<"all" | "draft" | "send" | "receipt" | "cancel">("all");

  // Calendar Date Range Filter (Default: Bulan Berjalan) & Excel Export States
  const [calendarDateFrom, setCalendarDateFrom] = useState<string>(() => getCurrentMonthDates().from);
  const [calendarDateTo, setCalendarDateTo] = useState<string>(() => getCurrentMonthDates().to);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Filtered lists & counts for IO and IT
  const filteredIoItems = useMemo(() => {
    if (ioStatusFilter === "all") return ioItems;
    return ioItems.filter((i: InternalOrderRecord) => {
      const code = (i.status_code || "").trim();
      const st = (i.status || "").trim().toLowerCase();
      if (ioStatusFilter === "draft") return code === "D" || st === "draft";
      if (ioStatusFilter === "dsm") return code === "S" || st === "checked dsm";
      if (ioStatusFilter === "approve") return code === "A" || st === "approve";
      if (ioStatusFilter === "it_process") return code === "P" || st.includes("process");
      if (ioStatusFilter === "partial") return code === "Z" || st.includes("partial");
      if (ioStatusFilter === "it_complete") return code === "C" || st.includes("complete");
      if (ioStatusFilter === "cancel") return ["X", "R", "K", "Y"].includes(code) || st.includes("cancel") || st.includes("reject");
      return true;
    });
  }, [ioItems, ioStatusFilter]);

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

  const filteredItItems = useMemo(() => {
    if (itStatusFilter === "all") return itItems;
    if (itStatusFilter === "draft") return itItems.filter((i) => (i.status || "").trim() === "D");
    if (itStatusFilter === "send") return itItems.filter((i) => (i.status || "").trim() === "S");
    if (itStatusFilter === "receipt") return itItems.filter((i) => ["R", "C"].includes((i.status || "").trim()));
    if (itStatusFilter === "cancel") return itItems.filter((i) => (i.status || "").trim() === "X");
    return itItems;
  }, [itItems, itStatusFilter]);

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

  // Reset page when date filter or status filter changes
  useEffect(() => { setDoPage(1); }, [calendarDateFrom, calendarDateTo, activeTab]);
  useEffect(() => { setIoPage(1); }, [calendarDateFrom, calendarDateTo, ioStatusFilter]);
  useEffect(() => { setItPage(1); }, [calendarDateFrom, calendarDateTo, itStatusFilter]);

  // Derived pagination slices
  const totalDoPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safeDoPage = Math.min(doPage, totalDoPages);
  const paginatedDoItems = items.slice((safeDoPage - 1) * ITEMS_PER_PAGE, safeDoPage * ITEMS_PER_PAGE);

  const totalIoPages = Math.max(1, Math.ceil(filteredIoItems.length / ITEMS_PER_PAGE));
  const safeIoPage = Math.min(ioPage, totalIoPages);
  const paginatedIoItems = filteredIoItems.slice((safeIoPage - 1) * ITEMS_PER_PAGE, safeIoPage * ITEMS_PER_PAGE);

  const totalItPages = Math.max(1, Math.ceil(filteredItItems.length / ITEMS_PER_PAGE));
  const safeItPage = Math.min(itPage, totalItPages);
  const paginatedItItems = filteredItItems.slice((safeItPage - 1) * ITEMS_PER_PAGE, safeItPage * ITEMS_PER_PAGE);

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
    const statusKey = doModalHeader?.status || doModalHeader?.status_label || "S";
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
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📦</span> Daftar Barang (Delivery Order Detail)
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Total: <strong style={{ color: "#38bdf8" }}>{doModalItems.length}</strong> item
              </span>
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
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Packing Number</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Qty Diterima</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doModalItems.map((item: DoLineItem, idx: number) => (
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
                        <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {item.packing_number || "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#10B981" }}>
                          {item.qty_diterima !== undefined && item.qty_diterima !== null ? Number(item.qty_diterima).toLocaleString("id-ID") : "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          {item.keterangan || "—"}
                        </td>
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
      const res = await apiDistributions.exportExcel({
        type,
        date_from: calendarDateFrom || undefined,
        date_to: calendarDateTo || undefined,
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
      const dateSuffix = `${calendarDateFrom || "all"}_sd_${calendarDateTo || "all"}`.replace(/-/g, "");
      a.download = `${label}_${dateSuffix}.xlsx`;
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
        const [sumRes, itemsRes, mapRes] = await Promise.allSettled([
          apiDistributions.summary(dateFilter),
          apiDistributions.list({ status: activeTab === "all" ? undefined : activeTab, limit: 500, ...dateFilter }),
          apiDistributions.mapData({ status: activeTab === "all" ? undefined : activeTab, ...dateFilter }),
        ]);

        if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
        if (itemsRes.status === "fulfilled") setItems(itemsRes.value.data.data || []);
        if (mapRes.status === "fulfilled") setMapData(mapRes.value.data || []);
      } else if (mainTab === "IO") {
        const res = await apiDistributions.internalOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          limit: 10000,
        });
        setIoItems(res.data.data || []);
      } else if (mainTab === "IT") {
        const res = await apiDistributions.transferOrders({
          date_from: calendarDateFrom || undefined,
          date_to: calendarDateTo || undefined,
          limit: 10000,
        });
        setItItems(res.data.data || []);
      }
    } catch {
      // API error handled
    } finally {
      setLoading(false);
    }
  }, [activeTab, mainTab, calendarDateFrom, calendarDateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Monitoring Distribusi</h1>
        <p className="page-subtitle">Tracking Delivery Order (DO), Internal Order (IO), dan Internal Transfer (IT)</p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem" }}>
        {[
          { key: "DO", label: "Surat Jalan (DO)" },
          { key: "IO", label: "Internal Order (IO)" },
          { key: "IT", label: "Internal Transfer (IT)" },
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

      {mainTab === "DO" && (
        <>
          {/* Action Bar: Calendar Date Filter & Download Excel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.35rem" }}>🚛</span>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Tracking Delivery Order (DO)
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const curr = getCurrentMonthDates();
                  setCalendarDateFrom(curr.from);
                  setCalendarDateTo(curr.to);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Tampilkan data Bulan Berjalan"
              >
                📅 Bulan Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalendarDateFrom("");
                  setCalendarDateTo(new Date().toISOString().slice(0, 10));
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                title="Tampilkan semua data tanpa batasan tanggal"
              >
                Semua Periode
              </button>

              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500, marginLeft: "0.2rem" }}>
                Rentang Tanggal:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📅</span>
                <input
                  type="date"
                  value={calendarDateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateFrom(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Mulai"
                />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>s/d</span>
                <input
                  type="date"
                  value={calendarDateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateTo(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Akhir"
                />
              </div>

              <button
                onClick={() => handleDownloadExcel("DO")}
                disabled={isDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: isDownloading ? "#065f46" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.48rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                }}
                title={`Download Delivery Order format Excel (.xlsx) untuk rentang tanggal ${calendarDateFrom} s/d ${calendarDateTo}`}
              >
                {isDownloading ? (
                  <>
                    <span>⏳</span>
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem" }}>📥</span>
                    <span>Download Excel (DO.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginBottom: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">📦</div>
              <div className="kpi-value">{summary?.total_do ?? items.length ?? "—"}</div>
              <div className="kpi-label">Total DO</div>
            </div>
            <div className="kpi-card info">
              <div className="kpi-icon info">🚛</div>
              <div className="kpi-value">{summary?.send ?? summary?.in_transit ?? "—"}</div>
              <div className="kpi-label">DO Send (Kirim)</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-icon success">✅</div>
              <div className="kpi-value">{summary?.received ?? summary?.delivered ?? "—"}</div>
              <div className="kpi-label">DO Received (Sampai)</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: "4px solid #6366f1" }}>
              <div className="kpi-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>📄</div>
              <div className="kpi-value" style={{ color: "#818cf8" }}>{summary?.invoice ?? "—"}</div>
              <div className="kpi-label">DO Invoice</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: "4px solid #ef4444" }}>
              <div className="kpi-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>❌</div>
              <div className="kpi-value" style={{ color: "#ef4444" }}>{summary?.cancel ?? "—"}</div>
              <div className="kpi-label">DO Cancel</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-icon warning">⏳</div>
              <div className="kpi-value" style={{ color: "var(--color-warning)" }}>{summary?.draft ?? summary?.pending ?? "—"}</div>
              <div className="kpi-label">DO Draft</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: "Semua" },
              { key: "send", label: "🚛 Send" },
              { key: "received", label: "✅ Received" },
              { key: "invoice", label: "📄 Invoice" },
              { key: "cancel", label: "❌ Cancel" },
              { key: "draft", label: "⏳ Draft" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <div className="card-title">Aktivitas Rute Pengiriman</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
              {loading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                  Memuat data rute...
                </div>
              ) : mapData.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                  Tidak ada aktivitas pengiriman.
                </div>
              ) : (
                (() => {
                  const routes = mapData.reduce((acc, curr) => {
                    const dest = (curr.destination || "Tidak diketahui").toUpperCase();
                    if (!acc[dest]) {
                      acc[dest] = { name: dest, in_transit: 0, delivered: 0, draft: 0, total: 0 };
                    }
                    acc[dest].total += 1;
                    if (curr.status_label === "in_transit") acc[dest].in_transit += 1;
                    else if (curr.status_label === "delivered") acc[dest].delivered += 1;
                    else acc[dest].draft += 1;
                    return acc;
                  }, {} as Record<string, any>);

                  return Object.values(routes)
                    .sort((a: any, b: any) => b.total - a.total)
                    .slice(0, 8)
                    .map((route: any) => (
                      <div key={route.name} style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--bg-border)" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>📍 Tujuan: {route.name}</div>
                        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem" }}>
                          <span style={{ color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>
                            {route.in_transit} Jalan
                          </span>
                          <span style={{ color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 15%, transparent)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>
                            {route.delivered} Sampai
                          </span>
                        </div>
                      </div>
                    ));
                })()
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. DO</th>
                    <th>Tanggal DO</th>
                    <th>Customer</th>
                    <th>Kota Tujuan</th>
                    <th>Driver / Kendaraan</th>
                    <th>Waktu Kirim</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Tidak ada data DO.
                      </td>
                    </tr>
                  ) : (
                    paginatedDoItems.map((row) => {
                      const isExpanded = expandedDoId === row.nomor;
                      const statusKey = row.status || row.status_label || "draft";
                      const badge = DO_STATUS_BADGE[statusKey] || STATUS_BADGE[statusKey] || { label: statusKey, cls: "badge-status badge-muted" };
                      return (
                        <React.Fragment key={row.nomor}>
                          <tr style={{ background: isExpanded ? "rgba(56, 189, 248, 0.08)" : undefined }}>
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
                            <td>{formatDisplayDate(row.tanggal)}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{row.nama_customer || "—"}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.id_customer || row.customer_id || "—"}</div>
                            </td>
                            <td style={{ color: "var(--text-secondary)" }}>{row.destination || row.kota_tujuan || "—"}</td>
                            <td>
                              <div style={{ color: "var(--text-secondary)" }}>{row.driver || "—"}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{row.lic_plate || row.plat_nomor || "—"}</div>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              {row.tgl_keluar ? formatDisplayDate(row.tgl_keluar) : (row.waktu_kirim ? new Date(row.waktu_kirim).toLocaleString("id") : "—")}
                            </td>
                            <td>
                              <span className={badge.cls}>{badge.label}</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${row.nomor}-modal-subrow`}>
                              <td colSpan={7} style={{ padding: "0.85rem 1rem 1.4rem", background: "var(--bg-surface)", borderBottom: "2px solid #38bdf8" }}>
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
            {renderPagination(safeDoPage, totalDoPages, items.length, setDoPage)}
          </div>
        </>
      )}

      {mainTab === "IO" && (
        <>
          {/* Action Bar: Calendar Date Filter & Download Excel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.35rem" }}>📑</span>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Data Internal Order (IO)
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const curr = getCurrentMonthDates();
                  setCalendarDateFrom(curr.from);
                  setCalendarDateTo(curr.to);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--color-success)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Tampilkan data Bulan Berjalan"
              >
                📅 Bulan Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalendarDateFrom("");
                  setCalendarDateTo(new Date().toISOString().slice(0, 10));
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                title="Tampilkan semua data tanpa batasan tanggal"
              >
                Semua Periode
              </button>

              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500, marginLeft: "0.2rem" }}>
                Rentang Tanggal:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📅</span>
                <input
                  type="date"
                  value={calendarDateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateFrom(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Mulai"
                />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>s/d</span>
                <input
                  type="date"
                  value={calendarDateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateTo(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Akhir"
                />
              </div>

              <button
                onClick={() => handleDownloadExcel("IO")}
                disabled={isDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: isDownloading ? "#065f46" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.48rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                }}
                title={`Download Internal Order format Excel (.xlsx) untuk rentang tanggal ${calendarDateFrom} s/d ${calendarDateTo}`}
              >
                {isDownloading ? (
                  <>
                    <span>⏳</span>
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem" }}>📥</span>
                    <span>Download Excel (IO.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>


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

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "35px", textAlign: "center" }}>No</th>
                  <th>Nomor IO</th>
                  <th>Tanggal</th>
                  <th>Kantor</th>
                  <th>Gudang Asal</th>
                  <th>Gudang Tujuan</th>
                  <th>Dibuat oleh</th>
                  <th>Send</th>
                  <th>Check By DSM</th>
                  <th>Dicek ST</th>
                  <th>Dicek WHM</th>
                  <th>Approve</th>
                  <th>No. IP</th>
                  <th>Status</th>
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
                      Tidak ada data Internal Order{ioStatusFilter !== "all" ? ` dengan status ${ioStatusFilter}` : ""}.
                    </td>
                  </tr>
                ) : (
                  filteredIoItems.map((row: InternalOrderRecord, idx: number) => {
                    const code = (row.status_code || row.status || "").trim();
                    const badge = IO_STATUS_BADGE[code] || IO_STATUS_BADGE[row.status] || { label: row.status || code || "—", cls: "badge-status badge-muted", desc: code };

                    const isExpanded = expandedIoId === row.nomor_io;

                    return (
                      <React.Fragment key={`${row.nomor_io}-${row.kode_barang || ''}-${idx}`}>
                        <tr style={{ background: isExpanded ? "rgba(16, 185, 129, 0.08)" : undefined }}>
                          <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>{idx + 1}</td>
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
          
          {/* Status Footer: Menampilkan seluruh data tanpa batasan per halaman */}
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
              Menampilkan seluruh <span style={{ color: "#10B981", fontWeight: 700 }}>{filteredIoItems.length}</span> data Internal Order
              {calendarDateFrom && calendarDateTo ? (
                <> (Periode: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatDisplayDate(calendarDateFrom)}</span> s/d <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatDisplayDate(calendarDateTo)}</span>)</>
              ) : " (Semua Periode)"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#10B981", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>✓</span> Data Bulan Berjalan / Periode Aktif
            </div>
          </div>
        </div>
        </>
      )}

      {mainTab === "IT" && (
        <>
          {/* Action Bar: Calendar Date Filter & Download Excel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
              padding: "0.85rem 1.15rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.35rem" }}>🔄</span>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Data Internal Transfer (IT)
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const curr = getCurrentMonthDates();
                  setCalendarDateFrom(curr.from);
                  setCalendarDateTo(curr.to);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Tampilkan data Bulan Berjalan"
              >
                📅 Bulan Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalendarDateFrom("");
                  setCalendarDateTo(new Date().toISOString().slice(0, 10));
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                title="Tampilkan semua data tanpa batasan tanggal"
              >
                Semua Periode
              </button>

              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500, marginLeft: "0.2rem" }}>
                Rentang Tanggal:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📅</span>
                <input
                  type="date"
                  value={calendarDateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateFrom(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Mulai"
                />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>s/d</span>
                <input
                  type="date"
                  value={calendarDateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarDateTo(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title="Tanggal Akhir"
                />
              </div>

              <button
                onClick={() => handleDownloadExcel("IT")}
                disabled={isDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: isDownloading ? "#065f46" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.48rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                }}
                title={`Download Internal Transfer format Excel (.xlsx) untuk rentang tanggal ${calendarDateFrom} s/d ${calendarDateTo}`}
              >
                {isDownloading ? (
                  <>
                    <span>⏳</span>
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem" }}>📥</span>
                    <span>Download Excel (IT.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>


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

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>IT No</th>
                  <th>Date</th>
                  <th>Create Date</th>
                  <th>Delivery Date</th>
                  <th>Receive Date</th>
                  <th>Gudang Asal</th>
                  <th>Gudang Tujuan</th>
                  <th>Nomor IO</th>
                  <th>Tgl. IO Approve</th>
                  <th>Receive Note</th>
                  <th>Status</th>
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
                      Tidak ada data Internal Transfer{itStatusFilter !== "all" ? ` dengan status ${itStatusFilter}` : ""}.
                    </td>
                  </tr>
                ) : (
                  filteredItItems.map((row: InternalTransferRecord) => {
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
          
          {/* Status Footer: Menampilkan seluruh data tanpa batasan per halaman */}
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
              Menampilkan seluruh <span style={{ color: "#38bdf8", fontWeight: 700 }}>{filteredItItems.length}</span> data Internal Transfer
              {calendarDateFrom && calendarDateTo ? (
                <> (Periode: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatDisplayDate(calendarDateFrom)}</span> s/d <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatDisplayDate(calendarDateTo)}</span>)</>
              ) : " (Semua Periode)"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>✓</span> Data Bulan Berjalan / Periode Aktif
            </div>
          </div>
        </div>
        </>
      )}


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
