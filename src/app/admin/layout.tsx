"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login")) {
    return <div className="admin-body">{children}</div>;
  }
  return (
    <div className="admin-body">
      <div className="admin-shell">
        <AdminNav />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
