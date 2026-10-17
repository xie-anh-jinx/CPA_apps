"use client";

import React, { useEffect, useRef } from "react";

export interface QuadrantPoint {
  name: string;
  x: number;
  y: number;
  group: string;
  volume: string;
}

interface C3QuadrantChartProps {
  data: QuadrantPoint[];
  height?: number;
}

export default function C3QuadrantChart({ data, height = 240 }: C3QuadrantChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initQuadrant() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current || !data || data.length === 0) return;

        const xs: Record<string, string> = {};
        const columns: any[] = [];

        data.forEach((p) => {
          xs[p.name] = `${p.name}_x`;
          columns.push([`${p.name}_x`, p.x]);
          columns.push([p.name, p.y]);
        });

        chartInstance = (c3 as any).generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            xs: xs,
            columns: columns,
            type: "scatter",
          },
          point: {
            r: 5,
          },
          axis: {
            x: {
              label: {
                text: "Touch Frequency / Activity Index",
                position: "outer-center",
              },
              min: 30,
              max: 100,
              tick: {
                fit: true,
              },
            },
            y: {
              label: {
                text: "Volume Run-Rate / Achievement Index",
                position: "outer-middle",
              },
              min: 80,
              max: 170,
              tick: {
                values: [100, 120, 140, 160],
              },
            },
          },
          grid: {
            x: {
              lines: [{ value: 65, text: "Benchmark Touch", class: "grid-benchmark" }],
            },
            y: {
              lines: [{ value: 125, text: "Benchmark Run-Rate", class: "grid-benchmark" }],
            },
          },
          legend: {
            show: false,
          },
          tooltip: {
            format: {
              title: (d: any) => `Sales Region / Account Rep`,
              value: (val: any, ratio: any, id: string, index: number) => {
                const pt = data.find((p) => p.name === id);
                return `${id}: Achievement ${val}, Touch ${pt?.x}, Vol ${pt?.volume || "N/A"}`;
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Quadrant Chart:", err);
      }
    }

    initQuadrant();

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
        padding: "1.25rem 1.25rem 0.85rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
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
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          People Quadrant Chart
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.72rem" }}>
          <span
            style={{
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              background: "rgba(234, 179, 8, 0.15)",
              color: "#eab308",
              fontWeight: 600,
            }}
          >
            Q1: High Touch
          </span>
          <span
            style={{
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              fontWeight: 600,
            }}
          >
            Q2: Star Growth
          </span>
        </div>
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
