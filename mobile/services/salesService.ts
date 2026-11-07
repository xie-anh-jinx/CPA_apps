/**
 * CPA Platform — Mobile Sales Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import { SalesSummary, SalesOrderRecord, AROutstandingItem } from "@shared/types";

export const salesService = {
  getSummary: async (params?: Record<string, unknown>): Promise<SalesSummary> => {
    const res = await api.get(API_ENDPOINTS.SALES.SUMMARY, { params });
    return res.data;
  },

  getOrders: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: SalesOrderRecord[]; total: number }> => {
    const res = await api.get(API_ENDPOINTS.SALES.ORDERS, { params });
    const items = res.data?.data || res.data || [];
    return {
      data: items,
      total: res.data?.total || items.length,
    };
  },

  getOrdersKpi: async (params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.SALES.ORDERS_KPI, { params });
    return res.data;
  },

  getOrderDetail: async (nomor: string) => {
    const res = await api.get(API_ENDPOINTS.SALES.ORDER_DETAIL(nomor));
    return res.data;
  },

  getAROutstanding: async (params?: Record<string, unknown>): Promise<{
    summary?: { total_outstanding: number; overdue_amount: number };
    items: AROutstandingItem[];
  }> => {
    const res = await api.get(API_ENDPOINTS.SALES.AR_OUTSTANDING, { params });
    return res.data || { items: [] };
  },
};
