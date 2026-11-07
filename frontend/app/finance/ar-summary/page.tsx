import type { Metadata } from "next";
import ArExecutiveSummary from "@/components/finance/ArExecutiveSummary";

export const metadata: Metadata = {
  title: "AR Executive Summary — CPA Finance & Akuntansi",
  description: "Gambaran posisi piutang perusahaan secara keseluruhan (Total OS x OS Overdue) beserta 9 sub-menu manajemen piutang.",
};

export default function Page() {
  return <ArExecutiveSummary />;
}

