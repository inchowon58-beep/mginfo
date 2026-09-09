"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { PromoBanner } from "@/components/PromoBanner";
import { PartnerMedia } from "@/components/PartnerMedia";
import { TalkThread } from "@/components/themes/TalkThread";
import type { Banner, Partner, Post } from "@/lib/types";

export function TalkHome({
  posts,
  partners,
  banner,
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
}) {
  const categories = useCategories();
  const feed = posts.slice(0, 10);
  const stories = categories.map((c) => ({
    ...c,
    count: posts.filter((p) => p.category === c.slug).length,
  })).filter((c) => c.count > 0);
  const explore = posts.filter((p) => p.coverImage).slice(0, 9);

  return (
    <div className="talk-wrap">
      {stories.length > 0 ? (
        <nav className="talk-stories" aria-label="스토리">
          {stories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`}>
              <span className="talk-story-ring">
                <span className="talk-story-inner">{c.name.slice(0, 1)}</span>
              </span>
              <em>{c.name}</em>
            </Link>
          ))}
        </nav>
      ) : null}
      {banner ? (
        <div className="talk-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}
      {feed.length ? (
        <TalkThread posts={feed} />
      ) : (
        <p className="empty-note">아직 올라온 피드가 없습니다.</p>
      )}
      {explore.length > 3 ? (
        <section className="talk-explore">
          <h2>탐색</h2>
          <div className="talk-grid">
            {explore.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`}>
                <img src={post.coverImage} alt={post.title} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {partners.length > 0 ? (
        <section className="talk-suggest">
          <h2>추천 계정</h2>
          <div>
            {partners.map((p) => (
              <Link key={p.id} href={p.url || "/partners"} target={p.url ? "_blank" : undefined} rel={p.url ? "noopener noreferrer" : undefined}>
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
