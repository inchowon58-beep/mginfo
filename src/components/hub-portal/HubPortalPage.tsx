"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HUB_PORTAL_REGIONS, resolvePostRegionKey } from "@/lib/hub-portal/regions";
import type { HubPortalFeed, HubPortalPost } from "@/lib/hub-portal/types";
import type { Settings } from "@/lib/types";
import { HubPortalChrome } from "./HubPortalChrome";
import styles from "./hub-portal.module.css";

const PAGE_SIZE = 30;
const PORTAL_HEADLINE = "인포씨에스 매거진 - 블로그 광고 사이트 통합 콘텐츠";
const PORTAL_LEAD = "전국의 웹 블로그 사이트 상위노출 포스팅을 확인해보세요.";

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

  const filtered = useMemo(() => {
    return feed.posts.filter((post) => {
      if (region !== "all" && resolvePostRegionKey(post) !== region) return false;
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

  const categoryActiveLabel =
    category === "all" ? "전체" : feed.categories.find((c) => c.slug === category)?.label || category;
  const regionLabel =
    region !== "all"
      ? HUB_PORTAL_REGIONS.find((r) => r.key === region)?.label || region
      : "";

  return (
    <HubPortalChrome feed={feed} siteName={siteName} settings={settings} active="posts">
      <div className={styles.mainHead}>
        <h1>{PORTAL_HEADLINE}</h1>
        <p className={styles.mainLead}>{PORTAL_LEAD}</p>
        <p className={styles.mainMeta}>
          {categoryActiveLabel}
          {regionLabel ? ` · ${regionLabel}` : ""} · {filtered.length}개
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
    </HubPortalChrome>
  );
}
