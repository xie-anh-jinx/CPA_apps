import type { Metadata } from "next";
import CrmPage from "@/components/crm/CrmPage";

export const metadata: Metadata = { title: "CRM & Pipeline" };

export default function Page() {
  return <CrmPage />;
}
