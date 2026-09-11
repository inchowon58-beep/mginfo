import { extractPlaceName, getNearbyDistricts, getRegionFact, isSamePlaceRegion, REGION_FACTS } from "./region-geo";
import { lookupPublicFacts } from "./public-facts";
import { decodeSlugParam, slugify } from "./slug";
import type { Post } from "./types";

export type RegionHub = {
  place: string;
  slug: string;
  official: string;
  count: number;
};

export function regionHubSlug(place: string): string {
  return slugify(String(place || "").trim());
}

export function regionHubPath(place: string): string {
  const slug = regionHubSlug(place);
  return slug ? `/region/${encodeURI(slug)}` : "/posts";
}

export function postPlace(post: Pick<Post, "region" | "focusKeyword" | "title">): string {
  return extractPlaceName(post.region, post.focusKeyword, post.title) || String(post.region || "").trim();
}

export function resolveRegionHubPlace(slug: string): string | null {
  const decoded = decodeSlugParam(slug).trim();
  if (!decoded) return null;
  const direct = extractPlaceName(decoded) || (REGION_FACTS[decoded] ? decoded : "");
  if (direct) return direct;

  const want = slugify(decoded);
  const keys = Object.keys(REGION_FACTS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (slugify(key) === want) return key;
    if (slugify(REGION_FACTS[key].official) === want) return key;
  }
  return decoded.length >= 2 ? decoded : null;
}

export function postsForRegion(posts: Post[], place: string): Post[] {
  if (!place) return [];
  return posts.filter((post) => {
    const found = postPlace(post);
    return found ? isSamePlaceRegion(found, place) : false;
  });
}

export function collectRegionHubs(posts: Post[]): RegionHub[] {
  const map = new Map<string, RegionHub>();
  for (const post of posts) {
    const place = postPlace(post);
    if (!place) continue;
    const slug = regionHubSlug(place);
    if (!slug) continue;
    const prev = map.get(slug);
    if (prev) {
      prev.count += 1;
      continue;
    }
    map.set(slug, {
      place,
      slug,
      official: getRegionFact(place)?.official || lookupPublicFacts(place)?.official || place,
      count: 1,
    });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place, "ko"));
}

export function nearbyRegionLinks(place: string, limit = 5): Array<{ place: string; href: string }> {
  return getNearbyDistricts(place, limit).map((item) => ({
    place: item,
    href: regionHubPath(item),
  }));
}
