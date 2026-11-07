import { api } from "@/lib/api";
import {
  ExecutiveDashboardKPI,
  ExecutiveChartsData,
  ArExecutiveSummaryData,
  Top20ArResponse,
  CollectionAlertResponse,
  WeeklyCollectionResponse,
  AmPerformanceResponse,
  GoodsInTransitResponse,
  CreditUtilizationResponse,
  CustomerPerformanceResponse,
  CollectionProjectionResponse,
  IcuResponse,
} from "@/types/finance";

/**
 * Service methods for the Finance ERP module.
 * Directly connected to live PostgreSQL ERP database (cpa_existing) via FastAPI backend.
 * NO MOCK DATA.
 */
export const apiFinance = {
  // 0. Metadata (Cabang & Periode Real dari Database)
  getMetadata: async (): Promise<{
    branches: Array<{ id: string; label: string; code: string }>;
    periods: Array<{ id: string; label: string }>;
  }> => {
    const res = await api.get<{
      branches: Array<{ id: string; label: string; code: string }>;
      periods: Array<{ id: string; label: string }>;
    }>("/api/finance/meta");
    return res.data;
  },

  // 1. Executive Dashboard (Single Source of Truth — 1 request for KPI + Charts + Note)
  getExecutiveDashboard: async (): Promise<{
    kpi: ExecutiveDashboardKPI;
    charts: ExecutiveChartsData;
    data_note?: string;
  }> => {
    const res = await api.get<{
      kpi: ExecutiveDashboardKPI;
      charts: ExecutiveChartsData;
      data_note?: string;
    }>("/api/finance/executive");
    return res.data;
  },

  // 1a. Executive Dashboard KPIs
  getExecutiveKPI: async (): Promise<ExecutiveDashboardKPI> => {
    const res = await api.get<{ kpi: ExecutiveDashboardKPI; charts: ExecutiveChartsData }>(
      "/api/finance/executive"
    );
    return res.data.kpi;
  },

  // 1b. Executive Dashboard Charts
  getExecutiveCharts: async (): Promise<ExecutiveChartsData> => {
    const res = await api.get<{ kpi: ExecutiveDashboardKPI; charts: ExecutiveChartsData }>(
      "/api/finance/executive"
    );
    return res.data.charts;
  },

  // 2. AR Executive Summary
  getArExecutiveSummary: async (params?: {
    scope?: string;
    id_kantor?: string;
  }): Promise<ArExecutiveSummaryData> => {
    const res = await api.get<ArExecutiveSummaryData>("/api/finance/ar-summary", {
      params: {
        scope: params?.scope || "ACTIVE",
        id_kantor: params?.id_kantor && params.id_kantor !== "ALL" ? params.id_kantor : undefined,
      },
    });
    return res.data;
  },

  // 11. Top 20 AR
  getTop20Ar: async (params?: {
    scope?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<Top20ArResponse> => {
    const res = await api.get<Top20ArResponse>("/api/finance/ar/top-20", {
      params: {
        scope: params?.scope || "ACTIVE",
        category: params?.category && params.category !== "ALL" ? params.category : undefined,
        search: params?.search || undefined,
        limit: params?.limit || 20,
      },
    });
    return res.data;
  },

  // 12. Collection Alert
  getCollectionAlerts: async (params?: {
    bucket?: string;
    scope?: string;
    search?: string;
    limit?: number;
  }): Promise<CollectionAlertResponse> => {
    const res = await api.get<CollectionAlertResponse>("/api/finance/ar/collection-alert", {
      params: {
        bucket: params?.bucket || "ALL",
        scope: params?.scope || "ACTIVE",
        search: params?.search || undefined,
        limit: params?.limit || 150,
      },
    });
    return res.data;
  },

  // 13. Weekly Collection Achievement
  getWeeklyCollection: async (params?: {
    weeks?: number;
  }): Promise<WeeklyCollectionResponse> => {
    const res = await api.get<WeeklyCollectionResponse>("/api/finance/ar/weekly-collection", {
      params: { weeks: params?.weeks || 12 },
    });
    return res.data;
  },

  // 14. AM Performance
  getAmPerformance: async (params?: {
    search?: string;
  }): Promise<AmPerformanceResponse> => {
    const res = await api.get<AmPerformanceResponse>("/api/finance/ar/am-performance", {
      params: { search: params?.search || undefined },
    });
    return res.data;
  },

  // 15. Goods in Transit Tracking
  getGoodsInTransit: async (params?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<GoodsInTransitResponse> => {
    const res = await api.get<GoodsInTransitResponse>("/api/finance/ar/goods-in-transit", {
      params: {
        status: params?.status || "ALL",
        search: params?.search || undefined,
        limit: params?.limit || 150,
      },
    });
    return res.data;
  },

  // 16. Credit Limit Utilization
  getCreditUtilization: async (params?: {
    policy_filter?: string;
    scope?: string;
    search?: string;
    limit?: number;
  }): Promise<CreditUtilizationResponse> => {
    const res = await api.get<CreditUtilizationResponse>("/api/finance/ar/credit-utilization", {
      params: {
        policy_filter: params?.policy_filter || "ALL",
        scope: params?.scope || "ACTIVE",
        search: params?.search || undefined,
        limit: params?.limit || 150,
      },
    });
    return res.data;
  },

  // 17. Customer Performance & Incentive List
  getCustomerPerformance: async (params?: {
    tier?: string;
    incentive_only?: boolean;
    search?: string;
    limit?: number;
  }): Promise<CustomerPerformanceResponse> => {
    const res = await api.get<CustomerPerformanceResponse>("/api/finance/ar/customer-performance", {
      params: {
        tier: params?.tier || "ALL",
        incentive_only: params?.incentive_only || false,
        search: params?.search || undefined,
        limit: params?.limit || 150,
      },
    });
    return res.data;
  },

  // 18. Collection Projection
  getCollectionProjection: async (params?: {
    scope?: string;
    confirm_filter?: string;
    search?: string;
  }): Promise<CollectionProjectionResponse> => {
    const res = await api.get<CollectionProjectionResponse>("/api/finance/ar/collection-projection", {
      params: {
        scope: params?.scope || "ACTIVE",
        confirm_filter: params?.confirm_filter || "ALL",
        search: params?.search || undefined,
      },
    });
    return res.data;
  },

  confirmCollectionInvoice: async (payload: {
    no_penjualan: string;
    id_customer?: string;
    confirm_status: string;
    promised_date?: string;
    confirmed_amount?: number;
    notes?: string;
  }) => {
    const res = await api.post("/api/finance/ar/collection-projection/confirm", payload);
    return res.data;
  },

  // 19. ICU (Pengajuan Incentive Customer)
  getIcuSubmissions: async (params?: {
    status?: string;
    search?: string;
  }): Promise<IcuResponse> => {
    const res = await api.get<IcuResponse>("/api/finance/ar/icu", {
      params: {
        status: params?.status || "ALL",
        search: params?.search || undefined,
      },
    });
    return res.data;
  },

  createIcuSubmission: async (payload: {
    id_customer: string;
    nama_customer: string;
    no_invoice: string;
    nama_barang: string;
    qty: number;
    bottom_price: number;
    harga_invoice: number;
    tarif_icu_per_unit: number;
    ongkos_kirim?: number;
    penerima_insentif: string;
    bank_penerima: string;
    nomor_rekening: string;
    nama_rekening: string;
    nama_salesman?: string;
    catatan_pengajuan?: string;
  }) => {
    const res = await api.post("/api/finance/ar/icu", payload);
    return res.data;
  },

  updateIcuApproval: async (
    icuId: number,
    payload: {
      action: "APPROVE" | "REJECT" | "MARK_PAID";
      approver_name?: string;
      catatan_approval?: string;
      tindak_lanjut?: string;
    }
  ) => {
    const res = await api.patch(`/api/finance/ar/icu/${icuId}/approval`, payload);
    return res.data;
  },
};
