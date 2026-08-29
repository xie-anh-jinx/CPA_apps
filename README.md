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

## 📡 URL Akses

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:3000 |
| FastAPI + Swagger Docs | http://localhost:8000/docs |
| Celery Flower Monitor | http://localhost:5555 |
| PostgreSQL Existing | localhost:5433 |
| PostgreSQL Analytics | localhost:5434 |
| Redis | localhost:6379 |

## 📊 Modul Aplikasi

### 1. Executive Dashboard (`/`)
- KPI ringkasan: omzet, inventory value, alert counts
- Sales trend chart 6 bulan
- Segmentasi customer (aktif/dormant/at-risk/churned)
- Status sinkronisasi real-time

### 2. Inventory Monitoring (`/inventory`)
- Stok per SKU per gudang
- Status: On Hand / Reserved / Available / Damaged / Quarantine
- Filter: Low Stock, Zero Stock, Overstock
- Nilai persediaan dan HPP

### 3. Multi-Warehouse (`/warehouses`)
- Dashboard konsolidasi semua gudang
- Perbandingan kapasitas dan stok
- Histori transfer antargudang
- Performa per periode

### 4. Sales Monitoring (`/sales`)
- Pipeline: SO → DO → Invoice → Payment
- Trend harian/mingguan/bulanan
- Top produk, top customer, per salesman
- Piutang outstanding

### 5. Distribusi (`/distributions`)
- DO tracking dengan status (Draft/In Transit/Delivered)
- Peta origin-destination (Leaflet)
- On-time rate dan biaya distribusi

### 6. CRM (`/crm`)
- Customer 360 View (profil, histori, produk, aktivitas)
- Pipeline opportunities (Prospect → Closed Won)
- Keluhan dan tiket
- Segmentasi dan reminder follow-up

## 🔑 Auth & RBAC

| Role | Akses |
|---|---|
| `admin` | Full access + user management |
| `manager` | Semua dashboard + analytics |
| `sales` | Sales + CRM + Customer 360 |
| `warehouse` | Inventory + Warehouse monitoring |
| `viewer` | Read-only semua dashboard |

## 📂 Struktur Direktori

```
CPA_apps/
├── docker-compose.yml
├── .env.example
├── setup.sh                    # Script setup otomatis
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Settings
│   │   ├── database.py         # Dual DB engine
│   │   ├── models/
│   │   │   ├── existing/       # Read-only models DB lama
│   │   │   └── analytics/      # Read-write models analytics
│   │   ├── routers/            # API endpoints
│   │   │   ├── auth.py         # JWT + RBAC
│   │   │   ├── inventory.py
│   │   │   ├── warehouses.py
│   │   │   ├── sales.py
│   │   │   ├── distributions.py
│   │   │   ├── customers.py
│   │   │   ├── crm.py
│   │   │   ├── alerts.py
│   │   │   └── analytics.py
│   │   └── workers/            # Celery tasks
│   │       ├── celery_app.py   # Celery config + beat schedule
│   │       ├── sync_inventory.py
│   │       ├── sync_sales.py
│   │       ├── sync_customers.py
│   │       ├── sync_distributions.py
│   │       ├── compute_analytics.py
│   │       └── check_alerts.py
│   └── alembic/                # DB migrations
│       └── versions/0001_initial.py
├── frontend/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   │   ├── layout/             # Sidebar, Topbar, AppShell
│   │   ├── dashboard/          # Executive dashboard
│   │   └── inventory/          # Inventory page
│   └── lib/api.ts              # Axios API client
└── nginx/nginx.conf            # Reverse proxy
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
