"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Box,
  Layers,
  Sparkles,
  Truck,
  Activity,
  ShieldCheck,
} from "lucide-react";

export default function WarehouseVisualizationPage() {
  const [iframeUrl, setIframeUrl] = useState("http://46.250.235.222:5173/");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Deteksi host aktif (IP publik, Tailscale, atau localhost) agar iframe selalu sinkron
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname || "46.250.235.222";
      setIframeUrl(`http://${hostname}:5173/`);
    }
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeUrl;
    }
  };

  const handleOpenExternal = () => {
    window.open(iframeUrl, "_blank", "noopener,noreferrer");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: isFullscreen ? "100vh" : "calc(100vh - 68px)",
        width: "100%",
        background: "var(--bg-base, #0b1120)",
        color: "var(--text-primary, #f1f5f9)",
        overflow: "hidden",
      }}
    >
      {/* ── Page Header Bar ── */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--bg-border, rgba(51, 65, 85, 0.4))",
          background: "var(--bg-panel, rgba(15, 23, 42, 0.85))",
          backdropFilter: "blur(12px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0284c7, #38bdf8, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(56, 189, 248, 0.3)",
              flexShrink: 0,
            }}
          >
            <Box size={22} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "#f8fafc",
                }}
              >
                CPA Warehouse Visualization
              </h1>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                3D Digital Twin
              </span>
            </div>
            <p
              style={{
                margin: "2px 0 0 0",
                color: "var(--text-muted, #94a3b8)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Activity size={13} color="#10b981" />
              <span>Simulasi Armada AGV Forklift, Pemetaan Rak Multi-Gudang & Live BTB Stream</span>
            </p>
          </div>
        </div>

        {/* ── Status Indicators & Action Buttons ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Status Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "0.75rem",
              color: "#34d399",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
                display: "inline-block",
              }}
            />
            <span>Port 5173 Active</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: "rgba(14, 165, 233, 0.12)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              fontSize: "0.75rem",
              color: "#38bdf8",
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} color="#38bdf8" />
            <span>Dual PostgreSQL Bridge</span>
          </div>

          {/* Action: Reload */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Muat Ulang Tampilan 3D"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "var(--bg-surface, rgba(30, 41, 59, 0.8))",
              border: "1px solid var(--bg-border, rgba(51, 65, 85, 0.6))",
              color: "#e2e8f0",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Reload</span>
          </button>

          {/* Action: Toggle Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "var(--bg-surface, rgba(30, 41, 59, 0.8))",
              border: "1px solid var(--bg-border, rgba(51, 65, 85, 0.6))",
              color: "#e2e8f0",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? "Kecilkan" : "Fullscreen"}</span>
          </button>

          {/* Action: Open New Tab */}
          <button
            type="button"
            onClick={handleOpenExternal}
            title="Buka Langsung di Tab Baru"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(14, 165, 233, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <ExternalLink size={14} />
            <span>Buka Tab Baru</span>
          </button>
        </div>
      </div>

      {/* ── Interactive 3D Canvas Iframe Container ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#070b14",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              background: "rgba(11, 17, 32, 0.95)",
              color: "#94a3b8",
              zIndex: 10,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                border: "3px solid rgba(56, 189, 248, 0.2)",
                borderTopColor: "#38bdf8",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#e2e8f0", fontSize: "0.95rem" }}>
                Memuat Kanvas 3D CPA Warehouse Visualization...
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                Menghubungkan ke server WebGL (Port 5173) & Sinkronisasi DB Gudang
              </p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={iframeUrl}
          title="CPA Warehouse Visualization 3D Digital Twin"
          onLoad={() => setIsLoading(false)}
          allow="fullscreen; accelerometer; gyroscope"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            background: "#0b1120",
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
