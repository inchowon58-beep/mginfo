"use client";

import Link from "next/link";
import { useState } from "react";
import { useCategories } from "@/components/CategoriesContext";
import { EngagementBar } from "@/components/EngagementBar";
import { PromoBanner } from "@/components/PromoBanner";
import { PartnerMedia } from "@/components/PartnerMedia";
import { StudioList } from "@/components/themes/StudioList";
import type { Banner, Partner, Post } from "@/lib/types";

export function StudioHome({
  posts,
  partners,
  banner,
  siteName,
  tagline,
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
  siteName: string;
  tagline?: string;
}) {
  const categories = useCategories();
  const [featured] = useState(() =>
    posts.length ? posts[Math.floor(Math.random() * posts.length)] : undefined
  );
  const rest = posts.filter((post) => post.id !== featured?.id).slice(0, 6);
  const dek =
    (tagline || "").trim() || "필요한 기능만 골라 익히고, 실생활에 바로 쓰는 가이드를 단계별로 만나보세요.";

  return (
    <div className="studio-home">
      <section className="studio-hero">
        <p className="studio-kicker">영상으로 시작하는 {siteName}</p>
        <h1>
          {siteName}, 쉽게 시작하고
          <br />
          혜택까지 받아가세요
        </h1>
        <p className="studio-dek">{dek}</p>
        <div className="studio-hero-actions">
          <Link className="studio-cta" href="/posts">
            시청 시작하기
          </Link>
          <p className="studio-live">{posts.length}편의 가이드가 열려 있어요</p>
        </div>
      </section>

      {categories.length ? (
        <nav className="studio-topics" aria-label="분야">
          {categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {banner ? (
        <div className="studio-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}

      {featured ? (
        <section className="studio-section">
          <div className="studio-section-head">
            <h2>지금보면 좋은글</h2>
            <Link href={`/posts/${featured.slug}`}>자세히</Link>
          </div>
          <Link className="studio-feature" href={`/posts/${featured.slug}`}>
            {featured.coverImage ? (
              <span className="studio-feature-thumb">
                <img src={featured.coverImage} alt="" />
              </span>
            ) : (
              <span className="studio-feature-thumb is-empty" aria-hidden />
            )}
            <span className="studio-feature-copy">
              <em>추천 가이드</em>
              <b>{featured.title}</b>
              {featured.excerpt ? <p>{featured.excerpt}</p> : null}
              <EngagementBar postId={featured.id} className="studio-engage engage-bar" />
              <span className="studio-cta is-ghost">이 글부터 보기</span>
            </span>
          </Link>
        </section>
      ) : (
        <p className="empty-note">아직 발행된 글이 없습니다. 관리자에서 첫 글을 발행해 보세요.</p>
      )}

      {rest.length ? (
        <section className="studio-section">
          <div className="studio-section-head">
            <h2>{siteName} 이야기</h2>
            <Link href="/posts">전체 보기</Link>
          </div>
          <StudioList posts={rest} />
        </section>
      ) : null}

      {partners.length ? (
        <section className="studio-community">
          <h2>함께하는 파트너</h2>
          <p>실제 현장에서 쓰는 정보와 업체를 모아 두었습니다.</p>
          <div className="studio-partners">
            {partners.slice(0, 6).map((p) => (
              <a key={p.id} href={p.url || "/partners"} target={p.url ? "_blank" : undefined} rel={p.url ? "noopener noreferrer" : undefined}>
                <PartnerMedia partner={p} variant="avatar" />
                <b>{p.name}</b>
                <small>{p.category}</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
