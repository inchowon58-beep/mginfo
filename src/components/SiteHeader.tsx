"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/Brand";
import { getThemeChrome } from "@/lib/theme-chrome";
import type { SiteThemeId } from "@/lib/types";

export function SiteHeader({
  active,
  themeId = "folio",
  siteName,
  mainLandingEnabled = false,
}: {
  active?: "home" | "posts" | "partners" | "write";
  themeId?: SiteThemeId;
  siteName?: string;
  mainLandingEnabled?: boolean;
}) {
  const chrome = getThemeChrome(themeId);
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAdmin(Boolean(data?.admin));
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAdmin(false);
      setMenuOpen(false);
      router.refresh();
      window.location.assign("/");
    } finally {
      setBusy(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const homeLabel = mainLandingEnabled ? "홈" : chrome.home;
  const postsLabel = mainLandingEnabled ? "블로그" : chrome.posts;

  return (
    <header className={`site-header${menuOpen ? " is-menu-open" : ""}`}>
      <div className="site-header-inner">
        <BrandMark themeId={themeId} name={siteName} />

        <button
          type="button"
          className="site-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-header-menu"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div id="site-header-menu" className="site-header-menu">
          <nav className="site-nav" aria-label="주요 메뉴">
            <Link className={active === "home" ? "active" : ""} href="/" onClick={closeMenu}>
              {homeLabel}
            </Link>
            <Link className={active === "posts" ? "active" : ""} href="/posts" onClick={closeMenu}>
              {postsLabel}
            </Link>
            <Link
              className={active === "partners" ? "active" : ""}
              href="/partners"
              onClick={closeMenu}
            >
              {chrome.partners}
            </Link>
            {admin ? (
              <Link
                className={`site-nav-write${active === "write" ? " active" : ""}`}
                href="/write"
                onClick={closeMenu}
              >
                글쓰기
              </Link>
            ) : null}
          </nav>
          {admin ? (
            <div className="site-auth-actions">
              <Link href="/admin" onClick={closeMenu}>
                {chrome.admin}
              </Link>
              <button type="button" className="site-auth-logout" disabled={busy} onClick={() => void logout()}>
                {busy ? "…" : "로그아웃"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {menuOpen ? (
        <button type="button" className="site-nav-backdrop" aria-label="메뉴 닫기" onClick={closeMenu} />
      ) : null}
    </header>
  );
}
