import { NextResponse } from "next/server";
import { FEED_REVALIDATE_SECONDS } from "@/lib/cache";
import { displaySiteName, siteBrand } from "@/lib/categories";
import { getPublishedPosts, getSettings } from "@/lib/db";
import { buildPostSeoDescription, buildPostSeoTitle } from "@/lib/post-seo";
import { postUrl, SITE_ORIGIN } from "@/lib/seo";

export const revalidate = FEED_REVALIDATE_SECONDS;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [postsRaw, settings] = await Promise.all([getPublishedPosts(), getSettings()]);
  const posts = postsRaw.slice(0, 50);
  const siteName = displaySiteName(settings.siteName);
  const brand = siteBrand(settings);
  const items = posts
    .map((post) => {
      const url = xmlEscape(postUrl(post.slug));
      const description = xmlEscape(buildPostSeoDescription(post));
      const pub = new Date(post.publishedAt || post.createdAt).toUTCString();
      const enclosure = post.coverImage
        ? `<enclosure url="${xmlEscape(post.coverImage)}" type="image/jpeg" />`
        : "";
      return `<item>
  <title>${xmlEscape(buildPostSeoTitle(post))}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${pub}</pubDate>
  <category>${xmlEscape(post.category)}</category>
  <description>${description}</description>
  ${enclosure}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(siteName)}</title>
    <link>${SITE_ORIGIN}/</link>
    <description>${xmlEscape(brand.description)}</description>
    <language>ko</language>
    <atom:link href="${SITE_ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
