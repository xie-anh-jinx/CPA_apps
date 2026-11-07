/**
 * CPA Platform — Shared Finance Module TypeScript Interfaces
 * Enterprise ERP definitions for financial monitoring, logistics cost variance,
 * budget requests, transaction journeys, and vendor performance.
 */

export type DocumentStage =
  | "PHS"
  | "PENAWARAN"
  | "SALES_ORDER"
  | "PACKING_LIST"
  | "DELIVERY_ORDER"
  | "BUDGET_REQUEST"
  | "FRDO"
  | "INVOICE";

export type VarianceStatus = "NORMAL" | "REVIEW" | "HIGH_VARIANCE";

export type ApprovalStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REALIZED";

export type VerificationTrigger =
  | "VARIANCE_GT_5"
  | "NO_FRDO"
  | "NO_INVOICE"
  | "NO_APPROVAL";

export interface DocumentTimelineItem {
  stage: DocumentStage;
  stage_label: string;
  nomor_dokumen: string | null;
  tanggal: string | null;
  pic: string | null;
  nominal: number | null;
  status: string | null;
  is_available: boolean;
  notes?: string;
  badge_color?: "green" | "yellow" | "red" | "blue" | "gray";
}

export interface TransactionJourney {
  id: string;
  no_do: string;
  customer: string;
  customer_id?: string;
  sales: string;
  sales_id?: string;
  tgl_do: string;
  destination: string;
  asal_gudang: string;
  transporter: string;
  estimasi_sales: number;
  budget_request: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
  variance_status: VarianceStatus;
  overall_status: "COMPLETED" | "IN_PROGRESS" | "PENDING_VERIFICATION" | "DELAYED";
  documents: DocumentTimelineItem[];
  lead_time_days: number;
  items_summary?: string;
  total_weight_kg?: number;
}

export interface CostVarianceItem {
  id: string;
  no_do: string;
  customer: string;
  sales: string;
  estimasi_sales: number;
  budget_request: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
  status: VarianceStatus;
  status_label: "Normal" | "Review" | "High Variance";
  tanggal: string;
  rute: string;
  transporter: string;
  notes?: string;
}

export interface ShippingCostItem {
  id: string;
  no_do: string;
  tgl_pengiriman: string;
  asal_gudang: string;
  kota_tujuan: string;
  transporter: string;
  jenis_armada: string;
  berat_kg: number;
  volume_cbm: number;
  biaya_dasar: number;
  biaya_bongkar_muat: number;
  biaya_tol_retribusi: number;
  biaya_tambahan: number;
  total_biaya: number;
  cost_per_kg: number;
  estimasi_biaya: number;
  status_pengiriman: "DELIVERED" | "IN_TRANSIT" | "PENDING";
  lead_time_days: number;
}

export interface BudgetRequestItem {
  id: string;
  no_br: string;
  tanggal: string;
  no_do: string;
  no_so: string;
  customer: string;
  pic_supply_chain: string;
  vendor: string;
  rute: string;
  nominal_pengajuan: number;
  nominal_disetujui: number;
  actual_cost: number;
  variance_br: number;
  status_approval: ApprovalStatus;
  status_label: string;
  approval_by?: string;
  approval_date?: string;
  keterangan: string;
}

export interface SalesVsSupplyItem {
  id: string;
  period: string;
  no_do: string;
  customer: string;
  sales_person: string;
  pic_supply_chain: string;
  estimasi_sales: number;
  permintaan_supply_chain: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
  trend: "UNDER_ESTIMATED" | "OVER_BUDGET" | "ALIGNED";
  trend_label: string;
  root_cause: string;
  tanggal: string;
}

export interface VendorPerformanceItem {
  vendor_id: string;
  vendor_name: string;
  jumlah_pengiriman: number;
  total_shipping_cost: number;
  avg_shipping_cost: number;
  avg_lead_time_days: number;
  avg_variance_pct: number;
  on_time_delivery_rate: number;
  rating: "A+" | "A" | "B" | "C";
  armada_types: string[];
  primary_destinations: string[];
  contact_person: string;
  phone: string;
}

export interface PendingVerificationItem {
  id: string;
  no_do: string;
  customer: string;
  sales: string;
  transporter: string;
  tanggal: string;
  estimasi_sales: number;
  budget_request: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
  has_frdo: boolean;
  has_invoice: boolean;
  has_approval: boolean;
  trigger_reasons: VerificationTrigger[];
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "PENDING" | "IN_REVIEW" | "RESOLVED";
  days_pending: number;
  notes: string;
}

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
    route: string;
    avg_days: number;
    target_days: number;
  }>;
}

export interface FinancialAnalyticsData {
  summary: {
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    operating_expenses: number;
    ebitda: number;
    ebitda_margin_pct: number;
    net_profit: number;
    net_margin_pct: number;
    cash_flow_operating: number;
    cash_burn_rate_monthly: number;
    runway_months: number;
  };
  monthly_pnl: Array<{
    month: string;
    revenue: number;
    cogs: number;
    opex: number;
    net_income: number;
  }>;
  cost_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}
