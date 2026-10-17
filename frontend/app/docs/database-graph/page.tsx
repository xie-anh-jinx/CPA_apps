"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import the force graph to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      Memuat Interactive Graph...
    </div>
  ),
});

export default function DatabaseGraphPage() {
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const data = {
    nodes: [
      { id: "users", name: "Users", group: 1, val: 25 },
      { id: "roles", name: "Roles", group: 1, val: 15 },
      { id: "permissions", name: "Permissions", group: 1, val: 15 },
      { id: "warehouses", name: "Warehouses", group: 2, val: 20 },
      { id: "inventory_items", name: "Inventory Items", group: 2, val: 25 },
      { id: "stock_mutations", name: "Stock Mutations", group: 2, val: 15 },
      { id: "distributions", name: "Distributions", group: 2, val: 15 },
      { id: "customers", name: "Customers", group: 3, val: 25 },
      { id: "invoices", name: "Invoices", group: 3, val: 20 },
      { id: "sales_orders", name: "Sales Orders", group: 3, val: 20 },
      { id: "ar_aging", name: "AR Aging", group: 4, val: 15 },
      { id: "kita_dashboard", name: "KITA API (External)", group: 5, val: 30 }
    ],
    links: [
      { source: "roles", target: "users" },
      { source: "permissions", target: "roles" },
      { source: "users", target: "inventory_items" },
      { source: "warehouses", target: "inventory_items" },
      { source: "warehouses", target: "stock_mutations" },
      { source: "inventory_items", target: "stock_mutations" },
      { source: "warehouses", target: "distributions" },
      { source: "users", target: "customers" },
      { source: "customers", target: "invoices" },
      { source: "customers", target: "sales_orders" },
      { source: "invoices", target: "ar_aging" },
      { source: "kita_dashboard", target: "customers" }
    ]
  };

  const getGroupColor = (group: number) => {
    const colors = {
      1: "#10b981", // Emerald (Auth/Users)
      2: "#3b82f6", // Blue (Inventory)
      3: "#f59e0b", // Amber (CRM/Sales)
      4: "#ef4444", // Red (Finance)
      5: "#8b5cf6", // Purple (External)
    };
    return colors[group as keyof typeof colors] || "#9ca3af";
  };

  // Node rendering to look like Obsidian (dot with text label)
  const nodeCanvasObject = useCallback((node: any, ctx: any, globalScale: any) => {
    const label = node.name;
    const fontSize = 14 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    
    // Draw Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, (node.val || 10) / 3, 0, 2 * Math.PI, false);
    ctx.fillStyle = getGroupColor(node.group);
    ctx.fill();

    // Draw Label Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e5e7eb'; // text-gray-200
    ctx.fillText(label, node.x, node.y + ((node.val || 10) / 3) + fontSize);
  }, []);

  return (
    <div className="page-container" style={{ padding: "2rem" }}>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>Database Graph (Force-Directed)</h1>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }} ref={containerRef}>
        <div style={{ height: "600px", background: "#111", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--bg-border)" }}>
          <ForceGraph2D
            width={containerWidth - 40}
            height={600}
            graphData={data}
            nodeLabel="name"
            nodeColor={node => getGroupColor(node.group as number)}
            linkColor={() => "rgba(255,255,255,0.25)"}
            nodeCanvasObject={nodeCanvasObject}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            backgroundColor="#111"
          />
        </div>
      </div>
      
      <div className="card">
        <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Keterangan Warna (Domain Level)</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }}></span> Auth & Akses (Users)</li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6" }}></span> Gudang & Stok</li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }}></span> Penjualan & CRM</li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }}></span> Finance & AR Aging</li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#8b5cf6" }}></span> Eksternal Data (KITA API)</li>
        </ul>
      </div>
    </div>
  );
}
