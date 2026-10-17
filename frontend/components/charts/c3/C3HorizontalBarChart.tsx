"use client";

import React, { useEffect, useRef } from "react";

export interface SectoralPerfData {
  sector: string;
  achievement_pct: number;
}

interface C3HorizontalBarChartProps {
  data: SectoralPerfData[];
  height?: number;
}

export default function C3HorizontalBarChart({ data, height = 280 }: C3HorizontalBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initHorizontalBar() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current || !data || data.length === 0) return;

        const categories = data.map((d) => d.sector);
        const values: [string, ...(number | string)[]] = ["Achievement", ...data.map((d) => d.achievement_pct)];

        chartInstance = (c3 as any).generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: [values] as any,
            type: "bar",
            colors: {
              Achievement: "#dc2626",
            },
          },
          bar: {
            width: 14,
          },
          axis: {
            rotated: true,
            x: {
              type: "category",
              categories: categories,
              tick: {
                multiline: false,
              },
            },
            y: {
              label: {
                text: "Volume Achievement vs YTD Target (%)",
                position: "outer-middle",
              },
              max: 100,
              min: 0,
              tick: {
                values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                format: (d: number) => `${d}%`,
                outer: false,
              },
            },
          },
          grid: {
            y: {
              show: true,
            },
          },
          legend: {
            show: false,
          },
          tooltip: {
            format: {
              value: (val: any) => `${Number(val).toFixed(1)}% vs Target`,
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Horizontal Bar Chart:", err);
      }
    }

    initHorizontalBar();

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
  }, [data, height]);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "12px",
        padding: "1.1rem 1.1rem 0.85rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Sectoral Performance
        </h3>
      </div>

      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${height}px`,
        }}
      />
    </div>
  );
}
