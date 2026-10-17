"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Radar,
  ScanBarcode,
  Network,
  CandlestickChart,
  Route,
  HeartHandshake,
  ScrollText,
  SlidersHorizontal,
  BellRing,
  ShieldCheck,
  Zap,
  Database,
  Server,
  Layers,
  Cpu,
  Boxes,
  Lock,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Terminal,
  Activity,
  ArrowUpRight,
  Building2,
  Users,
  Briefcase,
  FileSpreadsheet,
  Brain,
  TrendingUp,
  Target,
  BarChart3
} from "lucide-react";
import MermaidViewer from "./MermaidViewer";

const MERMAID_CHART = `flowchart TB

    subgraph ClientLayer ["Client & User Access Layer"]
        Browser["🖥️ Browser Desktop & Tablet"]
        Mobile["📱 Mobile Browser"]
    end

    subgraph ProxyLayer ["Gateway & Reverse Proxy"]
        Nginx["🌐 Nginx Reverse Proxy (Port 80/443 SSL)"]
    end

    subgraph AppLayer ["Application & Presentation Layer"]
        Frontend["⚛️ Next.js 16 (React 19, TypeScript)\\nContainer: cpa_frontend (Port 3001)"]
        Backend["⚡ FastAPI Backend (Python 3.12, Uvicorn)\\nContainer: cpa_backend (Port 8000)"]
    end

    subgraph AsyncLayer ["Background Processing & Real-time Layer"]
        Redis["🟥 Redis 7 (Cache, Broker & Pub/Sub)\\nContainer: cpa_redis (Port 6379)"]
        CeleryWorker["⚙️ Celery Worker (Sync, Analytics, Alerts)\\nContainer: cpa_celery_worker"]
        CeleryBeat["⏰ Celery Beat (Cron Scheduler)\\nContainer: cpa_celery_beat"]
        Flower["🌸 Flower Dashboard (Port 5555)\\nContainer: cpa_flower"]
        WAHA["💬 WAHA WhatsApp HTTP API (Port 3008)\\nContainer: cpa_waha"]
    end

    subgraph DataWarehouseLayer ["Data Warehouse & ETL Layer"]
        Airflow["🌪️ Apache Airflow (Scheduler & Webserver :8080)"]
        Metabase["📊 Metabase BI Server (Port 3005)"]
    end

    subgraph DatabaseLayer ["Data Storage Layer"]
        DB_Existing[("🐘 PostgreSQL 15: cpa_existing\\n(Read-Only ERP Data)")]
        DB_Analytics[("🐘 PostgreSQL 15: cpa_analytics\\n(ODS, CRM, Alerts, Users)")]
        DB_DWH[("🐘 PostgreSQL 15: Data Warehouse\\n(Historical & ETL Data)")]
    end

    Browser --> Nginx
    Mobile --> Nginx
    Nginx --> Frontend
    Frontend -->|REST API / HTTP| Backend
    Frontend <-->|WebSocket Real-time| Backend

    Backend -->|Read-Only Queries| DB_Existing
    Backend -->|Read & Write| DB_Analytics
    Backend -->|Pub/Sub & Cache| Redis

    CeleryBeat -->|Trigger Periodic Tasks| Redis
    Redis -->|Task Queue| CeleryWorker
    CeleryWorker -->|Read Core Data| DB_Existing
    CeleryWorker -->|Write Analytics & ODS| DB_Analytics
    CeleryWorker -->|Publish Real-time Events| Redis
    CeleryWorker -->|Trigger WA Alerts| WAHA

    Airflow -->|Heavy Batch ETL| DB_Existing
    Airflow -->|Load Marts| DB_DWH
    Metabase -->|Explore Analytics| DB_DWH
    Metabase -->|Explore Operational| DB_Analytics`;

const ML_FORECAST_MERMAID_CHART = `flowchart TB

    subgraph DataIngestion ["1. Ingestion & Backfill Transaksi"]
        ERP[("🐘 PostgreSQL: cpa_existing\\nt_sales_invoice_line")] -->|Agregasi Harian Nasional| DailySales[("📊 Table: daily_sales\\n16,886 baris (2022 - 2026)")]
    end

    subgraph FeatureEngineering ["2. Feature Engineering Deret Waktu"]
        DailySales --> Lags["Lags Penjualan\\n(t-1, t-7, t-14, t-30)"]
        DailySales --> Rolling["Rolling Statistics\\n(Mean, Std, Min, Max 7/14/30d)"]
        DailySales --> Calendar["Calendar Cyclical Encodings\\n(Day-of-Week sin/cos, Month sin/cos)"]
        DailySales --> Trends["Trend Slope\\n(Rasio Tren 7d vs 30d)"]
    end

    subgraph WalkForwardValidation ["3. Walk-Forward Cross Validation (Zero Leakage)"]
        Lags & Rolling & Calendar & Trends --> Splits["Temporal Window Splits\\n(Min Train=70%, Test=30 Hari)"]
        Splits --> SN["Seasonal Naive (7d Cycle)"]
        Splits --> MA["Moving Average (7d & 30d)"]
        Splits --> NV["Naive Benchmark (Last Value)"]
        Splits --> LGBM["LightGBM Quantile (p10, p50, p90)"]
    end

    subgraph ModelCompetition ["4. Model Competition & Registry"]
        SN & MA & NV & LGBM --> Compete{"Komparasi Otomatis\\n(WAPE & Bias %)"}
        Compete --> Winner["🏆 Algoritma Terbaik per SKU"]
        Winner --> Registry[("📋 Table: forecast_products\\nRegistry Best Model & WAPE")]
        Winner --> Metrics[("📈 Table: model_metrics\\nAudit Log MAE, RMSE, WAPE, Bias")]
    end

    subgraph MultiHorizonInference ["5. Proyeksi Multi-Horizon"]
        Winner --> Predict["Prediksi 7, 30, dan 90 Hari\\n+ Confidence Bounds (±20% / Quantile)"]
        Predict --> ResultsDB[("🎯 Table: forecast_results\\n90 Baris Proyeksi Kebutuhan")]
    end

    subgraph ServingVisualization ["6. Serving & Visualisasi Interaktif"]
        ResultsDB --> FastAPI["⚡ FastAPI Router\\n/api/forecast/*"]
        FastAPI --> NextUI["🖥️ Next.js Dashboard /forecast\\n- Interactive Recharts Timeline\\n- Kartu Horizon 7d, 30d, 90d\\n- Rekomendasi Reorder Point (ROP)"]
    end`;


interface TechStackItem {
  layer: string;
  tech: string;
  role: string;
}

