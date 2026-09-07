"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { CategoryIcon } from "@/components/CategoryIcon";

export function CategoryBar({ current }: { current?: string }) {
  const categories = useCategories();
  return (
    <div className="category-bar">
      <Link className={`category-pill ${!current ? "active" : ""}`} href="/posts">
        <CategoryIcon slug="all" />
        전체
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          className={`category-pill ${current === c.slug ? "active" : ""}`}
          data-cat={c.name}
          href={`/category/${c.slug}`}
        >
          <CategoryIcon slug={c.slug} />
          {c.name}
        </Link>
      ))}
    </div>
  );
}
