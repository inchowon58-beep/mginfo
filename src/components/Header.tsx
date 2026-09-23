import Link from "next/link";
import { BrandText } from "@/components/Brand";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SiteHeader } from "@/components/SiteHeader";
import { displaySiteName, footerBizLines } from "@/lib/categories";
import { resolveFooterDisclaimer } from "@/lib/publish-disclaimer";
import { getThemeChrome } from "@/lib/theme-chrome";
import type { Category, Settings, SiteThemeId } from "@/lib/types";

export function Header({
  active,
  themeId = "folio",
  siteName,
  mainLandingEnabled = false,
}: {
  active?: "home" | "posts" | "partners" | "write";
  themeId?: SiteThemeId;
  siteName?: string;
  mainLandingEnabled?: boolean;
}) {
  return (
    <SiteHeader
      active={active}
      themeId={themeId}
      siteName={siteName}
      mainLandingEnabled={mainLandingEnabled}
    />
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
  const disclaimer = resolveFooterDisclaimer(settings);
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
        <p className="footer-disclaimer">{disclaimer}</p>
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
