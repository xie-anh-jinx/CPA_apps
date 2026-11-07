/**
 * CPA Platform — Mobile Intelligence & Analytics Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";

export const intelligenceService = {
  // Main Dashboard C3
  getMainDashboard: async (params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.ANALYTICS.MAIN_DASHBOARD, { params });
    return res.data;
  },

  // Executive Summary
  getExecutiveSummary: async (params?: { period?: string }) => {
    const res = await api.get(API_ENDPOINTS.ANALYTICS.EXECUTIVE, { params });
    return res.data;
  },

  // Recent Transactions
  getRecentTransactions: async (limit = 10) => {
    const res = await api.get(API_ENDPOINTS.ANALYTICS.RECENT_TRANSACTIONS, { params: { limit } });
    return res.data;
  },

  // KITA Analytics Overview
  getOverview: async (params?: { year?: number; month?: number }) => {
    const res = await api.get(API_ENDPOINTS.INTELLIGENCE.OVERVIEW, { params });
    return res.data;
  },

  // Monthly Trends
  getMonthlyTrends: async (params?: { year?: number }) => {
    const res = await api.get(API_ENDPOINTS.INTELLIGENCE.MONTHLY_TRENDS, { params });
    return res.data;
  },

  // Sales Performance
  getSalesPerformance: async (params?: { year?: number; month?: number; area?: string }) => {
    const res = await api.get(API_ENDPOINTS.INTELLIGENCE.SALES_PERFORMANCE, { params });
    return res.data;
  },

  // Customer Graphic
  getCustomerGraphic: async (params?: { year?: number; month?: number }) => {
    const res = await api.get(API_ENDPOINTS.INTELLIGENCE.CUSTOMER_GRAPHIC, { params });
    return res.data;
  },

  // Key Accounts
  getKeyAccounts: async (params?: { year?: number; month?: number; limit?: number; search?: string }) => {
    const res = await api.get(API_ENDPOINTS.INTELLIGENCE.KEY_ACCOUNTS, { params });
    return res.data;
  },
};