const TECH_STACK_DATA: TechStackItem[] = [
  {
    layer: "Frontend UI",
    tech: "Next.js 16.3.3 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS & Vanilla CSS",
    role: "Tampilan antarmuka berbasis web modern, responsif, berkecepatan tinggi dengan rendering standalone dan komponen interaktif.",
  },
  {
    layer: "Visualisasi & Ikon",
    tech: "Recharts 3.10, Lucide React",
    role: "Rendering grafik analitik interaktif (bar chart, pie chart, progress gauges) dan set ikon antarmuka modern.",
  },
  {
    layer: "State & Data Fetching",
    tech: "SWR 2.5, Zustand 5.0, Axios 1.20",
    role: "Manajemen state lokal, cache data client-side, dan pemanggilan HTTP REST API.",
  },
  {
    layer: "Backend API",
    tech: "FastAPI (Python 3.12), Uvicorn ASGI Server, Pydantic V2",
    role: "REST API berperforma tinggi dengan validasi schema otomatis, async request handling, dan dokumentasi Swagger/OpenAPI bawaan.",
  },
  {
    layer: "Database ORM",
    tech: "SQLAlchemy 2.0, Psycopg2-binary",
    role: "Interaksi database terstruktur dengan connection pooling efisien dan query SQL teroptimasi.",
  },
  {
    layer: "Logging & Metrik",
    tech: "Structlog, Prometheus Instrumentator",
    role: "Structured JSON logging untuk audit trail operasional dan monitoring metrik aplikasi (/metrics).",
  },
  {
    layer: "Database Core ERP",
    tech: "PostgreSQL 15 Alpine (cpa_db_existing)",
    role: "Salinan database ERP operasional existing (read-only) untuk isolasi beban kerja analitik.",
  },
  {
    layer: "Database Analitik",
    tech: "PostgreSQL 15 Alpine (cpa_db_analytics)",
    role: "Menyimpan data skema ODS, users, otorisasi RBAC, CRM pipeline, aktivitas, log audit, dan alert triggers.",
  },
  {
    layer: "Cache & Message Broker",
    tech: "Redis 7 Alpine (cpa_redis)",
    role: "Message broker untuk antrean tugas Celery, key-value cache, dan kanal Pub/Sub event real-time.",
  },
  {
    layer: "Asynchronous Workers",
    tech: "Celery, Celery Beat",
    role: "Pemrosesan tugas sinkronisasi periodik (15s – 5m) di latar belakang secara terisolasi tanpa memblokir request pengguna.",
  },
  {
    layer: "Worker Monitoring",
    tech: "Flower (cpa_flower)",
    role: "Web dashboard untuk memantau status eksekusi task, retry, dan performa Celery worker (Port 5555).",
  },
  {
    layer: "WhatsApp Gateway",
    tech: "WAHA (WhatsApp HTTP API) (cpa_waha)",
    role: "Service integrasi WhatsApp berbasis Webhook/REST API untuk otomasi pengiriman notifikasi instan.",
  },
  {
    layer: "Batch ETL / Orchestration",
    tech: "Apache Airflow 2.x",
    role: "Pipeline orkestrasi pembersihan dan agregasi data historis skala besar (data warehouse).",
  },
  {
    layer: "Business Intelligence",
    tech: "Metabase",
    role: "Dashboard pelaporan eksploratif dan visualisasi data SQL untuk tim data/manajemen.",
  },
  {
    layer: "Web Server & SSL",
    tech: "Nginx Reverse Proxy, Let's Encrypt",
    role: "Reverse proxy, SSL/TLS termination, kompresi gzip/brotli, dan routing port aplikasi.",
  },
  {
    layer: "Machine Learning & Forecasting",
    tech: "LightGBM 4.7, Facebook Prophet, Scikit-learn, Pandas, NumPy",
    role: "Pemodelan deret waktu, multi-step time-series forecasting, quantile regression (confidence intervals 10% dan 90%), dan feature engineering (lags, rolling statistics, calendar cyclical encodings).",
  },
  {
    layer: "Model Validation & Competition",
    tech: "Walk-Forward Cross Validation, WAPE, MAE, RMSE, Bias Tracking",
    role: "Evaluasi model tanpa data leakage pada data historis 4.5 tahun (16.886 baris), memilih otomatis model paling akurat untuk setiap SKU produk.",
  },
  {
    layer: "Konteinerisasi",
    tech: "Docker & Docker Compose",
    role: "Isolasi dependensi, portabilitas tinggi, kemudahan deployment, dan manajemen lifecycle kontainer.",
  },
];

interface ContainerItem {
  containerName: string;
  service: string;
  baseImage: string;
  internalPort: string;
  externalPort: string;
  description: string;
}

const CONTAINER_DATA: ContainerItem[] = [
  {
    containerName: "cpa_frontend",
    service: "Next.js App",
    baseImage: "node:20-alpine",
    internalPort: "3000",
    externalPort: "3001",
    description: "Antarmuka Pengguna Utama Platform CPA",
  },
  {
    containerName: "cpa_backend",
    service: "FastAPI API",
    baseImage: "python:3.12-slim",
    internalPort: "8000",
    externalPort: "8000 (Internal DWH)",
    description: "Layanan Backend REST API & WebSockets",
  },
  {
    containerName: "cpa_db_existing (Database Ultima 2024)",
    service: "ERP Core DB",
    baseImage: "postgres:15-alpine",
    internalPort: "5432",
    externalPort: "(Jaringan Internal)",
    description: "Database PostgreSQL Read-Only ERP",
  },
  {
    containerName: "cpa_db_analytics",
    service: "Analytics DB",
    baseImage: "postgres:15-alpine",
    internalPort: "5432",
    externalPort: "(Jaringan Internal)",
    description: "Database PostgreSQL Read-Write Platform",
  },
  {
    containerName: "cpa_redis",
    service: "Redis Broker",
    baseImage: "redis:7-alpine",
    internalPort: "6379",
    externalPort: "(Jaringan Internal)",
    description: "In-Memory Broker & Cache",
  },
  {
    containerName: "cpa_celery_worker",
    service: "Celery Worker",
    baseImage: "python:3.12-slim",
    internalPort: "—",
    externalPort: "—",
    description: "Pemroses antrean tugas sinkronisasi",
  },
  {
    containerName: "cpa_celery_beat",
    service: "Celery Beat",
    baseImage: "python:3.12-slim",
    internalPort: "—",
    externalPort: "—",
    description: "Penjadwal cron tugas sinkronisasi",
  },
  {
    containerName: "cpa_flower",
    service: "Flower Web",
    baseImage: "python:3.12-slim",
    internalPort: "5555",
    externalPort: "5555",
    description: "Web Dashboard Monitoring Celery Worker",
  },
  {
    containerName: "cpa_waha",
    service: "WhatsApp API",
    baseImage: "devlikeapro/waha",
    internalPort: "3000",
    externalPort: "3008",
    description: "WhatsApp HTTP Gateway API",
  },
  {
    containerName: "airflow-webserver",
    service: "Airflow Web",
    baseImage: "Custom Airflow 2",
    internalPort: "8080",
    externalPort: "8080",
    description: "UI Manajemen Pipeline Data Warehouse",
  },
  {
    containerName: "metabase",
    service: "Metabase BI",
    baseImage: "metabase/metabase",
    internalPort: "3000",
    externalPort: "3005",
    description: "Web Dashboard BI & Visual SQL Analytics",
  },
];

