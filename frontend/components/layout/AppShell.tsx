"use client";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { usePathname, useRouter } from "next/navigation";
import AIChatBox from "@/components/ai/AIChatBox";
import { apiAuth } from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAuthPage = pathname === "/login";
  const isPublicPage = isAuthPage || pathname.startsWith("/docs");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      const token = localStorage.getItem("cpa_token");
      if (stored && token) {
        setCurrentUser(JSON.parse(stored));
      }
      if (token) {
        apiAuth.me().then((res) => {
          if (res.data) {
            setCurrentUser(res.data);
            localStorage.setItem("cpa_user", JSON.stringify(res.data));
          }
        }).catch(() => {});
      } else {
        setCurrentUser(null);
        if (!isPublicPage) {
          router.replace("/login");
        }
      }
    } catch (e) {
      setCurrentUser(null);
      if (!isPublicPage) {
        router.replace("/login");
      }
    }
  }, [pathname, isPublicPage, router]);

  const isWarehouse = currentUser?.role === "warehouse" || currentUser?.role === "warehouse_staff";
  const isAsset = ["asset", "asset_staff", "ga", "it"].includes(currentUser?.role);

  // Check role restrictions for asset / GA / IT staff (allow only GA, Fleet, IT, Alerts, Docs - no extra modules)
  const isBlockedForAsset = isAsset && (
    pathname === "/" ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/distributions") ||
    pathname.startsWith("/warehouses") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/hrm") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/main-dashboard") ||
    pathname.startsWith("/intelligence") ||
    pathname.startsWith("/forecast") ||
    pathname.startsWith("/database")
  );

  // Check role restrictions for warehouse
  const isBlockedForWarehouse = isWarehouse && (
    pathname === "/" ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/intelligence") ||
    pathname.startsWith("/main-dashboard") ||
    pathname.startsWith("/forecast") ||
    pathname.startsWith("/distributions/financial-flow") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/database")
  );

  useEffect(() => {
    if (!currentUser) return;

    if (isBlockedForAsset) {
      if (currentUser?.role === "ga") {
        router.replace("/ga");
      } else if (currentUser?.role === "it") {
        router.replace("/it");
      } else {
        router.replace("/assets/fleet");
      }
    } else if (isBlockedForWarehouse) {
      if (pathname.startsWith("/distributions/financial-flow")) {
        router.replace("/distributions");
      } else {
        router.replace("/inventory");
      }
    }
  }, [isBlockedForAsset, isBlockedForWarehouse, pathname, router, currentUser]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isPublicPage && !currentUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base, #0b1120)",
          color: "var(--text-muted, #94a3b8)",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary, #f8fafc)", marginBottom: "0.4rem" }}>
            Memeriksa Hak Akses...
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted, #94a3b8)" }}>
            Sistem memverifikasi sesi login Anda. Mohon tunggu sejenak...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      <Sidebar currentUser={currentUser} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Topbar currentUser={currentUser} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="main-content">
        {isBlockedForAsset ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</div>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Akses Dibatasi
            </div>
            <div style={{ fontSize: "0.85rem" }}>
              Akun Anda memiliki hak akses khusus modul Asset, IT & GA. Mengalihkan ke Asset Hub...
            </div>
          </div>
        ) : isBlockedForWarehouse ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</div>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Akses Dibatasi
            </div>
            <div style={{ fontSize: "0.85rem" }}>
              Akun Anda hanya memiliki izin untuk mengakses Inventori & Gudang. Mengalihkan ke Monitoring Stok...
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Floating AI Chat Box: available for all users including warehouse/Anida */}
      <AIChatBox variant="floating" contextPage={pathname} />
    </div>
  );
}
