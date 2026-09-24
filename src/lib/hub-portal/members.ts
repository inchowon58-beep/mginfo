import { isHubHost } from "../ops-hub";
import type { OpsSite } from "../ops-ledger";
import { siteRequestOrigin } from "../site-origin";
import type { HubPortalFeed, HubPortalPost } from "./types";

export type HubMemberHome = {
  id: string;
  siteName: string;
  concept: string;
  domain: string;
  siteUrl: string;
  recentPosts: Array<{
    title: string;
    url: string;
    publishedAt: string;
  }>;
};

function recentForDomain(posts: HubPortalPost[], domain: string, limit = 3) {
  const needle = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (!needle) return [];
  return posts
    .filter((post) => {
      const host = String(post.domain || "")
        .trim()
        .toLowerCase()
        .replace(/^www\./, "");
      return host === needle;
    })
    .slice(0, limit)
    .map((post) => ({
      title: post.title,
      url: post.url,
      publishedAt: post.publishedAt,
    }));
}

export function buildMemberHomes(sites: OpsSite[], feed: HubPortalFeed | null): HubMemberHome[] {
  const posts = feed?.posts || [];
  const clones = sites.filter((site) => site.domain && !isHubHost(site.domain));
  return clones
    .map((site) => {
      const siteName = String(site.siteName || site.domain).trim() || site.domain;
      const origin = siteRequestOrigin(site);
      return {
        id: site.id || site.domain,
        siteName,
        concept: String(site.concept || "").trim(),
        domain: site.domain,
        siteUrl: origin || `https://${site.domain}`,
        recentPosts: recentForDomain(posts, site.domain, 3),
      };
    })
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "ko"));
}

export function filterMemberHomes(homes: HubMemberHome[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return homes;
  return homes.filter((home) => {
    const hay = [
      home.siteName,
      home.concept,
      home.domain,
      ...home.recentPosts.map((p) => p.title),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
