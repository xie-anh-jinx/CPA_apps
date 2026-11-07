import type { Metadata } from "next";
import CollectionAlertPage from "@/components/finance/CollectionAlertPage";

export const metadata: Metadata = {
  title: "COLLECTION ALERT — CPA Finance & Akuntansi",
  description: "Daftar invoice yang memerlukan tindakan segera: Upcoming Overdue (7 hari kedepan), Due Today, OD 1-30, dst.",
};

export default function Page() {
  return <CollectionAlertPage />;
}

