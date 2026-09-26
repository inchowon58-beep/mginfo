"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { displaySiteName, footerBizLines } from "@/lib/categories";
import { HUB_PORTAL_REGIONS, resolvePostRegionKey } from "@/lib/hub-portal/regions";
import type { HubPortalFeed } from "@/lib/hub-portal/types";
import { resolveFooterDisclaimer } from "@/lib/publish-disclaimer";
import type { Settings } from "@/lib/types";
import styles from "./hub-portal.module.css";

export function HubPortalChrome({
  feed,
  siteName,
  settings,
  active,
  showRegions = true,
  children,
}: {
  feed: HubPortalFeed;
  siteName: string;
  settings: Settings;
  active: "posts" | "members";
  showRegions?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const region = search.get("region") || "all";
  const category = search.get("cat") || "all";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [region, category, active]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function pushHome(next: { region?: string; cat?: string }) {
    const params = new URLSearchParams();
    const r = next.region ?? (active === "posts" ? region : "all");
    const c = next.cat ?? "all";
    if (r && r !== "all") params.set("region", r);
    if (c && c !== "all") params.set("cat", c);
    const q = params.toString();
    router.push(q ? `/?${q}` : "/");
    setMenuOpen(false);
  }

  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of feed.posts) {
      const key = resolvePostRegionKey(post);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [feed.posts]);

  const regionChips = HUB_PORTAL_REGIONS.map((row) => ({
    ...row,
    count: row.key === "all" ? feed.posts.length : regionCounts.get(row.key) || 0,
  }));

  function CategoryList({ onPick }: { onPick?: () => void }) {
    return (
      <>
        <Link
          href="/members"
          className={`${styles.catItem} ${active === "members" ? styles.catActive : ""}`}
          onClick={() => onPick?.()}
        >
          <span className={styles.catIconWrap}>
            <CategoryIcon slug="ads" filled />
          </span>
          <span>정회원 홈페이지</span>
        </Link>
        <button
          type="button"
          className={`${styles.catItem} ${active === "posts" && category === "all" ? styles.catActive : ""}`}
          onClick={() => {
            pushHome({ cat: "all", region: active === "posts" ? region : "all" });
            onPick?.();
          }}
        >
          <span className={styles.catIconWrap}>
            <CategoryIcon slug="all" filled />
          </span>
          <span>전체</span>
          <em>{feed.posts.length}</em>
        </button>
        {feed.categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            className={`${styles.catItem} ${active === "posts" && category === cat.slug ? styles.catActive : ""}`}
            onClick={() => {
              pushHome({ cat: cat.slug, region: active === "posts" ? region : "all" });
              onPick?.();
            }}
          >
            <span className={styles.catIconWrap}>
              <CategoryIcon slug={cat.slug} filled />
            </span>
            <span>{cat.label}</span>
            <em>{cat.count}</em>
          </button>
        ))}
      </>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.brandRow}>
          <div className={styles.brandLeft}>
            <button
              type="button"
              className={styles.menuToggle}
              aria-label={menuOpen ? "카테고리 메뉴 닫기" : "카테고리 메뉴 열기"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className={styles.burger} data-open={menuOpen ? "1" : "0"} />
            </button>
            <Link href="/" className={styles.brand} aria-label="INFOCS 홈">
              <span className={styles.brandText}>
                <strong className={styles.brandName}>{siteName || "인포씨에스"}</strong>
                <em className={styles.brandEn}>INFOCS</em>
              </span>
            </Link>
          </div>
          <nav className={styles.topLinks}>
            <Link href="/members">정회원</Link>
            <Link href="/posts">블로그</Link>
            <Link href="/admin">관리</Link>
          </nav>
        </div>
        {showRegions ? (
          <div className={styles.regions} role="tablist" aria-label="지역">
            {regionChips.map((row) => (
              <button
                key={row.key}
                type="button"
                role="tab"
                className={`${styles.regionChip} ${region === row.key ? styles.regionActive : ""}`}
                onClick={() => pushHome({ region: row.key, cat: category })}
              >
                {row.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="카테고리">
          <CategoryList />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <p className={styles.footerBrand}>{displaySiteName(settings.siteName)}</p>
              <p className={styles.footerTag}>INFOCS</p>
              <p className={styles.footerTagSoft}>
                {(settings.siteTagline || "").trim() || "지역 정보와 비즈니스를 잇는 컨설팅"}
              </p>
            </div>
            <div className={styles.footerNav}>
              <Link href="/">홈</Link>
              <Link href="/members">정회원 홈페이지</Link>
              <Link href="/posts">블로그</Link>
              <Link href="/partners">제휴</Link>
              <Link href="/admin">관리</Link>
            </div>
          </div>
          {footerBizLines(settings).length ? (
            <div className={styles.footerBiz}>
              {footerBizLines(settings).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          <div className={styles.footerBottom}>
            <p>
              © 2017 {displaySiteName(settings.siteName)}
            </p>
            <p>{resolveFooterDisclaimer(settings)}</p>
          </div>
        </div>
      </footer>

      {menuOpen ? (
        <div className={styles.drawerRoot}>
          <button
            type="button"
            className={styles.drawerScrim}
            aria-label="메뉴 닫기"
            onClick={() => setMenuOpen(false)}
          />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="카테고리 메뉴">
            <div className={styles.drawerHead}>
              <strong>카테고리</strong>
              <button type="button" className={styles.drawerClose} onClick={() => setMenuOpen(false)}>
                닫기
              </button>
            </div>
            <div className={styles.drawerList}>
              <CategoryList onPick={() => setMenuOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
