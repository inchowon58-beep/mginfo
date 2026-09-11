import type { MetadataRoute } from "next";
import { FEED_REVALIDATE_SECONDS } from "@/lib/cache";
import { getCategories, getPublishedPosts } from "@/lib/db";
import { collectRegionHubs, regionHubPath } from "@/lib/region-hub";
import { postUrl, SITE_ORIGIN } from "@/lib/seo";

export const revalidate = FEED_REVALIDATE_SECONDS;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([getPublishedPosts(), getCategories()]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_ORIGIN}/posts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_ORIGIN}/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    ...categories.map((c) => ({
      url: `${SITE_ORIGIN}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...collectRegionHubs(posts).map((hub) => ({
      url: `${SITE_ORIGIN}${regionHubPath(hub.place)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: postUrl(post.slug),
    lastModified: new Date(post.updatedAt || post.publishedAt || post.createdAt),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticPages, ...postPages];
}
