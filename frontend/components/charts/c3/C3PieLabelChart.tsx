"use client";

import React, { useEffect, useRef } from "react";

export interface PieColumnItem {
  id: string;
  value: number;
  color?: string;
}

interface C3PieLabelChartProps {
  title: string;
  subtitle?: string;
  data: PieColumnItem[];
  height?: number;
  formatType?: "percentage" | "volume" | "both";
  totalValue?: number;
}

export default function C3PieLabelChart({
  title,
  subtitle,
  data,
  height = 280,
  formatType = "percentage",
  totalValue,
}: C3PieLabelChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initChart() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current) return;

        // Build columns: [ [id, value], ... ]
        const columns: [string, ...any[]][] = data.map((item) => [
          item.id,
          Math.round(item.value),
        ]);

        // Build color pattern
        const colorPattern = data
          .map((item) => item.color)
          .filter((c): c is string => Boolean(c));

        // Format function according to https://c3js.org/samples/pie_label_format.html
        const labelFormat = (value: number, ratio: number) => {
          if (formatType === "volume") {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M L`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k L`;
            return `${value} L`;
          }
          if (formatType === "both") {
            return `${(ratio * 100).toFixed(1)}%`;
          }
          // Default percentage
          return `${(ratio * 100).toFixed(1)}%`;
        };

        chartInstance = c3.generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: columns,
            type: "pie",
          },
          pie: {
            label: {
              format: labelFormat,
              show: true,
              threshold: 0.03, // Only show label if slice >= 3% to prevent clutter
            },
          },
          color: colorPattern.length > 0 ? { pattern: colorPattern } : undefined,
          legend: {
            position: "right",
            show: true,
          },
          tooltip: {
            format: {
              value: (value: number, ratio: number) => {
                const formattedNum = new Intl.NumberFormat("id-ID").format(value);
                const pct = (ratio * 100).toFixed(1);
                return `${formattedNum} L (${pct}%)`;
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Pie Chart:", err);
      }
    }

    initChart();

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
  }, [data, height, formatType]);

  const total = useMemoTotal(data, totalValue);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "10px",
        padding: "1.25rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.2px",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
        {total > 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Total Volume
            </span>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
              {new Intl.NumberFormat("id-ID").format(total)} L
            </div>
          </div>
        )}
      </div>

      <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} />
    </div>
  );
}

function useMemoTotal(data: PieColumnItem[], explicitTotal?: number): number {
  if (explicitTotal !== undefined && explicitTotal > 0) return explicitTotal;
  return data.reduce((sum, item) => sum + item.value, 0);
}
