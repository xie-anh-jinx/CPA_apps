import type { Metadata } from "next";
import AmPerformancePage from "@/components/finance/AmPerformancePage";

export const metadata: Metadata = {
  title: "AM PERFORMANCE — CPA Finance & Akuntansi",
  description: "Peringkat kontribusi DSR/Marketing terhadap penerimaan pembayaran: Ranking collection berdasarkan Account Manager & achievement terhadap target.",
};

export default function Page() {
  return <AmPerformancePage />;
}

