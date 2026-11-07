import type { Metadata } from "next";
import Top20ArPage from "@/components/finance/Top20ArPage";

export const metadata: Metadata = {
  title: "TOP 20 AR — CPA Finance & Akuntansi",
  description: "Total piutang customer current & Total AR terbesar dikategorikan dalam Top Performance atau Critical berdasarkan overduenya.",
};

export default function Page() {
  return <Top20ArPage />;
}

