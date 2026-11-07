"use client";
import React, { useState } from "react";
import { CheckSquare, Download, Copy, X, Check, FileSpreadsheet } from "lucide-react";

export interface DistributionBatchActionsProps {
  selectedCount: number;
  totalVolume?: number;
  docTypeLabel: string;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onCopyNumbers: () => void;
}

export default function DistributionBatchActions({
  selectedCount,
  totalVolume,
  docTypeLabel,
  onClearSelection,
  onExportSelected,
  onCopyNumbers,
}: DistributionBatchActionsProps) {
  const [copied, setCopied] = useState(false);

  if (selectedCount === 0) return null;

  const handleCopy = () => {
    onCopyNumbers();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "sticky",
        bottom: "1.5rem",
        zIndex: 50,
        margin: "0 auto",
        maxWidth: "800px",
        background: "rgba(18, 24, 38, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid #38bdf8",
        borderRadius: "10px",
        padding: "0.75rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.85rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.25)",
        animation: "fadeInUp 0.2s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(56, 189, 248, 0.15)",
            padding: "4px 10px",
            borderRadius: "6px",
            color: "#38bdf8",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          <CheckSquare size={16} />
          <span>{selectedCount} {docTypeLabel} Terpilih</span>
        </div>

        {totalVolume !== undefined && totalVolume > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #cbd5e1)" }}>
            Total Muatan: <strong style={{ color: "#10b981" }}>{totalVolume.toLocaleString("id-ID")} Liter</strong>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 11px",
            fontSize: "0.78rem",
            fontWeight: 600,
            borderRadius: "6px",
            border: "1px solid var(--bg-border, #444)",
            background: "var(--bg-card, #1e1e1e)",
            color: copied ? "#10b981" : "var(--text-primary, #ffffff)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Salin semua nomor transaksi terpilih ke clipboard"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Tersalin!" : "Salin Nomor"}</span>
        </button>

        <button
          type="button"
          onClick={onExportSelected}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 12px",
            fontSize: "0.78rem",
            fontWeight: 600,
            borderRadius: "6px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            background: "rgba(16, 185, 129, 0.2)",
            color: "#10b981",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Download data transaksi yang dipilih dalam format Excel / CSV"
        >
          <FileSpreadsheet size={14} />
          <span>Ekspor {selectedCount} Terpilih</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "5px 8px",
            fontSize: "0.78rem",
            borderRadius: "6px",
            border: "none",
            background: "rgba(239, 68, 68, 0.12)",
            color: "#ef4444",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          title="Batal pilih transaksi"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

