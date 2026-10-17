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

/**
 * ForkliftIcon — Icon Voxel/Flat SVG Forklift Industri
 * Membawa Palet Kayu & Drum Shell Merah di Atas Garpu
 */
export function ForkliftIcon({ width = 48, height = 36 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lampu Strobo Oranye Berkedip di Atap Kabin */}
      <circle cx="21" cy="4" r="2.5" fill="#F97316" />
      <circle cx="21" cy="4" r="4.5" fill="#F97316" opacity="0.4" />

      {/* Rangka Pelindung Kabin (Overhead ROPS Guard) */}
      <path d="M14 18V8H26V18" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 8V18" stroke="#334155" strokeWidth="1.5" />

      {/* Bodi Utama Chassis Forklift (Kuning Safety Industri) */}
      <path d="M8 18H30V26H8Z" fill="#F59E0B" />
      <path d="M4 22H8V26H4Z" fill="#D97706" />
      <rect x="8" y="24" width="22" height="2" fill="#EAB308" />
      <rect x="12" y="19" width="4" height="2" fill="#1E293B" />
      <rect x="18" y="19" width="4" height="2" fill="#1E293B" />

      {/* Tiang Angkat Vertikal Depan (Front Mast) */}
      <path d="M30 6V28" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 6V28" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />

      {/* Garpu Pengangkat Horizontal (Forks) */}
      <path d="M30 25H48V27H30" fill="#334155" />

      {/* Muatan Dinamis: Palet Kayu EUR + Drum Pelumas Shell Merah */}
      <rect x="34" y="22" width="13" height="3" fill="#B45309" rx="0.5" />
      <rect x="36" y="10" width="9" height="12" fill="#DC2626" rx="1.5" />
      <line x1="36" y1="13.5" x2="45" y2="13.5" stroke="#EF4444" strokeWidth="1" />
      <line x1="36" y1="18.5" x2="45" y2="18.5" stroke="#EF4444" strokeWidth="1" />
      <circle cx="40.5" cy="16" r="1.5" fill="#FBBF24" />

      {/* Roda Depan & Belakang */}
      <circle cx="12" cy="28" r="4.5" fill="#0F172A" />
      <circle cx="12" cy="28" r="2" fill="#64748B" />
      <circle cx="27" cy="28" r="4.5" fill="#0F172A" />
      <circle cx="27" cy="28" r="2" fill="#64748B" />
    </svg>
  );
}

export default function WarehouseVisualizationPage() {
  const [iframeUrl, setIframeUrl] = useState("/3d/");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Simulasi penambahan loading progres
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0; // Loop kembali ke 0
        return Math.min(prev + 1, 100);
      });
    }, 45);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Jika diakses via HTTPS (e.g. warehouse.pengajaran.com), selalu gunakan path HTTPS aman /3d/
      if (window.location.protocol === "https:" || window.location.hostname === "warehouse.pengajaran.com") {
        setIframeUrl("/3d/");
      } else if (window.location.port === "3001") {
        setIframeUrl(`http://${window.location.hostname}:5173/3d/`);
      } else {
        setIframeUrl("/3d/");
      }
    }
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setProgress(0);
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
      }).catch((err) => {
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
            <span>3D Engine Live</span>
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
        {/* Loading Progress Bar Animasi Forklift */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0B1120",
              padding: "30px",
              zIndex: 10,
              fontFamily: "monospace, sans-serif",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                background: "rgba(15, 23, 42, 0.95)",
                padding: "32px 28px 24px",
                borderRadius: "16px",
                border: "1px solid #1E293B",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.1)",
              }}
            >
              {/* Status Header */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "520px",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    color: "#38BDF8",
                    fontSize: "13px",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                  }}
                >
                  SYNCING DIGITAL TWIN ASSETS...
                </span>
                <span
                  style={{
                    color: "#F8FAFC",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {progress}%
                </span>
              </div>

              {/* Area Rel & Jalur Forklift */}
              <div style={{ width: "100%", maxWidth: "520px", position: "relative", height: "65px" }}>
                {/* Kontainer Forklift Berjalan */}
                <div
                  style={{
                    position: "absolute",
                    left: `calc(${progress}% - 30px)`,
                    bottom: "12px",
                    transition: "left 0.05s linear",
                    pointerEvents: "none",
                  }}
                >
                  <ForkliftIcon />
                </div>

                {/* Loading Track Dasar */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    width: "100%",
                    height: "10px",
                    background: "#1E293B",
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid #334155",
                  }}
                >
                  {/* Bar Terisi (Warna Safety Cyan ke Emerald) */}
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #0284C7 0%, #38BDF8 60%, #10B981 100%)",
                      boxShadow: "0 0 12px rgba(56, 189, 248, 0.6)",
                      transition: "width 0.05s linear",
                    }}
                  />
                </div>
              </div>

              {/* Indikator Strip Hazard Bawah */}
              <div
                style={{
                  marginTop: "16px",
                  fontSize: "11px",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10B981",
                  }}
                />
                INITIALIZING 3D INSTANCES & CPA WAREHOUSE TELEMETRY
              </div>
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
    </div>
  );
}
