/**
 * CPA Platform — Mobile Inventory & Warehouse Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import {
  InventorySummary,
  ProductStock,
  BatchAgingRecord,
  WarehouseRecord,
} from "@shared/types";

export const inventoryService = {
  getSummary: async (idGudang?: string): Promise<InventorySummary> => {
    const res = await api.get(API_ENDPOINTS.INVENTORY.SUMMARY, {
      params: { id_gudang: idGudang },
    });
    return res.data;
  },

  getProducts: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    id_gudang?: string;
  }): Promise<{ data: ProductStock[]; total: number }> => {
    const res = await api.get(API_ENDPOINTS.INVENTORY.BY_PRODUCT, { params });
    const items = res.data?.data || res.data || [];
    return {
      data: items,
      total: res.data?.total || items.length,
    };
  },

  getBatchAging: async (idGudang?: string): Promise<BatchAgingRecord[]> => {
    const res = await api.get(API_ENDPOINTS.INVENTORY.AGING, {
      params: { id_gudang: idGudang },
    });
    return res.data?.data || res.data || [];
  },

  getWarehouses: async (): Promise<WarehouseRecord[]> => {
    const res = await api.get(API_ENDPOINTS.WAREHOUSES.LIST);
    return res.data?.data || res.data || [];
  },

  getWarehouseStock: async (idGudang: string, params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.WAREHOUSES.STOCK(idGudang), { params });
    return res.data;
  },
};
