import type { Metadata } from "next";
import SalesOrderPage from "@/components/sales/SalesOrderPage";

export const metadata: Metadata = { title: "Sales Order | CPA Platform" };

export default function Page() {
  return <SalesOrderPage />;
}
