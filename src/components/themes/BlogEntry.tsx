"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { EngagementBar } from "@/components/EngagementBar";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function BlogEntry({ post }: { post: Post }) {
  const cat = getCategory(post.category, useCategories());
  return (
    <article className="blog-entry">
      {post.coverImage ? (
        <Link className="blog-entry-thumb" href={`/posts/${post.slug}`}>
          <img src={post.coverImage} alt="" />
        </Link>
      ) : null}
      <div className="blog-entry-body">
        <p className="blog-entry-meta">
          <time>{formatDate(post.publishedAt)}</time>
          {cat ? (
            <>
              <span>·</span>
              <Link href={`/category/${post.category}`}>{cat.name}</Link>
            </>
          ) : null}
        </p>
        <h2>
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className="blog-entry-excerpt">{post.excerpt}</p> : null}
        <EngagementBar postId={post.id} className="blog-engage engage-bar" />
        <Link className="blog-entry-more" href={`/posts/${post.slug}`}>
          이어 읽기
        </Link>
      </div>
    </article>
  );
}
