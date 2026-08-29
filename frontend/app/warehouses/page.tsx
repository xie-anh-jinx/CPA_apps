import type { Metadata } from "next";
import WarehousePage from "@/components/warehouse/WarehousePage";

export const metadata: Metadata = { title: "Multi-Warehouse" };

export default function Page() {
  return <WarehousePage />;
}
