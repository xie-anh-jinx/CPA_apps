import type { Metadata } from "next";
import ExecutiveDashboard from "@/components/finance/ExecutiveDashboard";

export const metadata: Metadata = {
  title: "Executive Finance Dashboard — PADI CPA Platform",
  description: "Executive ERP monitoring biaya operasional logistik, selisih estimasi sales vs realisasi, dan performa keuangan CPA.",
};

export default function Page() {
  return <ExecutiveDashboard />;
}
