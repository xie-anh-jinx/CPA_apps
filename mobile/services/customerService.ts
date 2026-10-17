/**
 * CPA Platform — Mobile Customer & CRM Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import { CustomerRecord, CreditHealthRecord, CRMActivity } from "@shared/types";

export const customerService = {
  getCustomers: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await api.get(API_ENDPOINTS.CUSTOMERS.LIST, { params });
    return res.data?.data || res.data || [];
  },

  getCustomer360: async (id: string): Promise<CustomerRecord> => {
    const res = await api.get(API_ENDPOINTS.CUSTOMERS.VIEW_360(id));
    return res.data;
  },

  getCreditHealth: async (params?: Record<string, unknown>): Promise<CreditHealthRecord[]> => {
    const res = await api.get(API_ENDPOINTS.CUSTOMERS.CREDIT_HEALTH, { params });
    return res.data?.data || res.data || [];
  },

  getActivities: async (params?: Record<string, unknown>): Promise<CRMActivity[]> => {
    const res = await api.get(API_ENDPOINTS.CRM.ACTIVITIES, { params });
    return res.data?.data || res.data || [];
  },

  createActivity: async (data: CRMActivity) => {
    const res = await api.post(API_ENDPOINTS.CRM.ACTIVITIES, data);
    return res.data;
  },
};
