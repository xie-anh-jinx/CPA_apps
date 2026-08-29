/**
 * CPA Platform — API Client (Axios + SWR)
 */
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      window.location.href = "/login";
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
};

export const apiCustomers = {
  list: (params?: Record<string, unknown>) =>
    api.get("/api/customers/", { params }),
  view360: (id: string) => api.get(`/api/customers/${id}/360`),
  history: (id: string, params?: Record<string, unknown>) =>
    api.get(`/api/customers/${id}/history`, { params }),
  segmentation: () => api.get("/api/customers/segmentation"),
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
  syncStatus: () => api.get("/api/analytics/sync-status"),
};
