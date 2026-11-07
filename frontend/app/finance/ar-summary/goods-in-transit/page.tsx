import type { Metadata } from "next";
import GoodsInTransitPage from "@/components/finance/GoodsInTransitPage";

export const metadata: Metadata = {
  title: "GOODS IN TRANSIT TRACKING — CPA Finance & Akuntansi",
  description: "Monitoring barang yang sudah keluar dari gudang atau dikirim ke customer, tetapi belum diterbitkan invoice.",
};

export default function Page() {
  return <GoodsInTransitPage />;
}

