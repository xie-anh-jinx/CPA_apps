/**
 * CPA Platform — Shared Distributions & DO Types
 */

export interface DoReceiptHeader {
  no_do: string;
  tgl_do?: string | null;
  tgl_do_str?: string;
  picking_list_no?: string;
  id_customer?: string;
  customer?: string;
  po_no?: string;
  id_gudang?: string;
  gudang?: string;
  contact_person?: string;
  telpon_no?: string;
  nama_penerima?: string;
  receive_date?: string | null;
  receive_date_str?: string;
  tgl_sampai_tujuan?: string | null;
  tgl_sampai_tujuan_str?: string;
  biaya_pengiriman?: number | string | null;
  return_date?: string | null;
  return_date_str?: string;
  delivery_address?: string;
  status?: string;
  status_label?: string;
  driver?: string;
  lic_plate?: string;
  transporter?: string;
  tgl_keluar?: string | null;
  keterangan?: string;
  // Geolocation for mobile delivery tracking
  latitude?: number;
  longitude?: number;
  photo_url?: string;
}

export interface DoLineItem {
  no: number;
  kode_barang: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  packing_number?: string;
  packing_type?: string;
  qty_diterima?: number;
  keterangan?: string;
}

export interface DistributionSummary {
  total_do: number;
  send?: number;
  received?: number;
  invoice?: number;
  cancel?: number;
  draft?: number;
  delivered: number;
  in_transit: number;
  pending: number;
  on_time_delivery_rate: number;
  avg_delivery_days: number;
}
