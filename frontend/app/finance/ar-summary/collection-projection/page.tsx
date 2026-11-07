import type { Metadata } from "next";
import CollectionProjectionPage from "@/components/finance/CollectionProjectionPage";

export const metadata: Metadata = {
  title: "COLLECTION PROJECTION — CPA Finance & Akuntansi",
  description: "Target collection weekly dan monthly berdasarkan confirm customer dan hari overdue.",
};

export default function Page() {
  return <CollectionProjectionPage />;
}

