"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function NightList({
  posts,
  start = 1,
}: {
  posts: Post[];
  start?: number;
}) {
  const categories = useCategories();
  return (
    <ol className="night-list" style={{ counterReset: `night ${start - 1}` }}>
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        return (
          <li key={post.id}>
            <Link href={`/posts/${post.slug}`}>
              <span className="night-list-copy">
                <span className="night-list-meta">
                  <span className="night-list-cat">{cat?.name}</span>
                  <span className="night-list-date">{formatDate(post.publishedAt)}</span>
                </span>
                <strong>{post.title}</strong>
                {post.excerpt ? <em>{post.excerpt}</em> : null}
              </span>
              {post.coverImage ? (
                <span className="night-list-thumb">
                  <img src={post.coverImage} alt="" />
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
