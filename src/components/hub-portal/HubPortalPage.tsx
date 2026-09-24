"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { displaySiteName, footerBizLines } from "@/lib/categories";
import { resolveFooterDisclaimer } from "@/lib/publish-disclaimer";
import { HUB_PORTAL_REGIONS } from "@/lib/hub-portal/regions";
import type { HubPortalFeed, HubPortalPost } from "@/lib/hub-portal/types";
import type { Settings } from "@/lib/types";
import styles from "./hub-portal.module.css";

const PAGE_SIZE = 30;

function formatWhen(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const hour = 3600_000;
  if (diff < hour) return "방금";
  if (diff < 24 * hour) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * 24 * hour) return `${Math.floor(diff / (24 * hour))}일 전`;
  return new Date(ts).toLocaleDateString("ko-KR");
}

function PostCard({ post }: { post: HubPortalPost }) {
  return (
    <a className={styles.card} href={post.url} target="_blank" rel="noopener noreferrer">
      <div className={styles.cardMedia}>
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt="" loading="lazy" />
        ) : (
          <div className={styles.cardPlaceholder}>
            <CategoryIcon slug={post.category || "all"} filled />
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <strong className={styles.cardTitle}>{post.title}</strong>
        {post.description ? <p className={styles.cardDesc}>{post.description}</p> : null}
        <div className={styles.cardMeta}>
          <span>{post.siteName}</span>
          <span>·</span>
          <span>{formatWhen(post.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

function pageNumbers(current: number, total: number) {
  if (total <= 1) return [1];
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let i = current - 2; i <= current + 2; i += 1) {
    if (i >= 1 && i <= total) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}

export function HubPortalPage({
  feed,
  siteName,
  settings,
}: {
  feed: HubPortalFeed;
  siteName: string;
  settings: Settings;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const region = search.get("region") || "all";
  const category = search.get("cat") || "all";
  const page = Math.max(1, Number(search.get("page") || "1") || 1);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [region, category, page]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const filtered = useMemo(() => {
    return feed.posts.filter((post) => {
      if (region !== "all" && post.region !== region) return false;
      if (category !== "all" && post.category !== category) return false;
      return true;
    });
  }, [feed.posts, region, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pages = pageNumbers(safePage, totalPages);

  function pushQuery(next: { region?: string; cat?: string; page?: number }) {
    const params = new URLSearchParams();
    const r = next.region ?? region;
    const c = next.cat ?? category;
    const p = next.page ?? 1;
    if (r && r !== "all") params.set("region", r);
    if (c && c !== "all") params.set("cat", c);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    router.push(q ? `/?${q}` : "/");
  }

  function setFilter(next: { region?: string; cat?: string }) {
    pushQuery({ ...next, page: 1 });
    setMenuOpen(false);
  }

  const regionChips = HUB_PORTAL_REGIONS.map((row) => ({
    ...row,
    count: row.key === "all" ? feed.posts.length : feed.regions.find((r) => r.key === row.key)?.count || 0,
  }));

  const categoryActiveLabel =
    category === "all" ? "전체" : feed.categories.find((c) => c.slug === category)?.label || category;

  function CategoryList({ onPick }: { onPick?: () => void }) {
    return (
      <>
        <button
          type="button"
          className={`${styles.catItem} ${category === "all" ? styles.catActive : ""}`}
          onClick={() => {
            setFilter({ cat: "all" });
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
            className={`${styles.catItem} ${category === cat.slug ? styles.catActive : ""}`}
            onClick={() => {
              setFilter({ cat: cat.slug });
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
            <Link href="/" className={styles.brand}>
              {siteName}
            </Link>
          </div>
          <nav className={styles.topLinks}>
            <Link href="/posts">블로그</Link>
            <Link href="/admin">관리</Link>
          </nav>
        </div>
        <div className={styles.regions} role="tablist" aria-label="지역">
          {regionChips.map((row) => (
            <button
              key={row.key}
              type="button"
              role="tab"
              className={`${styles.regionChip} ${region === row.key ? styles.regionActive : ""}`}
              onClick={() => setFilter({ region: row.key })}
            >
              {row.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="카테고리">
          <CategoryList />
        </aside>

        <main className={styles.main}>
          <div className={styles.mainHead}>
            <h1>추천 콘텐츠</h1>
            <p>
              {categoryActiveLabel}
              {region !== "all" ? ` · ${regionChips.find((r) => r.key === region)?.label || region}` : ""} ·{" "}
              {filtered.length}개
            </p>
          </div>
          {pageItems.length === 0 ? (
            <div className={styles.empty}>표시할 글이 없습니다. 관리자에서 피드를 수집해 보세요.</div>
          ) : (
            <>
              <div className={styles.grid}>
                {pageItems.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav className={styles.pager} aria-label="페이지">
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={safePage <= 1}
                    onClick={() => pushQuery({ page: safePage - 1 })}
                  >
                    이전
                  </button>
                  {pages.map((num, idx) => {
                    const prev = pages[idx - 1];
                    const gap = prev && num - prev > 1;
                    return (
                      <span key={num} className={styles.pageGroup}>
                        {gap ? <span className={styles.pageEllipsis}>…</span> : null}
                        <button
                          type="button"
                          className={`${styles.pageBtn} ${num === safePage ? styles.pageActive : ""}`}
                          onClick={() => pushQuery({ page: num })}
                        >
                          {num}
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={safePage >= totalPages}
                    onClick={() => pushQuery({ page: safePage + 1 })}
                  >
                    다음
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </main>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <p className={styles.footerBrand}>{displaySiteName(settings.siteName)}</p>
              <p className={styles.footerTag}>
                {(settings.siteTagline || "").trim() || "모든 생활 정보를 한눈에"}
              </p>
            </div>
            <div className={styles.footerNav}>
              <Link href="/">홈</Link>
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
            <p>© {new Date().getFullYear()} {displaySiteName(settings.siteName)}</p>
            <p>{resolveFooterDisclaimer(settings)}</p>
          </div>
        </div>
      </footer>

      {menuOpen ? (
        <div className={styles.drawerRoot}>
          <button type="button" className={styles.drawerScrim} aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />
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
