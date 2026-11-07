# CPA Inventory Intelligence & CRM Platform

Platform monitoring dan analisis yang terintegrasi untuk bisnis distribusi, membangun lapisan analytics di atas PostgreSQL aplikasi existing secara **read-only**.

## 🏗️ Arsitektur

```
PostgreSQL Existing (READ ONLY)
        ↓ incremental sync (Celery Beat, 15-30 detik)
PostgreSQL Analytics
├── operational (mirror data lama)
├── analytics (aggregasi)
└── crm (data baru)
        ↓
FastAPI (Business Logic, Auth RBAC, KPI)
        ↓
Next.js Dashboard (Real-time via polling + WebSocket)
        ↓
Redis (Cache, Queue, Pub/Sub)
```

## 🚀 Quick Start

### Prasyarat
- Docker & Docker Compose
- Python 3.12+ (opsional untuk dev lokal)
- Node.js 20+ (opsional untuk dev lokal)

### Setup Pertama Kali

```bash
# 1. Clone/masuk ke folder
cd /home/kotaromiyabi/CPA_apps

# 2. Jalankan setup otomatis
bash setup.sh
```

Script akan:
1. Membuat `.env` dari template
2. Menjalankan PostgreSQL analytics + Redis
3. Menjalankan Alembic migration (buat schema)
4. Membuat admin user (admin/admin123)
5. Menjalankan semua service

### Manual: Restore Database Existing

```bash
# Copy file SQL ke container
docker cp cpa_13022024.sql cpa_db_existing:/tmp/

# Restore (estimasi 15-30 menit untuk file 215MB)
docker exec cpa_db_existing psql -U postgres -d cpa_existing \
  -f /tmp/cpa_13022024.sql

# Atau jika DB existing sudah berjalan di server lain:
# Edit .env -> EXISTING_DB_HOST=<your-server-ip>
```

### Development Lokal (tanpa Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Celery (terminal baru)
celery -A app.workers.celery_app worker --loglevel=info

# Celery Beat (terminal baru)
celery -A app.workers.celery_app beat --loglevel=info

