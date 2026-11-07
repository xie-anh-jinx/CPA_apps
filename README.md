# CPA Inventory Intelligence, Finance AR & Enterprise Analytics Platform

Platform monitoring, analitik eksekutif, manajemen piutang (AR), logistik gudang, dan CRM terintegrasi untuk bisnis distribusi, yang membangun lapisan analitik cerdas di atas PostgreSQL aplikasi ERP existing secara **read-only**.

## 🏗️ Arsitektur

```
PostgreSQL Existing (READ ONLY)
        ↓ incremental sync (Celery Beat, 15-30 detik)
PostgreSQL Analytics
├── operational (mirror data lama)
├── analytics (aggregasi, AR confirmation, ICU incentive, forecast)
└── crm (customer 360 & pipeline)
        ↓
FastAPI (Business Logic, Auth RBAC, Finance AR Engine, AI Chat PADI & MCP)
        ↓
Next.js Web Dashboard + Expo React Native Mobile App (Real-time via polling + WebSocket)
        ↓
Redis (Cache, Queue, Pub/Sub)
```

## 🚀 Quick Start

### Prasyarat
- Docker & Docker Compose
- Python 3.12+ (opsional untuk dev lokal)
- Node.js 20+ (opsional untuk dev lokal & mobile Expo)

### Setup Pertama Kali

```bash
# 1. Clone/masuk ke folder
cd /root/CPA_analytics

# 2. Jalankan setup otomatis
bash setup.sh
```

Script akan:
1. Membuat `.env` dari template
2. Menjalankan PostgreSQL analytics + Redis
3. Menjalankan Alembic migration (buat schema)
4. Membuat admin user (`admin` / `admin123`)
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

# Celery Worker & Beat (terminal baru)
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info

# Frontend Web (terminal baru)
cd frontend
npm run dev

