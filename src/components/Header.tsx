import Link from "next/link";
import { BrandMark, BrandText } from "@/components/Brand";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES, SITE } from "@/lib/categories";

export function Header({
  active,
}: {
  active?: "home" | "posts" | "partners";
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandMark />
        <nav className="site-nav">
          <Link className={active === "home" ? "active" : ""} href="/">
            Home
          </Link>
          <Link className={active === "posts" ? "active" : ""} href="/posts">
            Stories
          </Link>
          <Link className={active === "partners" ? "active" : ""} href="/partners">
            Partners
          </Link>
        </nav>
        <Link className="header-search-link" href="/posts">
          Search
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandText />
        </div>
        <p className="footer-tag">{SITE.tagline}</p>
        <div className="footer-links">
          <Link href="/">Home</Link>
          <Link href="/posts">Stories</Link>
          <Link href="/partners">Partners</Link>
          <Link href="/admin">Admin</Link>
        </div>
        <div className="footer-biz">
          <p>
            상호: {SITE.company} | 대표: {SITE.ceo} | 사업자등록번호: {SITE.bizNo}
          </p>
          <p>
            주소: {SITE.address} | Email: {SITE.email}
          </p>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} infocs magazine</p>
      </div>
    </footer>
  );
}

export function BottomNav({ current }: { current?: string }) {
  return (
    <nav className="bottom-cat-nav" aria-label="카테고리">
      <div className="bottom-cat-nav-inner">
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
    </nav>
  );
}
