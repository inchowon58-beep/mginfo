"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategory } from "@/lib/categories";
import { formatAgo } from "@/lib/format";
import type { Post } from "@/lib/types";

export function CarrotList({ posts }: { posts: Post[] }) {
  const categories = useCategories();
  if (!posts.length) return null;
  return (
    <div className="carrot-grid">
      {posts.map((post) => {
        const cat = getCategory(post.category, categories);
        const ago = formatAgo(post.publishedAt);
        const meta = [post.region || cat?.name, ago].filter(Boolean).join(" · ");
        return (
          <Link key={post.id} className="carrot-card" href={`/posts/${post.slug}`} title={post.title}>
            {post.coverImage ? (
              <img src={post.coverImage} alt="" />
            ) : (
              <span className="carrot-card-empty" style={{ color: cat?.color }} aria-hidden>
                <CategoryIcon slug={post.category} filled />
              </span>
            )}
            <b>{post.title}</b>
            <small>{meta}</small>
          </Link>
        );
      })}
    </div>
  );
}
