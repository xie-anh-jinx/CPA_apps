"use client";
import React from "react";
import { Brain, TrendingUp, Target, BarChart3, Activity, Layers } from "lucide-react";

interface ForecastKPIsProps {
  summary: {
    total_forecast_products: number;
    average_wape: number | null;
    total_30d_predicted_units: number;
    model_distribution: Array<{ model: string; count: number }>;
  } | null;
  loading?: boolean;
}

const MODEL_NAMES: Record<string, { label: string; color: string }> = {
  lightgbm: { label: "LightGBM ML", color: "#A855F7" },
  prophet: { label: "Prophet", color: "#EC4899" },
  seasonal_naive: { label: "Seasonal Naive (7d)", color: "#0D99FF" },
  moving_avg_7d: { label: "Moving Avg (7d)", color: "#3AC977" },
  moving_avg_30d: { label: "Moving Avg (30d)", color: "#FFB323" },
  naive: { label: "Naive Benchmark", color: "#94A3B8" },
};

export default function ForecastKPIs({ summary, loading }: ForecastKPIsProps) {
  const fmt = (n: number | null | undefined, prefix = "", suffix = "") => {
    if (n == null) return "—";
    return `${prefix}${Math.round(n).toLocaleString("id-ID")}${suffix}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
      {/* KPI 1: Total Forecast Products */}
      <div className="card" style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              Produk Terpantau
            </span>
            <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.35rem", color: "var(--text-primary)" }}>
              {loading ? "..." : summary?.total_forecast_products ?? 30}
              <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem" }}>SKU Top</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "#3AC977" }}>
              <Activity size={14} />
              <span>Agregat Nasional (MVP)</span>
            </div>
          </div>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: "rgba(13,153,255,0.12)", color: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* KPI 2: Total 30-Day Demand Forecast */}
      <div className="card" style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              Estimasi Demand 30 Hari
            </span>
            <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.35rem", color: "#3AC977" }}>
              {loading ? "..." : fmt(summary?.total_30d_predicted_units)}
              <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem" }}>Unit</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <TrendingUp size={14} color="#3AC977" />
              <span>Horizon 1 Bulan ke Depan</span>
            </div>
          </div>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: "rgba(58,201,119,0.12)", color: "#3AC977",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <BarChart3 size={22} />
          </div>
        </div>
      </div>

      {/* KPI 3: Accuracy Benchmark (WAPE) */}
      <div className="card" style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              Rata-rata WAPE Error
            </span>
            <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.35rem", color: "#FFB323" }}>
              {loading ? "..." : summary?.average_wape ? `${summary.average_wape}%` : "—"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <Target size={14} color="#FFB323" />
              <span>Walk-Forward Cross Validation</span>
            </div>
          </div>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: "rgba(255,179,35,0.12)", color: "#FFB323",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Target size={22} />
          </div>
        </div>
      </div>

      {/* KPI 4: Model Competition Winner */}
      <div className="card" style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "100%" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              Distribusi Best Model
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
              {summary?.model_distribution && summary.model_distribution.length > 0 ? (
                summary.model_distribution.map((item) => {
                  const mMeta = MODEL_NAMES[item.model] || { label: item.model, color: "#828690" };
                  return (
                    <span
                      key={item.model}
                      style={{
                        fontSize: "0.72rem",
                        padding: "3px 8px",
                        borderRadius: "20px",
                        background: `${mMeta.color}18`,
                        color: mMeta.color,
                        border: `1px solid ${mMeta.color}40`,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <span>{mMeta.label}</span>
                      <strong style={{ opacity: 0.9 }}>({item.count})</strong>
                    </span>
                  );
                })
              ) : (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Memuat model...</span>
              )}
            </div>
          </div>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: "rgba(168,85,247,0.12)", color: "#A855F7",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}>
            <Brain size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}
