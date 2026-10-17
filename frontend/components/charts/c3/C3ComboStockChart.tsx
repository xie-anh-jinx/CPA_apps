"use client";

import React, { useEffect, useRef } from "react";

export interface MonthlyStockData {
  month: string;
  dpms_stock: number;
  siso_stock: number;
  sell_in: number;
  sell_out: number;
  stock_level_dpms: number;
}

interface C3ComboStockChartProps {
  data: MonthlyStockData[];
  height?: number;
}

export default function C3ComboStockChart({ data, height = 340 }: C3ComboStockChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initComboChart() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current || !data || data.length === 0) return;

        const categories = data.map((d) => d.month);
        const dpmsStock: [string, ...(number | string)[]] = ["DPMS Stock", ...data.map((d) => d.dpms_stock)];
        const sisoStock: [string, ...(number | string)[]] = ["SISO Stock", ...data.map((d) => d.siso_stock)];
        const sellIn: [string, ...(number | string)[]] = ["Sell In", ...data.map((d) => d.sell_in)];
        const sellOut: [string, ...(number | string)[]] = ["Sell Out", ...data.map((d) => d.sell_out)];
        const stockLevel: [string, ...(number | string)[]] = ["Stock Level DPMS", ...data.map((d) => d.stock_level_dpms)];

        chartInstance = (c3 as any).generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: [dpmsStock, sisoStock, sellIn, sellOut, stockLevel],
            types: {
              "DPMS Stock": "bar",
              "SISO Stock": "bar",
              "Sell In": "bar",
              "Sell Out": "bar",
              "Stock Level DPMS": "line",
            },
            axes: {
              "DPMS Stock": "y",
              "SISO Stock": "y",
              "Sell In": "y",
              "Sell Out": "y",
              "Stock Level DPMS": "y2",
            },
            colors: {
              "DPMS Stock": "#991b1b",
              "SISO Stock": "#eab308",
              "Sell In": "#94a3b8",
              "Sell Out": "#1e293b",
              "Stock Level DPMS": "#06b6d4",
            },
          },
          bar: {
            width: {
              ratio: 0.75,
            },
          },
          point: {
            r: 3.5,
            focus: {
              expand: {
                r: 6,
              },
            },
          },
          axis: {
            x: {
              type: "category",
              categories: categories,
              tick: {
                centered: true,
                outer: false,
              },
            },
            y: {
              label: {
                text: "Volume (Ltrs)",
                position: "outer-middle",
              },
              tick: {
                format: (d: number) => {
                  if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
                  if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
                  return d.toLocaleString();
                },
                outer: false,
              },
              padding: { top: 15, bottom: 0 },
            },
            y2: {
              show: true,
              label: {
                text: "In Month Cover",
                position: "outer-middle",
              },
              max: 4.0,
              min: 0,
              tick: {
                format: (d: number) => d.toFixed(1),
                outer: false,
              },
              padding: { top: 15, bottom: 0 },
            },
          },
          grid: {
            x: {
              show: false,
            },
            y: {
              show: true,
            },
          },
          legend: {
            position: "bottom",
          },
          tooltip: {
            grouped: true,
            format: {
              value: (val: any, ratio: any, id: string) => {
                if (id === "Stock Level DPMS") {
                  return `${Number(val).toFixed(2)} Month Cover`;
                }
                return `${new Intl.NumberFormat("id-ID").format(Number(val))} L`;
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Combo Stock Chart:", err);
      }
    }

    initComboChart();

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
        padding: "1.25rem 1.25rem 1rem",
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
          marginBottom: "0.75rem",
        }}
      >
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Si-So Stock
        </h3>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "var(--bg-surface)",
            padding: "0.2rem 0.6rem",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
          }}
        >
          Dual Axis (Volume & Month Cover)
        </span>
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