# Frontend (terminal baru)
cd frontend
npm run dev
```

## 📡 URL Akses & Layanan

| Service / Modul | URL / Port | Keterangan |
|---|---|---|
| Frontend Web App | https://warehouse.pengajaran.com (Port 3001) | Dashboard Analitik, GA, Fleet, IT, HRM, CRM |
| 3D Warehouse Twin | https://warehouse.pengajaran.com/3d/ (Port 5173) | Visualisasi 3D Interaktif Denah & Rak Gudang |
| FastAPI REST API | https://warehouse.pengajaran.com/api/ (Port 8000) | Backend REST API & WebSocket Real-time |
| API Docs (Swagger) | https://warehouse.pengajaran.com/api-docs | Dokumentasi interaktif OpenAPI / Swagger |
| MCP SSE Endpoint | https://warehouse.pengajaran.com/mcp & `/api/mcp` | Model Context Protocol untuk Claude & ChatGPT |
| Celery Flower | http://localhost:5555 | Web Dashboard Monitoring Antrean Task Celery |
| PostgreSQL Existing | localhost:5432 (Internal Docker) | DB Core ERP Ultima 2024 (Read-Only) |
| PostgreSQL Analytics | localhost:5432 (Internal Docker) | DB ODS, CRM, Logbook, Users, Forecast |
| Redis Pub/Sub | localhost:6379 (Internal Docker) | Cache & Broker Antrean Celery |
| WAHA WhatsApp API | localhost:3008 (Internal Docker) | WhatsApp HTTP API Gateway Notifikasi |

## 📊 Modul Aplikasi (Aktual)

### 1. Executive Dashboard (`/`)
- KPI Ringkasan: Omzet (MTD/YTD), Inventory Value, Active Orders, Overdue AR.
- Visualisasi analitik: Tren omzet multi-bulan, proporsi risiko piutang, dan status sinkronisasi real-time.

### 2. Manajemen Inventori & Gudang (`/inventory` & `/warehouses`)
- Saldo stok fisik real-time per SKU: On-Hand, Available, Reserved, Damaged, Quarantine.
- Multi-Warehouse comparison Sultanbatara (Makassar, Kendari, Palu, dll).
- Pelacakan Mutasi Internal Transfer (Receipt IT In & IT Out), batch IBC tank, dan logistik pengiriman.
- Analisis stok: Fast-moving, slow-moving, dead-stock, serta deteksi overstock/low-stock.

### 3. Penjualan & Sales Order (`/sales` & `/sales/orders`)
- Pipeline siklus order: SO → DO → Faktur Tagihan → Pelunasan.
- Performa sales: Analisis tren per cabang, salesperson, kategori produk, dan pelanggan.
- Pre-Delivery Credit Control: Pengecekan otomatis batas kredit pelanggan sebelum barang dirilis gudang.

### 4. Distribusi & Logistik Pengiriman (`/distributions`)
- Pelacakan Delivery Order (DO) fisik dan dokumen pengiriman pelanggan.
- Pelacakan pergerakan stok antarcabang (Internal Order & Internal Transfer).
- Logistik ekspedisi: data armada, identitas sopir, nomor polisi, dan SLA ketepatan waktu pengiriman.

### 5. CRM & Customer 360 (`/crm`)
- Profil komprehensif pelanggan 360° (plafon kredit, termin TOP, PIC, cabang).
- Sales Pipeline & Interactive Kanban (Prospect → Qualified → Proposal → Negotiation → Closed Won/Lost).
- Pencatatan aktivitas kunjungan sales dan tiket penanganan keluhan pelanggan (Complaint SLA).

### 6. Keuangan, Financial Flow & Credit Health (`/finance`, `/distributions/financial-flow`, `/reports`)
- Financial Flow: Monitoring arus kas terpadu dari PO, SO, DO, Faktur, hingga pelunasan Bank/Kas.
- Budget Request & Variance: Pengajuan anggaran operasional cabang dan komparasi budget vs realisasi riil.
- Transaction Journey: Audit trail visual dokumen akuntansi dari hulu ke hilir.
- Credit Health & AR Aging Matrix: Analisis penuaan piutang dalam 5 bucket (Lancar, 1–30d, 31–60d, 61–90d, >90d).

### 7. AI Demand Forecasting & Machine Learning (`/forecast`)
- Proyeksi kebutuhan permintaan unit multi-horizon (7, 30, dan 90 hari ke depan) untuk Top 30 SKU aktif.
- Model deret waktu: LightGBM Quantile Regression (p10, p50, p90), Facebook Prophet, Seasonal Naive (7d), Moving Average.
- Walk-Forward Cross Validation (Zero Data Leakage) dengan pelacakan metrik akurasi WAPE, MAE, RMSE, dan Bias %.
- Otomasi Reorder Point (ROP): Panduan batas minimum stok gudang untuk mencegah kehabisan stok (*stockout*).

### 8. Asset & Fleet Logbook Hub (`/assets/fleet`)
- Manajemen logbook armada kendaraan operasional (truk tangki, blind van, truk engkel, motor).
- Pencatatan berkala angka kilometer (KM/Odometer), konsumsi BBM, dan servis rutin berkala.
- Pelacakan masa berlaku dokumen legalitas kendaraan (KIR, STNK, uji emisi).
- Dual-storage dengan backup & export data armada ke format JSON & spreadsheet.

### 9. General Affairs (GA) Digital Logbook (`/ga` & `/ga/entry`)
- 6 Sub-modul operasional fasilitas cabang: Genset, Kebersihan (5S), Air Minum Galon, Pengiriman GA, PDAM (m³), Listrik (kWh).
- KPI otomatis: Deteksi dini kerusakan fasilitas (*damage alerts*), skor rating kebersihan 5S, dan estimasi biaya utilitas.
- Offline-First Architecture: Penyimpanan lokal di peramban (LocalStorage) yang andal saat jaringan offline, dilengkapi fitur Backup & Restore JSON.

### 10. IT Asset & Helpdesk Hub (`/it`)
- Inventarisasi aset TI: PC desktop, laptop, scanner barcode gudang, printer faktur, switch, access point, dan UPS.
- Monitoring status perangkat (Baik, Rusak, Maintenance, Decommissioned).
- Helpdesk ticketing untuk pencatatan dan eskalasi kendala teknis karyawan dengan SLA pemantauan.

### 11. Human Resource Management (HRM) (`/hrm`)
- Direktori SDM & Karyawan multi-cabang (jabatan, status kerja, kontak).
- Rekap absensi dan monitoring kehadiran kerja harian staf gudang dan kantor.
- Manajemen pengajuan dan saldo kuota cuti karyawan (Leaves Management) dengan alur persetujuan.

### 12. Asisten AI Interaktif & Model Context Protocol (MCP) (`/api/mcp`, `/mcp`, Floating AI Chat)
- Floating AI Assistant di pojok layar aplikasi: Tanya-jawab posisi stok real-time, status pengiriman, dan tren omzet dengan bahasa alami.
- Server Model Context Protocol (FastMCP) berbasis streaming Server-Sent Events (SSE).
- OAuth Discovery & RFC-compliant Authorization Server untuk integrasi ke Claude Desktop, ChatGPT, atau Cursor.

### 13. 3D Digital Twin Warehouse & Schema Graph (`/database/warehouse-visualization` & `/database/schema`)
- Visualisasi spasial 3D denah gudang dan rak penyimpanan pallet bertingkat secara interaktif (Three.js / WebGL / Vite).
- Interactive Database Schema Visualizer: Canvas graf relasi Foreign Key antartabel database ERP core dan database analitik.

## 🔑 Auth & RBAC (Role-Based Access Control)

| Role | Cakupan Hak Akses | Akses Finansial | Pembatasan RLS & Kebijakan |
|---|---|---|---|
| `admin` / `superadmin` | Seluruh Modul (Nasional) | Full Financial Access | Akses penuh tanpa batas ke seluruh modul, konfigurasi, dan user. |
| `finance` / `credit_control` | Keuangan, AR, CRM, Laporan | Full Financial Access | Akses tagihan faktur, pelunasan, AR aging, budget request, dan financial flow. |
| `sales` | Sales, Orders, CRM 360 | Data Customer Pribadi | Hanya melihat data relasi sales dan pelanggan miliknya. Salesperson lain diisolasi. |
| `warehouse` / `warehouse_staff` | Inventory, Warehouse, Mutasi | Zero Financial (Masked —) | Akses inventori gudang Sultanbatara (29 gudang). Menu Sales, CRM, dan Keuangan diblokir. |
| `ga` | General Affairs (`/ga`) | Non-Financial GA Utilities | Akses eksklusif logbook fasilitas GA (genset, kebersihan, PDAM, listrik, air). Modul lain ditutup. |
| `asset` / `asset_staff` | Fleet Management (`/assets/fleet`) | Biaya BBM & Servis Armada | Akses monitoring armada operasional, logbook KM/BBM, dan servis kendaraan. |
| `it` | IT Helpdesk & Assets (`/it`) | Non-Financial IT Assets | Akses inventarisasi perangkat keras, helpdesk ticketing, dan status jaringan. |
| `hrm` | SDM & Personalia (`/hrm`) | Data SDM Terbatas | Akses database karyawan, presensi absensi, dan kuota cuti staf. |

## 📂 Struktur Direktori Aktual

```
CPA_analytics/
├── docker-compose.yml
├── .env.example
├── setup.sh
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point & routers
│   │   ├── config.py           # Settings & env vars
│   │   ├── database.py         # Dual DB engine (existing read-only + analytics)
│   │   ├── mcp_server.py       # Model Context Protocol (FastMCP / SSE)
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── existing/       # Read-only models ERP Ultima
│   │   │   └── analytics/      # Read-write models (ODS, CRM, Alerts, Users)
│   │   ├── routers/            # API endpoints
│   │   │   ├── auth.py         # JWT + RBAC authorization
│   │   │   ├── inventory.py    # Stok & aging
│   │   │   ├── warehouses.py   # Gudang & mutasi IT
│   │   │   ├── sales.py        # Sales orders & invoices
│   │   │   ├── distributions.py# DO & ekspedisi
│   │   │   ├── customers.py    # Customer 360 & pipeline
│   │   │   ├── crm.py          # Opportunities & activities
│   │   │   ├── forecast.py     # AI Demand forecasting endpoints
│   │   │   ├── alerts.py       # Real-time alerts
│   │   │   └── analytics.py    # Metrik & KPIs
│   │   └── workers/            # Celery background tasks
│   │       ├── celery_app.py   # Celery worker configuration & beat schedule
│   │       ├── sync_inventory.py
│   │       ├── sync_sales.py
│   │       ├── sync_customers.py
│   │       ├── sync_distributions.py
│   │       ├── compute_analytics.py
│   │       └── check_alerts.py
│   └── alembic/                # Database migrations
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Executive Dashboard
│   │   ├── inventory/          # Monitoring stok fisik
│   │   ├── warehouses/         # Multi-warehouse Sultanbatara
│   │   ├── sales/              # Monitoring sales & SO
│   │   ├── distributions/      # Logistik & financial flow
│   │   ├── crm/                # Customer 360 & pipeline
│   │   ├── finance/            # Keuangan terpadu & budget request
│   │   ├── forecast/           # AI Demand forecasting
│   │   ├── assets/fleet/       # Fleet & vehicle logbook
│   │   ├── ga/                 # General Affairs logbook & entry
│   │   ├── it/                 # IT asset & helpdesk hub
│   │   ├── hrm/                # SDM, absensi & cuti
│   │   ├── database/           # 3D warehouse & schema graph
│   │   └── docs/               # In-app Dokumentasi Sistem & Teknis
│   ├── components/             # React components
│   │   ├── layout/             # Sidebar, Topbar, AppShell
│   │   ├── ai/                 # AIChatBox (Floating AI assistant)
│   │   ├── ga/                 # GaLogbookApp & forms
│   │   ├── assets/             # FleetLogbookApp
│   │   └── docs/               # DocsPage & MermaidViewer
│   └── lib/api.ts              # Axios HTTP client
└── docs/                       # Dokumentasi arsitektur, MCP & Obsidian Vault
```

## ⚙️ Sync Strategy

| Data | Source Table | Target | Interval |
|---|---|---|---|
| Stok | `stok_barang`, `mutasi` | `operational.inventory_balances` | 15 detik |
| SO + Invoice | `so`, `penjualan` | `operational.sales_orders`, `invoices` | 30 detik |
| DO | `do_tbl` | `operational.deliveries` | 1 menit |
| Customer | `customer` | `operational.customers` | 5 menit |
| Analytics | (computed) | `analytics.*` | 1 jam |
| Stock Snapshot | (computed) | `analytics.daily_stock_snapshot` | 23:55 harian |
| Customer Metrics | (computed) | `analytics.customer_metrics` | 01:00 harian |

## 🔒 Keamanan

Database existing **hanya dibaca** — koneksi menggunakan `default_transaction_read_only=on`. Tidak ada operasi INSERT/UPDATE/DELETE ke database lama.

```sql
-- Yang di-grant ke aplikasi ini:
GRANT CONNECT ON DATABASE cpa_existing TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
```
