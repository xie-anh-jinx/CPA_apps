# 🗄️ Database Graph & Visualisasi DBeaver

Dokumen ini ditujukan khusus bagi **Data Analyst** dan pengembang untuk memahami dari mana asal data CPA Analytics, bagaimana relasi antar entitasnya, dan bagaimana data tersebut dihasilkan (Data Lineage) sebelum ditampilkan di UI/UX.

---

## 1. Menampilkan Relasi (ERD) Menggunakan DBeaver

**DBeaver** adalah alat yang sangat disarankan untuk memvisualisasikan skema database PostgreSQL kita menjadi *Entity-Relationship Diagram* (ERD).

### Langkah-langkah Generate ERD:
1. Buka aplikasi **DBeaver**.
2. Buat koneksi baru ke database **PostgreSQL** CPA Analytics.
3. Di panel sebelah kiri (*Database Navigator*), rentangkan koneksi Anda $\rightarrow$ rentangkan `Databases` $\rightarrow$ rentangkan nama database Anda $\rightarrow$ rentangkan `Schemas` $\rightarrow$ pilih skema `public`.
4. **Klik Kanan** pada tulisan `public` (atau pada tabel spesifik yang ingin dilihat), lalu pilih **View Diagram** atau klik dua kali dan buka tab **ER Diagram** di panel utama.
5. Anda akan melihat kotak-kotak (tabel) dengan garis penghubung (*graph*). Garis ini menunjukkan **Primary Key (PK)** dan **Foreign Key (FK)**. Anda dapat menggeser tabel-tabel ini agar lebih mudah dibaca.

---

## 2. Pemetaan Sumber Data ke UI/UX (Data Lineage)

Data Analyst perlu memahami bahwa **tidak semua data yang ada di UI berasal dari database PostgreSQL kita**. CPA Analytics menggunakan pendekatan *Hybrid Data Source*:

### A. Data Internal (PostgreSQL)
Data yang murni dihasilkan dan disimpan di dalam server lokal kita. Anda bisa melihat relasinya secara utuh di DBeaver.
- **Data User & RLS (Akses)**: Tabel `users`, `roles`, dan `permissions`. Menentukan siapa yang bisa melihat data apa.
- **Inventory & Multi-Warehouse**: Tabel `inventory_items`, `warehouses`, `stock_mutations`. Data ini mengalir ke **Inventory Summary** dan **Multi-Warehouse Tab** di frontend melalui API `GET /api/inventory/...`.
- **Finance & AR Aging**: Tabel `invoices`, `payments`, `ar_aging_buckets`. Digunakan oleh tim Finance Manager untuk *Credit Health* di UI CRM.

### B. Data Eksternal (API KITA Dashboard)
Ini adalah kumpulan data analitik performa yang bersifat *live* atau *cached* dari sistem utama perusahaan, dan **TIDAK ADA** tabel fisiknya di DBeaver kita. Backend kita mengambilnya sebagai "passthrough".
- **Customer Dashboard (Customer Chart & Key Account)**: UI memanggil endpoint kita, lalu backend kita menarik data langsung dari `https://www.kita-dashboard.id`.
- **Picture of Success (6 Focus Tabs)**: Tab *Pipeline Strength, Runner Ratio, Premium Focus, dll*, tidak memiliki relasi FK di DBeaver. Backend mengambilnya dari KITA Dashboard, menyusunnya dalam JSON, dan mengirimkannya ke komponen UI (Recharts / C3.js).

---

## 3. Cara Membaca Alur Data (Reverse Engineering)

Jika Data Analyst melihat sebuah angka di layar (misal: **"YTD Sell Out: 5,000 L"** di halaman Key Account) dan ingin tahu dari mana asalnya:

1. Buka file komponen UI di frontend (misal: `frontend/app/intelligence/customers/page.tsx`). Cari dari endpoint mana komponen tersebut meminta data (biasanya menggunakan fungsi dari `api.ts`).
2. Temukan fungsi tersebut di backend (misal: `backend/app/routers/kita_analytics.py`).
3. Di dalam *router* backend, Anda akan melihat apakah data diambil menggunakan `SQLAlchemy` (berarti berasal dari PostgreSQL dan bisa dicek relasinya di DBeaver) atau dipanggil menggunakan `kita_client.py` (berarti berasal dari KITA API eksternal).
