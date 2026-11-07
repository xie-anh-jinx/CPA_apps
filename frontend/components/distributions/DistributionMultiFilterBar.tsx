"use client";
import React, { useState } from "react";
import { Search, X, Filter, RotateCcw, Calendar, Building2, Truck, Users, CheckCircle2, ChevronDown } from "lucide-react";
import MultiSelectFilter, { MultiSelectOption } from "@/components/inventory/MultiSelectFilter";

export interface DistributionMultiFilterProps {
  mainTab: "DO" | "IO" | "IT";
  // Search
  searchTerm: string;
  onSearchChange: (val: string) => void;
  // Dates
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
  // Warehouses
  warehouses: { id_gudang: string; nama_gudang: string }[];
  selectedOriginWarehouses: string[];
  onOriginWarehouseChange: (whs: string[]) => void;
  selectedDestinationWarehouses: string[];
  onDestinationWarehouseChange: (whs: string[]) => void;
  // DO Statuses
  selectedDoStatuses: string[];
  onDoStatusChange: (statuses: string[]) => void;
  // IO Statuses
  selectedIoStatuses: string[];
  onIoStatusChange: (statuses: string[]) => void;
  // IT Statuses
  selectedItStatuses: string[];
  onItStatusChange: (statuses: string[]) => void;
  // DO Customer
  availableCustomers?: string[];
  selectedCustomers?: string[];
  onCustomerChange?: (customers: string[]) => void;
  // DO Dates
  availableDoDates?: { label: string; value: string; count?: number }[];
  selectedDoDates?: string[];
  onDoDateChange?: (dates: string[]) => void;
  // DO Driver / Transporter
  availableDrivers?: string[];
  selectedDrivers?: string[];
  onDriverChange?: (drivers: string[]) => void;
  // Results summary
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onResetAll: () => void;
  // Excel Export
  onDownloadExcel?: () => void;
  isDownloading?: boolean;
  downloadLabel?: string;
}

