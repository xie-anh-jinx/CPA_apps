/**
 * CPA Platform — Finance & Accounting Module TypeScript Interfaces
 */

export interface ExecutiveDashboardKPI {
  total_delivery_order: number;
  total_shipping_cost: number;
  total_transport_cost: number;
  total_budget_request: number;
  total_actual_cost: number;
  total_variance: number;
  total_variance_pct: number;
  pending_verification: number;
  average_lead_time_days: number;
  top_customer: {
    name: string;
    total_cost: number;
    do_count: number;
  };
  top_sales: {
    name: string;
    total_cost: number;
    do_count: number;
    variance_pct: number;
  };
  top_vendor: {
    name: string;
    shipment_count: number;
    total_cost: number;
    on_time_rate: number;
  };
}

export interface ExecutiveChartsData {
  shipping_cost_trend: Array<{
    period: string;
    budget_request: number;
    actual_cost: number;
    estimasi_sales: number;
  }>;
  variance_trend: Array<{
    period: string;
    variance_nominal: number;
    variance_pct: number;
  }>;
  top_customers: Array<{
    name: string;
    shipping_cost: number;
    variance: number;
    shipments: number;
  }>;
  top_sales: Array<{
    name: string;
    estimasi: number;
    realisasi: number;
    variance_pct: number;
  }>;
  top_vendors: Array<{
    name: string;
    shipment_count: number;
    avg_cost: number;
    avg_lead_time: number;
  }>;
  shipment_per_month: Array<{
    month: string;
    total_shipment: number;
    on_time: number;
    delayed: number;
  }>;
  average_lead_time: Array<{
    period: string;
    lead_time_days: number;
    target_sla_days: number;
  }>;
}

export interface FinanceApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AR EXECUTIVE SUMMARY & 9 SUB-MENUS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArAgingBucket {
  bucket: string;
  short_label: string;
  amount: number;
  invoice_count: number;
  percentage: number;
  color: string;
  status: string;
}

export interface ArExecutiveSummaryData {
  kpi: {
    total_os: number;
    current_os: number;
    overdue_os: number;
    overdue_ratio_pct: number;
    current_ratio_pct: number;
    total_open_invoices: number;
    current_invoices: number;
    overdue_invoices: number;
    total_customers_with_ar: number;
    upcoming_7d_count: number;
    upcoming_7d_os: number;
    due_today_count: number;
    due_today_os: number;
    critical_od_gt_90_os: number;
    critical_od_gt_90_count: number;
    git_unbilled_count: number;
    pending_icu_count: number;
  };
  aging_buckets: ArAgingBucket[];
  os_vs_overdue_trend: Array<{
    period: string;
    total_os: number;
    current_os: number;
    overdue_os: number;
    overdue_pct: number;
    invoice_count: number;
  }>;
  top_os_vs_overdue: Array<{
    id_customer: string;
    nama_customer: string;
    total_os: number;
    current_os: number;
    overdue_os: number;
    overdue_ratio_pct: number;
    max_days_overdue: number;
    open_invoices: number;
  }>;
}

export interface Top20ArItem {
  rank: number;
  id_customer: string;
  nama_customer: string;
  id_kantor: string;
  id_sales: string;
  nama_sales: string;
  batas_kredit: number;
  top_days: number;
  open_invoices: number;
  overdue_invoices: number;
  total_ar: number;
  current_ar: number;
  overdue_ar: number;
  od_1_30: number;
  od_31_60: number;
  od_gt_60: number;
  current_ratio_pct: number;
  overdue_ratio_pct: number;
  max_days_overdue: number;
  category: "TOP_PERFORMANCE" | "CRITICAL" | "WATCHLIST";
  category_label: string;
  recommended_action: string;
}

export interface Top20ArResponse {
  summary: {
    top20_total_ar: number;
    top20_current_ar: number;
    top20_overdue_ar: number;
    top_performance_count: number;
    critical_count: number;
    watchlist_count: number;
  };
  items: Top20ArItem[];
}

