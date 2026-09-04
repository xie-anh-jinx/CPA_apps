"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { apiDistributions } from "@/lib/api";

interface SimNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  max_inv: number;
}

interface SimLink {
  from: string;
  to: string;
  type: "material" | "order" | "demand";
}

interface SimTruck {
  id: string;
  from: string;
  to: string;
  payload: number;
  progress: number;
}

interface SimOrder {
  id: string;
  from: string;
  to: string;
  qty: number;
  progress: number;
}

interface DayFrame {
  day: number;
  date: string;
  inventory: Record<string, number>;
  trucks: SimTruck[];
  orders: SimOrder[];
  demand: Record<string, { served: number; missed: number }>;
  node_histories: Record<string, { day: number; date: string; val: number }[]>;
  demand_histories: Record<string, { day: number; date: string; served: number; missed: number }[]>;
}

interface SimulationData {
  scenario: string;
  nodes: SimNode[];
  demands: { id: string; name: string; connected_node: string; x: number; y: number }[];
  links: SimLink[];
  total_days: number;
  days: DayFrame[];
}

export default function SupplyChainSimulation() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<"sulawesi" | "kalimantan">("sulawesi");

  // Mode: Pixel Art Retro (default) vs Classic Vector
  const [viewMode, setViewMode] = useState<"pixel" | "classic">("pixel");

  // Playback states
  const [currentDay, setCurrentDay] = useState(42);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [speed, setSpeed] = useState(0.6); // 0.20x to 2.50x

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const dayProgressRef = useRef<number>(42);

  // Fetch simulation data
  const fetchSimData = useCallback(async (sc: string) => {
    try {
      setLoading(true);
      const res = await apiDistributions.simulationData({ scenario: sc });
      setData(res.data);
      setCurrentDay(42);
      dayProgressRef.current = 42;
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimData(scenario);
  }, [scenario, fetchSimData]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying || !data || data.days.length === 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // 1 day per (1.2 / speed) seconds
      const daysDelta = (delta * speed) / 1.2;
      dayProgressRef.current += daysDelta;

      if (dayProgressRef.current > data.total_days) {
        if (isLooping) {
          dayProgressRef.current = 1;
        } else {
          dayProgressRef.current = data.total_days;
          setIsPlaying(false);
          setCurrentDay(data.total_days);
          return;
        }
      }

      const flooredDay = Math.min(data.total_days, Math.max(1, Math.floor(dayProgressRef.current)));
      setCurrentDay(flooredDay);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isLooping, speed, data]);

  const activeDayIndex = Math.min((data?.days.length || 60) - 1, Math.max(0, currentDay - 1));
  const activeFrame = data?.days[activeDayIndex];

  // Node lookup map
  const nodeMap = useMemo(() => {
    const map: Record<string, SimNode> = {};
    data?.nodes.forEach((n: SimNode) => {
      map[n.id] = n;
    });
    return map;
  }, [data]);

  // Helper for coordinates interpolation
  const getPointAlong = (fromId: string, toId: string, progress: number, offsetDistance: number = 0) => {
    const p1 = nodeMap[fromId];
    const p2 = nodeMap[toId];
    if (!p1 || !p2) return { x: 0, y: 0, angle: 0 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // normal vector for offset
    const nx = -dy / len;
    const ny = dx / len;

    const x = p1.x + dx * progress + nx * offsetDistance;
    const y = p1.y + dy * progress + ny * offsetDistance;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return { x, y, angle };
  };

  const handleDayChange = (newDay: number) => {
    const clamped = Math.min(data?.total_days || 60, Math.max(1, newDay));
    setCurrentDay(clamped);
    dayProgressRef.current = clamped;
  };

  // Status for each warehouse operator based on current day state
  const getNodeOperatorStatus = (nodeId: string) => {
    if (nodeId === "N0") {
      const activeTruck = activeFrame?.trucks.find((t: SimTruck) => t.from === "N0");
      return activeTruck ? `KIRIM IT: ${activeTruck.payload}` : "STANDBY GUDANG";
    }
    if (nodeId === "N1" || nodeId === "N2") {
      const inbound = activeFrame?.trucks.find((t: SimTruck) => t.to === nodeId);
      const outbound = activeFrame?.trucks.find((t: SimTruck) => t.from === nodeId);
      if (outbound) return `KIRIM IT: ${outbound.payload}`;
      if (inbound) return "TERIMA IT";
      return "RESTOCK READY";
    }
    if (nodeId === "N3") {
      return "CROSS-DOCK IT/IO";
    }
    if (nodeId === "N4" || nodeId === "N5") {
      const served = activeFrame?.demand?.[nodeId === "N4" ? "D1" : "D2"]?.served || 0;
      return `PROSES DO: ${served}u`;
    }
    return "OPERATOR SIAP";
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📦</div>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#38bdf8" }}>
          Inisialisasi Simulasi Distribusi CPA...
        </div>
        <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Memuat animasi pixel art, alur Delivery Order (DO), Internal Order (IO), dan Internal Transfer (IT)...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d1017", borderRadius: "12px", border: "1px solid #1e2638", padding: "1.25rem", color: "#f3f4f6", overflow: "hidden" }}>
      {/* ─── Embedded Pixel Art Keyframes & Retro Fonts ─── */}
      <style>{`
        @keyframes pixelBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes pixelPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes pixelSmoke {
          0% { opacity: 0.8; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(-10px, -6px) scale(1.4); }
        }
        @keyframes crtFlicker {
          0% { opacity: 0.98; }
          50% { opacity: 1; }
          100% { opacity: 0.99; }
        }
        .pixel-agent-bob {
          animation: pixelBob 1.4s ease-in-out infinite;
        }
        .pixel-antenna-pulse {
          animation: pixelPulse 0.9s ease-in-out infinite;
        }
        .pixel-smoke-anim {
          animation: pixelSmoke 1s linear infinite;
        }
        .pixel-font {
          font-family: 'Courier New', 'Press Start 2P', monospace;
          letter-spacing: -0.5px;
        }
      `}</style>

      {/* ─── Top Control Bar ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          background: "#131722",
          padding: "0.85rem 1.25rem",
          borderRadius: "8px",
          border: "1px solid #232d42",
          marginBottom: "1.25rem",
        }}
      >
        {/* Playback buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? "#f59e0b" : "#3b82f6",
              color: "#fff",
              border: "1px solid #60a5fa",
              borderRadius: "4px",
              padding: "0.45rem 0.95rem",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              fontFamily: "monospace",
            }}
            title={isPlaying ? "Pause Simulasi" : "Play Simulasi"}
          >
            {isPlaying ? "⏸ PAUSE" : "▶ MULAI SIMULASI"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              handleDayChange(1);
            }}
            style={{
              background: "#1e2433",
              color: "#e5e7eb",
              border: "1px solid #323d57",
              borderRadius: "4px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.95rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Stop & Reset ke Hari 1"
          >
            ⏹ RESET
          </button>
          <button
            onClick={() => setIsLooping(!isLooping)}
            style={{
              background: isLooping ? "#10b98126" : "#1e2433",
              color: isLooping ? "#34d399" : "#9ca3af",
              border: isLooping ? "1px solid #10b981" : "1px solid #323d57",
              borderRadius: "4px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.95rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
            title={isLooping ? "Loop Aktif" : "Loop Non-aktif"}
          >
            🔁 LOOP
          </button>
        </div>

        {/* Day Scrubber */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontFamily: "monospace", fontWeight: 600 }}>DAY:</span>
          <input
            type="number"
            value={currentDay}
            min={1}
            max={data?.total_days || 60}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDayChange(Number(e.target.value))}
            style={{
              width: "55px",
              background: "#1c2230",
              color: "#38bdf8",
              border: "1px solid #323d57",
              borderRadius: "4px",
              padding: "0.3rem 0.4rem",
              textAlign: "center",
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          />
          <input
            type="range"
            min={1}
            max={data?.total_days || 60}
            value={currentDay}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDayChange(Number(e.target.value))}
            style={{ width: "160px", cursor: "pointer", accentColor: "#38bdf8" }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", minWidth: "25px", fontFamily: "monospace" }}>
            / {data?.total_days || 60}
          </span>
        </div>

        {/* Speed Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontFamily: "monospace" }}>CLK:</span>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.1}
            value={speed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(Number(e.target.value))}
            style={{ width: "90px", cursor: "pointer", accentColor: "#10b981" }}
          />
          <span style={{ fontSize: "0.85rem", color: "#34d399", minWidth: "35px", fontFamily: "monospace", fontWeight: 700 }}>
            {speed.toFixed(2)}x
          </span>
        </div>

        {/* Style View Toggle (Pixel Art vs Classic) */}
        <div style={{ display: "flex", alignItems: "center", background: "#1c2230", padding: "2px", borderRadius: "6px", border: "1px solid #323d57" }}>
          <button
            onClick={() => setViewMode("pixel")}
            style={{
              background: viewMode === "pixel" ? "#3b82f6" : "transparent",
              color: viewMode === "pixel" ? "#ffffff" : "#94a3b8",
              border: "none",
              borderRadius: "4px",
              padding: "0.35rem 0.65rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            👾 Pixel Art
          </button>
          <button
            onClick={() => setViewMode("classic")}
            style={{
              background: viewMode === "classic" ? "#3b82f6" : "transparent",
              color: viewMode === "classic" ? "#ffffff" : "#94a3b8",
              border: "none",
              borderRadius: "4px",
              padding: "0.35rem 0.65rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            📊 Classic
          </button>
        </div>

        {/* Scenario Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <select
            value={scenario}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScenario(e.target.value as "sulawesi" | "kalimantan")}
            style={{
              background: "#1c2230",
              color: "#e5e7eb",
              border: "1px solid #323d57",
              borderRadius: "6px",
              padding: "0.4rem 0.6rem",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <option value="sulawesi">Sulawesi - Maluku Network</option>
            <option value="kalimantan">Kalimantan Network</option>
          </select>
        </div>
      </div>

      {/* ─── Simulation Date Header ─── */}
      <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "inline-block", background: "#131722", border: "1px solid #232d42", borderRadius: "6px", padding: "0.35rem 1.5rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 }}>
            SIMULATED TIMESTAMP
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "1px", color: "#38bdf8", margin: 0, fontFamily: "monospace" }}>
            {activeFrame?.date || "2023-02-12"}
          </h2>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
            {scenario === "sulawesi" ? "Bitung HO ➔ Kendari & Palu ➔ Makassar Transit ➔ Morowali & Weda" : "Balikpapan HO ➔ Sampit & Banjarmasin ➔ Samarinda"}
          </div>
        </div>
      </div>

      {/* ─── Main Interactive Simulation Canvas (SVG) ─── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          overflowX: "auto",
          background: viewMode === "pixel" ? "#0a0d14" : "#131722",
          borderRadius: "8px",
          border: "1px solid #1e2638",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        <svg
          viewBox="0 0 1000 620"
          style={{ width: "100%", minWidth: "960px", height: "auto", display: "block" }}
        >
          <defs>
            {/* Background Grid Pattern for Pixel mode */}
            <pattern id="pixel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#161c28" strokeWidth="1" />
              <circle cx="10" cy="10" r="0.8" fill="#252f44" />
            </pattern>

            {/* Arrowhead Markers */}
            <marker id="arrow-material-pixel" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 1 L 6 4 L 0 7 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-material-classic" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 6 4 L 0 6.5 z" fill="#9ca3af" />
            </marker>

            <marker id="arrow-order-pixel" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
              <path d="M 0 1 L 6 4 L 0 7 z" fill="#00d2d3" />
            </marker>
            <marker id="arrow-order-classic" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M 0 1.5 L 6 4 L 0 6.5 z" fill="#7dd3fc" />
            </marker>

            <marker id="arrow-demand" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 6 4 L 0 6.5 z" fill="#9ca3af" />
            </marker>

            {/* Drop Shadow Filter */}
            <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Grid Background in Pixel Mode */}
          {viewMode === "pixel" && (
            <rect width="1000" height="620" fill="url(#pixel-grid)" />
          )}

          {/* ─── 1. Distribution Links (Material & Orders) ─── */}
          {viewMode === "pixel" ? (
            /* Pixel Highway Style */
            <g shapeRendering="crispEdges">
              {/* Material Lines: Amber Cyber Road */}
              <line x1="120" y1="310" x2="310" y2="170" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="120" y1="310" x2="310" y2="450" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="330" y1="170" x2="520" y2="300" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="330" y1="450" x2="520" y2="320" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="560" y1="300" x2="740" y2="170" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="560" y1="320" x2="740" y2="450" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-material-pixel)" opacity="0.85" />
              <line x1="770" y1="150" x2="815" y2="150" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-demand)" opacity="0.85" />
              <line x1="770" y1="470" x2="815" y2="470" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-demand)" opacity="0.85" />

              {/* Order Lines: Cyan Cyber Fiber */}
              <line x1="510" y1="320" x2="345" y2="190" stroke="#00d2d3" strokeWidth="1.8" strokeDasharray="4 3" markerEnd="url(#arrow-order-pixel)" opacity="0.9" />
              <line x1="510" y1="300" x2="345" y2="430" stroke="#00d2d3" strokeWidth="1.8" strokeDasharray="4 3" markerEnd="url(#arrow-order-pixel)" opacity="0.9" />
              <line x1="730" y1="190" x2="570" y2="320" stroke="#00d2d3" strokeWidth="1.8" strokeDasharray="4 3" markerEnd="url(#arrow-order-pixel)" opacity="0.9" />
              <line x1="730" y1="430" x2="570" y2="300" stroke="#00d2d3" strokeWidth="1.8" strokeDasharray="4 3" markerEnd="url(#arrow-order-pixel)" opacity="0.9" />
            </g>
          ) : (
            /* Classic Vector Lines */
            <g>
              <line x1="120" y1="310" x2="310" y2="170" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="120" y1="310" x2="310" y2="450" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="330" y1="170" x2="520" y2="300" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="330" y1="450" x2="520" y2="320" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="560" y1="300" x2="740" y2="170" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="560" y1="320" x2="740" y2="450" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-material-classic)" />
              <line x1="770" y1="150" x2="815" y2="150" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-demand)" />
              <line x1="770" y1="470" x2="815" y2="470" stroke="#71717a" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrow-demand)" />

              <line x1="510" y1="320" x2="345" y2="190" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrow-order-classic)" opacity="0.9" />
              <line x1="510" y1="300" x2="345" y2="430" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrow-order-classic)" opacity="0.9" />
              <line x1="730" y1="190" x2="570" y2="320" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrow-order-classic)" opacity="0.9" />
              <line x1="730" y1="430" x2="570" y2="300" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrow-order-classic)" opacity="0.9" />
            </g>
          )}

          {/* ─── 2. Moving Cargo Trucks (🚚 Material Shipment) ─── */}
          {activeFrame?.trucks.map((truck: SimTruck) => {
            const pt = getPointAlong(truck.from, truck.to, truck.progress, -15);

            if (viewMode === "pixel") {
              return (
                <g key={truck.id} transform={`translate(${pt.x}, ${pt.y})`} filter="url(#badge-shadow)">
                  {/* Retro Pixel Payload Badge */}
                  <rect x="-24" y="-32" width="48" height="18" fill="#0b0e14" stroke="#f59e0b" strokeWidth="1.2" shapeRendering="crispEdges" />
                  <text x="0" y="-19" textAnchor="middle" fill="#fef08a" fontSize="11" fontWeight="700" fontFamily="monospace">
                    {truck.payload}
                  </text>

                  {/* 16-bit Retro Pixel Truck Sprite */}
                  <g transform="translate(-18, -12)" shapeRendering="crispEdges">
                    {/* Trailer Cargo Body */}
                    <rect x="0" y="2" width="18" height="13" fill="#f59e0b" />
                    <rect x="3" y="4" width="4" height="9" fill="#d97706" />
                    <rect x="10" y="4" width="4" height="9" fill="#d97706" />
                    {/* Cab */}
                    <rect x="18" y="5" width="10" height="10" fill="#3b82f6" />
                    <rect x="20" y="6" width="6" height="4" fill="#bae6fd" />
                    {/* Headlight beam */}
                    <polygon points="28,9 36,6 36,13 28,11" fill="#fef08a" opacity="0.5" />
                    {/* Wheels */}
                    <rect x="3" y="15" width="5" height="4" fill="#0f172a" />
                    <rect x="20" y="15" width="5" height="4" fill="#0f172a" />
                    <rect x="4" y="16" width="3" height="2" fill="#94a3b8" />
                    <rect x="21" y="16" width="3" height="2" fill="#94a3b8" />
                    {/* Exhaust Smoke Puff */}
                    <circle cx="-3" cy="11" r="2.5" fill="#94a3b8" opacity="0.8" className="pixel-smoke-anim" />
                  </g>
                </g>
              );
            }

            // Classic Truck
            return (
              <g key={truck.id} transform={`translate(${pt.x}, ${pt.y})`} filter="url(#badge-shadow)">
                <rect x="-24" y="-30" width="48" height="20" rx="4" fill="#111827" stroke="#374151" strokeWidth="1" />
                <text x="0" y="-16" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
                  {truck.payload}
                </text>
                <g transform="translate(-16, -10)">
                  <rect x="0" y="2" width="22" height="16" rx="2" fill="#fb923c" stroke="#c2410c" strokeWidth="1" />
                  <rect x="18" y="6" width="10" height="12" rx="2" fill="#38bdf8" />
                  <circle cx="6" cy="18" r="3" fill="#1f2937" stroke="#4b5563" strokeWidth="1" />
                  <circle cx="23" cy="18" r="3" fill="#1f2937" stroke="#4b5563" strokeWidth="1" />
                </g>
              </g>
            );
          })}

          {/* ─── 3. Moving Order Packets (📄 / 💾 Information Flow IO) ─── */}
          {activeFrame?.orders.map((ord: SimOrder) => {
            const pt = getPointAlong(ord.from, ord.to, ord.progress, 15);

            if (viewMode === "pixel") {
              return (
                <g key={ord.id} transform={`translate(${pt.x}, ${pt.y})`} filter="url(#badge-shadow)">
                  {/* Cyber Data Disk / Hologram Scroll Sprite */}
                  <g transform="translate(-12, -22)" shapeRendering="crispEdges">
                    <rect x="2" y="2" width="16" height="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                    <rect x="5" y="4" width="10" height="5" fill="#e0f2fe" />
                    <rect x="5" y="12" width="10" height="5" fill="#0369a1" />
                    {/* Blinking Data LED */}
                    <rect x="11" y="6" width="2.5" height="2" fill="#f97316" className="pixel-antenna-pulse" />
                  </g>

                  {/* Quantity Badge */}
                  <rect x="-20" y="2" width="40" height="16" fill="#082f49" stroke="#38bdf8" strokeWidth="1" shapeRendering="crispEdges" />
                  <text x="0" y="14" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="700" fontFamily="monospace">
                    IO:{ord.qty}
                  </text>
                </g>
              );
            }

            // Classic Order Document
            return (
              <g key={ord.id} transform={`translate(${pt.x}, ${pt.y})`} filter="url(#badge-shadow)">
                <g transform="translate(-12, -26)">
                  <rect x="0" y="0" width="18" height="24" rx="3" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" />
                  <line x1="4" y1="6" x2="14" y2="6" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
                  <line x1="4" y1="11" x2="14" y2="11" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
                  <line x1="4" y1="16" x2="10" y2="16" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="2" cy="18" r="6" fill="#f97316" stroke="#fff" strokeWidth="1.5" />
                  <line x1="2" y1="15" x2="2" y2="18" stroke="#fff" strokeWidth="1" />
                  <line x1="2" y1="18" x2="5" y2="18" stroke="#fff" strokeWidth="1" />
                </g>
                <text x="0" y="14" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold">
                  {ord.qty}
                </text>
              </g>
            );
          })}

          {/* ─── 4. Warehouse Nodes (Buildings, Pixel Staff, Sparklines) ─── */}
          {data?.nodes.map((node: SimNode) => {
            const currentStock = activeFrame?.inventory[node.id] ?? 0;
            const history = activeFrame?.node_histories[node.id] || [];
            const operatorStatus = getNodeOperatorStatus(node.id);

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {viewMode === "pixel" ? (
                  /* ─── 8-BIT PIXEL ART WAREHOUSE & OPERATOR ─── */
                  <>
                    {/* Pixel Warehouse Building */}
                    <g transform="translate(-32, -54)" shapeRendering="crispEdges">
                      {/* Stepped Terracotta Shingles */}
                      <rect x="14" y="0" width="36" height="4" fill="#991b1b" />
                      <rect x="10" y="4" width="44" height="4" fill="#dc2626" />
                      <rect x="6" y="8" width="52" height="4" fill="#991b1b" />
                      <rect x="2" y="12" width="60" height="4" fill="#ef4444" />
                      <rect x="0" y="16" width="64" height="3" fill="#7f1d1d" />

                      {/* Main Brick Wall */}
                      <rect x="4" y="19" width="56" height="34" fill="#334155" />
                      {/* Mortar texture accents */}
                      <rect x="8" y="22" width="6" height="3" fill="#1e293b" />
                      <rect x="22" y="22" width="8" height="3" fill="#1e293b" />
                      <rect x="38" y="22" width="8" height="3" fill="#1e293b" />
                      <rect x="14" y="28" width="8" height="3" fill="#1e293b" />
                      <rect x="30" y="28" width="8" height="3" fill="#1e293b" />
                      <rect x="46" y="28" width="8" height="3" fill="#1e293b" />

                      {/* Roll-up Bay Door with Shutter Slats */}
                      <rect x="18" y="32" width="26" height="21" fill="#64748b" />
                      <line x1="18" y1="36" x2="44" y2="36" stroke="#334155" strokeWidth="1" />
                      <line x1="18" y1="40" x2="44" y2="40" stroke="#334155" strokeWidth="1" />
                      <line x1="18" y1="44" x2="44" y2="44" stroke="#334155" strokeWidth="1" />
                      <line x1="18" y1="48" x2="44" y2="48" stroke="#334155" strokeWidth="1" />

                      {/* Safety Hazard Stripes above Door */}
                      <rect x="18" y="31" width="4" height="2" fill="#eab308" />
                      <rect x="22" y="31" width="4" height="2" fill="#1e293b" />
                      <rect x="26" y="31" width="4" height="2" fill="#eab308" />
                      <rect x="30" y="31" width="4" height="2" fill="#1e293b" />
                      <rect x="34" y="31" width="4" height="2" fill="#eab308" />
                      <rect x="38" y="31" width="4" height="2" fill="#1e293b" />

                      {/* Stacks of Wooden Cargo Crates */}
                      <rect x="6" y="41" width="10" height="10" fill="#b45309" />
                      <rect x="7" y="42" width="8" height="8" fill="#d97706" />
                      <line x1="7" y1="42" x2="15" y2="50" stroke="#78350f" strokeWidth="1" />
                      <rect x="46" y="43" width="8" height="8" fill="#d97706" stroke="#78350f" strokeWidth="1" />

                      {/* Warehouse Beacon Lamp */}
                      <circle cx="31" cy="27" r="2.5" fill="#fde047" />
                    </g>

                    {/* Pixel Warehouse Staff / Petugas Gudang (Walking / Working Beside Warehouse) */}
                    <g transform="translate(34, -42)" className="pixel-agent-bob" shapeRendering="crispEdges">
                      {/* Thought / Speech Bubble */}
                      <rect x="-20" y="-22" width="66" height="15" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="2" />
                      <text x="13" y="-11" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="7.5" fontWeight="bold">
                        {operatorStatus}
                      </text>
                      <polygon points="2,-7 6,-3 7,-7" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" />

                      {/* Yellow Safety Helmet (Helm Proyek Kuning APD) */}
                      <rect x="3" y="1" width="12" height="4" fill="#eab308" />
                      <rect x="2" y="4" width="14" height="2" fill="#ca8a04" />

                      {/* Face / Head */}
                      <rect x="4" y="6" width="10" height="6" fill="#fed7aa" />
                      {/* Eyes */}
                      <rect x="6" y="8" width="2" height="2" fill="#1e293b" />
                      <rect x="10" y="8" width="2" height="2" fill="#1e293b" />

                      {/* Orange Safety Vest with Reflective Stripes */}
                      <rect x="3" y="12" width="12" height="11" fill="#ea580c" />
                      <rect x="5" y="14" width="8" height="3" fill="#f8fafc" />
                      <rect x="5" y="19" width="8" height="2" fill="#f8fafc" />

                      {/* Arms holding Scanner / Clipboard */}
                      <rect x="1" y="13" width="2" height="7" fill="#ea580c" />
                      <rect x="15" y="13" width="2" height="7" fill="#ea580c" />
                      <rect x="14" y="17" width="4" height="5" fill="#38bdf8" />

                      {/* Legs in Navy Work Trousers */}
                      <rect x="4" y="23" width="4" height="7" fill="#1e293b" />
                      <rect x="10" y="23" width="4" height="7" fill="#1e293b" />
                    </g>

                    {/* Stock Badge (Top of building) */}
                    <rect
                      x={currentStock >= 10000 ? -42 : -30}
                      y="-74"
                      width={currentStock >= 10000 ? 84 : 60}
                      height="20"
                      fill="#020617"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      shapeRendering="crispEdges"
                    />
                    <text x="0" y="-60" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold" fontFamily="monospace">
                      {currentStock.toLocaleString()}
                    </text>
                  </>
                ) : (
                  /* ─── CLASSIC VECTOR WAREHOUSE ─── */
                  <>
                    <g transform="translate(-30, -50)">
                      <polygon points="30,0 0,22 60,22" fill="#e05a47" stroke="#b91c1c" strokeWidth="1.5" />
                      <line x1="24" y1="12" x2="36" y2="12" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                      <line x1="22" y1="16" x2="38" y2="16" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                      <rect x="5" y="22" width="50" height="34" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                      <rect x="18" y="32" width="24" height="24" fill="#94a3b8" />
                      <rect x="22" y="38" width="8" height="8" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
                      <rect x="30" y="42" width="8" height="8" fill="#f59e0b" stroke="#92400e" strokeWidth="0.8" />
                      <rect x="25" y="46" width="8" height="8" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
                    </g>
                    <rect
                      x={currentStock >= 10000 ? -38 : -26}
                      y="-72"
                      width={currentStock >= 10000 ? 76 : 52}
                      height="22"
                      rx="3"
                      fill="#000000"
                      stroke="#374151"
                      strokeWidth="1"
                    />
                    <text x="0" y="-56" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
                      {currentStock.toLocaleString()}
                    </text>
                  </>
                )}

                {/* Warehouse Name Label */}
                <text x="0" y="16" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="monospace">
                  {node.name}
                </text>

                {/* ─── CRT Monitor / Mini Sparkline Chart Container ─── */}
                <g transform="translate(-42, 24)">
                  {/* CRT Bezel / Monitor Container */}
                  <rect
                    x="0"
                    y="0"
                    width="84"
                    height="114"
                    fill="#0a0f18"
                    stroke={viewMode === "pixel" ? "#22d3ee" : "#33363f"}
                    strokeWidth={viewMode === "pixel" ? 1.5 : 1}
                    rx={viewMode === "pixel" ? 0 : 3}
                    shapeRendering={viewMode === "pixel" ? "crispEdges" : "auto"}
                  />

                  {/* Corner screws in Pixel CRT mode */}
                  {viewMode === "pixel" && (
                    <>
                      <rect x="2" y="2" width="3" height="3" fill="#475569" shapeRendering="crispEdges" />
                      <rect x="79" y="2" width="3" height="3" fill="#475569" shapeRendering="crispEdges" />
                      <rect x="2" y="109" width="3" height="3" fill="#475569" shapeRendering="crispEdges" />
                      <rect x="79" y="109" width="3" height="3" fill="#475569" shapeRendering="crispEdges" />
                    </>
                  )}

                  {/* Y Axis Label: Inventory */}
                  <text
                    x="-55"
                    y="10"
                    transform="rotate(-90)"
                    textAnchor="middle"
                    fill={viewMode === "pixel" ? "#38bdf8" : "#94a3b8"}
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    Inventory
                  </text>

                  {/* Y Axis Scale ticks */}
                  {node.id === "N0" ? (
                    <>
                      <text x="14" y="16" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">100k</text>
                      <text x="14" y="44" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">60k</text>
                      <text x="14" y="72" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">20k</text>
                      <text x="24" y="96" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">0</text>
                    </>
                  ) : node.id === "N5" || node.id === "N4" ? (
                    <>
                      <text x="16" y="18" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">125</text>
                      <text x="16" y="42" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">75</text>
                      <text x="16" y="68" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">25</text>
                      <text x="22" y="96" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">0</text>
                    </>
                  ) : (
                    <>
                      <text x="16" y="18" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">300</text>
                      <text x="16" y="42" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">200</text>
                      <text x="16" y="68" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">100</text>
                      <text x="22" y="96" fill="#cbd5e1" fontSize="7.5" fontWeight="500" fontFamily="monospace">0</text>
                    </>
                  )}

                  {/* Axis lines */}
                  <line x1="32" y1="12" x2="32" y2="94" stroke="#475569" strokeWidth="1" />
                  <line x1="32" y1="94" x2="80" y2="94" stroke="#475569" strokeWidth="1" />

                  {/* Polyline curve (Dynamic stock trend) */}
                  {history.length > 1 && (
                    <>
                      <polyline
                        fill="none"
                        stroke={viewMode === "pixel" ? "#00f0ff" : "#38bdf8"}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={history
                          .map((h: { day: number; val: number }) => {
                            const px = 32 + (h.day / 60) * 46;
                            const ratio = Math.min(1, Math.max(0, h.val / node.max_inv));
                            const py = 94 - ratio * 78;
                            return `${px.toFixed(1)},${py.toFixed(1)}`;
                          })
                          .join(" ")}
                      />
                      {(() => {
                        const lastH = history[history.length - 1];
                        const lastPx = 32 + (lastH.day / 60) * 46;
                        const lastPy = 94 - Math.min(1, Math.max(0, lastH.val / node.max_inv)) * 78;
                        return (
                          <circle
                            cx={lastPx}
                            cy={lastPy}
                            r="2.5"
                            fill={viewMode === "pixel" ? "#00f0ff" : "#38bdf8"}
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                        );
                      })()}
                    </>
                  )}

                  {/* X Axis Label: Date */}
                  <text x="56" y="108" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontWeight="600" fontFamily="monospace">
                    Date
                  </text>
                  <text x="32" y="102" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 32 102)">
                    2023-01
                  </text>
                  <text x="52" y="102" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 52 102)">
                    2023-02
                  </text>
                  <text x="70" y="102" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 70 102)">
                    2023-03
                  </text>
                </g>
              </g>
            );
          })}

          {/* ─── 5. Demand Sinks on the Right (Served vs Missed) ─── */}
          {data?.demands.map((dem: { id: string; name: string; connected_node: string; x: number; y: number }) => {
            const hist = activeFrame?.demand_histories[dem.id] || [];

            return (
              <g key={dem.id} transform={`translate(${dem.x}, ${dem.y - 70})`}>
                {/* Title */}
                <text x="42" y="-16" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="monospace">
                  {viewMode === "pixel" ? ">> DEMAND KONSINYASI <<" : "Demand Konsinyasi"}
                </text>

                {/* Card Container */}
                <rect
                  x="0"
                  y="-5"
                  width="84"
                  height="138"
                  fill="#0a0f18"
                  stroke={viewMode === "pixel" ? "#ec4899" : "#33363f"}
                  strokeWidth={viewMode === "pixel" ? 1.5 : 1}
                  rx={viewMode === "pixel" ? 0 : 3}
                  shapeRendering={viewMode === "pixel" ? "crispEdges" : "auto"}
                />

                {/* Legend: Missed (red) vs Served (green) */}
                <rect x="8" y="5" width="8" height="2.5" fill="#ef4444" rx={1} />
                <text x="20" y="8" fill="#f87171" fontSize="8" fontWeight="700" fontFamily="monospace">Missed</text>

                <rect x="8" y="14" width="8" height="2.5" fill="#22c55e" rx={1} />
                <text x="20" y="17" fill="#4ade80" fontSize="8" fontWeight="700" fontFamily="monospace">Served</text>

                {/* Y Axis Scale */}
                <text x="6" y="32" fill="#cbd5e1" fontSize="8" fontWeight="500" fontFamily="monospace">20</text>
                <text x="6" y="52" fill="#cbd5e1" fontSize="8" fontWeight="500" fontFamily="monospace">15</text>
                <text x="6" y="72" fill="#cbd5e1" fontSize="8" fontWeight="500" fontFamily="monospace">10</text>
                <text x="6" y="92" fill="#cbd5e1" fontSize="8" fontWeight="500" fontFamily="monospace">5</text>
                <text x="6" y="112" fill="#cbd5e1" fontSize="8" fontWeight="500" fontFamily="monospace">0</text>

                {/* Axis lines */}
                <line x1="22" y1="26" x2="22" y2="114" stroke="#475569" strokeWidth="1" />
                <line x1="22" y1="114" x2="80" y2="114" stroke="#475569" strokeWidth="1" />

                {/* Served line (Green) */}
                {hist.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={hist
                      .map((h) => {
                        const px = 22 + (h.day / 60) * 56;
                        const ratio = Math.min(1, Math.max(0, h.served / 20));
                        const py = 114 - ratio * 84;
                        return `${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(" ")}
                  />
                )}

                {/* Missed line (Red) */}
                {hist.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={hist
                      .map((h) => {
                        const px = 22 + (h.day / 60) * 56;
                        const ratio = Math.min(1, Math.max(0, h.missed / 20));
                        const py = 114 - ratio * 84;
                        return `${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(" ")}
                  />
                )}

                {/* X Axis Date ticks */}
                <text x="24" y="127" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 24 127)">
                  2023-01
                </text>
                <text x="46" y="127" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 46 127)">
                  2023-02
                </text>
                <text x="68" y="127" fill="#94a3b8" fontSize="6.5" fontWeight="500" fontFamily="monospace" transform="rotate(-30 68 127)">
                  2023-03
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ─── Distribution Activity Log Monitor ─── */}
      <div
        style={{
          marginTop: "1rem",
          background: "#080c14",
          border: "1px solid #1e293b",
          borderRadius: "8px",
          padding: "0.85rem 1.15rem",
          fontFamily: "monospace",
          fontSize: "0.82rem",
          lineHeight: "1.5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.35rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#38bdf8", fontWeight: 700 }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
            <span>STREAM MONITOR DISTRIBUSI &amp; LOGISTIK (HARI {currentDay} / {activeFrame?.date})</span>
          </div>
          <span style={{ color: "#64748b", fontSize: "0.75rem" }}>SISTEM MONITORING SUPPLY CHAIN CPA</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.6rem", color: "#cbd5e1" }}>
          <div style={{ background: "#0f172a", padding: "0.5rem 0.75rem", borderRadius: "4px", borderLeft: "3px solid #f59e0b" }}>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>&gt; INTERNAL TRANSFER (IT):</span>{" "}
            {activeFrame?.trucks.length ? `${activeFrame.trucks.length} armada truk aktif dalam perjalanan. Total muatan: ${activeFrame.trucks.reduce((a: number, b: SimTruck) => a + b.payload, 0)} unit.` : "Tidak ada pergerakan transfer saat ini."}
          </div>
          <div style={{ background: "#0f172a", padding: "0.5rem 0.75rem", borderRadius: "4px", borderLeft: "3px solid #38bdf8" }}>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>&gt; INTERNAL ORDER (IO):</span>{" "}
            {activeFrame?.orders.length ? `${activeFrame.orders.length} dokumen pesanan IO aktif. Total permintaan: ${activeFrame.orders.reduce((a: number, b: SimOrder) => a + b.qty, 0)} unit.` : "Alur permintaan pesanan IO stabil."}
          </div>
          <div style={{ background: "#0f172a", padding: "0.5rem 0.75rem", borderRadius: "4px", borderLeft: "3px solid #22c55e" }}>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>&gt; PEMENUHAN KONSINYASI (DO):</span>{" "}
            Terpenuhi {((activeFrame?.demand?.D1?.served || 0) + (activeFrame?.demand?.D2?.served || 0))} unit hari ini (Tertunda: {((activeFrame?.demand?.D1?.missed || 0) + (activeFrame?.demand?.D2?.missed || 0))}).
          </div>
        </div>
      </div>

      {/* ─── Simulation Highlights / Metrics Footer ─── */}
      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        <div style={{ background: "#131722", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #232d42" }}>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Active Shipments (IT)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fb923c", fontFamily: "monospace" }}>
            {activeFrame?.trucks.length || 0} Truk Mengangkut
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Muatan aktif: {activeFrame?.trucks.reduce((a: number, b: SimTruck) => a + b.payload, 0) || 0} unit
          </div>
        </div>

        <div style={{ background: "#131722", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #232d42" }}>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Order In-Flight (IO)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
            {activeFrame?.orders.length || 0} Dokumen Pesanan
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Total pesanan: {activeFrame?.orders.reduce((a: number, b: SimOrder) => a + b.qty, 0) || 0} unit
          </div>
        </div>

        <div style={{ background: "#131722", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #232d42" }}>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Demand Fulfillment (Served)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#22c55e", fontFamily: "monospace" }}>
            {((activeFrame?.demand?.D1?.served || 0) + (activeFrame?.demand?.D2?.served || 0))} unit
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Missed / Backorders: {((activeFrame?.demand?.D1?.missed || 0) + (activeFrame?.demand?.D2?.missed || 0))} unit
          </div>
        </div>
      </div>
    </div>
  );
}
