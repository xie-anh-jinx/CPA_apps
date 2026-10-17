"use client";

import React, { useEffect, useRef } from "react";

export interface DonutSegment {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface C3DonutChartProps {
  title: string;
  total: number;
  segments: DonutSegment[];
  height?: number;
}

export default function C3DonutChart({
  title,
  total,
  segments,
  height = 190,
}: C3DonutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chartInstance: any = null;
    let isMounted = true;

    async function initDonut() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current || !segments || segments.length === 0) return;

        const columns = segments.map((s) => [s.name, s.value]);
        const colors: Record<string, string> = {};
        segments.forEach((s) => {
          if (s.color) colors[s.name] = s.color;
        });

        const formattedTotal = new Intl.NumberFormat("id-ID").format(total);

        chartInstance = (c3 as any).generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: columns as any,
            type: "donut",
            colors: colors,
          },
          donut: {
            title: formattedTotal,
            width: 32,
            label: {
              format: (value: number, ratio: number) => {
                return `${(ratio * 100).toFixed(1)}%`;
              },
              threshold: 0.05,
            },
          },
          legend: {
            show: false,
          },
          tooltip: {
            format: {
              value: (val: any, ratio: any) => {
                const pct = (Number(ratio) * 100).toFixed(1);
                const num = new Intl.NumberFormat("id-ID").format(Number(val));
                return `${num} L (${pct}%)`;
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Donut Chart:", err);
      }
    }

    initDonut();

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
  }, [total, segments, height]);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "12px",
        padding: "1rem 1rem 0.85rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "0.35rem",
        }}
      >
        {title}
      </div>

      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${height}px`,
        }}
      />

      {/* Mini Segment Breakdown */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem 0.8rem",
          marginTop: "0.5rem",
          justifyContent: "center",
        }}
      >
        {segments.slice(0, 4).map((s) => (
          <div
            key={s.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.color || "#0ea5e9",
                display: "inline-block",
              }}
            />
            <span>{s.name}</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {s.percentage ? `${s.percentage.toFixed(1)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