export interface CollectionAlertItem {
  no_penjualan: string;
  no_faktur: string;
  invoice_date: string;
  due_date: string;
  id_customer: string;
  nama_customer: string;
  telepon: string;
  id_kantor: string;
  id_sales: string;
  nama_sales: string;
  top_days: number;
  nominal_invoice: number;
  sudah_bayar: number;
  outstanding: number;
  days_overdue: number;
  bucket_code: "UPCOMING_7D" | "DUE_TODAY" | "OD_1_30" | "OD_31_60" | "OD_61_90" | "OD_GT_90";
  bucket_label: string;
  urgency: "REMINDER" | "WARNING" | "HIGH" | "CRITICAL";
  recommended_action: string;
}

export interface CollectionAlertResponse {
  bucket_summary: Record<
    string,
    { count: number; amount: number; label: string }
  >;
  total_alerts: number;
  total_alert_amount: number;
  items: CollectionAlertItem[];
}

export interface WeeklyCollectionSeriesItem {
  week_label: string;
  week_start: string;
  week_end: string;
  target_collection: number;
  actual_collection: number;
  variance: number;
  achievement_pct: number;
  voucher_count: number;
  customer_count: number;
  daily_breakdown: {
    Senin: number;
    Selasa: number;
    Rabu: number;
    Kamis: number;
    Jumat: number;
    Sabtu_Minggu: number;
  };
  status: "ACHIEVED" | "ON_TRACK" | "BELOW_TARGET";
}

export interface DailyPaymentPostingItem {
  payment_date: string;
  payment_date_label: string;
  no_voucher: string;
  id_customer: string;
  nama_customer: string;
  id_kantor: string;
  jumlah_faktur_lunas: number;
  daftar_invoice: string;
  total_tagihan: number;
  total_discount: number;
  nominal_masuk: number;
  account_manager: string;
}

export interface WeeklyCollectionResponse {
  summary: {
    total_target_period: number;
    total_actual_period: number;
    overall_achievement_pct: number;
    weeks_achieved: number;
    total_weeks: number;
    latest_week_actual: number;
    latest_week_target: number;
    latest_week_pct: number;
  };
  weekly_series: WeeklyCollectionSeriesItem[];
  daily_postings: DailyPaymentPostingItem[];
}

export interface AmPerformanceItem {
  collection_rank: number;
  achievement_rank: number;
  id_sales: string;
  nama_am: string;
  cabang: string;
  target_collection: number;
  actual_collection: number;
  achievement_pct: number;
  contribution_pct: number;
  total_receipts: number;
  paid_customers: number;
  avg_collection_days: number;
  open_invoices: number;
  active_os: number;
  overdue_os: number;
  overdue_ratio_pct: number;
  performance_tier: "CHAMPION" | "GOOD" | "NEEDS_IMPROVEMENT";
  performance_label: string;
}

export interface AmPerformanceResponse {
  summary: {
    total_am_count: number;
    total_collected: number;
    total_target: number;
    avg_achievement_pct: number;
    top_collector_name: string;
    top_collector_amount: number;
    top_achiever_name: string;
    top_achiever_pct: number;
  };
  items: AmPerformanceItem[];
}

export interface GoodsInTransitItem {
  no_do: string;
  tgl_do: string;
  tgl_keluar_gudang: string;
  received_date: string | null;
  received_name: string | null;
  do_status: "S" | "R" | "D";
  status_label: string;
  id_customer: string;
  nama_customer: string;
  id_gudang: string;
  nama_gudang: string;
  id_sales: string;
  nama_sales: string;
  no_pl: string;
  no_so: string;
  ekspedisi: string;
  nopol: string;
  total_qty: number;
  jumlah_item: number;
  ringkasan_barang: string;
  estimasi_nilai: number;
  ongkir: number;
  days_unbilled: number;
  urgency: "CRITICAL" | "HIGH" | "NORMAL";
  recommended_action: string;
}

export interface GoodsInTransitResponse {
  summary: {
    total_git_do: number;
    total_estimasi_nilai: number;
    in_transit_count: number;
    received_unbilled_count: number;
    draft_loading_count: number;
    delayed_gt_7days_count: number;
  };
  items: GoodsInTransitItem[];
}

export interface CreditUtilizationItem {
  id_customer: string;
  nama_customer: string;
  id_kantor: string;
  id_sales: string;
  nama_sales: string;
  top_days: number;
  raw_credit_limit: number;
  credit_limit: number;
  is_Contract_limit: boolean;
  total_os: number;
  current_os: number;
  overdue_os: number;
  remaining_limit: number;
  utilization_pct: number;
  open_invoices: number;
  max_days_overdue: number;
  policy_status: "OVER_LIMIT" | "WARNING_80" | "CREDIT_REVIEW_60" | "CREDIT_HOLD_90" | "NORMAL";
  policy_label: string;
  policy_recommendation: string;
}