# Mobile App Expo (terminal baru)
cd mobile
npx expo start
```

## 📡 URL Akses & Layanan

| Service / Modul | URL / Port | Keterangan |
|---|---|---|
| Frontend Web App | https://warehouse.pengajaran.com (Port 3001) | Dashboard Analitik, Finance AR, Inventori, GA, Fleet, IT, HRM, CRM |
| 3D Warehouse Twin | https://warehouse.pengajaran.com/3d/ (Port 5173) | Visualisasi 3D Interaktif Denah & Rak Gudang |
| FastAPI REST API | https://warehouse.pengajaran.com/api/ (Port 8000) | Backend REST API, Finance AR API & WebSocket Real-time |
| API Docs (Swagger) | https://warehouse.pengajaran.com/api-docs | Dokumentasi interaktif OpenAPI / Swagger |
| MCP SSE Endpoint | https://warehouse.pengajaran.com/mcp & `/api/mcp` | Model Context Protocol untuk Claude & ChatGPT |
| Celery Flower | http://localhost:5555 | Web Dashboard Monitoring Antrean Task Celery |
| PostgreSQL Existing | localhost:5432 (Internal Docker) | DB Core ERP Ultima 2024 (Read-Only) |
| PostgreSQL Analytics | localhost:5432 (Internal Docker) | DB ODS, CRM, AR Management, Logbook, Users, Forecast |
| Redis Pub/Sub | localhost:6379 (Internal Docker) | Cache & Broker Antrean Celery |
| WAHA WhatsApp API | localhost:3008 (Internal Docker) | WhatsApp HTTP API Gateway Notifikasi |

## 📊 Modul Aplikasi (Aktual)

### 1. Executive & C3 Main Dashboard (`/` & `/main-dashboard`)
- KPI Ringkasan: Omzet (MTD/YTD), Inventory Value, Active Orders, Overdue AR, dan Rasio Kesehatan Kas.
- Visualisasi interaktif berbasis C3.js & Recharts: Tren omzet multi-bulan, Quadrant Matrix, Donut & Stacked Bar proporsi risiko piutang, serta status sinkronisasi real-time.

### 2. Manajemen Inventori & Gudang (`/inventory` & `/warehouses`)
- Saldo stok fisik real-time per SKU: On-Hand, Available, Reserved, Damaged, Quarantine, dan Batch Aging (`/inventory/aging`).
- Multi-Warehouse comparison Sultanbatara (Makassar, Kendari, Palu, Gorontalo, Manado, dll).
- Pelacakan Mutasi Internal Transfer (Receipt IT In & IT Out) dengan paginasi terstruktur, pelacakan batch IBC tank, dan logistik pengiriman.
- Analisis stok: Fast-moving, slow-moving, dead-stock, serta deteksi overstock/low-stock.

### 3. Distribusi & Logistik Pengiriman (`/distributions` & `/distributions/financial-flow`)
- Pelacakan Delivery Order (DO) fisik, multi-filter lanjutan, aksi batch, dan dokumen pengiriman pelanggan.
- Pelacakan pergerakan stok antarcabang (Internal Order & Internal Transfer).
- Financial Flow Distribusi: Rekonsiliasi alur pengiriman terhadap tagihan dan biaya ekspedisi.

### 4. Penjualan & Sales Order (`/sales` & `/sales/orders`)
- Pipeline siklus order: SO → DO → Faktur Tagihan → Pelunasan.
- Performa sales: Analisis tren per cabang, salesperson, kategori produk, dan pelanggan.
- Pre-Delivery Credit Control: Pengecekan otomatis batas kredit pelanggan sebelum barang dirilis gudang.

### 5. CRM & Customer 360 (`/crm`)
- Profil komprehensif pelanggan 360° (plafon kredit, termin TOP, PIC, cabang, serta tab Kesehatan Kredit).
- Sales Pipeline & Interactive Kanban (Prospect → Qualified → Proposal → Negotiation → Closed Won/Lost).
- Pencatatan aktivitas kunjungan sales dan tiket penanganan keluhan pelanggan (Complaint SLA).

### 6. Finance & Akuntansi — AR Executive Summary (`/finance` & `/finance/ar-summary`)
Modul komprehensif pengendalian piutang usaha (*Accounts Receivable*) dan kinerja penagihan perusahaan:
- **Executive Dashboard Finance (`/finance`)**: Ringkasan eksekutif indikator keuangan, pengiriman, dan alert penagihan prioritas.
- **AR EXECUTIVE SUMMARY (`/finance/ar-summary`)**: Gambaran posisi piutang perusahaan secara keseluruhan (**Total OS vs OS Overdue**), aging bucket matrix, dan navigasi terpadu ke **9 Sub-Menu AR**:
  1. **TOP 20 AR (`/finance/ar-summary/top-20`)**: Daftar 20 piutang customer terbesar (*Total Current AR* & *Total OS*) yang dikategorikan otomatis ke dalam **Top Performance** atau **Critical** berdasarkan tingkat overduenya.
  2. **COLLECTION ALERT (`/finance/ar-summary/collection-alert`)**: Daftar invoice yang memerlukan tindakan penagihan segera, dikelompokkan ke dalam *Upcoming Overdue (7 Hari Kedepan)*, *Due Today*, *OD 1–30 Hari*, *OD 31–60 Hari*, *OD 61–90 Hari*, dan *OD >90 Hari*.
  3. **WEEKLY COLLECTION ACHIEVEMENT (`/finance/ar-summary/weekly-collection`)**: Pengukuran realisasi pembayaran secara mingguan (*Target vs Actual Collection* per minggu, persentase pencapaian, serta rincian postingan pembayaran yang masuk setiap hari).
  4. **AM PERFORMANCE (`/finance/ar-summary/am-performance`)**: Peringkat kontribusi DSR / Marketing (*Account Manager*) terhadap penerimaan pembayaran (*ranking collection* dan *ranking achievement* terhadap target).
  5. **GOODS IN TRANSIT TRACKING (`/finance/ar-summary/goods-in-transit`)**: Monitoring barang yang sudah keluar dari gudang atau telah dikirim ke customer (DO terbit/terkirim), tetapi belum diterbitkan invoice penagihannya (*Unbilled Delivery Orders*).
  6. **CREDIT LIMIT UTILIZATION (`/finance/ar-summary/credit-utilization`)**: Pengukuran penggunaan fasilitas kredit pelanggan dengan aturan otomatis:
     - Utilisasi kredit $\ge 80\%$: **Warning**
     - Utilisasi kredit $\ge 100\%$: **Over Limit**
     - Overdue $> 60$ hari: **Credit Review**
     - Overdue $> 90$ hari: Rekomendasi **Credit Hold** sesuai kebijakan
  7. **CUSTOMER PERFORMANCE (`/finance/ar-summary/customer-performance`)**: Evaluasi *range payment customer* berdasarkan *Average Payment Days* ($\le 0$ hari overdue: **Excellent**, $1\text{–}30$ hari: **Good**, $31\text{–}60$ hari: **High Risk**, $>60$ hari: **Critical**) beserta daftar program insentif customer.
  8. **COLLECTION PROJECTION (`/finance/ar-summary/collection-projection`)**: Target & proyeksi penagihan *weekly* dan *monthly* berdasarkan konfirmasi pembayaran customer (*committed date & amount*) serta umur overdue.
  9. **ICU — Incentive Customer Unit (`/finance/ar-summary/icu`)**: Manajemen pengajuan insentif customer (diskon pelunasan dipercepat, rabat volume, insentif pembayaran tepat waktu) yang membutuhkan *approval* dan tindak lanjut manajemen.

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
- 6 Sub-modul operasional fasilitas cabang: Genset, Kebersihan (5S), Air Minum Galon, Pengiriman GA, PDAM ($\text{m}^3$), Listrik (kWh).
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

### 12. Asisten AI Interaktif PADI, Auto-Report Engine & Model Context Protocol (MCP)
- **Floating AI Assistant PADI**: Tanya-jawab posisi stok real-time, piutang overdue, status pengiriman DO, dan tren omzet dengan bahasa alami, dilengkapi grafik C3 interaktif di dalam chat (`C3ChatChart`) dan unggah dokumen analisis.
- **Auto-Report & Presentation Generator**: Pembuatan laporan PDF/Excel profesional (`report_engine.py`) serta presentasi analisis DO interaktif (`do_presentation_generator.py`).
- **Server Model Context Protocol (FastMCP)** berbasis streaming Server-Sent Events (SSE) dengan OAuth Discovery untuk integrasi ke Claude Desktop, ChatGPT, atau Cursor.

### 13. 3D Digital Twin Warehouse & Schema Graph (`/database/warehouse-visualization` & `/database/schema`)
- Visualisasi spasial 3D denah gudang dan rak penyimpanan pallet bertingkat secara interaktif (Three.js / WebGL / Vite).
- Interactive Database Schema Visualizer: Canvas graf relasi Foreign Key antartabel database ERP core dan database analitik.

### 14. Aplikasi Mobile Lintas Platform (`mobile/` & `shared/`)
- Aplikasi mobile berbasis **Expo React Native** (Android & iOS) untuk pemantauan eksekutif, stok inventori, distribusi DO, penjualan, dan metrik keuangan secara *on-the-go*.
- Berbagi definisi tipe TypeScript dan konstanta terpusat melalui modul `shared/`.

## 🔑 Auth & RBAC (Role-Based Access Control)

| Role | Cakupan Hak Akses | Akses Finansial | Pembatasan RLS & Kebijakan |
|---|---|---|---|
| `admin` / `superadmin` | Seluruh Modul (Nasional) | Full Financial Access | Akses penuh tanpa batas ke seluruh modul, konfigurasi, dan user. |
| `finance` / `credit_control` | Keuangan, AR Summary (9 Sub-Menu), CRM, Laporan | Full Financial Access | Akses penuh Executive Dashboard Finance, AR Executive Summary beserta 9 sub-menu AR, konfirmasi proyeksi penagihan, dan approval ICU. |
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
│   │   ├── main.py                  # FastAPI entry point & routers
│   │   ├── config.py                # Settings & env vars
│   │   ├── database.py              # Dual DB engine (existing read-only + analytics)
│   │   ├── mcp_server.py            # Model Context Protocol (FastMCP / SSE)
│   │   ├── mcp/                     # MCP auth, permissions, queries, db_knowledge & tools
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── existing/            # Read-only models ERP Ultima
│   │   │   └── analytics/           # Read-write models (ODS, CRM, AR Confirmation, ICU, Users)
│   │   ├── routers/                 # API endpoints
│   │   │   ├── auth.py              # JWT + RBAC authorization
│   │   │   ├── finance.py           # Finance Executive Dashboard, AR Summary & 9 AR Sub-Menus
│   │   │   ├── inventory.py         # Stok & batch aging
│   │   │   ├── warehouses.py        # Gudang & mutasi IT
│   │   │   ├── sales.py             # Sales orders & invoices
│   │   │   ├── distributions.py     # DO & ekspedisi
│   │   │   ├── customers.py         # Customer 360 & pipeline
│   │   │   ├── crm.py               # Opportunities & activities
│   │   │   ├── forecast.py          # AI Demand forecasting endpoints
│   │   │   ├── hrm.py               # SDM, kehadiran & cuti
│   │   │   ├── ai_chat.py           # Dual-Agent AI Assistant PADI
│   │   │   ├── documents.py         # Upload dokumen, export laporan & presentasi DO
│   │   │   ├── alerts.py            # Real-time alerts
│   │   │   └── analytics.py         # Metrik & KPIs
│   │   ├── services/                # Layanan LLM, cache, report PDF/XLSX & DO presentation
│   │   └── workers/                 # Celery background tasks
│   │       ├── celery_app.py        # Celery worker configuration & beat schedule
│   │       ├── sync_inventory.py
│   │       ├── sync_sales.py
│   │       ├── sync_customers.py
│   │       ├── sync_distributions.py
│   │       ├── compute_analytics.py
│   │       └── check_alerts.py
│   └── alembic/                     # Database migrations
├── frontend/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # Executive Dashboard
│   │   ├── main-dashboard/          # C3 Interactive Main Dashboard
│   │   ├── inventory/               # Monitoring stok fisik & batch aging
│   │   ├── warehouses/              # Multi-warehouse Sultanbatara
│   │   ├── sales/                   # Monitoring sales & SO
│   │   ├── distributions/           # Logistik DO & financial flow
│   │   ├── crm/                     # Customer 360 & pipeline
│   │   ├── finance/                 # Finance Executive Dashboard & AR Executive Summary
│   │   │   ├── page.tsx             # Executive Dashboard Finance
│   │   │   └── ar-summary/          # AR Executive Summary + 9 Sub-Menu routes
│   │   │       ├── page.tsx
│   │   │       ├── top-20/
│   │   │       ├── collection-alert/
│   │   │       ├── weekly-collection/
│   │   │       ├── am-performance/
│   │   │       ├── goods-in-transit/
│   │   │       ├── credit-utilization/
│   │   │       ├── customer-performance/
│   │   │       ├── collection-projection/
│   │   │       └── icu/
│   │   ├── forecast/                # AI Demand forecasting
│   │   ├── assets/fleet/            # Fleet & vehicle logbook
│   │   ├── ga/                      # General Affairs logbook & entry
│   │   ├── it/                      # IT asset & helpdesk hub
│   │   ├── hrm/                     # SDM, absensi & cuti
│   │   ├── database/                # 3D warehouse & schema graph
│   │   └── docs/                    # In-app Dokumentasi Sistem & Teknis
│   ├── components/                  # React components
│   │   ├── layout/                  # Sidebar, Topbar, AppShell
│   │   ├── finance/                 # Komponen ExecutiveDashboard, ArExecutiveSummary & 9 halaman AR
│   │   ├── charts/c3/               # Komponen grafik C3.js
│   │   ├── ai/                      # AIChatBox, ChatMarkdown & C3ChatChart
│   │   ├── ga/                      # GaLogbookApp & forms
│   │   ├── assets/                  # FleetLogbookApp
│   │   └── docs/                    # DocsPage & MermaidViewer
│   ├── lib/                         # API clients (api.ts, finance-api.ts, aiChat.ts)
│   └── types/                       # Definisi tipe TypeScript (finance.ts, dll)
├── mobile/                          # Aplikasi Mobile Expo React Native (Android & iOS)
├── shared/                          # Tipe data & konstanta bersama (Web & Mobile)
└── docs/                            # Dokumentasi arsitektur, MCP & Obsidian Vault
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

Database existing **hanya dibaca** — koneksi menggunakan `default_transaction_read_only=on`. Tidak ada operasi `INSERT`/`UPDATE`/`DELETE` ke database lama.

```sql
-- Yang di-grant ke aplikasi ini:
GRANT CONNECT ON DATABASE cpa_existing TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
```
