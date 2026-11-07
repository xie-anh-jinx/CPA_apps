import type { Metadata } from "next";
import GaEntryPage from "@/components/ga/GaEntryPage";

export const metadata: Metadata = {
  title: "Isi Logbook GA | CPA Platform",
  description: "Formulir input logbook General Affairs - Inspeksi Genset, Kebersihan, Air Minum, Pengiriman, PDAM, dan Listrik",
};

export default function GaEntryPageRoute() {
  return <GaEntryPage />;
}

