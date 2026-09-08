"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { EngagementBar } from "@/components/EngagementBar";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function StudioList({ posts }: { posts: Post[] }) {
  const categories = useCategories();
  if (!posts.length) return null;
  return (
    <div className="studio-grid">
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        return (
          <Link key={post.id} className="studio-card" href={`/posts/${post.slug}`}>
            {post.coverImage ? (
              <span className="studio-card-thumb">
                <img src={post.coverImage} alt="" />
              </span>
            ) : (
              <span className="studio-card-thumb is-empty" aria-hidden />
            )}
            <span className="studio-card-body">
              {cat ? <em>{cat.name}</em> : null}
              <b>{post.title}</b>
              {post.excerpt ? <p>{post.excerpt}</p> : null}
              <EngagementBar postId={post.id} className="studio-engage engage-bar" />
              <small>
                {formatDate(post.publishedAt)}
                <span>이야기 보기</span>
              </small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
