"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PromoBanner } from "@/components/PromoBanner";
import { PartnerMedia } from "@/components/PartnerMedia";
import { SearchForm } from "@/components/SearchForm";
import { CarrotList } from "@/components/themes/CarrotList";
import { getCategory } from "@/lib/categories";
import { formatAgo } from "@/lib/format";
import type { Banner, Partner, Post } from "@/lib/types";

function pickRandomPosts(posts: Post[], count: number) {
  const pool = posts.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = pool[i];
    pool[i] = pool[j];
    pool[j] = current;
  }
  return pool.slice(0, count);
}

export function CarrotHome({
  posts,
  partners,
  banner,
  keywords = [],
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
  keywords?: string[];
}) {
  const categories = useCategories();
  const listings = posts.slice(0, 12);
  const hot = pickRandomPosts(posts, 10);

  return (
    <div className="carrot-home">
      <section className="carrot-hero">
        <h1>당신 근처의 생활 정보</h1>
        <SearchForm placeholder="근처에서 검색" />
        {keywords.length > 0 ? (
          <div className="carrot-keys">
            <span>인기 검색어</span>
            {keywords.map((word) => (
              <Link key={word} href={`/posts?q=${encodeURIComponent(word)}`}>
                {word}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
      <nav className="carrot-cats" aria-label="카테고리">
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`}>
            <span className="carrot-cat-icon" style={{ color: c.color }}>
              <CategoryIcon slug={c.slug} filled />
            </span>
            {c.name}
          </Link>
        ))}
      </nav>
      {banner ? (
        <div className="carrot-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}
      <section className="carrot-section">
        <div className="carrot-section-head">
          <h2>지금 뜨는 동네 소식</h2>
          <Link href="/posts">더보기</Link>
        </div>
        {listings.length ? (
          <CarrotList posts={listings} />
        ) : (
          <p className="empty-note">아직 올라온 동네 소식이 없습니다.</p>
        )}
      </section>
      {hot.length > 0 ? (
        <section className="carrot-section">
          <div className="carrot-section-head">
            <h2>많이 보는 동네 이야기</h2>
          </div>
          <ol className="carrot-hot">
            {hot.map((post, i) => {
              const cat = getCategory(post.category, categories);
              const n = i + 1;
              return (
                <li key={post.id}>
                  <Link href={`/posts/${post.slug}`} title={post.title}>
                    <span className={n <= 3 ? "is-hot" : ""}>{n}</span>
                    <b>{post.title}</b>
                    <small>
                      {cat?.name}
                      {post.publishedAt ? ` · ${formatAgo(post.publishedAt)}` : ""}
                    </small>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      {partners.length > 0 ? (
        <section className="carrot-section">
          <div className="carrot-section-head">
            <h2>동네 파트너</h2>
            <Link href="/partners">더보기</Link>
          </div>
          <div className="carrot-shops">
            {partners.map((p) => (
              <Link key={p.id} href={p.url || "/partners"} target={p.url ? "_blank" : undefined} rel={p.url ? "noopener noreferrer" : undefined} title={p.name}>
                <PartnerMedia partner={p} variant="avatar" />
                <b>{p.name}</b>
                <small>{p.category}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
