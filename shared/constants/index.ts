/**
 * CPA Platform — Shared Constants
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/token",
    ME: "/api/auth/me",
  },
  INVENTORY: {
    SUMMARY: "/api/inventory/summary",
    BY_PRODUCT: "/api/inventory/by-product",
    BY_WAREHOUSE: "/api/inventory/by-warehouse",
    LOW_STOCK: "/api/inventory/low-stock",
    OVERSTOCK: "/api/inventory/overstock",
    MOVEMENTS: "/api/inventory/movements",
    AGING: "/api/inventory/aging",
    INBOUND: "/api/inventory/inbound",
    OUTBOUND: "/api/inventory/outbound",
  },
  WAREHOUSES: {
    LIST: "/api/warehouses/",
    COMPARISON: "/api/warehouses/comparison",
    STOCK: (id: string) => `/api/warehouses/${id}/stock`,
    TRANSFERS: "/api/warehouses/transfers",
    PERFORMANCE: "/api/warehouses/performance",
  },
  SALES: {
    SUMMARY: "/api/sales/summary",
    TREND: "/api/sales/trend",
    BY_PRODUCT: "/api/sales/by-product",
    BY_CUSTOMER: "/api/sales/by-customer",
    ORDERS: "/api/sales/orders",
    ORDERS_KPI: "/api/sales/orders/summary-kpi",
    ORDER_DETAIL: (nomor: string) => `/api/sales/orders/${encodeURIComponent(nomor)}/detail`,
    AR_OUTSTANDING: "/api/sales/ar-outstanding",
  },
  DISTRIBUTIONS: {
    LIST: "/api/distributions/",
    SUMMARY: "/api/distributions/summary",
    RECEIPT: "/api/distributions/delivery-order/receipt",
    INTERNAL_ORDERS: "/api/distributions/internal-orders",
    TRANSFER_ORDERS: "/api/distributions/transfer-orders",
  },
  CUSTOMERS: {
    LIST: "/api/customers/",
    VIEW_360: (id: string) => `/api/customers/${id}/360`,
    CREDIT_HEALTH: "/api/customers/credit-health",
    SEGMENTATION: "/api/customers/segmentation",
  },
  CRM: {
    ACTIVITIES: "/api/crm/activities",
    OPPORTUNITIES: "/api/crm/opportunities",
    COMPLAINTS: "/api/crm/complaints",
    PIPELINE: "/api/crm/pipeline-summary",
  },
  FORECAST: {
    SUMMARY: "/api/forecast/summary",
    PRODUCTS: "/api/forecast/products",
    PRODUCT_DETAIL: (id: string) => `/api/forecast/products/${id}`,
  },
  ANALYTICS: {
    KPI: "/api/analytics/kpi",
    EXECUTIVE: "/api/analytics/executive-summary",
    MAIN_DASHBOARD: "/api/analytics/main-dashboard",
    RECENT_TRANSACTIONS: "/api/analytics/recent-transactions",
  },
  AI: {
    CHAT: "/api/ai/chat",
    MCP_TOOLS: "/api/mcp/rpc",
  },
  REPORTS: {
    AR_AGING: "/api/reports/ar-aging",
  },
} as const;

export const DO_STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  S: { label: "Send", color: "#38bdf8", desc: "Sedang Dikirim" },
  R: { label: "Received", color: "#10b981", desc: "Diterima Customer" },
  I: { label: "Invoice", color: "#818cf8", desc: "Telah Ditagihkan" },
  C: { label: "Cancel", color: "#ef4444", desc: "Dibatalkan" },
  D: { label: "Draft", color: "#94a3b8", desc: "Draft" },
};

export const THEME_COLORS = {
  dark: {
    background: "#0b0f19",
    surface: "#111827",
    card: "#1e293b",
    border: "#334155",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    primary: "#0ea5e9",
    primaryLight: "#38bdf8",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    card: "#ffffff",
    border: "#e2e8f0",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    primary: "#0284c7",
    primaryLight: "#0ea5e9",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
  },
};
