/**
 * CPA Platform — Mobile Inventory Hooks (React Query)
 */
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventoryService";

export const useInventorySummary = (idGudang?: string) => {
  return useQuery({
    queryKey: ["inventory", "summary", idGudang],
    queryFn: () => inventoryService.getSummary(idGudang),
    staleTime: 1000 * 60 * 5, // 5 menit
  });
};

export const useProductsStock = (params?: { search?: string; id_gudang?: string; page?: number }) => {
  return useQuery({
    queryKey: ["inventory", "products", params],
    queryFn: () => inventoryService.getProducts(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useBatchAging = (idGudang?: string) => {
  return useQuery({
    queryKey: ["inventory", "aging", idGudang],
    queryFn: () => inventoryService.getBatchAging(idGudang),
    staleTime: 1000 * 60 * 5,
  });
};

export const useWarehouses = () => {
  return useQuery({
    queryKey: ["warehouses", "list"],
    queryFn: () => inventoryService.getWarehouses(),
    staleTime: 1000 * 60 * 15,
  });
};
