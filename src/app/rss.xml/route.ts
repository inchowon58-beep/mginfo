import { NextResponse } from "next/server";
import { SITE } from "@/lib/categories";
import { getPublishedPosts } from "@/lib/db";
import { stripHtml } from "@/lib/format";
import { SITE_ORIGIN } from "@/lib/seo";

export const dynamic = "force-dynamic";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getPublishedPosts().slice(0, 50);
  const items = posts
    .map((post) => {
      const url = `${SITE_ORIGIN}/posts/${post.slug}`;
      const description = xmlEscape(post.excerpt || stripHtml(post.bodyHtml).slice(0, 180));
      const pub = new Date(post.publishedAt || post.createdAt).toUTCString();
      const enclosure = post.coverImage
        ? `<enclosure url="${xmlEscape(post.coverImage)}" type="image/jpeg" />`
        : "";
      return `<item>
  <title>${xmlEscape(post.title)}</title>
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
    <title>${xmlEscape(SITE.name)}</title>
    <link>${SITE_ORIGIN}/</link>
    <description>${xmlEscape(SITE.description)}</description>
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
