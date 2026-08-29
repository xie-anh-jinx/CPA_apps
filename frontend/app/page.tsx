import type { Metadata } from "next";
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";

export const metadata: Metadata = {
  title: "Executive Dashboard",
};

export default function HomePage() {
  return <ExecutiveDashboard />;
}
