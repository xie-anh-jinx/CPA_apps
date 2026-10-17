/**
 * CPA Platform — Shared Forecast & Analytics Types
 */

export interface ForecastSummary {
  total_forecast_volume: number;
  expected_growth_pct: number;
  top_demanded_products: {
    id_barang: string;
    nama_barang: string;
    predicted_qty: number;
    trend: "naik" | "turun" | "stabil";
  }[];
  model_accuracy_mape: number;
}

export interface ProductForecast {
  id_barang: string;
  nama_barang: string;
  historical: { tanggal: string; actual_qty: number }[];
  predictions: { tanggal: string; predicted_qty: number; lower_bound: number; upper_bound: number }[];
  recommended_stock_order: number;
}
