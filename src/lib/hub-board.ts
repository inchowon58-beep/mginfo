import { FREE_BOARD_SLUG } from "./categories";
import type { OpsSite } from "./ops-ledger";
import { cleanHtml } from "./sanitize";
import { slugify, uid } from "./slug";
import type { Post } from "./types";
import { parseVendorFields } from "./vendor";

export type HubBoardResult = {
  siteId: string;
  domain: string;
  ok: boolean;
  error?: string;
  postId?: string;
};

export type HubBoardCampaign = {
  id: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  coverImage?: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  siteIds: string[];
  status: "scheduled" | "publishing" | "published" | "partial" | "failed";
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  results: HubBoardResult[];
};

function masterSecret() {
  return process.env.MASTER_PASSWORD || "ybijour80";
}

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

export function parseHubCampaign(raw: unknown, current?: HubBoardCampaign): HubBoardCampaign | null {
  if (!raw || typeof raw !== "object") return current || null;
  const row = raw as Record<string, unknown>;
  const title = trimText(row.title ?? current?.title);
  if (!title) return current || null;
  const now = new Date().toISOString();
  const vendor = parseVendorFields(row);
  const siteIds = Array.isArray(row.siteIds)
    ? [...new Set(row.siteIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : current?.siteIds || [];
  const results = Array.isArray(row.results)
    ? (row.results as HubBoardResult[])
    : current?.results || [];
  const status = String(row.status ?? current?.status ?? "scheduled");
  return {
    id: trimText(row.id ?? current?.id) || uid(),
    title,
    excerpt: trimText(row.excerpt ?? current?.excerpt),
    bodyHtml: cleanHtml(String(row.bodyHtml ?? current?.bodyHtml ?? "")),
    coverImage: trimText(row.coverImage ?? current?.coverImage) || undefined,
    vendorName: vendor.vendorName || current?.vendorName,
    vendorPhone: vendor.vendorPhone || current?.vendorPhone,
    vendorWebsite: vendor.vendorWebsite || current?.vendorWebsite,
    vendorKakao: vendor.vendorKakao || current?.vendorKakao,
    siteIds,
    status:
      status === "published" || status === "partial" || status === "failed" || status === "publishing"
        ? status
        : "scheduled",
    scheduledAt: row.scheduledAt === undefined ? current?.scheduledAt || null : trimText(row.scheduledAt) || null,
    createdAt: String(row.createdAt ?? current?.createdAt ?? now),
    updatedAt: String(row.updatedAt ?? now),
    publishedAt: row.publishedAt === undefined ? current?.publishedAt || null : trimText(row.publishedAt) || null,
    results,
  };
}

export function parseHubCampaigns(raw: unknown): HubBoardCampaign[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => parseHubCampaign(row)).filter((row): row is HubBoardCampaign => Boolean(row));
}

export function consentedSites(sites: OpsSite[]) {
  return sites.filter((site) => site.boardAdsConsent && site.domain);
}

function campaignPayload(campaign: HubBoardCampaign) {
  return {
    hubCampaignId: campaign.id,
    title: campaign.title,
    excerpt: campaign.excerpt || campaign.title,
    bodyHtml: campaign.bodyHtml,
    coverImage: campaign.coverImage || "",
    vendorName: campaign.vendorName || "",
    vendorPhone: campaign.vendorPhone || "",
    vendorWebsite: campaign.vendorWebsite || "",
    vendorKakao: campaign.vendorKakao || "",
  };
}

export async function pushCampaignToSites(campaign: HubBoardCampaign, sites: OpsSite[]): Promise<HubBoardCampaign> {
  const allowed = new Map(consentedSites(sites).map((site) => [site.id, site]));
  const targets = campaign.siteIds.map((id) => allowed.get(id)).filter((site): site is OpsSite => Boolean(site));
  const results: HubBoardResult[] = [];
  const body = JSON.stringify(campaignPayload(campaign));
  const password = masterSecret();

  for (const site of targets) {
    const url = `https://${site.domain}/api/ops/board`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-infocs-master": password,
        },
        body,
        signal: AbortSignal.timeout(20000),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; post?: { id?: string } };
      if (!res.ok) {
        results.push({ siteId: site.id, domain: site.domain, ok: false, error: data.error || `실패 (${res.status})` });
        continue;
      }
      results.push({ siteId: site.id, domain: site.domain, ok: true, postId: data.post?.id });
    } catch (err) {
      results.push({
        siteId: site.id,
        domain: site.domain,
        ok: false,
        error: err instanceof Error ? err.message : "연결 실패",
      });
    }
  }

  const skipped = campaign.siteIds.filter((id) => !allowed.has(id));
  for (const siteId of skipped) {
    const site = sites.find((row) => row.id === siteId);
    results.push({
      siteId,
      domain: site?.domain || siteId,
      ok: false,
      error: "광고글 동의가 꺼져 있습니다.",
    });
  }

  const okCount = results.filter((row) => row.ok).length;
  const status =
    results.length === 0 ? "failed" : okCount === results.length ? "published" : okCount > 0 ? "partial" : "failed";
  const now = new Date().toISOString();
  return {
    ...campaign,
    status,
    results,
    updatedAt: now,
    publishedAt: okCount > 0 ? now : campaign.publishedAt || null,
  };
}

export function dueCampaigns(list: HubBoardCampaign[], now = new Date()) {
  const ts = now.getTime();
  return list.filter((row) => {
    if (row.status !== "scheduled") return false;
    if (!row.scheduledAt) return true;
    const at = new Date(row.scheduledAt).getTime();
    return !Number.isNaN(at) && at <= ts;
  });
}

export function makeBoardPost(body: Record<string, unknown>, existing: Post[]): Post {
  const title = trimText(body.title);
  let slug = slugify(String(body.slug || title));
  if (existing.some((post) => post.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const vendor = parseVendorFields(body);
  const hubCampaignId = trimText(body.hubCampaignId) || undefined;
  return {
    id: uid(),
    slug,
    title,
    excerpt: trimText(body.excerpt) || title,
    bodyHtml: cleanHtml(String(body.bodyHtml || "")),
    category: FREE_BOARD_SLUG,
    tags: ["자유게시판"],
    coverImage: trimText(body.coverImage) || undefined,
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    theme: "art-v1",
    hubCampaignId,
    ...vendor,
  };
}

export function alreadyHasCampaign(posts: Post[], hubCampaignId: string) {
  return posts.some((post) => post.hubCampaignId === hubCampaignId);
}
