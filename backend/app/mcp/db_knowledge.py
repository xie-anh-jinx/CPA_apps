"""
CPA Platform / PADI ERP — Database Knowledge & Logic Registry
═════════════════════════════════════════════════════════════
Provides structured business domain categorization, ERD relationships,
table purposes, and column translations for both:
1. Operational ERP Database (PostgreSQL Ultima - cpa_existing)
2. Analytics Database (PostgreSQL Analytics - cpa_analytics)
"""

from typing import Dict, List, Any, Optional

# ─── 1. Core ERP Domain Categorization & Table Registry ────────────────────────

ERP_TABLE_DOMAINS: Dict[str, Dict[str, Any]] = {
    "INVENTORY": {
        "title": "Manajemen Persediaan & Gudang (Inventory & Warehouses)",
        "description": "Menyimpan master produk oli/pelumas, stok fisik per gudang, batch, kadaluarsa, mutasi, dan transfer.",
        "tables": {
            "barang": "Master katalog produk/barang, SKU, nama produk, HPP (modal), harga jual, min/max stok, satuan, dan family brand.",
            "stok_barang": "Posisi stok fisik per gudang secara real-time, nomor batch produksi, tanggal kadaluarsa, dan kuantitas persediaan.",
            "gudang": "Master lokasi fisik gudang, cabang operasional, alamat depo, dan penanggung jawab gudang.",
            "barang_minmax": "Batas minimum dan maksimum stok per gudang untuk panduan reorder point (ROP).",
            "internaltransfer": "Dokumen transfer mutasi stok antar cabang/gudang (in-transit).",
            "decanting": "Pencatatan proses repacking/decanting drum menjadi kemasan pail/jerigen/liter.",
            "disposal": "Penghapusan atau pemusnahan barang rusak/kadaluarsa (spoilage/scrap)."
        }
    },
    "SALES": {
        "title": "Penjualan & Komersial (Sales & Invoicing)",
        "description": "Menyimpan pesanan penjualan (SO), faktur komersial (penjualan), detail item penjualan, dan relasi ke pengiriman.",
        "tables": {
            "so": "Sales Order (Surat Pesanan Pelanggan) dari sales/customer, tanggal pemesanan, nilai transaksi, dan status approval.",
            "so_detail": "Rincian produk pada Sales Order (SKU barang, kuantitas order, harga satuan, dan diskon).",
            "penjualan": "Faktur Penjualan (Sales Invoice / Piutang), no faktur, tanggal jatuh tempo, total tagihan, status bayar (is_lunas), dan salesman.",
            "penjualan_detail": "Rincian barang pada Faktur Penjualan (qty jual, harga real, subtotal, diskon).",
            "penjualando": "Tabel jembatan (cross-reference) yang menghubungkan Faktur Penjualan dengan Surat Jalan / DO pengiriman."
        }
    },
    "DISTRIBUTION": {
        "title": "Distribusi & Logistik Pengiriman (Logistics & DO)",
        "description": "Pelacakan Surat Jalan (DO), armada kendaraan, sopir/transporter, volume dalam Liter, dan lead time kirim.",
        "tables": {
            "do_tbl": "Surat Jalan / Delivery Order (DO) resmi pengiriman barang dari gudang ke alamat customer/site, sopir, nomor polisi, dan status ekspedisi.",
            "do_detail": "Rincian barang dan volume (dalam Liter/Qty) yang dimuat dalam armada pengiriman Surat Jalan.",
            "penjualando": "Relasi antara nomor DO dengan nomor invoice/faktur penjualan."
        }
    },
    "PROCUREMENT": {
        "title": "Pengadaan & Pembelian (Procurement & Purchasing)",
        "description": "Pengadaan stok dari prinsipal (Shell / supplier), purchase order, dan bukti penerimaan barang masuk.",
        "tables": {
            "supplier": "Master data vendor, prinsipal (seperti Shell), alamat, kontak, dan syarat pembayaran.",
            "po": "Purchase Order (PO) pembelian persediaan ke supplier prinsipal.",
            "po_detail": "Detail barang dan nilai nominal yang dipesan ke supplier pada tiap PO.",
            "penerimaan": "Bukti Penerimaan Barang (Goods Receipt / Inbound) dari supplier di gudang penerima.",
            "penerimaan_detail": "Rincian fisik produk yang telah diterima dan diinspeksi masuk ke gudang."
        }
    },
    "CUSTOMER_CRM": {
        "title": "Pelanggan & CRM (Customer & Relationship)",
        "description": "Master data pembeli, sektor industri pelanggan, plafon kredit (credit limit), dan termin pembayaran.",
        "tables": {
            "customer": "Master data kontak customer, badan usaha (PT/CV/Perorangan), alamat pengiriman, dan NPWP.",
            "customer_kontak": "Daftar PIC / kontak person perwakilan pelanggan.",
            "customer_pengiriman": "Daftar alamat tujuan bongkar muat (delivery drop-point) milik pelanggan.",
            "sektor": "Klasifikasi industri pelanggan (Pertambangan, Perkebunan, Transportasi/Fleet, Manufaktur, Konstruksi, dll.)."
        }
    },
    "FINANCE": {
        "title": "Keuangan & Akuntansi (Finance & General Ledger)",
        "description": "Buku besar, piutang usaha (AR), hutang dagang (AP), kas masuk/keluar, dan nota kredit.",
        "tables": {
            "acc_ar_faktur": "Buku pembantu piutang dagang (AR) berdasarkan faktur penjualan yang belum lunas.",
            "acc_ap_faktur": "Buku pembantu hutang dagang (AP) kepada supplier / vendor.",
            "acc_gl_trans": "Transaksi jurnal umum / buku besar keuangan (General Ledger).",
            "acc_gl_detail": "Ayat jurnal debit / kredit transaksi buku besar.",
            "acc_kas": "Pencatatan kas dan bank masuk/keluar.",
            "credit_note": "Nota retur atau potongan kredit untuk transaksi penjualan."
        }
    },
    "HRM": {
        "title": "Kepegawaian & SDM (Human Resources)",
        "description": "Data karyawan, tim sales, sopir logistik, jabatan, divisi kerja, dan penempatan cabang.",
        "tables": {
            "pegawai": "Master data staf dan karyawan (nama, NIK, jabatan, nomor telepon, divisi kerja, cabang lokasi).",
            "departemen": "Struktur departemen organisasi perusahaan.",
            "jabatan": "Tingkatan posisi / jabatan kerja karyawan."
        }
    },
    "ANALYTICS": {
        "title": "Analytics Data Mart (Data Warehouse Layer)",
        "description": "Agregasi metrik performa bisnis, snapshot harian, customer intelligence, dan forecasting.",
        "tables": {
            "daily_sales": "Ringkasan penjualan harian teragregasi untuk dashboard cepat.",
            "forecast_results": "Hasil proyeksi kebutuhan stok AI (7 hari, 30 hari, 90 hari) berbasis ML.",
            "model_metrics": "Akurasi model forecasting (WAPE, RMSE, MAPE).",
            "analytics.daily_stock_snapshot": "Snapshot harian persediaan stok dan valuasi per gudang.",
            "analytics.customer_metrics": "Metrik kesehatan pelanggan (RFM, churn risk, rasio pembayaran).",
            "analytics.warehouse_performance": "KPI efisiensi gudang dan utilisasi kapasitas."
        }
    }
}


