"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BLOCKED_ROLES = ["warehouse", "warehouse_staff"];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (BLOCKED_ROLES.includes(user?.role)) {
          setIsBlocked(true);
          router.replace("/inventory");
        }
      }
    } catch {}
  }, [router]);

  if (isBlocked) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Akses ditolak. Mengalihkan ke Monitoring Stok...
      </div>
    );
  }

  return <>{children}</>;
}
