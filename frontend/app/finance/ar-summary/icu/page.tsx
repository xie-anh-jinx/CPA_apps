import type { Metadata } from "next";
import IcuIncentivePage from "@/components/finance/IcuIncentivePage";

export const metadata: Metadata = {
  title: "ICU (Pengajuan Incentive Customer) — CPA Finance & Akuntansi",
  description: "Monitoring pengajuan Incentive Customer (ICU) yang masih membutuhkan approval dan tindak lanjut.",
};

export default function Page() {
  return <IcuIncentivePage />;
}

