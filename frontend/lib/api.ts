/**
 * CPA Platform — API Client (Axios + SWR)
 */
import axios from "axios";

const API_BASE = "";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("cpa_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("cpa_token");
      const pathname = window.location.pathname;
      if (!pathname.startsWith("/docs") && !pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ─── SWR Fetcher ──────────────────────────────────────────────────────────────
export const fetcher = (url: string) =>
  api.get(url).then((res) => res.data);

// ─── API Helpers ──────────────────────────────────────────────────────────────
export const apiAuth = {
  login: (username: string, password: string) => {
    const form = new FormData();
    form.append("username", username);
    form.append("password", password);
    return api.post("/api/auth/token", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => api.get("/api/auth/me"),
};

export const apiInventory = {
  summary: (id_gudang?: string) =>
    api.get("/api/inventory/summary", { params: { id_gudang } }),
  byProduct: (params?: Record<string, unknown>) =>
    api.get("/api/inventory/by-product", { params }),
  byWarehouse: () => api.get("/api/inventory/by-warehouse"),
  lowStock: (id_gudang?: string) =>
    api.get("/api/inventory/low-stock", { params: { id_gudang } }),
  overstock: (id_gudang?: string) =>
    api.get("/api/inventory/overstock", { params: { id_gudang } }),
  movements: (params?: Record<string, unknown>) =>
    api.get("/api/inventory/movements", { params }),
  aging: (id_gudang?: string) =>
    api.get("/api/inventory/aging", { params: { id_gudang } }),
  inbound: (params?: Record<string, unknown>) =>
    api.get("/api/inventory/inbound", { params }),
  outbound: (params?: Record<string, unknown>) =>
    api.get("/api/inventory/outbound", { params }),
};

export const apiWarehouses = {
  list: () => api.get("/api/warehouses/"),
  comparison: () => api.get("/api/warehouses/comparison"),
  stock: (id: string, params?: Record<string, unknown>) =>
    api.get(`/api/warehouses/${id}/stock`, { params }),
  transfers: (params?: Record<string, unknown>) =>
    api.get("/api/warehouses/transfers", { params }),
  performance: (year?: string, month?: string) =>
    api.get("/api/warehouses/performance", { params: { year, month } }),
};

export const apiSales = {
  summary: (params?: Record<string, unknown>) =>
    api.get("/api/sales/summary", { params }),
  trend: (params?: Record<string, unknown>) =>
    api.get("/api/sales/trend", { params }),
  byProduct: (params?: Record<string, unknown>) =>
    api.get("/api/sales/by-product", { params }),
  byCustomer: (params?: Record<string, unknown>) =>
    api.get("/api/sales/by-customer", { params }),
  bySalesperson: (params?: Record<string, unknown>) =>
    api.get("/api/sales/by-salesperson", { params }),
  orders: (params?: Record<string, unknown>) =>
    api.get("/api/sales/orders", { params }),
  ordersKpi: (params?: Record<string, unknown>) =>
    api.get("/api/sales/orders/summary-kpi", { params }),
  orderDetail: (nomor: string) =>
    api.get(`/api/sales/orders/${encodeURIComponent(nomor)}/detail`),
  arOutstanding: (params?: Record<string, unknown>) =>
    api.get("/api/sales/ar-outstanding", { params }),
  exportArExcel: (params?: Record<string, unknown>) =>
    api.get("/api/sales/export-ar-excel", { params, responseType: "blob" }),
};

export const apiDistributions = {
  list: (params?: Record<string, unknown>) =>
    api.get("/api/distributions/", { params }),
  pending: () => api.get("/api/distributions/pending"),
  inTransit: () => api.get("/api/distributions/in-transit"),
  summary: (params?: Record<string, unknown>) =>
    api.get("/api/distributions/summary", { params }),
  mapData: (params?: Record<string, unknown>) =>
    api.get("/api/distributions/map-data", { params }),
  detail: (nomor: string) => api.get(`/api/distributions/${nomor}`),
  deliveryOrderReceipt: (nomor: string) =>
    api.get("/api/distributions/delivery-order/receipt", { params: { nomor } }),
  internalOrders: (params?: Record<string, unknown>) =>
    api.get("/api/distributions/internal-orders", { params }),
  internalOrderItems: (nomor_io: string) =>
    api.get("/api/distributions/internal-orders/items", { params: { nomor_io } }),
  transferOrders: (params?: Record<string, unknown>) =>
    api.get("/api/distributions/transfer-orders", { params }),
  transferOrderItems: (nomor: string) =>
    api.get("/api/distributions/transfer-orders/items", { params: { nomor } }),
  exportExcel: (params: { type: "IO" | "IT" | "DO"; period?: string; date_from?: string; date_to?: string; status?: string }) =>
    api.get("/api/distributions/export-excel", { params, responseType: "blob" }),
};

export const apiCustomers = {
  list: (params?: Record<string, unknown>) =>
    api.get("/api/customers/", { params }),
  view360: (id: string) => api.get(`/api/customers/${id}/360`),
  history: (id: string, params?: Record<string, unknown>) =>
    api.get(`/api/customers/${id}/history`, { params }),
  segmentation: (params?: Record<string, unknown>) =>
    api.get("/api/customers/segmentation", { params }),
  salesRelations: (params?: Record<string, unknown>) =>
    api.get("/api/customers/sales-relations", { params }),
  salesCustomers: (idSales: string) =>
    api.get(`/api/customers/sales-relations/${idSales}/customers`),
  creditHealth: (params?: Record<string, unknown>) =>
    api.get("/api/customers/credit-health", { params }),
  creditHealthInvoices: (idCustomer: string) =>
    api.get(`/api/customers/credit-health/${idCustomer}/invoices`),
};

export const apiCRM = {
  activities: (params?: Record<string, unknown>) =>
    api.get("/api/crm/activities", { params }),
  createActivity: (data: Record<string, unknown>) =>
    api.post("/api/crm/activities", data),
  opportunities: (params?: Record<string, unknown>) =>
    api.get("/api/crm/opportunities", { params }),
  createOpportunity: (data: Record<string, unknown>) =>
    api.post("/api/crm/opportunities", data),
  updateStage: (id: number, stage: string) =>
    api.patch(`/api/crm/opportunities/${id}/stage`, null, { params: { stage } }),
  complaints: (params?: Record<string, unknown>) =>
    api.get("/api/crm/complaints", { params }),
  createComplaint: (data: Record<string, unknown>) =>
    api.post("/api/crm/complaints", data),
  pipelineSummary: () => api.get("/api/crm/pipeline-summary"),
};

export const apiAlerts = {
  list: (params?: Record<string, unknown>) =>
    api.get("/api/alerts/", { params }),
  counts: () => api.get("/api/alerts/counts"),
  resolve: (id: number) => api.patch(`/api/alerts/${id}/resolve`),
};

export const apiAnalytics = {
  kpi: (params?: Record<string, unknown>) => api.get("/api/analytics/kpi", { params }),
  executiveSummary: (params?: Record<string, unknown>) =>
    api.get("/api/analytics/executive-summary", { params }),
  recentTransactions: (limit?: number) =>
    api.get("/api/analytics/recent-transactions", { params: { limit } }),
  syncStatus: () => api.get("/api/analytics/sync-status"),
  mainDashboard: (params?: Record<string, unknown>) =>
    api.get("/api/analytics/main-dashboard", { params }),
};

export const apiReports = {
  arAging: (params?: Record<string, unknown>) =>
    api.get("/api/reports/ar-aging", { params }),
  arAgingExportUrl: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    return `${base}/reports/ar-aging/export?${q}`;
  },
};

export const apiForecast = {
  summary: () => api.get("/api/forecast/summary"),
  products: () => api.get("/api/forecast/products"),
  productForecast: (productId: string) => api.get(`/api/forecast/products/${productId}`),
  productHistory: (productId: string, days = 90) =>
    api.get(`/api/forecast/products/${productId}/history`, { params: { days } }),
  productModels: (productId: string) =>
    api.get(`/api/forecast/products/${productId}/models`),
};

export const apiKitaAnalytics = {
  overview: (params?: { year?: number; month?: number }) =>
    api.get("/api/analytics/kita/overview", { params }),
  monthlyTrends: (params?: { year?: number }) =>
    api.get("/api/analytics/kita/monthly-trends", { params }),
  salesPerformance: (params?: { year?: number; month?: number; area?: string }) =>
    api.get("/api/analytics/kita/sales-performance", { params }),
  customers: (params?: {
    year?: number;
    month?: number;
    page?: number;
    limit?: number;
    search?: string;
    orderby?: string;
    column_order_desc?: string;
  }) => api.get("/api/analytics/kita/customers", { params }),
  sectorMix: (params?: { year?: number; month?: number }) =>
    api.get("/api/analytics/kita/sector-mix", { params }),
  pipelineStrength: (params?: { year?: number; month?: number }) =>
    api.get("/api/analytics/kita/pipeline-strength", { params }),
  focusTables: (params?: { tab: string; year?: number; month?: number }) =>
    api.get("/api/analytics/kita/focus-tables", { params }),
  customerGraphic: (params?: { year?: number; month?: number }) =>
    api.get("/api/analytics/kita/customer-graphic", { params }),
  keyAccounts: (params?: { year?: number; month?: number; limit?: number; search?: string }) =>
    api.get("/api/analytics/kita/key-accounts", { params }),
};