export default function DocsPage() {
  const [techFilter, setTechFilter] = useState("");
  const [containerFilter, setContainerFilter] = useState("");
  const [activeNav, setActiveNav] = useState("overview");

  const filteredTech = useMemo(() => {
    if (!techFilter) return TECH_STACK_DATA;
    const q = techFilter.toLowerCase();
    return TECH_STACK_DATA.filter(
      (item) =>
        item.layer.toLowerCase().includes(q) ||
        item.tech.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q)
    );
  }, [techFilter]);

  const filteredContainers = useMemo(() => {
    if (!containerFilter) return CONTAINER_DATA;
    const q = containerFilter.toLowerCase();
    return CONTAINER_DATA.filter(
      (item) =>
        item.containerName.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q) ||
        item.baseImage.toLowerCase().includes(q) ||
        item.externalPort.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [containerFilter]);

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "5rem" }}>
      {/* ─── Hero Header ────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        borderRadius: "var(--radius-xl)",
        padding: "2.5rem 2rem",
        marginBottom: "2rem",
        background: "linear-gradient(135deg, rgba(13,153,255,0.08) 0%, var(--bg-card) 60%, rgba(58,201,119,0.05) 100%)",
        border: "1px solid var(--bg-border)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden"
      }}>
        {/* Decorative backdrop shapes */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,153,255,0.2) 0%, transparent 70%)",
          filter: "blur(30px)",
          pointerEvents: "none"
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(13,153,255,0.2)",
            border: "1px solid rgba(13,153,255,0.4)",
            color: "var(--color-primary-light)",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase"
          }}>
            <Sparkles size={13} />
            DOKUMENTASI TEKNIS & FUNGSIONAL
          </span>
          <span style={{
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-muted)",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: 500
          }}>
            v1.0.0 Production • warehouse.pengajaran.com
          </span>
        </div>

        <h1 style={{
          fontSize: "2.3rem",
          fontWeight: 800,
          lineHeight: 1.25,
          color: "var(--text-primary)",
          marginBottom: "0.5rem"
        }}>
          CPA Analytics Platform
        </h1>

        <p style={{
          fontSize: "1.1rem",
          color: "var(--color-primary-light)",
          fontWeight: 500,
          marginBottom: "1rem"
        }}>
          CPA Inventory Intelligence, Distribution, CRM & Credit Control Platform
        </p>

        <p style={{
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          maxWidth: "980px",
          marginBottom: "1.75rem"
        }}>
          <strong>CPA Analytics Platform</strong> adalah sistem analitik operasional dan Business yang dirancang khusus
          untuk memonitor, menganalisis, dan mengendalikan seluruh siklus operasional bisnis distribusi CPA secara terintegrasi dan real-time.
          Platform ini bertindak sebagai <em>Analytics Layer</em> dari sistem ERP core (Ultima ERP), menjembatani kebutuhan lintas divisi secara presisi.
        </p>

        {/* Quick action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              background: "var(--color-primary)",
              color: "#FFFFFF",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "var(--shadow-glow-primary)",
              transition: "var(--transition-fast)"
            }}
          >
            <Radar size={16} />
            Buka Executive Dashboard
          </Link>

          <button
            onClick={() => scrollToSection("architecture-diagram")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition-fast)"
            }}
          >
            <Layers size={16} />
            Lihat Diagram Arsitektur
          </button>

          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "var(--transition-fast)"
            }}
          >
            <FileCode2 size={16} />
            Swagger REST API Docs
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ─── Sticky Sub-Navigation Bar ──────────────────────────── */}
      <div style={{
        position: "sticky",
        top: "60px",
        zIndex: 50,
        background: "rgba(30,30,30,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--bg-border)",
        margin: "0 -1.5rem 2.5rem -1.5rem",
        padding: "0.6rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        overflowX: "auto"
      }}>
        {[
          { id: "overview", label: "Latar Belakang & Peran" },
          { id: "operational-modules", label: "Modul Operasional" },
          { id: "demand-forecasting-module", label: "AI Demand Forecasting" },
          { id: "key-advantages", label: "Keunggulan Utama" },
          { id: "security-rls", label: "Keamanan & RBAC" },
          { id: "waha-notification", label: "WhatsApp Gateway" },
          { id: "architecture-diagram", label: "4.1 Arsitektur Sistem" },
          { id: "tech-stack", label: "4.2 Tech Stack" },
          { id: "container-mapping", label: "4.3 Pemetaan Kontainer" },
          { id: "ml-technical-spec", label: "4.4 Spesifikasi Teknis ML" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => scrollToSection(tab.id)}
            style={{
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition-fast)",
              background: activeNav === tab.id ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
              color: activeNav === tab.id ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Section 1: Overview & Lintas Divisi ───────────────── */}
      <section id="overview" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Briefcase size={20} style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Peran Platform & Dukungan Lintas Divisi
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Platform ini dirancang khusus untuk memadukan proses bisnis multi-cabang tanpa membebani server transaksi utama:
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem"
        }}>
          {/* Card 1: Manajemen Eksekutif */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(13,153,255,0.15)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <Radar size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
              Manajemen Eksekutif
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--color-primary)", fontWeight: 600, marginBottom: "0.6rem" }}>
              Direksi / General Manager
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Memantau performa bisnis, tren omzet, posisi aset stok, dan rasio piutang secara makro melalui dashboard eksekutif berkecepatan tinggi.
            </p>
          </div>

          {/* Card 2: Operasional Gudang */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(58,201,119,0.15)",
              color: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <ScanBarcode size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
              Operasional Gudang
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--color-success)", fontWeight: 600, marginBottom: "0.6rem" }}>
              Warehouse & Logistics Staff
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Memantau saldo stok multi-gudang, melacak mutasi transfer internal (Receipt IT In & IT Out), spesifikasi batch IBC tank, serta armada logistik.
            </p>
          </div>

          {/* Card 3: Divisi Penjualan */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(255,179,35,0.15)",
              color: "var(--color-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <HeartHandshake size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
              Divisi Penjualan
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--color-warning)", fontWeight: 600, marginBottom: "0.6rem" }}>
              Sales & Marketing / DSR
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Mengelola pipeline peluang penjualan (Kanban), direktori Customer 360, serta interaksi dan ticket penanganan keluhan pelanggan.
            </p>
          </div>

          {/* Card 4: Keuangan & Piutang */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(255,94,94,0.15)",
              color: "var(--color-danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <ScrollText size={22} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
              Keuangan & Piutang
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--color-danger)", fontWeight: 600, marginBottom: "0.6rem" }}>
              Finance, AR & Credit Control
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Mengontrol risiko kredit pelanggan, melakukan pre-delivery credit check sebelum barang dirilis, dan analisis umur piutang (AR Aging).
            </p>
          </div>
        </div>

        <div style={{
          padding: "0.85rem 1.25rem",
          background: "rgba(255,255,255,0.03)",
          borderLeft: "4px solid var(--color-primary)",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          fontStyle: "italic"
        }}>
          “Divisi lain dapat ditambahkan dan disesuaikan dengan database existing (ultima) atau kebutuhan lainnya.”
        </div>
      </section>

      {/* ─── Section 2: Modul Operasional ───────────────────────── */}
      <section id="operational-modules" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Boxes size={20} style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Fungsi Utama Aplikasi (Modul Operasional)
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.75rem" }}>
          Enam modul operasional terpadu yang memetakan seluruh alur bisnis dari gudang, penjualan, logistik hingga keuangan:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Module 1: Executive Dashboard */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(13,153,255,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-primary)" }}>
                  <Radar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Executive Dashboard
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-primary-light)" }}>/</code>
                </div>
              </div>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                Kunjungi Modul <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Metrik finansial & operasional:</strong> Total Omzet Penjualan (MTD / YTD), Total Nilai Persediaan Stok Seluruh Gudang, Total Piutang Aktif (AR) dan Piutang Jatuh Tempo (Overdue AR), Jumlah Pesanan Aktif dan Volume Pengiriman.
              </li>
              <li>
                <strong>Visualisasi analitik:</strong> Grafik tren penjualan historis, pencapaian target per cabang, dan peringatan dini operasional (system alerts).
              </li>
            </ul>
          </div>

          {/* Module 2: Manajemen Inventori & Warehouse */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(58,201,119,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-success)" }}>
                  <ScanBarcode size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Manajemen Inventori & Warehouse
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-success)" }}>/inventory & /warehouses</code>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link
                  href="/inventory"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600, textDecoration: "none" }}
                >
                  Stok <ArrowUpRight size={14} />
                </Link>
                <Link
                  href="/warehouses"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600, textDecoration: "none" }}
                >
                  Gudang <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Monitoring Stok Real-Time:</strong> Posisi stok fisik (On-Hand, Available, Reserved, Damaged, Quarantine) per item barang.
              </li>
              <li>
                <strong>Multi-Warehouse Analytics:</strong> Komparasi saldo stok antarcabang dan pergudangan (Sultanbatara: Makassar, Kendari, Palu; serta cabang lainnya).
              </li>
              <li>
                <strong>Tracking Mutasi Barang (Internal Transfer / IT):</strong>
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                  <li><em>Receipt IT In:</em> Pelacakan barang masuk ke gudang tujuan.</li>
                  <li><em>IT Out:</em> Pelacakan barang keluar dari gudang asal.</li>
                  <li>Detail spesifikasi batch, nomor IBC tank / skid tank, dan status pengiriman (Draft, Send, Receipt).</li>
                </ul>
              </li>
              <li>
                <strong>Analisis Persediaan:</strong> Identifikasi barang slow-moving, dead-stock, serta peringatan otomatis low-stock dan overstock.
              </li>
            </ul>
          </div>

          {/* Module 3: Penjualan & Monitoring Pesanan */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(13,153,255,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-primary)" }}>
                  <CandlestickChart size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Penjualan & Monitoring Pesanan
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-primary)" }}>/sales & /sales/orders</code>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link
                  href="/sales"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}
                >
                  Sales Monitoring <ArrowUpRight size={14} />
                </Link>
                <Link
                  href="/sales/orders"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}
                >
                  Sales Order <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Sales Monitoring:</strong> Analisis performa penjualan berdasarkan cabang, salesperson, kategori produk, dan customer.
              </li>
              <li>
                <strong>Sales Order (SO) Tracking:</strong> Pelacakan siklus hidup status pesanan dari draft hingga siap kirim.
              </li>
              <li>
                <strong>Pre-Delivery Credit Control:</strong> Evaluasi otomatis kelayakan pengiriman pesanan berdasarkan riwayat pembayaran dan status piutang customer sebelum barang dikeluarkan dari gudang.
              </li>
            </ul>
          </div>

          {/* Module 4: Distribusi & Logistik Pengiriman */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(58,201,119,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-success)" }}>
                  <Route size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Distribusi & Logistik Pengiriman
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-success)" }}>/distributions</code>
                </div>
              </div>
              <Link
                href="/distributions"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600, textDecoration: "none" }}
              >
                Kunjungi Modul <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Delivery Order (DO) Tracking:</strong> Pelacakan dokumen dan fisik pengiriman barang ke pelanggan secara akurat.
              </li>
              <li>
                <strong>Internal Order (IO) & Internal Transfer (IT):</strong> Pelacakan pergerakan stok antargudang cabang Sultanbatara dan cabang lainnya.
              </li>
              <li>
                <strong>Logistik & Ekspedisi:</strong> Detail armada pengangkut termasuk nomor polisi armada, identitas sopir, tanggal keberangkatan, dan estimasi tiba (SLA delivery).
              </li>
            </ul>
          </div>

          {/* Module 5: CRM & Customer 360 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(255,179,35,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-warning)" }}>
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    CRM & Customer 360
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-warning)" }}>/crm</code>
                </div>
              </div>
              <Link
                href="/crm"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-warning)", fontWeight: 600, textDecoration: "none" }}
              >
                Kunjungi Modul <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Customer 360 Directory:</strong> Profil komprehensif pelanggan, kategori, Person in Charge (PIC), cabang kantor penanggung jawab, termin pembayaran (TOP), dan batas plafon kredit.
              </li>
              <li>
                <strong>Sales Pipeline & Kanban:</strong> Manajemen prospek interaktif melalui tahapan <em>Prospect</em>, <em>Qualified</em>, <em>Proposal</em>, <em>Negotiation</em>, hingga <em>Closed Won / Lost</em>.
              </li>
              <li>
                <strong>Aktivitas & Komplain:</strong> Pencatatan log kunjungan sales, riwayat penawaran harga, dan tiket penanganan keluhan pelanggan (complaint SLA tracking).
              </li>
              <li>
                <strong>Relasi Sales & Pelanggan:</strong> Pemetaan customer per salesperson secara terisolasi berdasarkan wilayah penugasan geografis.
              </li>
            </ul>
          </div>

          {/* Module 6: Keuangan & Credit Reports / AR Aging */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(255,94,94,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-danger)" }}>
                  <ScrollText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Keuangan & Credit Reports / AR Aging
                  </h3>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-danger)" }}>/crm & /reports</code>
                </div>
              </div>
              <Link
                href="/reports"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 600, textDecoration: "none" }}
              >
                Kunjungi Laporan <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>CRM Credit Health:</strong> Analisis kesehatan kredit pelanggan real-time meliputi:
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                  <li>Rasio utilisasi batas kredit (Plafon vs Total Piutang).</li>
                  <li>Klasifikasi risiko kredit: <em>Lancar</em>, <em>Waspada</em>, <em>Tinggi</em>, dan <em>Kritis</em>.</li>
                  <li>Rincian faktur terbuka (open unpaid invoices) beserta perhitungan hari keterlambatan.</li>
                </ul>
              </li>
              <li>
                <strong>Laporan Aging AR (Accounts Receivable):</strong>
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                  <li>Analisis umur piutang dalam 5 bucket jatuh tempo: <strong>Lancar</strong>, <strong>1–30 Hari</strong>, <strong>31–60 Hari</strong>, <strong>61–90 Hari</strong>, dan <strong>&gt;90 Hari (Macet)</strong>.</li>
                  <li>Stacked bar visual proporsi risiko portofolio piutang perusahaan.</li>
                  <li>Dapat diekspor secara instan ke format file <strong>Excel (.xlsx) / CSV</strong>.</li>
                </ul>
              </li>
            </ul>
          </div>

          {/* Module 7: AI Demand Forecasting & Sales Projection */}
          <div id="demand-forecasting-module" style={{
            background: "var(--bg-surface)",
            border: "1px solid rgba(13,153,255,0.3)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            position: "relative",
            boxShadow: "0 4px 20px rgba(13,153,255,0.08)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(13,153,255,0.15)", padding: "8px", borderRadius: "8px", color: "var(--color-primary)" }}>
                  <Brain size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      AI Demand Forecasting & Sales Projection
                    </h3>
                    <span style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: "4px", background: "rgba(168,85,247,0.18)", color: "#C084FC", fontWeight: 700 }}>
                      MACHINE LEARNING
                    </span>
                  </div>
                  <code style={{ fontSize: "0.78rem", color: "var(--color-primary-light)" }}>/forecast</code>
                </div>
              </div>
              <Link
                href="/forecast"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}
              >
                Kunjungi Modul <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
              <li>
                <strong>Tujuan Utama:</strong> Menjawab kebutuhan procurement & sales: <em>“Berdasarkan histori transaksi, berapa unit setiap produk yang kemungkinan terjual dalam 7, 30, dan 90 hari ke depan?”</em> pada agregat nasional Top 30 SKU aktif.
              </li>
              <li>
                <strong>3 Horizon Kebutuhan (7, 30, 90 Hari):</strong>
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                  <li><strong>7 Hari (Operasional Mingguan):</strong> Memproyeksikan permintaan jangka sangat pendek, estimasi laju run-rate harian, dan rentang keyakinan lower/upper bound.</li>
                  <li><strong>30 Hari (Perencanaan Bulanan):</strong> Menentukan kuantitas pengadaan bulanan dan saran buffer safety stock (+20%).</li>
                  <li><strong>90 Hari (Prospek Kuartal):</strong> Proyeksi kebutuhan pengadaan kuartalan untuk negosiasi kuota distributor ke prinsipal.</li>
                </ul>
              </li>
              <li>
                <strong>Grafik Interaktif Recharts:</strong> Menggabungkan garis riil transaksi masa lalu (garis biru solid) dengan garis putus-putus proyeksi masa depan (garis ungu) serta area bayangan rentang keyakinan probabilistik (confidence band).
              </li>
              <li>
                <strong>Kompetisi Algoritma Otomatis:</strong> Mengevaluasi multi-model (Seasonal Naive 7d, Moving Average 7d/30d, Naive Benchmark, LightGBM Quantile Regression) dan memilih otomatis algoritma dengan WAPE (Weighted Absolute Percentage Error) terendah.
              </li>
              <li>
                <strong>Otomasi Reorder Point (ROP):</strong> Memberikan rekomendasi batas minimum stok gudang untuk segera menerbitkan Purchase Order sebelum terjadi stockout.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Section 3: Key Advantages ──────────────────────────── */}
      <section id="key-advantages" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Zap size={20} style={{ color: "var(--color-warning)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Key Advantages (Keunggulan Utama)
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Dua pilar arsitektur utama yang menjamin keandalan sistem dan integritas database core ERP:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
          {/* Advantage 1 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                background: "rgba(13,153,255,0.15)",
                width: 36,
                height: 36,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
                fontWeight: 700
              }}>
                1
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Dual Database dengan Role Read-Only (Zero ERP Ultima Risk)
              </h3>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>
              Sistem memisahkan database operasional ERP asli (<code>cpa_db_existing</code>) dengan database analitik (<code>cpa_db_analytics</code>):
            </p>
            <ul style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.7 }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Hak Akses Read-Only:</strong> Akses ke database ERP dilakukan secara mutlak dengan hak akses Read-Only. Query analitik yang berat tidak akan pernah membebani performa kasir/admin ERP dan <em>tidak memiliki risiko menghapus/mengubah data core transaksi perusahaan</em>.
              </li>
              <li>
                <strong>Penyimpanan Analitik Terpisah:</strong> Data analitik, log audit, CRM pipeline, konfigurasi alert, dan user akun tersimpan aman di database sekunder (<code>cpa_analytics</code>).
              </li>
            </ul>
          </div>

          {/* Advantage 2 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                background: "rgba(58,201,119,0.15)",
                width: 36,
                height: 36,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-success)",
                fontWeight: 700
              }}>
                2
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Sinkronisasi Data Cepat & Real-Time (Celery + Redis + WebSocket)
              </h3>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.75rem" }}>
              Pekerja latar belakang (<strong>Celery Workers</strong>) secara otomatis dan periodik menyinkronkan data perubahan:
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.6rem",
              marginBottom: "1rem"
            }}>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Inventori</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-success)" }}>Setiap 15 Detik</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Penjualan & SO</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-primary)" }}>Setiap 30 Detik</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Distribusi & Mutasi</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-warning)" }}>Setiap 1 Menit</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Customer & CRM</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#D946EF" }}>Setiap 5 Menit</span>
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong>Real-Time Pub/Sub:</strong> Perubahan data di-publish melalui Redis channel ke FastAPI WebSocket, sehingga indikator metrik dan live alert pada layar pengguna langsung ter-update tanpa harus me-refresh browser.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Security & RLS ──────────────────────────── */}
      <section id="security-rls" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <ShieldCheck size={20} style={{ color: "var(--color-success)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Security: RBAC & Row-Level Security (RLS)
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Sistem menerapkan kontrol hak akses berlapis sesuai jabatan dan penugasan operasional:
        </p>

        {/* Role Matrix Table */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          marginBottom: "1.5rem"
        }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--bg-border)", background: "rgba(255,255,255,0.02)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Matriks Batasan Hak Akses Pengguna (Sample Implementation)
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                  <th style={{ padding: "10px 16px" }}>Role / Jabatan</th>
                  <th style={{ padding: "10px 16px" }}>Contoh Akun</th>
                  <th style={{ padding: "10px 16px" }}>Cakupan Wilayah / Gudang</th>
                  <th style={{ padding: "10px 16px" }}>Akses Finansial (Omzet & HPP)</th>
                  <th style={{ padding: "10px 16px" }}>Kebijakan Pembatasan RLS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>Warehouse Staff</td>
                  <td style={{ padding: "12px 16px" }}><code>ratih</code></td>
                  <td style={{ padding: "12px 16px" }}>Sultanbatara (29 gudang)</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>Zero Financial (Masking —)</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    Menu Sales, CRM, dan Laporan Keuangan diblokir total (HTTP 403 Forbidden).
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>Sales Rep</td>
                  <td style={{ padding: "12px 16px" }}><code>azzuhri</code></td>
                  <td style={{ padding: "12px 16px" }}>Wilayah Penugasan Sales</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>Data Customer Pribadi</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    Hanya dapat melihat data relasi sales & transaksi pelanggan miliknya. Salesperson lain diisolasi.
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>Finance & Credit Control</td>
                  <td style={{ padding: "12px 16px" }}><code>finance, margono, mery, credit_control</code></td>
                  <td style={{ padding: "12px 16px" }}>Seluruh Cabang (Nasional)</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: "var(--color-success)", fontWeight: 600 }}>Full Financial Access</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    Visibilitas penuh tagihan faktur, histori pembayaran, dan umur piutang se-perusahaan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Architecture Highlights */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)", padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--color-primary)" }}>
              <Lock size={18} />
              <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Autentikasi JWT</h4>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              JSON Web Tokens (JWT) dengan algoritma enkripsi HS256 dan hashing kata sandi pengguna berbasis bcrypt.
            </p>
          </div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)", padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--color-success)" }}>
              <Database size={18} />
              <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Backend Data Enforcement</h4>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Pencegahan kebocoran omzet & HPP diterapkan langsung pada level query SQL backend, bukan sekadar penyembunyian elemen UI frontend.
            </p>
          </div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)", padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--color-warning)" }}>
              <Network size={18} />
              <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Isolasi Jaringan Docker</h4>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Database & Redis berjalan di bridge network tertutup (<code>cpa_net</code> dan <code>dwh_network</code>), tanpa mengekspos port ke publik.
            </p>
          </div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-md)", padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#A855F7" }}>
              <Activity size={18} />
              <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Resiliensi & Healthcheck</h4>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Healthcheck kontainer otomatis pada PostgreSQL & Redis, serta antrean tugas dengan toleransi tinggi terhadap network downtime.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 5: WhatsApp Notification ───────────────────── */}
      <section id="waha-notification" style={{ marginBottom: "3.5rem" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(58,201,119,0.08) 0%, var(--bg-card) 100%)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1.25rem",
          flexWrap: "wrap"
        }}>
          <div style={{
            background: "rgba(58,201,119,0.2)",
            color: "var(--color-success)",
            padding: "12px",
            borderRadius: "12px",
            flexShrink: 0
          }}>
            <MessageSquare size={28} />
          </div>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Notifikasi Otomatis WhatsApp (WAHA Integration)
              </h3>
              <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "10px", color: "var(--text-muted)" }}>
                Optional / On-Demand
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.85rem" }}>
              Terintegrasi dengan mesin WhatsApp API lokal (<strong>WAHA - WhatsApp HTTP API</strong>). Mengirimkan alert langsung ke nomor WhatsApp manajemen atau penanggung jawab:
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-primary)", background: "rgba(0,0,0,0.3)", padding: "6px 12px", borderRadius: "6px" }}>
                <CheckCircle2 size={14} style={{ color: "var(--color-danger)" }} />
                Peringatan Stok Kritis (Under Minimum)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-primary)", background: "rgba(0,0,0,0.3)", padding: "6px 12px", borderRadius: "6px" }}>
                <CheckCircle2 size={14} style={{ color: "var(--color-warning)" }} />
                Faktur Tagihan Jatuh Tempo (Overdue AR)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-primary)", background: "rgba(0,0,0,0.3)", padding: "6px 12px", borderRadius: "6px" }}>
                <CheckCircle2 size={14} style={{ color: "var(--color-primary)" }} />
                Order Tertahan (Credit Hold Alert)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 6: Diagram Arsitektur Sistem ────────────────── */}
      <section id="architecture-diagram" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={20} style={{ color: "var(--color-primary)" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              4.1. Diagram Arsitektur Sistem
            </h2>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Mermaid Live Flowchart
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.25rem" }}>
          Arsitektur Containerized Microservices CPA Platform di lingkungan Linux Server (Docker Compose):
        </p>

        {/* Interactive Mermaid Component */}
        <MermaidViewer chart={MERMAID_CHART} />
      </section>

      {/* ─── Section 7: Detail Komponen Teknologi (Tech Stack) ──── */}
      <section id="tech-stack" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={20} style={{ color: "var(--color-primary)" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              4.2. Detail Komponen Teknologi (Tech Stack)
            </h2>
          </div>

          {/* Table search filter */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Cari komponen / teknologi..."
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.82rem"
              }}
            />
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.25rem" }}>
          Daftar layer, teknologi, framework, dan peranan dalam CPA Platform:
        </p>

        {/* Tech Stack Table */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-md)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.35)", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                  <th style={{ padding: "12px 18px", width: "220px" }}>Layer / Komponen</th>
                  <th style={{ padding: "12px 18px", width: "320px" }}>Teknologi yang Digunakan</th>
                  <th style={{ padding: "12px 18px" }}>Fungsi & Peranan</th>
                </tr>
              </thead>
              <tbody>
                {filteredTech.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--bg-border)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"
                    }}
                  >
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        background: "rgba(13,153,255,0.12)",
                        color: "var(--color-primary-light)",
                        border: "1px solid rgba(13,153,255,0.25)"
                      }}>
                        {item.layer}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", verticalAlign: "top", fontWeight: 600, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {item.tech.split(", ").map((t, tidx) => (
                          <span key={tidx} style={{
                            display: "inline-block",
                            background: "rgba(255,255,255,0.04)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.82rem",
                            width: "fit-content"
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", verticalAlign: "top", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {item.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Section 8: Pemetaan Port & Kontainer Layanan ────────── */}
      <section id="container-mapping" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Server size={20} style={{ color: "var(--color-primary)" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              4.3. Pemetaan Port & Kontainer Layanan (Container Service Mapping)
            </h2>
          </div>

          {/* Container search filter */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Cari kontainer / port..."
              value={containerFilter}
              onChange={(e) => setContainerFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.82rem"
              }}
            />
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.25rem" }}>
          Daftar seluruh service microservices yang berjalan dalam docker runtime, pemetaan port internal dan host:
        </p>

        {/* Container Mapping Table */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-md)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.35)", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                  <th style={{ padding: "12px 16px" }}>Nama Kontainer</th>
                  <th style={{ padding: "12px 16px" }}>Service</th>
                  <th style={{ padding: "12px 16px" }}>Image Dasar</th>
                  <th style={{ padding: "12px 16px" }}>Port Internal</th>
                  <th style={{ padding: "12px 16px" }}>Port Eksternal / Host</th>
                  <th style={{ padding: "12px 16px" }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--bg-border)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-primary)" }}>
                      <code>{item.containerName}</code>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: "rgba(13,153,255,0.1)",
                        color: "var(--color-primary)"
                      }}>
                        {item.service}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontFamily: "monospace" }}>
                      {item.baseImage}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {item.internalPort}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        fontFamily: "monospace",
                        background: item.externalPort.includes("Internal") || item.externalPort === "—"
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(58,201,119,0.12)",
                        color: item.externalPort.includes("Internal") || item.externalPort === "—"
                          ? "var(--text-muted)"
                          : "var(--color-success)"
                      }}>
                        {item.externalPort}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Section 9: Spesifikasi Teknis Machine Learning Forecasting ─── */}
      <section id="ml-technical-spec" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Brain size={22} style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            4.4. Spesifikasi Teknis & Arsitektur Machine Learning Forecasting
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Dokumentasi teknis lengkap mengenai pipeline pemrosesan data deret waktu, algoritma machine learning, validasi walk-forward bebas data leakage, skema database, dan API endpoint prediksi demand.
        </p>

        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[
            { label: "LightGBM 4.7.0", color: "#A855F7" },
            { label: "Facebook Prophet", color: "#EC4899" },
            { label: "Walk-Forward CV", color: "#3AC977" },
            { label: "Apache Airflow DAGs", color: "#0D99FF" },
            { label: "PostgreSQL 15 Dual-DB", color: "#38BDF8" },
            { label: "FastAPI Async Router", color: "#FFB323" },
            { label: "Quantile Regression CI", color: "#F43F5E" },
          ].map((b, bidx) => (
            <span
              key={bidx}
              style={{
                fontSize: "0.75rem",
                padding: "3px 10px",
                borderRadius: "20px",
                background: `${b.color}15`,
                color: b.color,
                border: `1px solid ${b.color}35`,
                fontWeight: 600,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* 1. Mermaid Flowchart */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.75rem",
          boxShadow: "var(--shadow-md)"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} color="var(--color-primary)" />
            Diagram Alur End-to-End ML Pipeline & Serving
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Alur data dari ekstraksi transaksi faktur ERP, rekayasa fitur deret waktu, kompetisi model validasi silang, hingga visualisasi interaktif pada dashboard:
          </p>
          <MermaidViewer chart={ML_FORECAST_MERMAID_CHART} />
        </div>

        {/* 2. Skema Database Analitik */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.75rem"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} color="#3AC977" />
            Skema Tabel Database Analitik (cpa_analytics)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Seluruh komputasi agregasi dan hasil proyeksi disimpan dalam database <code>cpa_analytics</code> tanpa membebani database operasional ERP:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* Table 1: daily_sales */}
            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38BDF8" }}>daily_sales</code>
                <span style={{ fontSize: "0.7rem", color: "#3AC977" }}>16,886 baris</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                Tabel agregat harian nasional hasil ETL backfill dari histori transaksi faktur penjualan (Jan 2022 – Sep 2026).
              </p>
              <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#D1D5DB", lineHeight: 1.5 }}>
                date (DATE PK), product_id (VARCHAR), product_name, warehouse_id (&apos;ALL&apos;), quantity_sold (NUMERIC), revenue, avg_price, cost_price
              </div>
            </div>

            {/* Table 2: forecast_products */}
            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.85rem", fontWeight: 700, color: "#A855F7" }}>forecast_products</code>
                <span style={{ fontSize: "0.7rem", color: "#A855F7" }}>30 SKU Top</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                Registry produk prioritas yang dipantau sistem forecast, menyimpan model terbaik dan skor WAPE terbaru.
              </p>
              <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#D1D5DB", lineHeight: 1.5 }}>
                product_id (PK), product_name, best_model, best_model_wape, active_days, data_from, data_to, last_trained, last_forecast, is_active
              </div>
            </div>

            {/* Table 3: forecast_results */}
            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.85rem", fontWeight: 700, color: "#3AC977" }}>forecast_results</code>
                <span style={{ fontSize: "0.7rem", color: "#3AC977" }}>90 Proyeksi</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                Menyimpan angka estimasi penjualan unit untuk horizon 7, 30, dan 90 hari beserta batas atas dan bawah keyakinan.
              </p>
              <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#D1D5DB", lineHeight: 1.5 }}>
                id (SERIAL PK), product_id, horizon_days (7/30/90), predicted_qty, lower_bound, upper_bound, model_name, forecast_date, generated_at
              </div>
            </div>

            {/* Table 4: model_metrics */}
            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFB323" }}>model_metrics</code>
                <span style={{ fontSize: "0.7rem", color: "#FFB323" }}>124 Evaluasi</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                Log audit kompetisi model dari cross-validation, menyimpan WAPE, MAE, RMSE, dan Bias per algoritma per produk.
              </p>
              <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#D1D5DB", lineHeight: 1.5 }}>
                id (SERIAL PK), product_id, model_name, horizon_days, mae, rmse, wape, bias, n_samples, evaluated_at
              </div>
            </div>
          </div>
        </div>

        {/* 3. Algoritma Model & Rekayasa Fitur */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.75rem"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={18} color="#A855F7" />
            Algoritma Model & Rekayasa Fitur (Feature Matrix)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Setiap produk diuji terhadap kandidat model statistik dan machine learning untuk menemukan karakteristik permintaan yang paling cocok:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0D99FF", marginBottom: "0.35rem" }}>
                1. Seasonal Naive (7d Cycle)
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Mengasumsikan penjualan pada hari tertentu (misal: Senin) identik dengan hari Senin minggu sebelumnya. Sangat efektif untuk produk bertransaksi ritel dengan pola kerja mingguan yang konsisten.
              </p>
            </div>

            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#3AC977", marginBottom: "0.35rem" }}>
                2. Moving Average (7d & 30d)
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Menghitung rata-rata bergerak jendela 7 hari (jangka sangat pendek) dan 30 hari (jangka menengah). Menghaluskan lonjakan ekstrem acak pada produk dengan penjualan stabil.
              </p>
            </div>

            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#A855F7", marginBottom: "0.35rem" }}>
                3. LightGBM Quantile Regression
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Gradient Boosting Decision Trees dengan multi-step recursive forecasting. Dilatih pada 3 objektif quantile (median p50, lower bound p10, upper bound p90) untuk menghasilkan rentang interval keyakinan probabilistik.
              </p>
            </div>

            <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#EC4899", marginBottom: "0.35rem" }}>
                4. Facebook Prophet
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Model Bayesian struktural aditif yang memisahkan komponen tren non-linear, efek musiman tahunan/mingguan, dan efek hari libur nasional.
              </p>
            </div>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFF", marginBottom: "0.6rem" }}>
            Feature Matrix LightGBM (15+ Dimensi Rekayasa Fitur):
          </h4>
          <ul style={{ paddingLeft: "1.5rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <li><strong>Fitur Lag:</strong> <code>lag_1</code>, <code>lag_7</code>, <code>lag_14</code>, <code>lag_30</code> (menangkap momentum jangka pendek hingga 1 bulan).</li>
            <li><strong>Statistik Rolling:</strong> <code>rolling_mean_7</code>, <code>rolling_std_7</code>, <code>rolling_max_7</code>, <code>rolling_min_7</code>, serta jendela 14 dan 30 hari.</li>
            <li><strong>Calendar Cyclical Encoding:</strong> <code>day_of_week_sin</code>, <code>day_of_week_cos</code> (mempertahankan kontinuitas siklus hari Minggu ke Senin), serta <code>month_sin</code> dan <code>month_cos</code>.</li>
            <li><strong>Indikator Kalender:</strong> <code>is_weekend</code>, <code>is_month_start</code>, <code>is_month_end</code>, <code>week_of_year</code>.</li>
            <li><strong>Fitur Tren:</strong> <code>trend_7_vs_30</code> (rasio rata-rata 7 hari terhadap 30 hari untuk mendeteksi akselerasi/deselerasi permintaan).</li>
          </ul>
        </div>

        {/* 4. Validasi Walk-Forward & Metrik Evaluasi */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.75rem"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={18} color="#FFB323" />
            Validasi Deret Waktu: Walk-Forward Cross Validation (Zero Data Leakage)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>
            Dalam analisis deret waktu, pembagian data menggunakan teknik K-Fold acak standar (random split) adalah <strong>kesalahan fatal</strong> karena menimbulkan <em>data leakage</em> (model belajar dari data masa depan untuk memprediksi masa lalu).
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
            Sistem CPA menerapkan <strong>Walk-Forward Validation</strong>: jendela pelatihan selalu mendahului jendela pengujian secara kronologis:
          </p>

          <div style={{ padding: "1rem 1.25rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", borderLeft: "4px solid #FFB323", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFB323", marginBottom: "0.25rem" }}>
              Prinsip Walk-Forward Splits:
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Fold 1: Train [Hari 1 s.d. T-60] → Test [Hari T-59 s.d. T-30]<br />
              Fold 2: Train [Hari 1 s.d. T-30] → Test [Hari T-29 s.d. Hari T (Terbaru)]
            </div>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFF", marginBottom: "0.6rem" }}>
            Metrik Evaluasi Utama:
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <strong style={{ color: "#3AC977", fontSize: "0.85rem" }}>WAPE (Weighted Absolute Percentage Error)</strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                Mengukur total galat absolut dibagi total penjualan riil. Jauh lebih andal dibandingkan MAPE standar saat menghadapi hari tanpa transaksi (nol unit).
              </p>
            </div>
            <div style={{ padding: "0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <strong style={{ color: "#38BDF8", fontSize: "0.85rem" }}>MAE & RMSE</strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                Menyajikan besaran simpangan rata-rata unit fisik aktual terhadap hasil prediksi model.
              </p>
            </div>
            <div style={{ padding: "0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <strong style={{ color: "#FF5E5E", fontSize: "0.85rem" }}>Bias (%)</strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                Mendeteksi deviasi arah model: <em>Overforecast (&gt;+5%)</em> dapat memicu overstock, sedangkan <em>Underforecast (&lt;-5%)</em> berisiko stockout.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Katalog REST API Endpoints */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.75rem"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileCode2 size={18} color="var(--color-primary)" />
            Katalog REST API Endpoints (/api/forecast)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Endpoint FastAPI melayani data summary, direktori produk, detail ramalan 7/30/90 hari, histori deret waktu, dan log kompetisi model:
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                  <th style={{ padding: "10px 14px" }}>Method</th>
                  <th style={{ padding: "10px 14px" }}>Path Endpoint</th>
                  <th style={{ padding: "10px 14px" }}>Parameter</th>
                  <th style={{ padding: "10px 14px" }}>Deskripsi & Response</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "rgba(58,201,119,0.15)", color: "#3AC977", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>GET</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38BDF8", fontWeight: 600 }}>/api/forecast/summary</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    Ringkasan eksekutif: total SKU dipantau, rata-rata WAPE, total demand 30 hari, dan distribusi model pemenang.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "rgba(58,201,119,0.15)", color: "#3AC977", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>GET</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38BDF8", fontWeight: 600 }}>/api/forecast/products</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    Daftar 30 SKU top dengan best_model, skor WAPE, hari aktif transaksi, bias %, dan angka proyeksi 7d, 30d, 90d.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "rgba(58,201,119,0.15)", color: "#3AC977", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>GET</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38BDF8", fontWeight: 600 }}>/api/forecast/products/&#123;id&#125;</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>product_id (path)</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    Detail proyeksi 7, 30, dan 90 hari untuk SKU spesifik lengkap dengan lower_bound dan upper_bound keyakinan.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "rgba(58,201,119,0.15)", color: "#3AC977", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>GET</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38BDF8", fontWeight: 600 }}>/api/forecast/products/&#123;id&#125;/history</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>days (int, default=90)</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    Deret waktu penjualan harian (date, quantity_sold, revenue, avg_price) untuk visualisasi grafik.
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "rgba(58,201,119,0.15)", color: "#3AC977", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>GET</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38BDF8", fontWeight: 600 }}>/api/forecast/products/&#123;id&#125;/models</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>product_id (path)</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    Peringkat komparasi seluruh algoritma yang diuji pada produk (MAE, RMSE, WAPE, Bias, jumlah sampel).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Orkestrasi Airflow & Rekomendasi ROP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {/* Box 1: Jadwal Airflow DAGs */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem"
          }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Terminal size={18} color="#0D99FF" />
              Jadwal Orkestrasi Apache Airflow DAGs
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(13,153,255,0.08)", border: "1px solid rgba(13,153,255,0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <strong style={{ color: "#38BDF8" }}>cpa_daily_forecast_pipeline</strong>
                  <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>Setiap Hari 01:00</span>
                </div>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.78rem", lineHeight: 1.5 }}>
                  Mengekstrak transaksi H-1 dari ERP, validasi kelengkapan data dan anomali penjualan, upsert ke <code>daily_sales</code>, dan memperbarui angka proyeksi forecast 7, 30, 90 hari.
                </p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <strong style={{ color: "#C084FC" }}>cpa_weekly_model_training</strong>
                  <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>Senin 02:00</span>
                </div>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.78rem", lineHeight: 1.5 }}>
                  Pelatihan ulang (retraining) seluruh model pada data historis terbaru, menjalankan kompetisi walk-forward, menyimpan model terbaik ke disk (<code>saved_models/*.pkl</code>), dan memperbarui registry pemenang.
                </p>
              </div>
            </div>
          </div>

          {/* Box 2: Formula Reorder Point */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem"
          }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="#3AC977" />
              Otomasi Keputusan Procurement: Reorder Point (ROP)
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.85rem" }}>
              Sistem forecast mengonversi hasil proyeksi 30 hari menjadi panduan batas stok minimal untuk mencegah kehabisan stok (*stockout*):
            </p>
            <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(58,201,119,0.1)", border: "1px solid rgba(58,201,119,0.3)", textAlign: "center", marginBottom: "0.85rem" }}>
              <code style={{ fontSize: "0.95rem", fontWeight: 700, color: "#3AC977" }}>
                ROP = (Daily Run-Rate × Lead Time) + Safety Stock
              </code>
            </div>
            <ul style={{ paddingLeft: "1.2rem", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              <li><strong>Daily Run-Rate:</strong> Rata-rata proyeksi unit terjual per hari (Prediksi 30 Hari / 30).</li>
              <li><strong>Lead Time:</strong> Estimasi waktu pengiriman dari prinsipal pemasok (asumsi standar: 7 hari).</li>
              <li><strong>Safety Stock Buffer:</strong> Cadangan pengaman sebesar +20% dari estimasi volume bulanan untuk meredam lonjakan tak terduga.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Footer note ────────────────────────────────────────── */}
      <div style={{
        marginTop: "3rem",
        padding: "1.5rem",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--bg-border)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          CPA Analytics Platform Documentation • Tersedia daring di{" "}
          <span style={{ color: "var(--color-primary-light)", fontWeight: 600 }}>warehouse.pengajaran.com/docs</span>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          ↑ Kembali ke Atas
        </button>
      </div>
    </div>
  );
}
