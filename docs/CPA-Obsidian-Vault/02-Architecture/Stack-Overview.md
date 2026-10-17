# 🏗️ Arsitektur Sistem CPA Analytics

Sistem ini dirancang menggunakan arsitektur monorepo dengan pemisahan Frontend dan Backend berbasis Docker containers.

## 📦 Tech Stack Utama
- **Frontend**: Next.js 16, React 19, TailwindCSS, Lucide Icons, Recharts & C3.js (Visualisasi).
- **Backend**: Python FastAPI, Pydantic, SQLAlchemy.
- **Reverse Proxy**: Nginx (menangani routing port 80/443).
- **Integrasi Eksternal**: KITA Dashboard (Live API via `backend/app/services/kita_client.py`).

## 🔐 Sistem Keamanan & Akses (RLS)
Sistem memiliki kontrol akses ketat berdasarkan *Role-Based Access Control* (RBAC) dan *Row-Level Security* (RLS):
1. **Warehouse Staff** (`warehouse_staff`): Memiliki akses ke modul *Inventory*, namun **diblokir total** dari data finansial dan omzet (Zero Financial Access). Valuasi persediaan di-*masking*.
2. **Sales Representative** (`sales_rep`): Hanya dapat melihat relasi dan transaksi milik pelanggannya sendiri (Contoh kasus: *Azzuhri*).
3. **Finance & Accounting** (`finance_manager`, `ar_staff`): Memiliki akses ke modul Piutang (AR Aging), *Credit Health*, dan *Pre-Delivery Credit Check*.

## 🐳 Struktur Docker
- `cpa_frontend` (Port 3001 internal)
- `cpa_backend` (Port 8000 internal)
- `data_warehouse-nginx-1` (Mengekspos layanan ke browser di port 80/443)
