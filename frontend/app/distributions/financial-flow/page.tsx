"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DistributionsPage from "@/components/distributions/DistributionsPage";

const BLOCKED_ROLES = ["warehouse", "warehouse_staff", "asset", "asset_staff", "ga", "it", "sales", "sales_rep"];

export default function FinancialFlowPage() {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (BLOCKED_ROLES.includes(user?.role)) {
          setIsBlocked(true);
          router.replace("/distributions");
        }
      }
    } catch {}
  }, [router]);

  if (isBlocked) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Mengalihkan ke Monitoring Distribusi...
      </div>
    );
  }

  return <DistributionsPage initialTab="FINANCIAL_FLOW" />;
}
