# CPA Analytics Mobile App (Expo + React Native + TypeScript)

Aplikasi mobile resmi CPA Analytics / PADI berbasis **Expo SDK 52** (React Native & TypeScript) yang terintegrasi langsung dengan backend FastAPI sebagai **Single Source of Truth**.

---

## 📱 Arsitektur & Teknologi

- **Framework**: Expo SDK 52 (React Native 0.76+, Expo Router v4)
- **Bahasa**: TypeScript (Strict Mode)
- **Styling**: NativeWind (Tailwind CSS v3) + Design System Terpadu (Dark/Light Mode)
- **Data Fetching & Offline Caching**: TanStack React Query + AsyncStorage Persister
- **State Management**: Zustand
- **Keamanan & Token JWT**: Expo SecureStore (Hardware-backed iOS Keychain & Android Keystore)
- **Hardware Integration**:
  - **Expo Camera & Barcode Scanner**: Scan barcode SKU barang dan QR Surat Jalan (DO)
  - **Expo Location (GPS)**: Pencatatan koordinat GPS serah terima barang dan log kunjungan sales
  - **Expo Image Picker**: Unggah foto bukti penerimaan DO dan dokumentasi kunjungan
  - **Expo Notifications**: Push notification status distribusi dan alert stok kritis
  - **Expo FileSystem & Sharing**: Unduh dan bagikan dokumen laporan Excel / PDF
- **Form & Validasi**: React Hook Form + Zod (menggunakan schema dari folder `shared/`)

---

## 📂 Struktur Project

```
CPA_analytics/
├── shared/                         # Shared Types, DTOs, Validation, & Constants
│   ├── types/                      # TypeScript Interfaces (Auth, DO, Stock, Sales, dll.)
│   ├── constants/                  # API Endpoints, Status Badges, Theme Colors
│   └── validation/                 # Zod Schemas (Login, CRM, Settings)
│
├── mobile/                         # Expo React Native App
│   ├── app/                        # Expo Router Pages (Feature Parity dengan Web)
│   │   ├── (auth)/login.tsx        # Login Screen
│   │   ├── (tabs)/
│   │   │   ├── index.tsx           # Executive Dashboard & KPI Grid
│   │   │   ├── inventory.tsx       # Monitoring Stok Persediaan & Filter Gudang
│   │   │   ├── sales.tsx           # Sales Orders & AR Outstanding
│   │   │   ├── crm.tsx             # Customer 360, Credit Health, & Log Kunjungan GPS
│   │   │   └── ai.tsx              # PADI AI Assistant & Integrasi MCP
│   │   ├── distributions/          # Tracking DO & Form Receipt Delivery Order
│   │   ├── warehouse/              # Kapasitas Gudang & Visualisasi
│   │   ├── aging/                  # FIFO Batch Aging (0-30, 31-60, >180 hari)
│   │   ├── forecast/               # Demand Forecasting & Model Akurasi
│   │   ├── reports/                # Unduh Laporan Excel / PDF & Native Sharing
│   │   ├── database-graph/         # Visualisasi Skema Database & Relasi FK
│   │   ├── docs/                   # Dokumentasi Sistem (Akses Tanpa Login)
│   │   ├── settings/               # Dark Mode, Ganti Server URL, Bersihkan Cache
│   │   └── scanner/                # Camera Barcode Scanner
│   ├── components/                 # Reusable UI & Modal Form
│   │   ├── common/                 # Header, Card, Badge, Button, Input
│   │   └── distribution/           # ReceiptModal (Form Receipt DO persis Ultima)
│   ├── services/                   # Axios API Clients & Hardware Services
│   ├── stores/                     # Zustand Stores (Auth, Theme, Offline Sync Queue)
│   ├── hooks/                      # React Query Custom Hooks
│   ├── theme/                      # Tokens & Colors Design System
│   └── navigation/                 # Route Name Constants
│
├── frontend/                       # Next.js Web App
└── backend/                        # FastAPI Backend (Single Source of Truth)
```

---

## 🚀 Menjalankan Aplikasi Mobile

### 1. Masuk ke direktori mobile & Install dependensi:
```bash
cd /root/CPA_analytics/mobile
npm install
```

### 2. Menjalankan di Expo Go atau Emulator:
```bash
# Menjalankan Expo development server
npx expo start

# Menjalankan langsung di Android Emulator / Device:
npx expo start --android

# Menjalankan di iOS Simulator:
npx expo start --ios

# Menjalankan mode Web:
npx expo start --web
```

---

## 🔄 Fitur Unggulan Mobile & Paritas Web

1. **Form Receipt Delivery Order (DO)**:
   - Sesuai dengan form asli Ultima (No. DO, Picking List No, PO No, Contact Person, Nama Penerima, Tgl Sampai, Rich Text Delivery Address, Customer, Gudang, Telpon, Receive Date, Biaya Pengiriman, Return Date, serta daftar detail item barang).
   - Filter status lengkap: `Send`, `Received`, `Invoice`, `Cancel`, `Draft`.
2. **Offline-First & Background Sync**:
   - Jika koneksi terputus, data tetap dapat dilihat melalui offline cache.
   - Aktivitas kunjungan sales otomatis masuk antrean (`OfflineStore`) dan tersinkronisasi saat koneksi pulih.
3. **Kamera & Barcode Scanner**:
   - Scan barcode SKU langsung mengarahkan ke filter stok barang.
   - Ambil foto bukti serah terima DO dan kunjungan sales.
4. **GPS Tagging**:
   - Lokasi geografis otomatis tercatat saat serah terima barang atau pencatatan aktivitas CRM.
