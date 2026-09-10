"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드", short: "대시보드", home: true },
  { href: "/admin/settings", label: "설정", short: "설정" },
  { href: "/admin/vendors", label: "광고업체정보설정", short: "광고업체" },
  { href: "/admin/ops", label: "사이트 대장", short: "사이트대장" },
  { href: "/admin/ops/board", label: "자유게시판 광고", short: "게시판광고" },
  { href: "/admin/posts", label: "글 목록", short: "글 목록" },
  { href: "/admin/posts/new", label: "새 글 작성", short: "새 글" },
  { href: "/admin/bulk", label: "대량발행예약", short: "대량발행" },
  { href: "/admin/banners", label: "메인 배너", short: "배너" },
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
  if (pathname === "/admin") return "";
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
  return "";
}

export function AdminNav({ showOps = false }: { showOps?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = showOps ? NAV : NAV.filter((item) => !item.href.startsWith("/admin/ops"));
  const title = screenTitle(pathname);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="admin-side">
      <div className="admin-side-brand">
        <Link href="/admin" className="admin-side-logo">
          <h1>InfoCS 관리자</h1>
          <p>magazine.infocs.co.kr</p>
        </Link>
      </div>
      {title ? <p className="admin-screen-title">{title}</p> : null}
      <nav className="admin-side-nav" aria-label="관리 메뉴">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${item.home ? "admin-nav-home" : ""} ${isActive(pathname, item.href) ? "active" : ""}`.trim()}
          >
            <span className="admin-nav-full">{item.label}</span>
            <span className="admin-nav-short">{item.short}</span>
          </Link>
        ))}
        <Link href="/" target="_blank">
          <span className="admin-nav-full">사이트 보기</span>
          <span className="admin-nav-short">사이트</span>
        </Link>
        <Link href="/admin/password" className={isActive(pathname, "/admin/password") ? "active" : ""}>
          <span className="admin-nav-full">아이디/비밀번호설정</span>
          <span className="admin-nav-short">비밀번호</span>
        </Link>
        <button className="linkish" type="button" onClick={logout}>
          <span className="admin-nav-full">로그아웃</span>
          <span className="admin-nav-short">로그아웃</span>
        </button>
      </nav>
    </aside>
  );
}
