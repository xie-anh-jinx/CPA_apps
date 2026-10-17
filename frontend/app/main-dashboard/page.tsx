import type { Metadata } from "next";
import MainDashboardC3 from "@/components/dashboard/MainDashboardC3";

export const metadata: Metadata = {
  title: "Main Dashboard (C3 Analytics) | CPA Analytics",
};

export default function MainDashboardPage() {
  return (
    <div style={{ padding: "1.5rem 1.75rem", minHeight: "100vh" }}>
      <MainDashboardC3 />
    </div>
  );
}