# ─── 2. Business Flow & ERD Relational Logic ──────────────────────────────────

BUSINESS_WORKFLOWS: List[Dict[str, Any]] = [
    {
        "flow_name": "Order-to-Cash (Siklus Penjualan & Pembayaran)",
        "steps": [
            "1. Sales Order (`so`, `so_detail`): Customer memesan pelumas melalui sales rep.",
            "2. Delivery Order (`do_tbl`, `do_detail`): Gudang menyiapkan barang dan menerbitkan Surat Jalan (DO) dengan volume dalam Liter.",
            "3. Cross-Link (`penjualando`): Menghubungkan nomor DO pengiriman dengan nomor faktur komersial.",
            "4. Sales Invoice (`penjualan`, `penjualan_detail`): Faktur resmi terbit, mencatat total tagihan dan tanggal jatuh tempo (TOP).",
            "5. Accounts Receivable (`acc_ar_faktur`): Mencatat piutang customer hingga customer melunasi (`is_lunas = true`)."
        ],
        "key_foreign_keys": [
            "so_detail.no_so -> so.no_so",
            "penjualando.no_penjualan -> penjualan.no_penjualan",
            "penjualando.no_do -> do_tbl.nomor",
            "penjualan_detail.no_penjualan -> penjualan.no_penjualan",
            "penjualan.id_customer -> customer.id_kontak",
            "penjualan.id_salesman -> pegawai.id_pegawai"
        ]
    },
    {
        "flow_name": "Procure-to-Pay (Siklus Pengadaan & Masuk Stok)",
        "steps": [
            "1. Purchase Requisition (`permintaan_pembelian`): Permintaan kebutuhan restock dari gudang.",
            "2. Purchase Order (`po`, `po_detail`): Order pembelian resmi dikirimkan ke supplier Shell / prinsipal.",
            "3. Goods Receipt (`penerimaan`, `penerimaan_detail`): Barang tiba di gudang dan dicek fisik serta batch.",
            "4. Stock Update (`stok_barang`): Kuantitas stok otomatis bertambah pada gudang tujuan.",
            "5. Accounts Payable (`acc_ap_faktur`): Kewajiban hutang dagang dicatat ke pembukuan finance."
        ],
        "key_foreign_keys": [
            "po.id_supplier -> supplier.id_kontak",
            "po_detail.no_po -> po.nomor",
            "penerimaan.no_po -> po.nomor",
            "stok_barang.id_barang -> barang.id_barang",
            "stok_barang.id_gudang -> gudang.id_gudang"
        ]
    },
    {
        "flow_name": "Stock Aging & Lifecycle (Manajemen Umur Stok)",
        "steps": [
            "1. Fresh / Fast-Moving: Umur stok di bawah 150 hari sejak tanggal penerimaan/batch.",
            "2. Over-Stock: Umur persediaan antara 150 s/d 239 hari (perlu dorongan program promosi/bundling).",
            "3. Deadstock: Umur persediaan di atas 240 hari (risiko tinggi, evaluasi diskon cuci gudang atau retur)."
        ],
        "calculation_logic": "Umur stok dihitung dari: `CURRENT_DATE - tgl_masuk_batch` atau selisih hari mutasi terakhir."
    }
]


