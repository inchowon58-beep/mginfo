import { DEFAULT_CATEGORIES, displaySiteName, getCategory } from "../categories";
import { isHubHost } from "../ops-hub";
import { getOpsSites } from "../ops-store";
import { siteRequestOrigin } from "../site-origin";
import { getPublishedPosts, getSettings } from "../db";
import { buildPostSeoDescription, buildPostSeoTitle } from "../post-seo";
import { postUrl, SITE_ORIGIN } from "../seo";
import { normalizeRegionKey, HUB_PORTAL_REGIONS } from "./regions";
import { loadHubPortalFeed, saveHubPortalFeed } from "./store";
import type { HubPortalFeed, HubPortalPost } from "./types";
import { HUB_PORTAL_STALE_MS } from "./types";

type RemoteFeedPost = {
  id?: string;
  url?: string;
  title?: string;
  description?: string;
  bodyPreview?: string;
  category?: string;
  region?: string;
  publishedAt?: string;
  coverImage?: string;
  image?: string;
};

function categoryLabel(slug: string) {
  const found = getCategory(slug, DEFAULT_CATEGORIES);
  if (found?.name) return found.name;
  const text = String(slug || "").trim();
  return text || "기타";
}

function mapRemotePost(
  row: RemoteFeedPost,
  meta: { siteName: string; domain: string }
): HubPortalPost | null {
  const url = String(row.url || "").trim();
  const title = String(row.title || "").trim();
  if (!url.startsWith("http") || !title) return null;
  const category = String(row.category || "").trim() || "life";
  const regionRaw = String(row.region || "").trim();
  const regionKey = normalizeRegionKey(regionRaw) || normalizeRegionKey(title);
  return {
    id: `${meta.domain}:${String(row.id || url)}`,
    url,
    title,
    description: String(row.description || row.bodyPreview || "").trim().slice(0, 220),
    image: String(row.coverImage || row.image || "").trim() || undefined,
    category,
    categoryLabel: categoryLabel(category),
    region: regionKey,
    siteName: meta.siteName,
    domain: meta.domain,
    publishedAt: String(row.publishedAt || "").trim() || new Date().toISOString(),
  };
}

async function fetchSiteFeed(origin: string): Promise<RemoteFeedPost[]> {
  const res = await fetch(`${origin.replace(/\/$/, "")}/feed/posts.json`, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as { posts?: RemoteFeedPost[] };
  return Array.isArray(data.posts) ? data.posts : [];
}

async function collectHubOwnPosts(): Promise<HubPortalPost[]> {
  const [settings, posts] = await Promise.all([getSettings(), getPublishedPosts()]);
  const siteName = displaySiteName(settings.siteName);
  const domain = SITE_ORIGIN.replace(/^https:\/\//, "");
  return posts.slice(0, 50).map((post) => {
    const regionRaw = String(post.region || "").trim();
    const regionKey = normalizeRegionKey(regionRaw) || normalizeRegionKey(post.title);
    const category = String(post.category || "life");
    return {
      id: `hub:${post.id}`,
      url: postUrl(post.slug),
      title: buildPostSeoTitle(post),
      description: buildPostSeoDescription(post).slice(0, 220),
      image: String(post.coverImage || "").trim() || undefined,
      category,
      categoryLabel: categoryLabel(category),
      region: regionKey,
      siteName,
      domain,
      publishedAt: post.publishedAt || post.createdAt,
    } satisfies HubPortalPost;
  });
}

function aggregate(posts: HubPortalPost[], sites: HubPortalFeed["sites"]): HubPortalFeed {
  const catMap = new Map<string, { slug: string; label: string; count: number }>();
  const regionMap = new Map<string, number>();
  for (const post of posts) {
    const prev = catMap.get(post.category) || {
      slug: post.category,
      label: post.categoryLabel || categoryLabel(post.category),
      count: 0,
    };
    prev.count += 1;
    catMap.set(post.category, prev);
    if (post.region) regionMap.set(post.region, (regionMap.get(post.region) || 0) + 1);
  }
  const categories = [...catMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  const regions = HUB_PORTAL_REGIONS.filter((r) => r.key !== "all")
    .map((r) => ({ key: r.key, label: r.label, count: regionMap.get(r.key) || 0 }))
    .filter((r) => r.count > 0);
  posts.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return {
    updatedAt: new Date().toISOString(),
    posts,
    categories,
    regions,
    sites,
  };
}

export async function collectHubPortalFeed(): Promise<HubPortalFeed> {
  const sites = await getOpsSites();
  const clones = sites.filter((site) => site.domain && !isHubHost(site.domain));
  const collected: HubPortalPost[] = [];
  const siteRows: HubPortalFeed["sites"] = [];

  // Hub own posts first
  try {
    const own = await collectHubOwnPosts();
    collected.push(...own);
    siteRows.push({
      domain: SITE_ORIGIN.replace(/^https:\/\//, ""),
      siteName: "허브",
      ok: true,
      count: own.length,
    });
  } catch (err) {
    siteRows.push({
      domain: SITE_ORIGIN.replace(/^https:\/\//, ""),
      siteName: "허브",
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : "hub fail",
    });
  }

  const concurrency = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < clones.length) {
      const index = cursor++;
      const site = clones[index];
      const origin = siteRequestOrigin(site);
      const siteName = String(site.siteName || site.domain).trim() || site.domain;
      if (!origin) {
        siteRows.push({ domain: site.domain, siteName, ok: false, count: 0, error: "origin 없음" });
        continue;
      }
      try {
        const rows = await fetchSiteFeed(origin);
        const mapped = rows
          .map((row) => mapRemotePost(row, { siteName, domain: site.domain }))
          .filter((row): row is HubPortalPost => Boolean(row));
        collected.push(...mapped);
        siteRows.push({ domain: site.domain, siteName, ok: true, count: mapped.length });
      } catch (err) {
        siteRows.push({
          domain: site.domain,
          siteName,
          ok: false,
          count: 0,
          error: err instanceof Error ? err.message : "fetch fail",
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, clones.length)) }, () => worker()));

  // Dedupe by URL
  const seen = new Set<string>();
  const unique = collected.filter((post) => {
    if (seen.has(post.url)) return false;
    seen.add(post.url);
    return true;
  });

  const feed = aggregate(unique, siteRows);
  await saveHubPortalFeed(feed);
  return feed;
}

export function isHubPortalFeedStale(feed: HubPortalFeed, now = Date.now()) {
  if (!feed.updatedAt) return true;
  const ts = Date.parse(feed.updatedAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts > HUB_PORTAL_STALE_MS;
}

/** Load cache; refresh synchronously if missing/stale (dev + first visit). */
export async function getHubPortalFeed(options?: { force?: boolean }): Promise<HubPortalFeed> {
  const cached = await loadHubPortalFeed();
  if (!options?.force && cached.posts.length > 0 && !isHubPortalFeedStale(cached)) {
    return cached;
  }
  try {
    return await collectHubPortalFeed();
  } catch {
    return cached.posts.length ? cached : aggregate([], []);
  }
}
