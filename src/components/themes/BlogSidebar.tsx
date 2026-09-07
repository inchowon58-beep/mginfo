"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { SITE, displaySiteName, getCategory } from "@/lib/categories";
import type { Partner, Post } from "@/lib/types";

export function BlogSidebar({
  posts,
  partners,
  siteName,
}: {
  posts: Post[];
  partners: Partner[];
  siteName?: string;
}) {
  const categories = useCategories();
  const name = displaySiteName(siteName || SITE.name);
  const recent = posts.slice(0, 5);
  const counts = categories.map((c) => ({
    ...c,
    count: posts.filter((p) => p.category === c.slug).length,
  })).filter((c) => c.count > 0);

  return (
    <aside className="blog-side">
      <section className="blog-widget">
        <h3>이 블로그는</h3>
        <p>
          {name}의 생활 기록입니다. 반려동물, 집, 맛집 이야기를 차분히 남겨 둡니다.
        </p>
      </section>
      {counts.length > 0 ? (
        <section className="blog-widget">
          <h3>분야</h3>
          <ul className="blog-count-list">
            {counts.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`}>
                  {c.name}
                  <span>{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {recent.length > 0 ? (
        <section className="blog-widget">
          <h3>최근 글</h3>
          <ul>
            {recent.map((post) => {
              const cat = getCategory(post.category, categories);
              return (
                <li key={post.id}>
                  <Link href={`/posts/${post.slug}`}>
                    {post.title}
                    {cat ? <small>{cat.name}</small> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {partners.length > 0 ? (
        <section className="blog-widget">
          <h3>이웃</h3>
          <ul>
            {partners.map((p) => (
              <li key={p.id}>
                <Link href={p.url || "/partners"} target={p.url ? "_blank" : undefined}>
                  {p.name}
                  <small>{p.category}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
