"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, ExternalLink, Code2, Eye, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";

interface MermaidViewerProps {
  chart: string;
}

export default function MermaidViewer({ chart }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"diagram" | "code">("diagram");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function renderMermaid() {
      setIsLoading(true);
      setRenderError(null);

      try {
        if (typeof window !== "undefined") {
          // @ts-ignore
          let mermaid = window.mermaid;
          if (!mermaid) {
            await new Promise<void>((resolve, reject) => {
              const existingScript = document.getElementById("mermaid-cdn-script");
              if (existingScript) {
                // @ts-ignore
                if (window.mermaid) return resolve();
                existingScript.addEventListener("load", () => resolve());
                existingScript.addEventListener("error", () => reject(new Error("Failed to load mermaid")));
                return;
              }
              const script = document.createElement("script");
              script.id = "mermaid-cdn-script";
              script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
              script.async = true;
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load mermaid script from CDN"));
              document.head.appendChild(script);
            });
            // @ts-ignore
            mermaid = window.mermaid;
          }

          if (mermaid && isMounted) {
            mermaid.initialize({
              startOnLoad: false,
              theme: "dark",
              securityLevel: "loose",
              flowchart: {
                curve: "basis",
                htmlLabels: true,
                useMaxWidth: true,
                padding: 15,
              },
              themeVariables: {
                darkMode: true,
                background: "#1E1E1E",
                primaryColor: "#0D99FF",
                primaryTextColor: "#FFFFFF",
                primaryBorderColor: "#3DABFF",
                lineColor: "#3AC977",
                secondaryColor: "#242424",
                tertiaryColor: "#1a1a1a",
                nodeBorder: "#444444",
                clusterBkg: "#242424",
                clusterBorder: "#3b4252",
                titleColor: "#0D99FF",
                edgeLabelBackground: "#1E1E1E",
              },
            });

            const uniqueId = `mermaid-svg-${Date.now()}`;
            const { svg } = await mermaid.render(uniqueId, chart);
            if (isMounted) {
              setSvgContent(svg);
              setIsLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        if (isMounted) {
          setRenderError(err.message || "Gagal merender diagram otomatis.");
          setIsLoading(false);
        }
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(0.6, Math.round((prev + delta) * 100) / 100), 1.8));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--bg-border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-md)"
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid var(--bg-border)",
        background: "rgba(255,255,255,0.02)",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            display: "inline-flex",
            background: "rgba(0,0,0,0.3)",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid var(--bg-border)"
          }}>
            <button
              onClick={() => setActiveTab("diagram")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "var(--transition-fast)",
                background: activeTab === "diagram" ? "var(--color-primary)" : "transparent",
                color: activeTab === "diagram" ? "#fff" : "var(--text-muted)",
              }}
            >
              <Eye size={15} />
              Diagram Interaktif
            </button>
            <button
              onClick={() => setActiveTab("code")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "var(--transition-fast)",
                background: activeTab === "code" ? "var(--color-primary)" : "transparent",
                color: activeTab === "code" ? "#fff" : "var(--text-muted)",
              }}
            >
              <Code2 size={15} />
              Mermaid Source
            </button>
          </div>

          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            flowchart TB • 6 Layer Arsitektur Microservices
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {activeTab === "diagram" && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "2px 6px", borderRadius: "6px" }}>
              <button
                onClick={() => handleZoom(-0.15)}
                title="Zoom Out"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "4px"
                }}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", minWidth: "42px", textAlign: "center" }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.15)}
                title="Zoom In"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "4px"
                }}
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.7rem",
                  padding: "4px 6px",
                  cursor: "pointer",
                  marginLeft: "2px"
                }}
              >
                Reset
              </button>
            </div>
          )}

          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: copied ? "rgba(58,201,119,0.15)" : "rgba(255,255,255,0.05)",
              color: copied ? "var(--color-success)" : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)"
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Tersalin!" : "Salin Kode"}
          </button>

          <a
            href="https://bit.ly/mermaid-CPA-platform"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(13,153,255,0.4)",
              background: "rgba(13,153,255,0.12)",
              color: "var(--color-primary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              transition: "var(--transition-fast)"
            }}
          >
            <ExternalLink size={14} />
            Buka di Live Editor
          </a>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "diagram" ? (
        <div
          ref={containerRef}
          style={{
            minHeight: "560px",
            maxHeight: "820px",
            overflow: "auto",
            padding: "2rem 1.5rem",
            background: "#161616",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text-muted)" }}>
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.85rem" }}>Memuat & merender diagram arsitektur...</span>
            </div>
          )}

          {renderError && !isLoading && (
            <div style={{
              textAlign: "center",
              maxWidth: "600px",
              padding: "1.5rem",
              borderRadius: "10px",
              background: "rgba(255,94,94,0.1)",
              border: "1px solid rgba(255,94,94,0.3)",
              color: "var(--color-danger)"
            }}>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Gagal merender diagram otomatis</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{renderError}</p>
              <button
                onClick={() => setActiveTab("code")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "var(--color-primary)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                Tampilkan Kode Sumber Mermaid
              </button>
            </div>
          )}

          {!isLoading && svgContent && (
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 150ms ease-out",
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      ) : (
        <div style={{
          position: "relative",
          background: "#131313",
          padding: "1.25rem",
          overflowX: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "#A6ACCD",
          maxHeight: "600px",
        }}>
          <pre style={{ margin: 0 }}>
            <code>{chart}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
