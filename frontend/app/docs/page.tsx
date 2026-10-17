import type { Metadata } from "next";
import DocsPage from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Dokumentasi Sistem & Teknis",
  description: "Dokumentasi Teknis & Fungsional CPA Analytics Platform: Inventory Intelligence, Distribution, CRM & Credit Control Platform.",
};

export default function Page() {
  return <DocsPage />;
}
