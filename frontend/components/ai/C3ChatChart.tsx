"use client";

import React, { useEffect, useRef, useState, useId } from "react";

interface C3ChatChartProps {
  code: string;
}

export default function C3ChatChart({ code }: C3ChatChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<string>("chart");
  const uniqueId = useId().replace(/:/g, "_");

  // Attempt to parse JSON safely
  let config: any = null;
  let isParsing = false;
  try {
    const cleaned = code.trim().replace(/^```(?:c3|c3js)?/i, "").replace(/```$/, "").trim();
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      config = JSON.parse(cleaned);
    } else {
      isParsing = true;
    }
  } catch (err: any) {
    isParsing = true;
  }

  useEffect(() => {
    if (!config || !chartRef.current) return;

    let chartInstance: any = null;
    let isMounted = true;

    async function initChart() {
      try {
        const c3 = (await import("c3")).default;
        if (!isMounted || !chartRef.current) return;

        // Extract or default chart type
        const type =
          config.data?.type ||
          (config.data?.types ? Object.values(config.data.types)[0] : "bar") ||
          "chart";
        setChartType(String(type).toUpperCase());

        // Prepare sanitized config
        const c3Options: any = {
          ...config,
          bindto: chartRef.current,
          size: {
            height: config.size?.height || 260,
          },
          padding: config.padding || {
            top: 10,
            right: 20,
            bottom: 10,
            left: 45,
          },
          legend: {
            position: "bottom",
            ...(config.legend || {}),
          },
        };

        // Donut / Pie labels customization
        if (type === "donut" || config.donut) {
          c3Options.donut = {
            width: 32,
            ...(config.donut || {}),
            label: {
              format: (value: number, ratio: number) => `${(ratio * 100).toFixed(1)}%`,
              threshold: 0.05,
              ...(config.donut?.label || {}),
            },
          };
        }

        // Clean previous SVG if any
        if (chartRef.current) {
          chartRef.current.innerHTML = "";
        }

        chartInstance = c3.generate(c3Options);
        setParseError(null);
      } catch (err: any) {
        console.error("C3ChatChart render error:", err);
        if (isMounted) {
          setParseError(err?.message || "Gagal merender grafik C3.js");
        }
      }
    }

    initChart();

    return () => {
      isMounted = false;
      try {
        if (chartInstance && typeof chartInstance.destroy === "function") {
          chartInstance.destroy();
        }
      } catch (_) {}
    };
  }, [code, config]);

  // If streaming and JSON not yet valid
  if (isParsing && !config) {
    return (
      <div className="my-3 p-4 rounded-xl border border-sky-500/20 bg-sky-950/20 backdrop-blur-sm flex items-center gap-3 text-sky-400 text-xs">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        <span>Menyiapkan grafik interaktif C3.js...</span>
      </div>
    );
  }

  // If parsing failed with error
  if (parseError && !config) {
    return (
      <pre className="aic-md-pre my-2 text-xs">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-lg overflow-hidden backdrop-blur-md">
      {/* Header Bar */}
      <div className="px-3.5 py-2 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-base">📊</span>
          <span className="font-semibold text-slate-100">Visualisasi Data C3.js</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {chartType}
          </span>
        </div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          title="Tampilkan / sembunyikan konfigurasi JSON"
        >
          {showRaw ? "Tutup JSON" : "Lihat JSON"}
        </button>
      </div>

      {/* Interactive C3 Chart Canvas */}
      <div className="p-3 w-full overflow-x-auto">
        <div ref={chartRef} id={`c3_chart_${uniqueId}`} className="w-full min-h-[260px]" />
      </div>

      {/* Raw JSON Config Drawer */}
      {showRaw && (
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
          <pre>{code.trim()}</pre>
        </div>
      )}
    </div>
  );
}

