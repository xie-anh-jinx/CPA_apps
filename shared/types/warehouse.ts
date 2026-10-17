/**
 * CPA Platform — Shared Warehouse Types
 */

export interface WarehouseRecord {
  id_gudang: string;
  gudang: string;
  lokasi?: string;
  alamat?: string;
  kota?: string;
  kapasitas_total?: number;
  kapasitas_terpakai?: number;
  utilisasi_persen?: number;
  total_sku?: number;
  total_qty?: number;
  status_operasional?: "aktif" | "nonaktif" | "pemeliharaan";
}

export interface WarehouseComparison {
  id_gudang: string;
  gudang: string;
  total_qty: number;
  total_sku: number;
  inbound_monthly: number;
  outbound_monthly: number;
}