export default function DistributionMultiFilterBar({
  mainTab,
  searchTerm,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
  warehouses,
  selectedOriginWarehouses,
  onOriginWarehouseChange,
  selectedDestinationWarehouses,
  onDestinationWarehouseChange,
  selectedDoStatuses,
  onDoStatusChange,
  selectedIoStatuses,
  onIoStatusChange,
  selectedItStatuses,
  onItStatusChange,
  availableCustomers = [],
  selectedCustomers = [],
  onCustomerChange,
  availableDoDates = [],
  selectedDoDates = [],
  onDoDateChange,
  availableDrivers = [],
  selectedDrivers = [],
  onDriverChange,
  filteredCount,
  totalCount,
  hasActiveFilters,
  onResetAll,
  onDownloadExcel,
  isDownloading = false,
  downloadLabel,
}: DistributionMultiFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper date presets
  const handlePresetDate = (type: "this_month" | "7_days" | "30_days" | "all") => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    if (type === "this_month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      onDateChange(from, to);
    } else if (type === "7_days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      onDateChange(past.toISOString().slice(0, 10), to);
    } else if (type === "30_days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      onDateChange(past.toISOString().slice(0, 10), to);
    } else if (type === "all") {
      onDateChange("", to);
    }
  };

  // Status Options based on Main Tab
  const doStatusOptions: MultiSelectOption[] = [
    { label: "Send / In-Transit", value: "send", badge: "S", color: "#38bdf8", subLabel: "Dalam Pengiriman" },
    { label: "Received / Diterima", value: "received", badge: "R", color: "#10b981", subLabel: "Barang Sampai" },
    { label: "Return / FRDO", value: "return", badge: "R-FRDO", color: "#f59e0b", subLabel: "Surat Jalan Kembali" },
    { label: "Invoice / Faktur", value: "invoice", badge: "I", color: "#8b5cf6", subLabel: "Faktur Terbit" },
    { label: "Draft", value: "draft", badge: "D", color: "#94a3b8", subLabel: "Belum Dikirim" },
    { label: "Cancel", value: "cancel", badge: "C", color: "#ef4444", subLabel: "Dibatalkan" },
  ];

  const ioStatusOptions: MultiSelectOption[] = [
    { label: "Draft", value: "draft", badge: "D", color: "#94a3b8", subLabel: "Draft Awal" },
    { label: "Checked DSM", value: "dsm", badge: "S", color: "#38bdf8", subLabel: "Pemeriksaan DSM" },
    { label: "Approved", value: "approve", badge: "A", color: "#10b981", subLabel: "Disetujui" },
    { label: "Process IT", value: "it_process", badge: "P", color: "#f59e0b", subLabel: "Dalam Proses IT" },
    { label: "Partial Complete", value: "partial", badge: "Z", color: "#06b6d4", subLabel: "Sebagian Selesai" },
    { label: "IT Complete", value: "it_complete", badge: "C", color: "#8b5cf6", subLabel: "Selesai Penuh" },
    { label: "Cancelled / Reject", value: "cancel", badge: "X", color: "#ef4444", subLabel: "Batal / Tolak" },
  ];

  const itStatusOptions: MultiSelectOption[] = [
    { label: "Draft", value: "draft", badge: "D", color: "#94a3b8", subLabel: "Draft IT" },
    { label: "Send / Kirim", value: "send", badge: "S", color: "#38bdf8", subLabel: "Dalam Pengiriman" },
    { label: "Receipt / Selesai", value: "receipt", badge: "R/C", color: "#10b981", subLabel: "Barang Diterima" },
    { label: "Cancel", value: "cancel", badge: "X", color: "#ef4444", subLabel: "Dibatalkan" },
  ];

  // Warehouse options
  const warehouseOptions: MultiSelectOption[] = warehouses.map((w) => ({
    label: w.nama_gudang || w.id_gudang,
    value: w.id_gudang,
    subLabel: w.id_gudang,
  }));

  // Customer options (for DO)
  const customerOptions: MultiSelectOption[] = availableCustomers.slice(0, 100).map((c) => ({
    label: c,
    value: c,
  }));

  // Date options (for DO)
  const doDateOptions: MultiSelectOption[] = availableDoDates.map((d) => ({
    label: d.label,
    value: d.value,
    count: d.count,
  }));

  // Driver options (for DO)
  const driverOptions: MultiSelectOption[] = availableDrivers.slice(0, 100).map((d) => ({
    label: d,
    value: d,
  }));

  const searchPlaceholder =
    mainTab === "DO"
      ? "Cari No. DO, Customer, Sopir, Plat, PO, Invoice, Gudang..."
      : mainTab === "IO"
      ? "Cari No. IO, Pemohon/Dibuat Oleh, Gudang Asal, Gudang Tujuan, Kantor..."
      : "Cari No. IT, No. Ref IO, Gudang Asal, Gudang Tujuan, Keterangan...";

  return (
    <div
      style={{
        background: "var(--bg-surface, #1e1e1e)",
        border: "1px solid var(--bg-border, #333333)",
        borderRadius: "10px",
        padding: "1rem 1.15rem",
        marginBottom: "1.25rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {/* Row 1: Search Input & Quick Status Selection */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.85rem",
          alignItems: "center",
        }}
      >
        {/* Search Input Box */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted, #94a3b8)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: "100%",
              padding: "0.55rem 2.2rem 0.55rem 2.3rem",
              fontSize: "0.82rem",
              background: "var(--bg-card, #121212)",
              color: "var(--text-primary, #ffffff)",
              border: searchTerm.trim() ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444444)",
              borderRadius: "6px",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Multi-Select Filter */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {mainTab === "DO" && (
            <div style={{ flex: 1, minWidth: "160px" }}>
              <MultiSelectFilter
                title="Pilihan Status DO"
                placeholder="Semua Status DO"
                options={doStatusOptions}
                selectedValues={selectedDoStatuses}
                onChange={onDoStatusChange}
                icon={<CheckCircle2 size={14} />}
              />
            </div>
          )}

          {mainTab === "IO" && (
            <div style={{ flex: 1, minWidth: "160px" }}>
              <MultiSelectFilter
                title="Pilihan Status IO"
                placeholder="Semua Status IO"
                options={ioStatusOptions}
                selectedValues={selectedIoStatuses}
                onChange={onIoStatusChange}
                icon={<CheckCircle2 size={14} />}
              />
            </div>
          )}

          {mainTab === "IT" && (
            <div style={{ flex: 1, minWidth: "160px" }}>
              <MultiSelectFilter
                title="Pilihan Status IT"
                placeholder="Semua Status IT"
                options={itStatusOptions}
                selectedValues={selectedItStatuses}
                onChange={onItStatusChange}
                icon={<CheckCircle2 size={14} />}
              />
            </div>
          )}

          {/* Warehouse Asal / Origin Filter */}
          <div style={{ flex: 1, minWidth: "160px" }}>
            <MultiSelectFilter
              title={mainTab === "DO" ? "Pilihan Gudang Asal" : "Gudang Asal"}
              placeholder="Semua Gudang Asal"
              options={warehouseOptions}
              selectedValues={selectedOriginWarehouses}
              onChange={onOriginWarehouseChange}
              icon={<Building2 size={14} />}
            />
          </div>

          {/* Toggle More Filters Button */}
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: showAdvanced ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444)",
              background: showAdvanced ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card, #1e1e1e)",
              color: showAdvanced ? "#38bdf8" : "var(--text-secondary, #b6b6b6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Filter size={13} />
            <span>Filter Lainnya</span>
            <ChevronDown
              size={13}
              style={{
                transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          </button>
        </div>
      </div>

      {/* Row 2: Advanced Filters (Gudang Tujuan for IO/IT, Customer/Driver for DO, Date Presets) */}
      {showAdvanced && (
        <div
          style={{
            marginTop: "0.85rem",
            paddingTop: "0.85rem",
            borderTop: "1px dashed var(--bg-border, #333333)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.85rem",
            alignItems: "center",
          }}
        >
          {/* Destination Warehouse for IO / IT */}
          {(mainTab === "IO" || mainTab === "IT") && (
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Gudang Tujuan:
              </label>
              <MultiSelectFilter
                title="Gudang Tujuan"
                placeholder="Semua Gudang Tujuan"
                options={warehouseOptions}
                selectedValues={selectedDestinationWarehouses}
                onChange={onDestinationWarehouseChange}
                icon={<Building2 size={14} />}
              />
            </div>
          )}

          {/* Customer Filter for DO */}
          {mainTab === "DO" && onCustomerChange && customerOptions.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Pilihan Customer / Penerima:
              </label>
              <MultiSelectFilter
                title="Customer / Penerima"
                placeholder="Semua Customer"
                options={customerOptions}
                selectedValues={selectedCustomers}
                onChange={onCustomerChange}
                icon={<Users size={14} />}
              />
            </div>
          )}

          {/* DO Date Multi-Select for DO */}
          {mainTab === "DO" && onDoDateChange && doDateOptions.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Pilihan Tanggal DO:
              </label>
              <MultiSelectFilter
                title="Tanggal DO"
                placeholder="Semua Tanggal DO"
                options={doDateOptions}
                selectedValues={selectedDoDates}
                onChange={onDoDateChange}
                icon={<Calendar size={14} />}
              />
            </div>
          )}

          {/* Driver / Kendaraan Filter for DO */}
          {mainTab === "DO" && onDriverChange && driverOptions.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                Sopir / Kendaraan Armada:
              </label>
              <MultiSelectFilter
                title="Sopir / Armada"
                placeholder="Semua Sopir"
                options={driverOptions}
                selectedValues={selectedDrivers}
                onChange={onDriverChange}
                icon={<Truck size={14} />}
              />
            </div>
          )}

          {/* Custom Date Range Inputs */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
              Rentang Tanggal Transaksi:
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateChange(e.target.value, dateTo)}
                style={{
                  width: "100%",
                  fontSize: "0.78rem",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "var(--bg-card, #121212)",
                  color: "var(--text-primary, #fff)",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateChange(dateFrom, e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "0.78rem",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "var(--bg-card, #121212)",
                  color: "var(--text-primary, #fff)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Date Presets Quick Buttons */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
              Pintasan Periode:
            </label>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handlePresetDate("this_month")}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  borderRadius: "4px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--color-success, #10b981)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                📅 Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate("7_days")}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  borderRadius: "4px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "var(--bg-card, #121212)",
                  color: "var(--text-secondary, #b6b6b6)",
                  cursor: "pointer",
                }}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate("30_days")}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  borderRadius: "4px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "var(--bg-card, #121212)",
                  color: "var(--text-secondary, #b6b6b6)",
                  cursor: "pointer",
                }}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate("all")}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  borderRadius: "4px",
                  border: "1px solid var(--bg-border, #444)",
                  background: "var(--bg-card, #121212)",
                  color: "var(--text-secondary, #b6b6b6)",
                  cursor: "pointer",
                }}
              >
                Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Active Filters Chips & Results Count Bar */}
      <div
        style={{
          marginTop: "0.75rem",
          paddingTop: "0.6rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.6rem",
          borderTop: "1px solid var(--bg-border, rgba(255,255,255,0.06))",
        }}
      >
        {/* Active Filter Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted, #94a3b8)", fontWeight: 500 }}>
            Hasil: <strong style={{ color: "#38bdf8" }}>{filteredCount.toLocaleString()}</strong> dari {totalCount.toLocaleString()} transaksi
          </span>

          {searchTerm.trim() && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              Kata kunci: &ldquo;{searchTerm}&rdquo;
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onSearchChange("")} />
            </span>
          )}

          {mainTab === "DO" && selectedDoStatuses.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(139, 92, 246, 0.15)",
                color: "#a78bfa",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              Status DO: {selectedDoStatuses.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onDoStatusChange([])} />
            </span>
          )}

          {mainTab === "IO" && selectedIoStatuses.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              Status IO: {selectedIoStatuses.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onIoStatusChange([])} />
            </span>
          )}

          {mainTab === "IT" && selectedItStatuses.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              Status IT: {selectedItStatuses.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onItStatusChange([])} />
            </span>
          )}

          {selectedOriginWarehouses.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(6, 182, 212, 0.15)",
                color: "#22d3ee",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              Gudang Asal: {selectedOriginWarehouses.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onOriginWarehouseChange([])} />
            </span>
          )}

          {selectedDestinationWarehouses.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(236, 72, 153, 0.15)",
                color: "#f472b6",
                border: "1px solid rgba(236, 72, 153, 0.3)",
              }}
            >
              Gudang Tujuan: {selectedDestinationWarehouses.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onDestinationWarehouseChange([])} />
            </span>
          )}

          {selectedCustomers.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              Customer: {selectedCustomers.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onCustomerChange && onCustomerChange([])} />
            </span>
          )}

          {selectedDrivers.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(234, 179, 8, 0.15)",
                color: "#facc15",
                border: "1px solid rgba(234, 179, 8, 0.3)",
              }}
            >
              Sopir: {selectedDrivers.length} dipilih
              <X size={11} style={{ cursor: "pointer" }} onClick={() => onDriverChange && onDriverChange([])} />
            </span>
          )}
        </div>

        {/* Actions: Export Excel & Reset Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onDownloadExcel && (
            <button
              type="button"
              onClick={onDownloadExcel}
              disabled={isDownloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                fontSize: "0.74rem",
                borderRadius: "5px",
                border: "none",
                background: isDownloading ? "#065f46" : "#059669",
                color: "#ffffff",
                cursor: isDownloading ? "not-allowed" : "pointer",
                fontWeight: 600,
                boxShadow: "0 2px 5px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
              title={`Download ${downloadLabel || "Excel (.xlsx)"}`}
            >
              {isDownloading ? (
                <>
                  <span>⏳</span>
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download Excel</span>
                </>
              )}
            </button>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                fontSize: "0.74rem",
                borderRadius: "5px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title="Reset semua filter ke default"
            >
              <RotateCcw size={12} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

