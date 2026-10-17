"use client";

import React, { useEffect, useRef } from "react";

interface C3GaugeChartProps {
  label: string;
  percentage: number;
  volumeLiters?: number;
  growthPct?: number;
  max?: number;
  color?: string;
  height?: number;
}

export default function C3GaugeChart({
  label,
  percentage,
  volumeLiters,
  growthPct,
  max = 100,
  color,
  height = 140,
}: C3GaugeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Auto-determine gauge arc color if not explicitly provided
  const gaugeColor =
    color ||
    (percentage >= 100
      ? "#10b981" // Green
      : percentage >= 85
      ? "#eab308" // Yellow / Amber
      : "#ef4444"); // Red

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initGauge() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current) return;

        chartInstance = c3.generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: [["data", percentage]],
            type: "gauge",
          },
          gauge: {
            label: {
              format: (val: number) => `${val.toFixed(1)}%`,
              show: true,
            },
            min: 0,
            max: Math.max(max, Math.ceil(percentage * 1.1)),
            width: 24, // Arc thickness
          },
          color: {
            pattern: [gaugeColor],
          },
          legend: {
            show: false,
          },
          tooltip: {
            show: false,
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Gauge:", err);
      }
    }

    initGauge();

    const handleResize = () => {
      chartInstance?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (chartInstance) {
        try {
          chartInstance.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [percentage, max, gaugeColor, height]);

  const fmtNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };

  const isPositiveGrowth = growthPct !== undefined && growthPct >= 0;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "12px",
        padding: "1rem 0.75rem 0.85rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        minWidth: "155px",
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          alignSelf: "flex-start",
          paddingLeft: "0.35rem",
          letterSpacing: "0.2px",
        }}
      >
        {label}
      </div>

      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${height}px`,
          marginTop: "-10px",
          marginBottom: "-10px",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.15rem",
          marginTop: "0.2rem",
        }}
      >
        {volumeLiters !== undefined && (
          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.2px",
            }}
          >
            {fmtNumber(volumeLiters)} L
          </div>
        )}

        {growthPct !== undefined && (
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: isPositiveGrowth ? "#10b981" : "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            <span>{isPositiveGrowth ? "↗" : "↘"}</span>
            <span>
              {isPositiveGrowth ? "+" : ""}
              {growthPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
