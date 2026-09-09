import Link from "next/link";
import { BrandMark, BrandText } from "@/components/Brand";
import { CategoryIcon } from "@/components/CategoryIcon";
import { displaySiteName, footerBizLines } from "@/lib/categories";
import { FOOTER_DISCLAIMER } from "@/lib/publish-disclaimer";
import { getThemeChrome } from "@/lib/theme-chrome";
import type { Category, Settings, SiteThemeId } from "@/lib/types";

export function Header({
  active,
  themeId = "folio",
  siteName,
}: {
  active?: "home" | "posts" | "partners";
  themeId?: SiteThemeId;
  siteName?: string;
}) {
  const chrome = getThemeChrome(themeId);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandMark themeId={themeId} name={siteName} />
        <nav className="site-nav">
          <Link className={active === "home" ? "active" : ""} href="/">
            {chrome.home}
          </Link>
          <Link className={active === "posts" ? "active" : ""} href="/posts">
            {chrome.posts}
          </Link>
          <Link className={active === "partners" ? "active" : ""} href="/partners">
            {chrome.partners}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer({
  themeId = "folio",
  settings,
}: {
  themeId?: SiteThemeId;
  settings?: Settings;
}) {
  const chrome = getThemeChrome(themeId);
  const siteName = displaySiteName(settings?.siteName);
  const tagline = (settings?.siteTagline || "").trim() || chrome.tagline;
  const bizLines = settings ? footerBizLines(settings) : [];
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandText themeId={themeId} name={siteName} />
        </div>
        <p className="footer-tag">{tagline}</p>
        <div className="footer-links">
          <Link href="/">{chrome.home}</Link>
          <Link href="/posts">{chrome.posts}</Link>
          <Link href="/partners">{chrome.partners}</Link>
          <Link href="/admin">{chrome.admin}</Link>
        </div>
        {bizLines.length ? (
          <div className="footer-biz">
            {bizLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        <p className="footer-copy">
          © {new Date().getFullYear()} {siteName}
        </p>
        <p className="footer-disclaimer">{FOOTER_DISCLAIMER}</p>
        <p className="footer-maker">
          블로그 사이트 제작 배포{" "}
          <a href="https://www.infocs.co.kr" target="_blank" rel="noopener noreferrer">
            인포씨에스
          </a>
        </p>
      </div>
    </footer>
  );
}

export function BottomNav({ current, categories }: { current?: string; categories: Category[] }) {
  return (
    <nav className="bottom-cat-nav" aria-label="카테고리">
      <div className="bottom-cat-nav-inner">
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
    </nav>
  );
}
