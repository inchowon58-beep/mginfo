import type { Metadata } from "next";
import "./magazine.css";
import "./globals.css";
import { SITE } from "@/lib/categories";
import { NAVER_VERIFICATION, SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  metadataBase: new URL(SITE_ORIGIN),
  other: {
    "naver-site-verification": NAVER_VERIFICATION,
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
