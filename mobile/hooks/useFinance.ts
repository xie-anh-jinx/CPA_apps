/**
 * CPA Platform — Mobile Finance React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "../services/financeService";

export const useFinanceMeta = () => {
  return useQuery({
    queryKey: ["finance", "meta"],
    queryFn: () => financeService.getMetadata(),
    staleTime: 1000 * 60 * 30, // 30 mins
  });
};

export const useFinanceExecutiveKPI = () => {
  return useQuery({
    queryKey: ["finance", "executive-kpi"],
    queryFn: () => financeService.getExecutiveKPI(),
  });
};

export const useFinanceExecutiveCharts = () => {
  return useQuery({
    queryKey: ["finance", "executive-charts"],
    queryFn: () => financeService.getExecutiveCharts(),
  });
};

export const useCostVariances = (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "variances", params],
    queryFn: () => financeService.getCostVariances(params),
  });
};

export const useTransactionJourneys = (params?: {
  search?: string;
  status?: string;
  variance_status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "journeys", params],
    queryFn: () => financeService.getTransactionJourneys(params),
  });
};

export const useShippingCosts = (params?: {
  search?: string;
  transporter?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "shipping", params],
    queryFn: () => financeService.getShippingCosts(params),
  });
};

export const useBudgetRequests = (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "budget-requests", params],
    queryFn: () => financeService.getBudgetRequests(params),
  });
};

export const useSalesVsSupply = (params?: {
  search?: string;
  trend?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "sales-vs-supply", params],
    queryFn: () => financeService.getSalesVsSupply(params),
  });
};

export const useVendorPerformances = (params?: {
  search?: string;
  rating?: string;
}) => {
  return useQuery({
    queryKey: ["finance", "vendor-performances", params],
    queryFn: () => financeService.getVendorPerformances(params),
  });
};

export const usePendingVerifications = (params?: {
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["finance", "pending-verifications", params],
    queryFn: () => financeService.getPendingVerifications(params),
  });
};

export const useFinancialAnalytics = () => {
  return useQuery({
    queryKey: ["finance", "analytics"],
    queryFn: () => financeService.getFinancialAnalytics(),
  });
};
