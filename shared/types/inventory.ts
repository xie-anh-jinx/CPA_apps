/**
 * CPA Platform — Shared Inventory Types
 */

export interface InventorySummary {
  total_sku: number;
  total_quantity: number;
  total_value?: number;
  low_stock_count: number;
  overstock_count: number;
  warehouses_count?: number;
}

export interface ProductStock {
  id_barang: string;
  nama_barang: string;
  id_kategori?: string;
  kategori?: string;
  stok_total: number;
  stok_tersedia?: number;
  stok_dialokasikan?: number;
  satuan?: string;
  harga_satuan?: number;
  nilai_total?: number;
  status_stok?: "aman" | "kritis" | "berlebih" | "habis";
  gudang_distribusi?: Record<string, number>;
  batch_count?: number;
}

export interface BatchAgingRecord {
  id_barang: string;
  nama_barang: string;
  batch_no: string;
  id_gudang: string;
  gudang?: string;
  qty: number;
  satuan: string;
  tgl_masuk: string;
  umur_hari: number;
  kategori_aging: "0-30" | "31-60" | "61-90" | "91-180" | ">180";
  nilai_stok?: number;
  status?: string;
}

export interface InventoryMovement {
  id: string;
  tanggal: string;
  nomor_dokumen: string;
  jenis_mutasi: "masuk" | "keluar" | "transfer" | "penyesuaian";
  id_barang: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  gudang_asal?: string;
  gudang_tujuan?: string;
  keterangan?: string;
}
