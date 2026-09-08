"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/settings", label: "설정" },
  { href: "/admin/vendors", label: "광고업체정보설정" },
  { href: "/admin/posts", label: "글 목록" },
  { href: "/admin/posts/new", label: "새 글 작성" },
  { href: "/admin/bulk", label: "대량발행예약" },
  { href: "/admin/banners", label: "메인 배너" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/settings") return pathname.startsWith("/admin/settings");
    if (href === "/admin/posts/new") return pathname === "/admin/posts/new";
    if (href === "/admin/posts") {
      return pathname === "/admin/posts" || (pathname.startsWith("/admin/posts/") && pathname !== "/admin/posts/new");
    }
    if (href === "/admin/password") return pathname.startsWith("/admin/password");
    if (href === "/admin/vendors") return pathname.startsWith("/admin/vendors");
    return pathname === href;
  }

  return (
    <aside className="admin-side">
      <div className="admin-side-brand">
        <h1>InfoCS 관리자</h1>
        <p>magazine.infocs.co.kr</p>
      </div>
      <nav className="admin-side-nav" aria-label="관리 메뉴">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""}>
            {item.label}
          </Link>
        ))}
        <Link href="/" target="_blank">
          사이트 보기
        </Link>
        <Link href="/admin/password" className={isActive("/admin/password") ? "active" : ""}>
          아이디/비밀번호설정
        </Link>
        <button className="linkish" type="button" onClick={logout}>
          로그아웃
        </button>
      </nav>
    </aside>
  );
}