export interface CreditUtilizationResponse {
  summary: {
    total_customers_evaluated: number;
    total_credit_limit: number;
    total_os: number;
    overall_utilization_pct: number;
    over_limit_count: number;
    warning_80_count: number;
    credit_review_60_count: number;
    credit_hold_90_count: number;
    normal_count: number;
  };
  items: CreditUtilizationItem[];
}

export interface CustomerPerformanceItem {
  id_customer: string;
  nama_customer: string;
  id_kantor: string;
  id_sales: string;
  nama_sales: string;
  top_days: number;
  avg_payment_days: number;
  avg_overdue_days: number;
  paid_invoices: number;
  total_paid_amount: number;
  total_omset_recent: number;
  active_os: number;
  performance_tier: "EXCELLENT" | "GOOD" | "HIGH_RISK" | "CRITICAL";
  performance_label: string;
  incentive_eligible: boolean;
  incentive_rate_pct: number;
  estimated_incentive_rp: number;
  incentive_program: string;
}

export interface CustomerPerformanceResponse {
  summary: {
    total_evaluated: number;
    excellent_count: number;
    good_count: number;
    high_risk_count: number;
    critical_count: number;
    incentive_eligible_count: number;
    total_estimated_incentive_pool: number;
  };
  items: CustomerPerformanceItem[];
}

export interface CollectionProjectionItem {
  no_penjualan: string;
  no_faktur: string;
  invoice_date: string;
  due_date: string;
  promised_date: string;
  id_customer: string;
  nama_customer: string;
  id_kantor: string;
  id_sales: string;
  nama_sales: string;
  outstanding: number;
  days_overdue: number;
  confirm_status: "CONFIRMED" | "PROMISED" | "FOLLOW_UP" | "UNCONFIRMED";
  confirmed_amount: number;
  probability_pct: number;
  projected_collection: number;
  target_week: string;
  notes: string;
}

export interface CollectionProjectionResponse {
  summary: {
    total_open_ar_analyzed: number;
    total_confirmed_collection: number;
    total_weighted_projection: number;
    weekly_target_total: number;
    monthly_target_m1: number;
    confirmed_invoice_count: number;
  };
  weekly_projection: Array<{
    week_key: string;
    label: string;
    confirmed: number;
    projected_overdue: number;
    total_target: number;
    invoice_count: number;
  }>;
  monthly_projection: Array<{
    month_key: string;
    label: string;
    confirmed: number;
    projected_unconfirmed: number;
    total_target: number;
    invoice_count: number;
  }>;
  items: CollectionProjectionItem[];
}

export interface IcuSubmissionItem {
  id: number;
  nomor_icu: string;
  tanggal_pengajuan: string;
  id_customer: string;
  nama_customer: string;
  no_invoice: string;
  tanggal_invoice: string;
  tanggal_payment: string;
  umur_piutang_hari: number;
  id_salesman: string;
  nama_salesman: string;
  id_barang: string;
  nama_barang: string;
  qty: number;
  bottom_price: number;
  harga_invoice: number;
  tarif_icu_per_unit: number;
  ongkos_kirim: number;
  potongan_pph: number;
  total_insentif_net: number;
  penerima_insentif: string;
  bank_penerima: string;
  nomor_rekening: string;
  nama_rekening: string;
  status_approval: "PENDING_MANAGER" | "PENDING_FINANCE" | "PENDING_DIREKSI" | "APPROVED" | "PAID" | "REJECTED";
  current_approver_role: string;
  approved_by: string | null;
  approved_at: string | null;
  catatan_pengajuan: string | null;
  catatan_approval: string | null;
  tindak_lanjut: string | null;
}

export interface IcuResponse {
  summary: {
    total_submissions: number;
    pending_approval_count: number;
    pending_approval_amount: number;
    approved_waiting_disbursement_count: number;
    approved_waiting_disbursement_amount: number;
    paid_count: number;
    paid_amount: number;
    rejected_count: number;
  };
  items: IcuSubmissionItem[];
}

