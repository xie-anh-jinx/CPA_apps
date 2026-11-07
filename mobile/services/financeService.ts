/**
 * CPA Platform — Mobile Finance Service
 * Connected to FastAPI live PostgreSQL ERP backend.
 * Zero mock data — Single Source of Truth.
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import {
  ExecutiveDashboardKPI,
  ExecutiveChartsData,
  TransactionJourney,
  CostVarianceItem,
  ShippingCostItem,
  BudgetRequestItem,
  SalesVsSupplyItem,
  VendorPerformanceItem,
  PendingVerificationItem,
  FinancialAnalyticsData,
} from "@shared/types";

export const financeService = {
  // Metadata: Cabang & Periode
  getMetadata: async (): Promise<{
    branches: Array<{ id: string; label: string; code: string }>;
    periods: Array<{ id: string; label: string }>;
  }> => {
    const res = await api.get(API_ENDPOINTS.FINANCE.META);
    return res.data;
  },

  // Executive Dashboard KPIs
  getExecutiveKPI: async (): Promise<ExecutiveDashboardKPI> => {
    const res = await api.get<{ kpi: ExecutiveDashboardKPI; charts: ExecutiveChartsData }>(
      API_ENDPOINTS.FINANCE.EXECUTIVE
    );
    return res.data.kpi;
  },

  // Executive Dashboard Charts
  getExecutiveCharts: async (): Promise<ExecutiveChartsData> => {
    const res = await api.get<{ kpi: ExecutiveDashboardKPI; charts: ExecutiveChartsData }>(
      API_ENDPOINTS.FINANCE.EXECUTIVE
    );
    return res.data.charts;
  },

  // Transaction Journeys list & detail
  getTransactionJourneys: async (params?: {
    search?: string;
    status?: string;
    variance_status?: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionJourney[]> => {
    const res = await api.get<TransactionJourney[]>(API_ENDPOINTS.FINANCE.JOURNEY, {
      params: {
        search: params?.search || undefined,
        status: params?.status && params.status !== "ALL" ? params.status : undefined,
        variance_status:
          params?.variance_status && params.variance_status !== "ALL"
            ? params.variance_status
            : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Cost Variance
  getCostVariances: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<CostVarianceItem[]> => {
    const res = await api.get<CostVarianceItem[]>(API_ENDPOINTS.FINANCE.VARIANCE, {
      params: {
        search: params?.search || undefined,
        status: params?.status && params.status !== "ALL" ? params.status : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Shipping Costs
  getShippingCosts: async (params?: {
    search?: string;
    transporter?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ShippingCostItem[]> => {
    const res = await api.get<ShippingCostItem[]>(API_ENDPOINTS.FINANCE.SHIPPING, {
      params: {
        search: params?.search || undefined,
        transporter:
          params?.transporter && params.transporter !== "ALL"
            ? params.transporter
            : undefined,
        status: params?.status && params.status !== "ALL" ? params.status : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Budget Requests
  getBudgetRequests: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<BudgetRequestItem[]> => {
    const res = await api.get<BudgetRequestItem[]>(API_ENDPOINTS.FINANCE.BUDGET_REQUEST, {
      params: {
        search: params?.search || undefined,
        status: params?.status && params.status !== "ALL" ? params.status : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Sales vs Supply Chain
  getSalesVsSupply: async (params?: {
    search?: string;
    trend?: string;
    page?: number;
    limit?: number;
  }): Promise<SalesVsSupplyItem[]> => {
    const res = await api.get<SalesVsSupplyItem[]>(API_ENDPOINTS.FINANCE.SALES_VS_SUPPLY, {
      params: {
        search: params?.search || undefined,
        trend: params?.trend && params.trend !== "ALL" ? params.trend : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Vendor Performance
  getVendorPerformances: async (params?: {
    search?: string;
    rating?: string;
  }): Promise<VendorPerformanceItem[]> => {
    const res = await api.get<VendorPerformanceItem[]>(API_ENDPOINTS.FINANCE.VENDOR_PERFORMANCE, {
      params: {
        search: params?.search || undefined,
        rating: params?.rating && params.rating !== "ALL" ? params.rating : undefined,
      },
    });
    return res.data || [];
  },

  // Pending Verifications
  getPendingVerifications: async (params?: {
    search?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<PendingVerificationItem[]> => {
    const res = await api.get<PendingVerificationItem[]>(API_ENDPOINTS.FINANCE.PENDING_VERIFICATION, {
      params: {
        search: params?.search || undefined,
        priority: params?.priority && params.priority !== "ALL" ? params.priority : undefined,
        page: params?.page || 1,
        limit: params?.limit || 100,
      },
    });
    return res.data || [];
  },

  // Financial Analytics
  getFinancialAnalytics: async (): Promise<FinancialAnalyticsData> => {
    const res = await api.get<FinancialAnalyticsData>(API_ENDPOINTS.FINANCE.ANALYTICS);
    return res.data;
  },
};
