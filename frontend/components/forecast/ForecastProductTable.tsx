"use client";
import React, { useState, useMemo } from "react";
import { Search, Sparkles, Filter, ChevronRight, ArrowUpDown, Brain, CheckCircle2 } from "lucide-react";

export interface ForecastProductItem {
  product_id: string;
  product_name: string;
  best_model: string;
  wape: number | null;
  active_days: number;
  bias: number | null;
  mae: number | null;
  forecast_7d: number | null;
  forecast_30d: number | null;
  forecast_90d: number | null;
  last_forecast: string | null;
}

interface ForecastProductTableProps {
  products: ForecastProductItem[];
  selectedProductId: string;
  onSelectProduct: (product: ForecastProductItem) => void;
  loading?: boolean;
}

export default function ForecastProductTable({
  products,
  selectedProductId,
  onSelectProduct,
  loading
}: ForecastProductTableProps) {
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"active_days" | "wape" | "forecast_30d">("forecast_30d");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtering and sorting
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.product_id.toLowerCase().includes(q) ||
          p.product_name.toLowerCase().includes(q)
      );
    }

    // Model filter
    if (modelFilter !== "all") {
      if (modelFilter === "high_accuracy") {
        list = list.filter((p) => p.wape !== null && p.wape < 70);
      } else {
        list = list.filter((p) => p.best_model === modelFilter);
      }
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortBy] ?? (sortBy === "wape" ? 999 : 0);
      let valB = b[sortBy] ?? (sortBy === "wape" ? 999 : 0);
      return sortOrder === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return list;
  }, [products, search, modelFilter, sortBy, sortOrder]);

  const toggleSort = (col: "active_days" | "wape" | "forecast_30d") => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder(col === "wape" ? "asc" : "desc");
    }
  };

  const getModelBadge = (model: string) => {
    if (model.includes("lightgbm")) {
      return { label: "LightGBM", bg: "rgba(168,85,247,0.15)", text: "#A855F7", border: "#A855F7" };
    }
    if (model.includes("seasonal")) {
      return { label: "Seasonal Naive (7d)", bg: "rgba(13,153,255,0.15)", text: "#0D99FF", border: "#0D99FF" };
    }
    if (model.includes("moving_avg_7d")) {
      return { label: "Moving Avg (7d)", bg: "rgba(58,201,119,0.15)", text: "#3AC977", border: "#3AC977" };
    }
    if (model.includes("moving_avg_30d")) {
      return { label: "Moving Avg (30d)", bg: "rgba(255,179,35,0.15)", text: "#FFB323", border: "#FFB323" };
    }
    return { label: "Naive", bg: "rgba(148,163,184,0.15)", text: "#94A3B8", border: "#94A3B8" };
  };

  return (
    <div className="card" style={{
      padding: "1.5rem",
      borderRadius: "14px",
      background: "var(--bg-surface)",
      border: "1px solid var(--bg-border)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
    }}>
      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={19} color="var(--color-primary)" />
            Daftar Top 30 SKU Produk & Proyeksi Kebutuhan
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
            Pilih baris produk untuk menganalisis proyeksi permintaan 7, 30, dan 90 hari ke depan.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari SKU atau nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              borderRadius: "8px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          { id: "all", label: `Semua Produk (${products.length})` },
          { id: "high_accuracy", label: "Akurasi Tinggi (WAPE < 70%)" },
          { id: "seasonal_naive", label: "Seasonal Naive" },
          { id: "moving_avg_7d", label: "Moving Avg (7d)" },
          { id: "moving_avg_30d", label: "Moving Avg (30d)" },
          { id: "naive", label: "Naive Benchmark" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setModelFilter(tab.id)}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
              border: modelFilter === tab.id ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.08)",
              background: modelFilter === tab.id ? "rgba(13,153,255,0.15)" : "rgba(255,255,255,0.02)",
              color: modelFilter === tab.id ? "var(--color-primary-light)" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px" }}>SKU / Produk</th>
              <th style={{ padding: "10px 12px" }}>Model Terbaik</th>
              <th
                onClick={() => toggleSort("wape")}
                style={{ padding: "10px 12px", textAlign: "right", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  <span>WAPE Error</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Bias</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>7 Hari</th>
              <th
                onClick={() => toggleSort("forecast_30d")}
                style={{ padding: "10px 12px", textAlign: "right", cursor: "pointer", userSelect: "none", color: "#3AC977" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  <span>30 Hari (Utama)</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>90 Hari</th>
              <th style={{ padding: "10px 12px", textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Memuat data forecast 30 produk...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Tidak ada produk yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.product_id === selectedProductId;
                const badge = getModelBadge(p.best_model);

                return (
                  <tr
                    key={p.product_id}
                    onClick={() => onSelectProduct(p)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isSelected ? "rgba(13,153,255,0.12)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* SKU & Product Name */}
                    <td style={{ padding: "10px 12px", maxWidth: "260px" }}>
                      <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: isSelected ? "var(--color-primary-light)" : "var(--text-muted)" }}>
                        {p.product_id}
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.product_name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {p.active_days} hari transaksi
                      </div>
                    </td>

                    {/* Best Model Badge */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}35`,
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* WAPE */}
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <span style={{
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: (p.wape ?? 999) < 70 ? "#3AC977" : (p.wape ?? 999) < 95 ? "#FFB323" : "#FF5E5E"
                      }}>
                        {p.wape !== null ? `${p.wape}%` : "—"}
                      </span>
                    </td>

                    {/* Bias */}
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <span style={{
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        color: (p.bias ?? 0) > 5 ? "#FF5E5E" : (p.bias ?? 0) < -5 ? "#FFB323" : "#3AC977"
                      }}>
                        {p.bias !== null ? `${p.bias > 0 ? "+" : ""}${p.bias}%` : "0%"}
                      </span>
                    </td>

                    {/* 7 Days Forecast */}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      {p.forecast_7d !== null ? `${Math.round(p.forecast_7d).toLocaleString("id-ID")} u` : "—"}
                    </td>

                    {/* 30 Days Forecast */}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#3AC977" }}>
                      {p.forecast_30d !== null ? `${Math.round(p.forecast_30d).toLocaleString("id-ID")} u` : "—"}
                    </td>

                    {/* 90 Days Forecast */}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      {p.forecast_90d !== null ? `${Math.round(p.forecast_90d).toLocaleString("id-ID")} u` : "—"}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(p);
                        }}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: isSelected ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.1)",
                          background: isSelected ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                          color: "#FFF",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <span>{isSelected ? "Aktif" : "Pilih"}</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
