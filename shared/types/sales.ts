/**
 * CPA Platform — Shared Sales Types
 */

export interface SalesSummary {
  total_omzet: number;
  total_orders: number;
  total_volume_liter?: number;
  avg_order_value: number;
  growth_mom_pct?: number;
  ar_outstanding_total?: number;
}

export interface SalesOrderRecord {
  nomor: string;
  tanggal: string;
  id_customer: string;
  nama_customer: string;
  id_sales?: string;
  nama_sales?: string;
  total_nominal: number;
  total_qty?: number;
  status: string;
  status_label?: string;
  referensi_po?: string;
  term_of_payment?: string;
  jatuh_tempo?: string;
}

export interface AROutstandingItem {
  id_customer: string;
  nama_customer: string;
  nomor_faktur: string;
  tanggal_faktur: string;
  jatuh_tempo: string;
  umur_hari: number;
  sisa_piutang: number;
  total_faktur: number;
  status_pembayaran: "lancar" | "jatuh_tempo" | "kritis";
  kategori_overdue: "belum_jatuh_tempo" | "1-30" | "31-60" | "61-90" | ">90";
}
