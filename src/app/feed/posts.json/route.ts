import { NextResponse } from "next/server";
import { getPublishedPosts } from "@/lib/db";
import { postUrl, SITE_ORIGIN } from "@/lib/seo";

export const dynamic = "force-dynamic";

const MAX_POSTS = 50;

export async function GET() {
  const published = await getPublishedPosts();
  const posts = published.slice(0, MAX_POSTS).map((post) => ({
    id: post.id,
    url: postUrl(post.slug),
    title: post.title,
    publishedAt: post.publishedAt || post.createdAt,
    updatedAt: post.updatedAt,
    category: post.category,
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
