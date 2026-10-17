/**
 * CPA Platform — Shared Customer & CRM Types
 */

export interface CustomerRecord {
  id_kontak: string;
  customer: string;
  alamat?: string;
  kota?: string;
  telepon?: string;
  email?: string;
  id_sales?: string;
  sales_name?: string;
  kredit_limit?: number;
  saldo_piutang?: number;
  term_pembayaran?: number;
  status_kredit?: "sehat" | "waspada" | "kritis";
  klasifikasi_segment?: "platinum" | "gold" | "silver" | "bronze";
}

export interface CreditHealthRecord {
  id_customer: string;
  customer: string;
  credit_limit: number;
  total_outstanding: number;
  overdue_amount: number;
  utilization_pct: number;
  risk_level: "rendah" | "sedang" | "tinggi";
  avg_payment_days: number;
}

export interface CRMActivity {
  id?: number;
  id_customer: string;
  tipe_aktivitas: "kunjungan" | "telepon" | "email" | "penawaran" | "meeting";
  catatan: string;
  tanggal: string;
  sales_rep?: string;
  latitude?: number;
  longitude?: number;
  lampiran_foto?: string;
}
