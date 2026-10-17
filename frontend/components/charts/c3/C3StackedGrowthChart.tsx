"use client";

import React, { useEffect, useRef } from "react";

export interface GrowthVolumeData {
  sector: string;
  sell_out_ytd: number;
  opportunity_existing: number;
  opportunity_new_win: number;
  target_sectoral: number;
}

interface C3StackedGrowthChartProps {
  data: GrowthVolumeData[];
  height?: number;
}

export default function C3StackedGrowthChart({ data, height = 340 }: C3StackedGrowthChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initStackedChart() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current || !data || data.length === 0) return;

        const categories = data.map((d) => d.sector);
        const sellOutYTD = ["Sell Out YTD", ...data.map((d) => d.sell_out_ytd)];
        const oppExisting = ["Opportunity from Existing Customer", ...data.map((d) => d.opportunity_existing)];
        const oppNewWin = ["Opportunity from New Account Win", ...data.map((d) => d.opportunity_new_win)];
        const targetSectoral = ["Target Sectoral", ...data.map((d) => d.target_sectoral)];

        chartInstance = (c3 as any).generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: [sellOutYTD, oppExisting, oppNewWin, targetSectoral],
            type: "bar",
            groups: [
              [
                "Sell Out YTD",
                "Opportunity from Existing Customer",
                "Opportunity from New Account Win",
                "Target Sectoral",
              ],
            ],
            colors: {
              "Sell Out YTD": "#eab308",
              "Opportunity from Existing Customer": "#0ea5e9",
              "Opportunity from New Account Win": "#ef4444",
              "Target Sectoral": "#1e3a8a",
            },
          },
          bar: {
            width: {
              ratio: 0.65,
            },
          },
          axis: {
            x: {
              type: "category",
              categories: categories,
              tick: {
                rotate: 25,
                multiline: false,
                culling: false,
              },
            },
            y: {
              tick: {
                format: (d: number) => {
                  if (d >= 1000000) return `${(d / 1000000).toFixed(0)}M`;
                  if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
                  return d.toLocaleString();
                },
                outer: false,
              },
              padding: { top: 20, bottom: 0 },
            },
          },
          grid: {
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
              value: (val: any) => `${new Intl.NumberFormat("id-ID").format(Number(val))} L`,
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Stacked Growth Chart:", err);
      }
    }

    initStackedChart();

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
          Source of Growth Volume
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
          Stacked by Sector
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
