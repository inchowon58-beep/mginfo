import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";

export function CategoryBar({ current }: { current?: string }) {
  return (
    <div className="category-bar">
      <Link className={`category-pill ${!current ? "active" : ""}`} href="/posts">
        <CategoryIcon slug="all" />
        전체
      </Link>
      {CATEGORIES.map((c) => (
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
