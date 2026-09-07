"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { EngagementBar } from "@/components/EngagementBar";
import { useSiteName } from "@/components/SiteNameContext";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function TalkThread({ posts }: { posts: Post[] }) {
  const categories = useCategories();
  const siteName = useSiteName();
  return (
    <div className="talk-feed">
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        const initial = (cat?.name || siteName).slice(0, 1);
        return (
          <article key={post.id} className="talk-post">
            <header className="talk-post-head">
              <Link className="talk-user" href={`/category/${post.category}`}>
                <span className="talk-user-pic" data-cat={cat?.name}>
                  {initial}
                </span>
                <span>
                  <b>{cat?.name || siteName}</b>
                  <small>{formatDate(post.publishedAt)}</small>
                </span>
              </Link>
            </header>
            <Link className="talk-photo" href={`/posts/${post.slug}`}>
              {post.coverImage ? (
                <img src={post.coverImage} alt="" />
              ) : (
                <span className="talk-photo-empty">{post.title}</span>
              )}
            </Link>
            <EngagementBar postId={post.id} className="talk-actions engage-bar" />
            <p className="talk-caption">
              <Link href={`/category/${post.category}`}>{cat?.name}</Link> {post.title}
            </p>
            {post.excerpt ? <p className="talk-more">{post.excerpt}</p> : null}
            <Link className="talk-open" href={`/posts/${post.slug}`}>
              더 보기
            </Link>
          </article>
        );
      })}
    </div>
  );
}
