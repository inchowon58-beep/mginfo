"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { Post } from "@/lib/types";

export function IndexList({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState<string>("all");
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: posts.length };
    for (const c of CATEGORIES) {
      map[c.slug] = posts.filter((p) => p.category === c.slug).length;
    }
    return map;
  }, [posts]);
  const visible = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <section className="index-list">
      <h2>Stories</h2>
      <p className="index-list-desc">
        이번 호에 실린 {posts.length}편의 글입니다. 분야를 골라 천천히 읽어 보세요.
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
        {CATEGORIES.map((c) => (
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
            const cat = getCategory(post.category);
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
