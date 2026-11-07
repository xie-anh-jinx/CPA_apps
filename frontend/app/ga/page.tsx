import type { Metadata } from "next";
import GaLogbookPage from "@/components/ga/GaLogbookPage";

export const metadata: Metadata = {
  title: "General Affairs (GA) | CPA Platform",
  description: "Logbook General Affairs PT Cahaya Pengajaran Abadi - Genset, Kebersihan, Air Minum, Pengiriman, PDAM, dan Listrik",
};

export default function GaPageRoute() {
  return <GaLogbookPage />;
}
