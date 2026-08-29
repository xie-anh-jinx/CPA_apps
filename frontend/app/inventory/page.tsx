import type { Metadata } from "next";
import InventoryPage from "@/components/inventory/InventoryPage";

export const metadata: Metadata = { title: "Inventory Monitoring" };

export default function Page() {
  return <InventoryPage />;
}
