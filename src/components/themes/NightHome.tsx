"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { PromoBanner } from "@/components/PromoBanner";
import { PartnerMedia } from "@/components/PartnerMedia";
import { NightList } from "@/components/themes/NightList";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Banner, Partner, Post } from "@/lib/types";

function pickRandomWithImages(posts: Post[], count: number, excludeId?: string) {
  const pool = posts.filter((p) => p.coverImage && p.id !== excludeId);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = pool[i];
    pool[i] = pool[j];
    pool[j] = current;
  }
  return pool.slice(0, count);
}

export function NightHome({
  posts,
  partners,
  banner,
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
}) {
  const categories = useCategories();
  const cover = posts[0];
  const cue = posts.slice(1, 7);
  const stills = pickRandomWithImages(posts, 8, cover?.id);
  const cat = cover ? getCategory(cover.category, categories) : undefined;

  return (
    <>
      {cover ? (
        <section className="night-cover">
          {cover.coverImage ? (
            <img className="night-cover-img" src={cover.coverImage} alt="" />
          ) : (
            <div className="night-cover-fallback" />
          )}
          <div className="night-cover-veil" />
          <div className="night-cover-copy">
            <p className="night-cover-kicker">
              표지 · {cat?.name || "매거진"} · {formatDate(cover.publishedAt)}
            </p>
            <h1>
              <Link href={`/posts/${cover.slug}`}>{cover.title}</Link>
            </h1>
            {cover.excerpt ? <p className="night-cover-dek">{cover.excerpt}</p> : null}
            <Link className="night-cover-cta" href={`/posts/${cover.slug}`}>
              이야기 열기
            </Link>
          </div>
        </section>
      ) : (
        <section className="night-cover is-empty">
          <div className="night-cover-copy">
            <p className="night-cover-kicker">표지</p>
            <h1>오늘 밤의 생활 정보</h1>
            <p className="night-cover-dek">아직 발행된 글이 없습니다.</p>
          </div>
        </section>
      )}

      {banner ? (
        <div className="night-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}

      <div className="night-board">
        <aside className="night-rail">
          <h2>투데이 매거진</h2>
          <nav className="night-rail-cats">
            {categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="night-board-main">
          {cue.length ? (
            <NightList posts={cue} start={2} />
          ) : (
            <p className="empty-note">다음에 이을 글이 아직 없습니다.</p>
          )}
        </div>
      </div>

      {stills.length > 0 ? (
        <section className="night-stills">
          <div className="night-stills-head">
            <h2>이런글은 어때요?</h2>
          </div>
          <div className="night-stills-grid">
            {stills.map((post) => {
              const stillCat = getCategory(post.category, categories);
              return (
                <Link key={post.id} className="night-still" href={`/posts/${post.slug}`}>
                  <img src={post.coverImage} alt="" />
                  <span>
                    <b>{stillCat?.name}</b>
                    {post.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {partners.length > 0 ? (
        <section className="night-partners">
          <p>Partners</p>
          <div className="night-partners-row">
            {partners.map((p) => (
              <Link key={p.id} href={p.url || "/partners"} target={p.url ? "_blank" : undefined} rel={p.url ? "noopener noreferrer" : undefined}>
                <PartnerMedia partner={p} variant="avatar" />
                {p.name}
                <small>{p.category}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
