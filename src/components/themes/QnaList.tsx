"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function QnaList({ posts }: { posts: Post[] }) {
  const categories = useCategories();
  return (
    <ul className="qna-list">
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        return (
          <li key={post.id}>
            <Link className="qna-item" href={`/posts/${post.slug}`}>
              <span className="qna-badge" aria-hidden>
                Q
              </span>
              <span className="qna-item-body">
                <strong>{post.title}</strong>
                {post.excerpt ? <em>{post.excerpt}</em> : null}
                <span className="qna-item-meta">
                  {cat?.name}
                  {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
                  <span className="qna-item-go">지식알아보기</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
