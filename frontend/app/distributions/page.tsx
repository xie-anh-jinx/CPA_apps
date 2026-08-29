import type { Metadata } from "next";
import DistributionsPage from "@/components/distributions/DistributionsPage";

export const metadata: Metadata = { title: "Distribusi" };

export default function Page() {
  return <DistributionsPage />;
}
