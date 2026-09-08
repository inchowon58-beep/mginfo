import type { Metadata, Viewport } from "next";
import "./magazine.css";
import "./globals.css";
import "./theme-press.css";
import "./theme-night.css";
import "./theme-journal.css";
import "./theme-qna.css";
import "./theme-talk.css";
import "./theme-portal.css";
import "./theme-carrot.css";
import "./theme-studio.css";
import { SITE, displaySiteName } from "@/lib/categories";
import { getSettings } from "@/lib/db";
import { NAVER_VERIFICATION, SITE_ORIGIN } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = displaySiteName(settings.siteName);
  const tagline = (settings.siteTagline || "").trim() || SITE.tagline;
  return {
    title: {
      default: `${name} — ${tagline}`,
      template: `%s | ${name}`,
    },
    description: SITE.description,
    metadataBase: new URL(SITE_ORIGIN),
    robots: { index: true, follow: true },
    other: {
      "naver-site-verification": NAVER_VERIFICATION,
    },
    alternates: {
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
