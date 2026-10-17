"use client";

import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, Layers, BarChart3, Activity } from "lucide-react";

export interface SplineSeries {
  id: string;
  data: number[];
  color?: string;
}

interface C3SplineTransformChartProps {
  title: string;
  subtitle?: string;
  categories?: string[];
  series: SplineSeries[];
  height?: number;
}

type ChartType = "spline" | "line" | "bar" | "area-spline";

export default function C3SplineTransformChart({
  title,
  subtitle,
  categories = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ],
  series,
  height = 320,
}: C3SplineTransformChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [currentType, setCurrentType] = useState<ChartType>("spline");

  useEffect(() => {
    let isMounted = true;

    async function initChart() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current) return;

        // Columns: [ [id, ...values], ... ]
        const columns: [string, ...any[]][] = series.map((s) => [
          s.id,
          ...s.data,
        ]);

        // Colors mapping
        const colors: Record<string, string> = {};
        series.forEach((s) => {
          if (s.color) colors[s.id] = s.color;
        });

        chartInstanceRef.current = c3.generate({
          bindto: chartRef.current,
          size: {
            height: height,
          },
          data: {
            columns: columns,
            type: "spline",
            colors: Object.keys(colors).length > 0 ? colors : undefined,
          },
          axis: {
            x: {
              type: "category",
              categories: categories,
              tick: {
                rotate: 0,
                multiline: false,
              },
            },
            y: {
              tick: {
                format: (d: number) => {
                  if (d >= 1_000_000) return `${(d / 1_000_000).toFixed(1)}M L`;
                  if (d >= 1_000) return `${(d / 1_000).toFixed(0)}k L`;
                  return `${d} L`;
                },
              },
            },
          },
          grid: {
            x: { show: false },
            y: { show: true },
          },
          legend: {
            position: "bottom",
          },
          tooltip: {
            format: {
              value: (value: number) => {
                return `${new Intl.NumberFormat("id-ID").format(value)} L`;
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to render C3 Spline Chart:", err);
      }
    }

    initChart();

    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [series, categories, height]);

  // Transform chart type according to https://c3js.org/samples/transform_spline.html
  const handleTransform = (targetType: ChartType) => {
    if (!chartInstanceRef.current) return;
    try {
      chartInstanceRef.current.transform(targetType);
      setCurrentType(targetType);
    } catch (err) {
      console.error("Failed to transform chart type:", err);
    }
  };

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
        gap: "0.75rem",
      }}
    >
      {/* Header and Transform Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
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

        {/* Transform Buttons (Spline, Line, Bar, Area-Spline) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "var(--bg-surface)",
            padding: "0.2rem",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
          }}
        >
          <button
            onClick={() => handleTransform("spline")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.3rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: currentType === "spline" ? "var(--bg-card)" : "transparent",
              color: currentType === "spline" ? "var(--color-primary)" : "var(--text-muted)",
              boxShadow: currentType === "spline" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Activity size={12} />
            Spline
          </button>
          <button
            onClick={() => handleTransform("line")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.3rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: currentType === "line" ? "var(--bg-card)" : "transparent",
              color: currentType === "line" ? "var(--color-primary)" : "var(--text-muted)",
              boxShadow: currentType === "line" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <TrendingUp size={12} />
            Line
          </button>
          <button
            onClick={() => handleTransform("bar")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.3rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: currentType === "bar" ? "var(--bg-card)" : "transparent",
              color: currentType === "bar" ? "var(--color-primary)" : "var(--text-muted)",
              boxShadow: currentType === "bar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <BarChart3 size={12} />
            Bar
          </button>
          <button
            onClick={() => handleTransform("area-spline")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.3rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: currentType === "area-spline" ? "var(--bg-card)" : "transparent",
              color: currentType === "area-spline" ? "var(--color-primary)" : "var(--text-muted)",
              boxShadow: currentType === "area-spline" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Layers size={12} />
            Area
          </button>
        </div>
      </div>

      <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} />
    </div>
  );
}
