/**
 * CPA Platform — Mobile Forecast Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import { ForecastSummary, ProductForecast } from "@shared/types";

export const forecastService = {
  getSummary: async (): Promise<ForecastSummary> => {
    const res = await api.get(API_ENDPOINTS.FORECAST.SUMMARY);
    return res.data;
  },

  getProducts: async () => {
    const res = await api.get(API_ENDPOINTS.FORECAST.PRODUCTS);
    return res.data?.data || res.data || [];
  },

  getProductForecast: async (idBarang: string): Promise<ProductForecast> => {
    const res = await api.get(API_ENDPOINTS.FORECAST.PRODUCT_DETAIL(idBarang));
    return res.data;
  },
};
