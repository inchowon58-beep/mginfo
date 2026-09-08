"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login")) {
    return <div className="admin-body">{children}</div>;
  }
  const keepWide = pathname === "/admin/posts/new";
  return (
    <div className="admin-body">
      <div className="admin-shell">
        <AdminNav />
        <main className="admin-main">
          {keepWide ? children : <div className="admin-narrow">{children}</div>}
        </main>
      </div>
    </div>
  );
}
