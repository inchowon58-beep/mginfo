import type { AdVendor, Category, CategoryVendorAd, Post } from "./types";
import { getNearbyDistricts } from "./region-geo";

export const DEFAULT_VENDOR_SLOTS = 3;
export const MAX_VENDOR_SLOTS = 5;

function compact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function termVariants(term: string): string[] {
  const base = compact(term);
  if (base.length < 2) return [];
  const out = new Set<string>([base]);
  if (/[동구시군읍면]$/.test(base) && base.length >= 3) out.add(base.slice(0, -1));
  return [...out];
}

function shouldExpand(term: string) {
  const base = compact(term);
  if (!base) return false;
  if (/동$/.test(base)) return false;
  if (/[시구군]$/.test(base)) return true;
  return getNearbyDistricts(base, 20).length > 0;
}

function expandedTerms(term: string): string[] {
  const out = new Set(termVariants(term));
  if (shouldExpand(term)) {
    for (const child of getNearbyDistricts(term, 20)) {
      for (const item of termVariants(child)) out.add(item);
    }
  }
  return [...out].filter((item) => item.length >= 2);
}

export function parseRegionTerms(raw: unknown, limit = 20): string[] {
  const values = typeof raw === "string" ? raw.split(/[,/\n]/) : Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const next = String(value || "").trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= limit) break;
  }
  return out;
}

export function slotCountForCategory(category?: Pick<Category, "vendorSlotCount"> | null) {
  const n = Number(category?.vendorSlotCount);
  if (!Number.isFinite(n)) return DEFAULT_VENDOR_SLOTS;
  return Math.min(MAX_VENDOR_SLOTS, Math.max(1, Math.round(n)));
}

export function parseCategoryVendorAds(raw: unknown): CategoryVendorAd[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryVendorAd[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const vendorId = String(row.vendorId || "").trim();
    if (!vendorId || seen.has(vendorId)) continue;
    seen.add(vendorId);
    const mode = row.mode === "region" ? "region" : "all";
    out.push({
      vendorId,
      mode,
      regions: mode === "region" ? parseRegionTerms(row.regions) : [],
      excludes: mode === "region" ? parseRegionTerms(row.excludes) : [],
    });
    if (out.length >= 40) break;
  }
  return out;
}

export function categoryAdsConfigured(category?: Pick<Category, "vendorAds"> | null) {
  return Array.isArray(category?.vendorAds) && category.vendorAds.length > 0;
}

export function categoryRecruitEnabled(category?: Pick<Category, "vendorRecruitSlot"> | null) {
  return Boolean(category?.vendorRecruitSlot);
}

function postHaystack(post: Pick<Post, "title" | "focusKeyword" | "region" | "regionInfo" | "nearbyAreas" | "tags" | "excerpt">) {
  return compact(
    [
      post.focusKeyword,
      post.title,
      post.region,
      post.regionInfo,
      post.excerpt,
      ...(post.nearbyAreas || []),
      ...(post.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function haystackHas(haystack: string, term: string) {
  return expandedTerms(term).some((item) => haystack.includes(item));
}

export function categoryVendorMatchesPost(ad: CategoryVendorAd, post: Post) {
  if (ad.mode !== "region") return true;
  const haystack = postHaystack(post);
  if (!haystack) return false;
  const regions = ad.regions || [];
  if (!regions.length) return false;
  if (!regions.some((region) => haystackHas(haystack, region))) return false;
  return !(ad.excludes || []).some((region) => haystackHas(haystack, region));
}

export function categoryListingVendors(post: Post, vendors: AdVendor[], category?: Category | null): AdVendor[] {
  const ads = category?.vendorAds || [];
  if (!ads.length) return [];
  const rows: AdVendor[] = [];
  const seen = new Set<string>();
  for (const ad of ads) {
    if (!categoryVendorMatchesPost(ad, post)) continue;
    const vendor = vendors.find((row) => row.id === ad.vendorId);
    if (!vendor || seen.has(vendor.id)) continue;
    seen.add(vendor.id);
    rows.push(vendor);
  }
  return rows;
}
