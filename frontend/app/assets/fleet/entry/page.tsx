import type { Metadata } from "next";
import FleetEntryPage from "@/components/assets/FleetEntryPage";

export const metadata: Metadata = {
  title: "Isi Logbook Armada Kendaraan & Alat Berat | Asset CPA Group",
  description: "Formulir input entri data master kendaraan, perpanjangan pajak STNK, uji berkala KIR, asuransi, dan data forklift.",
};

export default function FleetEntryRoutePage() {
  return <FleetEntryPage />;
}

