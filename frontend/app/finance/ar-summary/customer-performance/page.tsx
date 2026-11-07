import type { Metadata } from "next";
import CustomerPerformancePage from "@/components/finance/CustomerPerformancePage";

export const metadata: Metadata = {
  title: "CUSTOMER PERFORMANCE — CPA Finance & Akuntansi",
  description: "Range payment customer berdasarkan Average Payment Days (<=0d Excellent, 1-30d Good, 31-60d High Risk, >60d Critical) & Daftar Insentif Customer.",
};

export default function Page() {
  return <CustomerPerformancePage />;
}

