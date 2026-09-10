"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/settings", label: "설정" },
  { href: "/admin/vendors", label: "광고업체정보설정" },
  { href: "/admin/ops", label: "사이트 대장" },
  { href: "/admin/ops/board", label: "자유게시판 광고" },
  { href: "/admin/posts", label: "글 목록" },
  { href: "/admin/posts/new", label: "새 글 작성" },
  { href: "/admin/bulk", label: "대량발행예약" },
  { href: "/admin/banners", label: "메인 배너" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/settings") return pathname.startsWith("/admin/settings");
  if (href === "/admin/posts/new") return pathname === "/admin/posts/new";
  if (href === "/admin/posts") {
    return pathname === "/admin/posts" || (pathname.startsWith("/admin/posts/") && pathname !== "/admin/posts/new");
  }
  if (href === "/admin/password") return pathname.startsWith("/admin/password");
  if (href === "/admin/vendors") return pathname.startsWith("/admin/vendors");
  if (href === "/admin/ops/board") return pathname.startsWith("/admin/ops/board");
  if (href === "/admin/ops") return pathname === "/admin/ops";
  return pathname === href;
}

function screenTitle(pathname: string) {
  if (pathname === "/admin") return "대시보드";
  if (pathname.startsWith("/admin/settings")) return "설정";
  if (pathname.startsWith("/admin/vendors")) return "광고업체정보설정";
  if (pathname.startsWith("/admin/ops/board")) return "자유게시판 광고";
  if (pathname === "/admin/ops") return "사이트 대장";
  if (pathname === "/admin/posts/new") return "새 글 작성";
  if (pathname.startsWith("/admin/posts/") && pathname !== "/admin/posts") return "글 수정";
  if (pathname === "/admin/posts") return "글 목록";
  if (pathname.startsWith("/admin/bulk")) return "대량발행예약";
  if (pathname.startsWith("/admin/banners")) return "메인 배너";
  if (pathname.startsWith("/admin/password")) return "아이디/비밀번호설정";
  return "관리자";
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {open ? (
        <path
          fill="currentColor"
          d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"
        />
      ) : (
        <path fill="currentColor" d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
      )}
    </svg>
  );
}

export function AdminNav({ showOps = false }: { showOps?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = showOps ? NAV : NAV.filter((item) => !item.href.startsWith("/admin/ops"));
  const title = screenTitle(pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className={`admin-side${menuOpen ? " is-menu-open" : ""}`}>
      <div className="admin-side-bar">
        <Link href="/admin" className="admin-side-logo" onClick={() => setMenuOpen(false)}>
          <h1>InfoCS 관리자</h1>
          <p>magazine.infocs.co.kr</p>
        </Link>
        <p className="admin-screen-title">{title}</p>
        <button
          className="admin-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-side-nav"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
      <nav id="admin-side-nav" className="admin-side-nav" aria-label="관리 메뉴">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "active" : ""}>
            {item.label}
          </Link>
        ))}
        <Link href="/" target="_blank">
          사이트 보기
        </Link>
        <Link href="/admin/password" className={isActive(pathname, "/admin/password") ? "active" : ""}>
          아이디/비밀번호설정
        </Link>
        <button className="linkish" type="button" onClick={logout}>
          로그아웃
        </button>
      </nav>
    </aside>
  );
}
