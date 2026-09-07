"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function PortalRank({
  posts,
  start = 1,
  split = false,
}: {
  posts: Post[];
  start?: number;
  split?: boolean;
}) {
  const categories = useCategories();
  return (
    <ol className={`portal-rank${split ? " is-split" : ""}`} start={start}>
      {posts.map((post, i) => {
        const cat = getCategory(post.category, categories);
        const n = start + i;
        return (
          <li key={post.id}>
            <Link href={`/posts/${post.slug}`} title={post.title}>
              <span className={`portal-n ${n <= 3 ? "is-hot" : ""}`}>{n}</span>
              <span className="portal-rank-body">
                <strong>{post.title}</strong>
                {split ? null : (
                  <em>
                    {cat?.name}
                    {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
                  </em>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
