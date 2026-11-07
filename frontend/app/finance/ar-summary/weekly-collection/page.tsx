import type { Metadata } from "next";
import WeeklyCollectionPage from "@/components/finance/WeeklyCollectionPage";

export const metadata: Metadata = {
  title: "WEEKLY COLLECTION ACHIEVEMENT — CPA Finance & Akuntansi",
  description: "Mengukur realisasi pembayaran secara mingguan: Target vs Actual Collection per minggu, postingan tiap hari, dan persentase.",
};

export default function Page() {
  return <WeeklyCollectionPage />;
}

