"use client";
import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import {
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart2
} from "lucide-react";

interface ForecastDetailChartProps {
  product: {
    product_id: string;
    product_name: string;
    forecast_date: string;
    model_name: string;
    wape: number | null;
    bias: number | null;
    bias_label: string;
    forecasts: {
      [key: string]: {
        horizon_days: number;
        predicted_qty: number;
        lower_bound: number;
        upper_bound: number;
      };
    };
  } | null;
  history: Array<{
    date: string;
    quantity_sold: number;
    revenue: number;
    avg_price: number;
  }>;
  historyDays: number;
  onHistoryDaysChange: (days: number) => void;
  loading?: boolean;
}

export default function ForecastDetailChart({
  product,
  history,
  historyDays,
  onHistoryDaysChange,
  loading
}: ForecastDetailChartProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<7 | 30 | 90>(30);

  const f7 = product?.forecasts?.["7_days"];
  const f30 = product?.forecasts?.["30_days"];
  const f90 = product?.forecasts?.["90_days"];

  // Prepare combined timeline dataset for Recharts
  const chartData = useMemo(() => {
    if (!product) return [];

    const data: Array<{
      date: string;
      actual: number | null;
      predicted: number | null;
      lower: number | null;
      upper: number | null;
      isForecast: boolean;
    }> = [];

    // 1. Add historical actuals
    history.forEach((h) => {
      data.push({
        date: h.date,
        actual: Math.round(h.quantity_sold),
        predicted: null,
        lower: null,
        upper: null,
        isForecast: false,
      });
    });

    if (data.length === 0) return [];

    // Last historical point connects with forecast start
    const lastHist = data[data.length - 1];
    const lastDate = new Date(lastHist.date);

    // Pick active horizon forecast
    const activeForecast =
      selectedHorizon === 7 ? f7 : selectedHorizon === 30 ? f30 : f90;

    if (activeForecast && activeForecast.predicted_qty > 0) {
      // Connect line at last actual date
      lastHist.predicted = lastHist.actual;
      lastHist.lower = lastHist.actual;
      lastHist.upper = lastHist.actual;

      const horizonDays = activeForecast.horizon_days;
      const dailyRate = activeForecast.predicted_qty / horizonDays;
      const dailyLower = activeForecast.lower_bound / horizonDays;
      const dailyUpper = activeForecast.upper_bound / horizonDays;

      // Project daily points forward
      for (let day = 1; day <= horizonDays; day++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + day);
        const iso = nextDate.toISOString().split("T")[0];

        data.push({
          date: iso,
          actual: null,
          predicted: Math.round(dailyRate),
          lower: Math.max(0, Math.round(dailyLower)),
          upper: Math.round(dailyUpper),
          isForecast: true,
        });
      }
    }

    return data;
  }, [history, product, selectedHorizon, f7, f30, f90]);

  // Model tag styling
  const getModelBadge = (model: string) => {
    if (model.includes("lightgbm")) {
      return { label: "LightGBM ML", bg: "rgba(168,85,247,0.15)", text: "#A855F7", border: "#A855F7" };
    }
    if (model.includes("seasonal")) {
      return { label: "Seasonal Naive (7d)", bg: "rgba(13,153,255,0.15)", text: "#0D99FF", border: "#0D99FF" };
    }
    if (model.includes("moving_avg")) {
      return { label: model.replace("_", " "), bg: "rgba(58,201,119,0.15)", text: "#3AC977", border: "#3AC977" };
    }
    return { label: model, bg: "rgba(148,163,184,0.15)", text: "#94A3B8", border: "#94A3B8" };
  };

  const badge = getModelBadge(product?.model_name || "seasonal_naive");

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const p = payload[0]?.payload;
    const isProj = p?.isForecast;

    return (
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        boxShadow: "var(--shadow-md)",
        fontSize: "0.82rem",
        color: "var(--text-primary)",
        minWidth: "170px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.3rem" }}>
          <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{label}</span>
          <span style={{
            fontSize: "0.7rem",
            padding: "1px 6px",
            borderRadius: "4px",
            background: isProj ? "rgba(168,85,247,0.2)" : "rgba(13,153,255,0.2)",
            color: isProj ? "#C084FC" : "var(--color-primary)",
            fontWeight: 600
          }}>
            {isProj ? "Proyeksi" : "Histori"}
          </span>
        </div>

        {p?.actual !== null && !isProj && (
          <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
            <span style={{ color: "var(--color-primary)" }}>● Penjualan Aktual:</span>
            <strong style={{ color: "var(--text-primary)" }}>{p.actual.toLocaleString("id-ID")} unit</strong>
          </div>
        )}

        {isProj && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
              <span style={{ color: "#A855F7" }}>● Prediksi Run-Rate:</span>
              <strong style={{ color: "var(--text-primary)" }}>{p?.predicted?.toLocaleString("id-ID")} unit/hari</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Batas Bawah:</span>
              <span>{p?.lower?.toLocaleString("id-ID")} unit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Batas Atas:</span>
              <span>{p?.upper?.toLocaleString("id-ID")} unit</span>
            </div>
          </>
        )}
      </div>
    );
  };

  if (!product) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center", borderRadius: "12px", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <p style={{ color: "var(--text-muted)" }}>Pilih produk dari tabel di bawah untuk melihat grafik demand forecast dan analisis model.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
      {/* Product Banner & Horizon Cards */}
      <div className="card" style={{
        padding: "1.5rem",
        borderRadius: "14px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
              <span style={{
                fontSize: "0.75rem",
                fontFamily: "monospace",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(13,153,255,0.1)",
                color: "var(--color-primary)",
                fontWeight: 600
              }}>
                SKU: {product.product_id}
              </span>
              <span style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "6px",
                background: badge.bg,
                color: badge.text,
                border: `1px solid ${badge.border}40`,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <Sparkles size={12} />
                Best Model: {badge.label}
              </span>
              {product.wape && (
                <span style={{
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: product.wape < 70 ? "rgba(58,201,119,0.15)" : "rgba(255,179,35,0.15)",
                  color: product.wape < 70 ? "#3AC977" : "#FFB323",
                  fontWeight: 600
                }}>
                  WAPE: {product.wape}%
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {product.product_name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.35rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>Agregat: <strong>Nasional (Semua Gudang)</strong></span>
              <span>•</span>
              <span>Tanggal Forecast: <strong>{product.forecast_date}</strong></span>
              <span>•</span>
              <span>
                Bias: <strong style={{
                  color: product.bias_label === "OVERFORECAST" ? "#FF5E5E" : product.bias_label === "UNDERFORECAST" ? "#FFB323" : "#3AC977"
                }}>
                  {product.bias !== null ? `${product.bias > 0 ? "+" : ""}${product.bias}% (${product.bias_label})` : "Neutral"}
                </strong>
              </span>
            </div>
          </div>

          {/* Horizon Switcher Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--bg-surface)", padding: "4px", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 0.5rem" }}>Tampilkan:</span>
            {[
              { id: 7, label: "7 Hari" },
              { id: 30, label: "30 Hari" },
              { id: 90, label: "90 Hari" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedHorizon(tab.id as any)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  background: selectedHorizon === tab.id ? "var(--color-primary)" : "transparent",
                  color: selectedHorizon === tab.id ? "#FFF" : "var(--text-muted)"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Core Horizon Projection Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
          {/* Card 7 Hari */}
          <div
            onClick={() => setSelectedHorizon(7)}
            style={{
              padding: "1rem",
              borderRadius: "10px",
              background: selectedHorizon === 7 ? "rgba(13,153,255,0.12)" : "var(--bg-surface)",
              border: selectedHorizon === 7 ? "1.5px solid var(--color-primary)" : "1px solid var(--bg-border)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: selectedHorizon === 7 ? "var(--color-primary)" : "var(--text-muted)" }}>
                Forecast 7 Hari
              </span>
              <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                Mingguan
              </span>
            </div>
            <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.4rem" }}>
              {f7 ? Math.round(f7.predicted_qty).toLocaleString("id-ID") : "—"}
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.35rem" }}>unit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.5rem", borderTop: "1px solid var(--bg-border)", paddingTop: "0.4rem" }}>
              <span>Rentang Keyakinan:</span>
              <strong style={{ color: "var(--text-secondary)" }}>
                {f7 ? `${Math.round(f7.lower_bound)} - ${Math.round(f7.upper_bound)}` : "—"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span>Laju Harian (Run-Rate):</span>
              <strong style={{ color: "var(--color-primary)" }}>
                {f7 ? `~${Math.round(f7.predicted_qty / 7)} unit/hari` : "—"}
              </strong>
            </div>
          </div>

          {/* Card 30 Hari */}
          <div
            onClick={() => setSelectedHorizon(30)}
            style={{
              padding: "1rem",
              borderRadius: "10px",
              background: selectedHorizon === 30 ? "rgba(58,201,119,0.12)" : "var(--bg-surface)",
              border: selectedHorizon === 30 ? "1.5px solid #3AC977" : "1px solid var(--bg-border)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: selectedHorizon === 30 ? "#3AC977" : "var(--text-muted)" }}>
                Forecast 30 Hari
              </span>
              <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(58,201,119,0.15)", color: "#3AC977", fontWeight: 600 }}>
                Utama (1 Bulan)
              </span>
            </div>
            <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#3AC977", marginTop: "0.4rem" }}>
              {f30 ? Math.round(f30.predicted_qty).toLocaleString("id-ID") : "—"}
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.35rem" }}>unit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.5rem", borderTop: "1px solid var(--bg-border)", paddingTop: "0.4rem" }}>
              <span>Rentang Keyakinan:</span>
              <strong style={{ color: "var(--text-secondary)" }}>
                {f30 ? `${Math.round(f30.lower_bound)} - ${Math.round(f30.upper_bound)}` : "—"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span>Saran Buffer Stok Min:</span>
              <strong style={{ color: "#3AC977" }}>
                {f30 ? `~${Math.round(f30.predicted_qty * 0.2)} unit` : "—"}
              </strong>
            </div>
          </div>

          {/* Card 90 Hari */}
          <div
            onClick={() => setSelectedHorizon(90)}
            style={{
              padding: "1rem",
              borderRadius: "10px",
              background: selectedHorizon === 90 ? "rgba(168,85,247,0.12)" : "var(--bg-surface)",
              border: selectedHorizon === 90 ? "1.5px solid #A855F7" : "1px solid var(--bg-border)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: selectedHorizon === 90 ? "#A855F7" : "var(--text-muted)" }}>
                Forecast 90 Hari
              </span>
              <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                Triwulan
              </span>
            </div>
            <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.4rem" }}>
              {f90 ? Math.round(f90.predicted_qty).toLocaleString("id-ID") : "—"}
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.35rem" }}>unit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.5rem", borderTop: "1px solid var(--bg-border)", paddingTop: "0.4rem" }}>
              <span>Rentang Keyakinan:</span>
              <strong style={{ color: "var(--text-secondary)" }}>
                {f90 ? `${Math.round(f90.lower_bound)} - ${Math.round(f90.upper_bound)}` : "—"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span>Kebutuhan Kuartal:</span>
              <strong style={{ color: "#A855F7" }}>
                {f90 ? `~${Math.round(f90.predicted_qty / 3)} unit/bln` : "—"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Forecast Line & Interval Chart */}
      <div className="card" style={{
        padding: "1.5rem",
        borderRadius: "14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={18} color="var(--color-primary)" />
              Grafik Histori Transaksi & Proyeksi Demand ({selectedHorizon} Hari ke Depan)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
              Garis biru solid menunjukkan data riil penjualan. Garis ungu putus-putus menunjukkan proyeksi run-rate model dengan area keyakinan ±20%.
            </p>
          </div>

          {/* History Range Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Histori:</span>
            {[
              { days: 30, label: "30h" },
              { days: 60, label: "60h" },
              { days: 90, label: "90h" },
              { days: 180, label: "180h" },
              { days: 365, label: "1 Thn" },
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => onHistoryDaysChange(opt.days)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: historyDays === opt.days ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.1)",
                  background: historyDays === opt.days ? "rgba(13,153,255,0.15)" : "rgba(255,255,255,0.02)",
                  color: historyDays === opt.days ? "var(--color-primary-light)" : "var(--text-muted)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Viewport */}
        <div style={{ width: "100%", height: 380 }}>
          {loading ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              Memuat grafik penjualan dan proyeksi...
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              Data histori tidak tersedia untuk rentang ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  {/* Area gradient for historical */}
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D99FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0D99FF" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Area gradient for forecast confidence band */}
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                
                <XAxis
                  dataKey="date"
                  stroke="#828690"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    // Show Month-Day
                    const parts = val.split("-");
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                  }}
                />

                <YAxis
                  stroke="#828690"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => Number(v).toLocaleString("id")}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Legend */}
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "0.78rem" }}
                  formatter={(value) => {
                    if (value === "actual") return <span style={{ color: "#38BDF8" }}>Histori Aktual</span>;
                    if (value === "predicted") return <span style={{ color: "#C084FC" }}>Proyeksi Forecast ({selectedHorizon}d)</span>;
                    if (value === "upper") return <span style={{ color: "#E9D5FF" }}>Batas Atas / Bawah</span>;
                    return value;
                  }}
                />

                {/* Confidence bound upper area */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="transparent"
                  fill="url(#forecastBand)"
                  isAnimationActive={false}
                />

                {/* Historical Actual line */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#0D99FF"
                  strokeWidth={2.5}
                  fill="url(#actualGradient)"
                  dot={{ r: 2, fill: "#0D99FF" }}
                  activeDot={{ r: 5, fill: "#FFF", stroke: "#0D99FF", strokeWidth: 2 }}
                />

                {/* Forecast projection line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#A855F7"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2, fill: "#A855F7" }}
                  activeDot={{ r: 5, fill: "#FFF", stroke: "#A855F7", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
