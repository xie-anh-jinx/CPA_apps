import type { Metadata } from "next";
import FleetLogbookPage from "@/components/assets/FleetLogbookPage";

export const metadata: Metadata = {
  title: "Armada Kendaraan & Alat Berat | Asset CPA Group",
  description: "Logbook Armada Kendaraan & Alat Berat (Forklift) PT Cahaya Pengajaran Abadi & PT Cahaya Resources Abadi",
};

export default function FleetPage() {
  return <FleetLogbookPage />;
}

