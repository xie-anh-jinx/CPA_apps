"use client";
import React from "react";
import { Brain, Trophy, ShieldCheck, CheckCircle2, AlertCircle, HelpCircle, Info } from "lucide-react";

interface ModelMetric {
  model_name: string;
  horizon_days: number;
  mae: number | null;
  rmse: number | null;
  wape: number | null;
  bias: number | null;
  n_samples: number;
  evaluated_at: string;
}

interface ForecastModelComparisonProps {
  productId: string;
  productName: string;
  bestModelName: string;
  models: ModelMetric[];
  forecast30d?: number;
  loading?: boolean;
}

const MODEL_LABELS: Record<string, { name: string; type: string; desc: string }> = {
  seasonal_naive: {
    name: "Seasonal Naive (7d)",
    type: "Benchmark Musiman",
    desc: "Memprediksi hari yang sama pada siklus minggu sebelumnya. Efektif untuk pola permintaan berulang mingguan."
  },
  moving_avg_7d: {
    name: "Moving Average 7 Hari",
    type: "Rolling Baseline",
    desc: "Rata-rata bergerak 7 hari terakhir. Cepat merespons fluktuasi jangka sangat pendek."
  },
  moving_avg_30d: {
    name: "Moving Average 30 Hari",
    type: "Rolling Baseline",
    desc: "Rata-rata bergerak 30 hari. Menghaluskan fluktuasi harian dan cocok untuk tren stabil."
  },
  naive: {
    name: "Naive (Last Value)",
    type: "Baseline Statis",
    desc: "Menggunakan angka penjualan terakhir sebagai proyeksi flat."
  },
  lightgbm: {
    name: "LightGBM Regression",
    type: "Machine Learning (GBDT)",
    desc: "Model machine learning dengan 15+ feature lag, rolling statistics, dan calendar encodings."
  },
  prophet: {
    name: "Facebook Prophet",
    type: "Additive Time-Series",
    desc: "Model time-series dekomposisi tren, musiman mingguan/bulanan, dan efek hari libur."
  }
};

export default function ForecastModelComparison({
  productId,
  productName,
  bestModelName,
  models,
  forecast30d,
  loading
}: ForecastModelComparisonProps) {
  // Sort models by WAPE ascending
  const sorted = [...models].sort((a, b) => (a.wape ?? 999) - (b.wape ?? 999));

  // Business recommendation calculations
  const est30 = forecast30d ?? 0;
  const dailyRunRate = est30 > 0 ? Math.round(est30 / 30) : 0;
  const recommendedBuffer = Math.round(est30 * 0.2); // 20% safety stock
  const leadTimeDays = 7; // Standard supplier delivery lead time assumption
  const reorderPoint = (dailyRunRate * leadTimeDays) + recommendedBuffer;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginTop: "1rem" }}>
      {/* Table: Model Competition & Walk-Forward Metrics */}
      <div className="card" style={{
        padding: "1.5rem",
        borderRadius: "14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        gridColumn: "span 2"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trophy size={18} color="#FFB323" />
              Hasil Kompetisi Model (Walk-Forward Cross Validation)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
              Sistem mengevaluasi beberapa kandidat algoritma dan secara otomatis memilih model dengan nilai WAPE (Weighted Absolute Percentage Error) terendah.
            </p>
          </div>
          <span style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
            Horizon Evaluasi: 30 Hari
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "8px 12px" }}>Algoritma Model</th>
                <th style={{ padding: "8px 12px" }}>Tipe Model</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>WAPE Error</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>MAE</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>RMSE</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Bias</th>
                <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Memuat metrik evaluasi model...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Belum ada data evaluasi model untuk produk ini.
                  </td>
                </tr>
              ) : (
                sorted.map((m, idx) => {
                  const isWinner = m.model_name === bestModelName;
                  const meta = MODEL_LABELS[m.model_name] || { name: m.model_name, type: "Algorithm", desc: "" };

                  return (
                    <tr
                      key={`${m.model_name}-${idx}`}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: isWinner ? "rgba(58, 201, 119, 0.08)" : "transparent",
                        fontWeight: isWinner ? 600 : 400
                      }}
                    >
                      <td style={{ padding: "10px 12px", color: isWinner ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isWinner && <CheckCircle2 size={15} color="#3AC977" />}
                          <span>{meta.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {meta.type}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: isWinner ? "#3AC977" : "#FFB323", fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {m.wape !== null ? `${m.wape}%` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#D1D5DB", fontFamily: "monospace" }}>
                        {m.mae !== null ? m.mae.toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#D1D5DB", fontFamily: "monospace" }}>
                        {m.rmse !== null ? m.rmse.toFixed(1) : "—"}
                      </td>
                      <td style={{
                        padding: "10px 12px", textAlign: "right", fontFamily: "monospace",
                        color: (m.bias ?? 0) > 5 ? "#FF5E5E" : (m.bias ?? 0) < -5 ? "#FFB323" : "#3AC977"
                      }}>
                        {m.bias !== null ? `${m.bias > 0 ? "+" : ""}${m.bias.toFixed(1)}%` : "0.0%"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {isWinner ? (
                          <span style={{
                            fontSize: "0.7rem",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "rgba(58,201,119,0.2)",
                            color: "#3AC977",
                            border: "1px solid rgba(58,201,119,0.4)",
                            fontWeight: 700
                          }}>
                            BEST MODEL
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Evaluated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card: Automated Inventory Reorder Advice */}
      <div className="card" style={{
        padding: "1.5rem",
        borderRadius: "14px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            background: "rgba(58,201,119,0.15)", color: "#3AC977",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Rekomendasi Reorder & Safety Stock
            </h4>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Otomasi berbasis run-rate forecast 30 hari
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.82rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <span style={{ color: "var(--text-muted)" }}>Laju Penjualan (Run-Rate):</span>
            <strong style={{ color: "var(--text-primary)" }}>~{dailyRunRate} unit / hari</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <span style={{ color: "var(--text-muted)" }}>Asumsi Lead Time Pengadaan:</span>
            <strong style={{ color: "var(--text-primary)" }}>{leadTimeDays} hari kalender</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <span style={{ color: "var(--text-muted)" }}>Safety Stock Disarankan (+20%):</span>
            <strong style={{ color: "#3AC977" }}>~{recommendedBuffer} unit</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderRadius: "8px", background: "rgba(13,153,255,0.12)", border: "1px solid rgba(13,153,255,0.3)" }}>
            <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>Titik Reorder Minimal (ROP):</span>
            <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>~{reorderPoint} unit</strong>
          </div>
        </div>

        <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "8px", background: "var(--bg-surface)", border: "1px dashed var(--bg-border)", fontSize: "0.74rem", color: "var(--text-muted)" }}>
          <Info size={13} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
          Ketika total stok gudang berada di bawah <strong>{reorderPoint} unit</strong>, tim procurement disarankan segera menerbitkan Purchase Order agar tidak terjadi kehabisan stok (stockout).
        </div>
      </div>
    </div>
  );
}
