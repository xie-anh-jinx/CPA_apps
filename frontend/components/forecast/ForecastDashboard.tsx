"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiForecast } from "@/lib/api";
import ForecastKPIs from "./ForecastKPIs";
import ForecastDetailChart from "./ForecastDetailChart";
import ForecastModelComparison from "./ForecastModelComparison";
import ForecastProductTable, { ForecastProductItem } from "./ForecastProductTable";
import { Brain, Sparkles, RefreshCw, Calendar, ArrowUpRight, TrendingUp } from "lucide-react";

export default function ForecastDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<ForecastProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("550044360");
  const [selectedProductData, setSelectedProductData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [modelMetrics, setModelMetrics] = useState<any[]>([]);
  const [historyDays, setHistoryDays] = useState<number>(90);

  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Load Summary and Products list
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setLoadingProducts(true);

      const [sumRes, prodRes] = await Promise.allSettled([
        apiForecast.summary(),
        apiForecast.products(),
      ]);

      if (sumRes.status === "fulfilled") {
        setSummary(sumRes.value.data);
      }
      if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value.data)) {
        setProducts(prodRes.value.data);
        if (prodRes.value.data.length > 0 && !selectedProductId) {
          setSelectedProductId(prodRes.value.data[0].product_id);
        }
      }
    } catch (err) {
      console.error("Failed to load forecast data:", err);
    } finally {
      setLoadingSummary(false);
      setLoadingProducts(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Load detail data for selected product
  const loadProductDetail = useCallback(async (pid: string, days: number) => {
    if (!pid) return;
    try {
      setLoadingDetail(true);
      const [forecastRes, historyRes, modelsRes] = await Promise.allSettled([
        apiForecast.productForecast(pid),
        apiForecast.productHistory(pid, days),
        apiForecast.productModels(pid),
      ]);

      if (forecastRes.status === "fulfilled") {
        setSelectedProductData(forecastRes.value.data);
      }
      if (historyRes.status === "fulfilled") {
        setHistoryData(historyRes.value.data);
      }
      if (modelsRes.status === "fulfilled") {
        setModelMetrics(modelsRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load product detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductDetail(selectedProductId, historyDays);
    }
  }, [selectedProductId, historyDays, loadProductDetail]);

  const handleSelectProduct = (p: ForecastProductItem) => {
    setSelectedProductId(p.product_id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialData();
    if (selectedProductId) {
      await loadProductDetail(selectedProductId, historyDays);
    }
    setIsRefreshing(false);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1600px", margin: "0 auto", color: "var(--text-primary)" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-primary-light)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <Brain size={14} />
              AI Demand Intelligence
            </span>
            <span style={{ color: "var(--text-muted)" }}>•</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Fase MVP (Top 30 SKU Nasional)</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
            Demand Forecasting & Sales Projection
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
            Prediksi kuantitas penjualan produk dalam horizon 7, 30, dan 90 hari berbasis histori transaksi dan walk-forward cross validation.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: isRefreshing ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? "spin-animation" : ""} />
            <span>{isRefreshing ? "Memperbarui..." : "Perbarui Data"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ForecastKPIs summary={summary} loading={loadingSummary} />

      {/* Detail Chart & Projection Horizon Cards */}
      <ForecastDetailChart
        product={selectedProductData}
        history={historyData}
        historyDays={historyDays}
        onHistoryDaysChange={(days) => setHistoryDays(days)}
        loading={loadingDetail}
      />

      {/* Model Competition & Reorder Advice */}
      {selectedProductData && (
        <ForecastModelComparison
          productId={selectedProductData.product_id}
          productName={selectedProductData.product_name}
          bestModelName={selectedProductData.model_name}
          models={modelMetrics}
          forecast30d={selectedProductData.forecasts?.["30_days"]?.predicted_qty}
          loading={loadingDetail}
        />
      )}

      <div style={{ height: "1.5rem" }} />

      {/* Product List Table */}
      <ForecastProductTable
        products={products}
        selectedProductId={selectedProductId}
        onSelectProduct={handleSelectProduct}
        loading={loadingProducts}
      />
    </div>
  );
}
