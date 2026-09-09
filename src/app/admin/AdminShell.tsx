"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

export function AdminShell({
  children,
  showOps = false,
}: {
  children: React.ReactNode;
  showOps?: boolean;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login")) {
    return <div className="admin-body">{children}</div>;
  }
  const keepWide = pathname === "/admin/posts/new" || pathname.startsWith("/admin/ops");
  return (
    <div className="admin-body">
      <div className="admin-shell">
        <AdminNav showOps={showOps} />
        <main className="admin-main">
          {keepWide ? children : <div className="admin-narrow">{children}</div>}
        </main>
      </div>
    </div>
  );
}