# ─── 3. Column Terminology & Business Dictionary ──────────────────────────────

COLUMN_DICTIONARY: Dict[str, Dict[str, str]] = {
    "id_barang": {"id": "Kode unik SKU / barang pelumas", "desc": "Identifier utama produk di sistem."},
    "nama_barang": {"id": "Nama lengkap produk pelumas", "desc": "Contoh: Shell Rimula R4 X 15W-40."},
    "hpp": {"id": "Harga Pokok Penjualan (Modal dasar)", "desc": "Biaya modal per unit barang."},
    "harga": {"id": "Harga jual per satuan", "desc": "Harga transaksi sebelum atau sesudah diskon."},
    "grandtotal": {"id": "Total nilai akhir transaksi", "desc": "Total faktur termasuk PPN dan dikurangi diskon."},
    "is_lunas": {"id": "Status pelunasan pembayaran", "desc": "Boolean (true = lunas, false = masih ada piutang)."},
    "total_bayar": {"id": "Akumulasi pembayaran yang telah diterima", "desc": "Nominal uang yang sudah dibayar oleh customer."},
    "id_customer": {"id": "ID Referensi Pelanggan", "desc": "Menghubungkan ke `customer.id_kontak`."},
    "id_salesman": {"id": "ID Karyawan Salesman / DSR", "desc": "Menghubungkan ke `pegawai.id_pegawai`."},
    "id_gudang": {"id": "Kode unik gudang penyimpanan", "desc": "Contoh: 001 (Pusat), 005 (Banjarmasin)."},
    "stok": {"id": "Kuantitas stok fisik di gudang", "desc": "Jumlah total fisik on-hand."},
    "batch": {"id": "Nomor lot / batch produksi", "desc": "Penanda kode produksi pabrik untuk traceability."},
    "kadaluarsa": {"id": "Tanggal kedaluwarsa produk", "desc": "Batas waktu rekomendasi penggunaan pelumas."},
    "no_do": {"id": "Nomor Surat Jalan pengiriman", "desc": "Dokumen jalan barang dari gudang ke pembeli."},
    "lic_plate": {"id": "Nomor plat polisi armada truk", "desc": "Armada kendaraan pengantar logistik."},
    "driver": {"id": "Nama pengemudi / sopir", "desc": "Petugas kurir/sopir pengantar barang."},
    "volume": {"id": "Volume muatan (dalam Liter)", "desc": "Kapasitas muatan pelumas dalam satuan Liter."},
    "sektor": {"id": "Kategori industri pelanggan", "desc": "Mining, Plantation, Fleet, Marine, Industry."}
}


# ─── 4. Helper Functions ──────────────────────────────────────────────────────

def get_database_overview() -> Dict[str, Any]:
    """Mengembalikan ringkasan lengkap struktur database ERP dan relasinya."""
    return {
        "domains": ERP_TABLE_DOMAINS,
        "workflows": BUSINESS_WORKFLOWS,
        "key_columns": COLUMN_DICTIONARY
    }


def find_table_domain(table_name: str) -> Optional[str]:
    """Menemukan domain bisnis untuk nama tabel tertentu."""
    tbl = table_name.lower().strip()
    for domain_key, domain_info in ERP_TABLE_DOMAINS.items():
        if tbl in domain_info.get("tables", {}):
            return domain_key
    return None


def get_table_business_meaning(table_name: str) -> str:
    """Mengembalikan deskripsi bahasa manusia untuk tabel tertentu."""
    tbl = table_name.lower().strip()
    for domain_info in ERP_TABLE_DOMAINS.values():
        tables = domain_info.get("tables", {})
        if tbl in tables:
            return tables[tbl]
    return f"Tabel operasional '{table_name}' pada sistem ERP PADI."
