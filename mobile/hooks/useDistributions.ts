/**
 * CPA Platform — Mobile Distributions Hooks (React Query)
 */
import { useQuery } from "@tanstack/react-query";
import { distributionService } from "../services/distributionService";

export const useDistributionSummary = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ["distributions", "summary", params],
    queryFn: () => distributionService.getSummary(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useDeliveryOrders = (params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
}) => {
  return useQuery({
    queryKey: ["distributions", "list", params],
    queryFn: () => distributionService.getDeliveryOrders(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useDeliveryOrderDetail = (nomor: string) => {
  return useQuery({
    queryKey: ["distributions", "receipt", nomor],
    queryFn: () => distributionService.getReceiptDetail(nomor),
    enabled: !!nomor,
    staleTime: 1000 * 60 * 5,
  });
};
