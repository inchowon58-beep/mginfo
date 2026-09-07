"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCategories } from "@/components/CategoriesContext";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategory } from "@/lib/categories";
import type { Post } from "@/lib/types";

export function IndexList({
  posts,
  title = "Stories",
  description,
  moreHref,
  moreLabel,
}: {
  posts: Post[];
  title?: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  const categories = useCategories();
  const [filter, setFilter] = useState<string>("all");
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: posts.length };
    for (const c of categories) {
      map[c.slug] = posts.filter((p) => p.category === c.slug).length;
    }
    return map;
  }, [posts, categories]);
  const visible = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <section className="index-list">
      <h2>{title}</h2>
      <p className="index-list-desc">
        {description || `이번 호에 실린 ${posts.length}편의 글입니다. 분야를 골라 천천히 읽어 보세요.`}
        {moreHref && moreLabel ? (
          <>
            {" "}
            <Link href={moreHref}>{moreLabel}</Link>
          </>
        ) : null}
      </p>
      <div className="index-filter-tabs">
        <button
          type="button"
          className={`category-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CategoryIcon slug="all" />
          전체 <span>{counts.all}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`category-pill ${filter === c.slug ? "active" : ""}`}
            data-cat={c.name}
            onClick={() => setFilter(c.slug)}
          >
            <CategoryIcon slug={c.slug} />
            {c.name} <span>{counts[c.slug] || 0}</span>
          </button>
        ))}
      </div>
      <div className="index-list-box">
        <ul>
          {visible.map((post) => {
            const cat = getCategory(post.category, categories);
            return (
              <li key={post.id} className={cat?.filterClass}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
