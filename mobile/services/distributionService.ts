/**
 * CPA Platform — Mobile Distribution & Delivery Order Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import {
  DistributionSummary,
  DoReceiptHeader,
  DoLineItem,
} from "@shared/types";

export const distributionService = {
  getSummary: async (params?: Record<string, unknown>): Promise<DistributionSummary> => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.SUMMARY, { params });
    return res.data;
  },

  getDeliveryOrders: async (params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }) => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.LIST, { params });
    return res.data?.data || res.data || [];
  },

  getReceiptDetail: async (
    nomor: string
  ): Promise<{ nomor: string; header: DoReceiptHeader; items: DoLineItem[] }> => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.RECEIPT, {
      params: { nomor },
    });
    return res.data;
  },

  getFinancialFlow: async (params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.FINANCIAL_FLOW, { params });
    return res.data;
  },

  getInternalOrders: async (params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.INTERNAL_ORDERS, { params });
    return res.data?.data || res.data || [];
  },

  getTransferOrders: async (params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.DISTRIBUTIONS.TRANSFER_ORDERS, { params });
    return res.data?.data || res.data || [];
  },
};
