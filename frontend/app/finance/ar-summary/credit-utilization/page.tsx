import type { Metadata } from "next";
import CreditUtilizationPage from "@/components/finance/CreditUtilizationPage";

export const metadata: Metadata = {
  title: "CREDIT LIMIT UTILIZATION — CPA Finance & Akuntansi",
  description: "Mengukur penggunaan fasilitas kredit: Utilisasi >=80% Warning, >=100% Over Limit, Overdue >60 hari Credit Review, Overdue >90 hari pertimbangkan Credit Hold.",
};

export default function Page() {
  return <CreditUtilizationPage />;
}

