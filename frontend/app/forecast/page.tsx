import type { Metadata } from "next";
import ForecastDashboard from "@/components/forecast/ForecastDashboard";

export const metadata: Metadata = {
  title: "Demand Forecasting & Sales Projection",
  description:
    "Prediksi kuantitas penjualan produk dalam horizon 7, 30, dan 90 hari ke depan berbasis machine learning dan time-series forecasting.",
};

export default function Page() {
  return <ForecastDashboard />;
}
