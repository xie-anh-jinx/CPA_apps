import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: {
    template: "%s | CPA Platform",
    default: "CPA Inventory Intelligence & CRM Platform",
  },
  description:
    "Platform monitoring inventory real-time, sales analytics, distribusi tracking, dan CRM terintegrasi untuk operasional bisnis distribusi.",
  keywords: ["inventory", "CRM", "sales monitoring", "distribusi", "analytics"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
