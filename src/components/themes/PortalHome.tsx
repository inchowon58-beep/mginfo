"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PromoBanner } from "@/components/PromoBanner";
import { SearchForm } from "@/components/SearchForm";
import { useSiteName } from "@/components/SiteNameContext";
import { PortalRank } from "@/components/themes/PortalRank";
import { PartnerMedia } from "@/components/PartnerMedia";
import { getCategory } from "@/lib/categories";
import { shuffleItems } from "@/lib/shuffle";
import type { Banner, Partner, Post } from "@/lib/types";

function PortalNewsGrid({ posts, className = "" }: { posts: Post[]; className?: string }) {
  const categories = useCategories();
  if (!posts.length) return null;
  return (
    <div className={`portal-news ${className}`.trim()}>
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        return (
          <Link key={post.id} href={`/posts/${post.slug}`} title={post.title}>
            {post.coverImage ? (
              <img src={post.coverImage} alt="" />
            ) : (
              <span className="portal-news-empty" style={{ color: cat?.color }} aria-hidden>
                <CategoryIcon slug={post.category} />
              </span>
            )}
            <b>{post.title}</b>
            <small>{cat?.name}</small>
          </Link>
        );
      })}
    </div>
  );
}

export function PortalHome({
  posts,
  partners,
  banner,
  seed = 1,
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
  seed?: number;
}) {
  const categories = useCategories();
  const siteName = useSiteName();
  const topNews = posts.slice(0, 8);
  const headlines = posts.slice(8, 22);
  const bottomNews = posts.slice(22, 26);
  const ranking = shuffleItems(posts, seed).slice(0, 12);

  return (
    <div className="portal-home">
      <section className="portal-search">
        <h1 className="portal-logo-lg">{siteName}</h1>
        <SearchForm placeholder="검색어를 입력해 보세요" />
      </section>
      <nav className="portal-shorts" aria-label="바로가기">
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} data-cat={c.slug}>
            <span className="portal-short-icon" style={{ color: c.color }}>
              <CategoryIcon slug={c.slug} filled animated />
            </span>
            {c.name}
          </Link>
        ))}
      </nav>
      {banner ? (
        <div className="portal-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}
      <div className="portal-board">
        <section className="portal-box">
          <div className="portal-box-head">
            <h2>오늘의 이슈</h2>
            <Link href="/posts">더보기</Link>
          </div>
          <PortalNewsGrid posts={topNews} />
          {headlines.length ? (
            <PortalRank posts={headlines} split />
          ) : topNews.length || bottomNews.length ? null : (
            <p className="empty-note">아직 등록된 뉴스가 없습니다.</p>
          )}
          <PortalNewsGrid posts={bottomNews} className="is-foot" />
        </section>
        <aside className="portal-side">
          <section className="portal-box">
            <div className="portal-box-head">
              <h2>실시간 인기글</h2>
            </div>
            {ranking.length ? <PortalRank posts={ranking} /> : <p className="empty-note">집계 중</p>}
          </section>
        </aside>
      </div>
      {partners.length > 0 ? (
        <section className="portal-partners">
          <div className="portal-box-head">
            <h2>파트너</h2>
            <Link href="/partners">더보기</Link>
          </div>
          <div className="portal-partners-row">
            {partners.map((p) => (
              <Link key={p.id} href={p.url || "/partners"} target={p.url ? "_blank" : undefined} rel={p.url ? "noopener noreferrer" : undefined} title={p.name}>
                <PartnerMedia partner={p} variant="avatar" />
                <span>{p.name}</span>
                <small>{p.category}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
