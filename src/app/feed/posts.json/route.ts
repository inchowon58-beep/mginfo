import { NextResponse } from "next/server";
import { htmlToCompareText } from "@/lib/body-uniqueness";
import { getPublishedPosts } from "@/lib/db";
import { buildPostSeoDescription, buildPostSeoTitle, pageKeyword } from "@/lib/post-seo";
import { postUrl, SITE_ORIGIN } from "@/lib/seo";

export const revalidate = 600;

const MAX_POSTS = 50;

export async function GET() {
  const published = await getPublishedPosts();
  const posts = published.slice(0, MAX_POSTS).map((post) => ({
    id: post.id,
    url: postUrl(post.slug),
    title: buildPostSeoTitle(post),
    keyword: pageKeyword(post),
    description: buildPostSeoDescription(post),
    publishedAt: post.publishedAt || post.createdAt,
    updatedAt: post.updatedAt,
    category: post.category,
    region: post.region || "",
    bodyPreview: htmlToCompareText(post.bodyHtml).slice(0, 800),
  }));

  return NextResponse.json(
    {
      site: SITE_ORIGIN,
      feed: `${SITE_ORIGIN}/feed/posts.json`,
      generatedAt: new Date().toISOString(),
      count: posts.length,
      posts,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
