import { resolveArticleStyle } from "./article-style";
import { parseKeywordList } from "./bulk-keywords";
import { randomPublishSlots, seoulWindow } from "./bulk-publish";
import { parseFaqItems } from "./faq";
import { FREE_BOARD_SLUG } from "./categories";
import { generateArticle } from "./gemini";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { bannedContentError, collectPublishText } from "./banned-keywords";
import { resolveGeminiNotes } from "./gemini-notes";
import type { OpsSite } from "./ops-ledger";
import { canClaimDueKeyword } from "./publish-claim";
import { seoulDateKey } from "./publish-limits";
import { extractPlaceName, parseNameList } from "./region-geo";
import { cleanHtml } from "./sanitize";
import { articleSlug, slugify, uid } from "./slug";
import { attachLocalFactBlocks } from "./article-blocks";
import { collectTodayKeywords, uniqueTextList, withUniqueArticle } from "./title-uniqueness";
import type { Post, Settings } from "./types";
import { normalizeHttpUrl, parseVendorFields } from "./vendor";
import { ensureVendorSlots } from "./vendor-slots";
import { pickRandomPostImages, mergeImageUrls } from "./image-pool";
import { discoverWebFolderImages } from "./web-image-folder";

export type HubBoardResult = {
  siteId: string;
  domain: string;
  ok: boolean;
  error?: string;
  postId?: string;
};

export type HubBoardKeyword = {
  id: string;
  keyword: string;
  status: "queued" | "scheduled" | "processing" | "published" | "failed";
  siteId?: string;
  domain?: string;
  postId?: string;
  scheduledAt?: string;
  publishedAt?: string;
  processingAt?: string;
  processingClaim?: string;
  error?: string;
  title?: string;
};

export type HubBoardSchedule = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  planDate: string;
};

export type HubBoardCampaign = {
  id: string;
  title: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  vendorId?: string;
  vendorIds?: string[];
  writingStyle: string;
  imagePool?: string[];
  imageFolderUrl?: string;
  extraPrompt?: string;
  dailyLimit: number;
  siteIds: string[];
  nextSiteIndex: number;
  keywords: HubBoardKeyword[];
  schedule: HubBoardSchedule;
  createdAt: string;
  updatedAt: string;
  excerpt?: string;
  bodyHtml?: string;
  coverImage?: string;
  status?: "scheduled" | "publishing" | "published" | "partial" | "failed";
  scheduledAt?: string | null;
  publishedAt?: string | null;
  results?: HubBoardResult[];
  vendorRecruitSlot?: boolean;
};

function masterSecret() {
  return process.env.MASTER_PASSWORD || "ybijour80";
}

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

function clampHour(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(23, Math.max(0, Math.floor(num)));
}

function normalizeKeyword(raw: unknown): HubBoardKeyword | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const keyword = trimText(row.keyword);
  if (!keyword) return null;
  const status = String(row.status || "queued");
  return {
    id: trimText(row.id) || uid(),
    keyword,
    status:
      status === "scheduled" || status === "processing" || status === "published" || status === "failed"
        ? status
        : "queued",
    siteId: trimText(row.siteId) || undefined,
    domain: trimText(row.domain) || undefined,
    postId: trimText(row.postId) || undefined,
    scheduledAt: trimText(row.scheduledAt) || undefined,
    publishedAt: trimText(row.publishedAt) || undefined,
    processingAt: trimText(row.processingAt) || undefined,
    processingClaim: trimText(row.processingClaim) || undefined,
    error: trimText(row.error) || undefined,
    title: trimText(row.title) || undefined,
  };
}

export function parseHubCampaign(raw: unknown, current?: HubBoardCampaign): HubBoardCampaign | null {
  if (!raw || typeof raw !== "object") return current || null;
  const row = raw as Record<string, unknown>;
  const vendor = parseVendorFields(row);
  const title = trimText(row.title ?? current?.title) || vendor.vendorName || "자유게시판 광고";
  const now = new Date().toISOString();
  const siteIds = Array.isArray(row.siteIds)
    ? [...new Set(row.siteIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : current?.siteIds || [];
  const keywords = Array.isArray(row.keywords)
    ? row.keywords.map(normalizeKeyword).filter((item): item is HubBoardKeyword => Boolean(item))
    : current?.keywords || [];
  const scheduleRaw = (row.schedule && typeof row.schedule === "object" ? row.schedule : {}) as Record<string, unknown>;
  const prevSchedule = current?.schedule;
  return {
    id: trimText(row.id ?? current?.id) || uid(),
    title,
    vendorName: vendor.vendorName || current?.vendorName,
    vendorPhone: vendor.vendorPhone || current?.vendorPhone,
    vendorWebsite: vendor.vendorWebsite || current?.vendorWebsite,
    vendorKakao: vendor.vendorKakao || current?.vendorKakao,
    vendorId: vendor.vendorId || current?.vendorId,
    vendorIds: vendor.vendorIds?.length ? vendor.vendorIds : current?.vendorIds,
    imagePool: mergeImageUrls(
      [],
      Array.isArray(row.imagePool)
        ? row.imagePool.map((item) => String(item || ""))
        : current?.imagePool || (current?.coverImage ? [current.coverImage] : [])
    ),
    writingStyle: trimText(row.writingStyle ?? current?.writingStyle) || "random",
    extraPrompt: trimText(row.extraPrompt ?? current?.extraPrompt) || undefined,
    imageFolderUrl: trimText(row.imageFolderUrl ?? current?.imageFolderUrl) || undefined,
    dailyLimit: Math.max(1, Math.min(9999, Math.floor(Number(row.dailyLimit ?? current?.dailyLimit) || 1))),
    siteIds,
    nextSiteIndex: Math.max(0, Math.floor(Number(row.nextSiteIndex ?? current?.nextSiteIndex) || 0)),
    keywords,
    schedule: {
      enabled: typeof scheduleRaw.enabled === "boolean" ? scheduleRaw.enabled : Boolean(prevSchedule?.enabled),
      startHour: clampHour(scheduleRaw.startHour ?? prevSchedule?.startHour, 1),
      endHour: 23,
      planDate: trimText(scheduleRaw.planDate ?? prevSchedule?.planDate),
    },
    createdAt: String(row.createdAt ?? current?.createdAt ?? now),
    updatedAt: String(row.updatedAt ?? now),
    excerpt: trimText(row.excerpt ?? current?.excerpt) || undefined,
    bodyHtml: current?.bodyHtml,
    coverImage: trimText(row.coverImage ?? current?.coverImage) || undefined,
    results: Array.isArray(row.results) ? (row.results as HubBoardResult[]) : current?.results || [],
    vendorRecruitSlot:
      typeof row.vendorRecruitSlot === "boolean" ? row.vendorRecruitSlot : Boolean(current?.vendorRecruitSlot),
  };
}

export function parseHubCampaigns(raw: unknown): HubBoardCampaign[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => parseHubCampaign(row))
    .filter((row): row is HubBoardCampaign => Boolean(row))
    .map((row) => pruneStalePublishedKeywords(row));
}

/** 발행 완료 후 하루가 지난 키워드는 목록에서 제거(저장 시에도 정리). */
export function pruneStalePublishedKeywords(campaign: HubBoardCampaign, now = new Date()): HubBoardCampaign {
  const today = seoulDateKey(now);
  if (!today) return campaign;
  const keywords = campaign.keywords.filter((item) => {
    if (item.status !== "published") return true;
    const day = seoulDateKey(item.publishedAt || item.scheduledAt || "");
    if (!day) return true;
    return day >= today;
  });
  if (keywords.length === campaign.keywords.length) return campaign;
  return { ...campaign, keywords, updatedAt: now.toISOString() };
}

export function consentedSites(sites: OpsSite[]) {
  return sites
    .filter((site) => site.boardAdsConsent && site.domain)
    .slice()
    .sort((a, b) => {
      const apex = String(a.apexDomain || "").localeCompare(String(b.apexDomain || ""), "ko");
      if (apex) return apex;
      return a.domain.localeCompare(b.domain, "ko");
    });
}

export function orderedCampaignSites(campaign: HubBoardCampaign, sites: OpsSite[]) {
  const selected = new Set(campaign.siteIds);
  return consentedSites(sites).filter((site) => selected.has(site.id));
}

export function appendCampaignKeywords(campaign: HubBoardCampaign, incoming: string[]) {
  const have = new Set(campaign.keywords.map((item) => item.keyword));
  const extra: HubBoardKeyword[] = [];
  for (const keyword of incoming) {
    if (have.has(keyword)) continue;
    have.add(keyword);
    extra.push({ id: uid(), keyword, status: "queued" });
  }
  return { campaign: { ...campaign, keywords: [...campaign.keywords, ...extra] }, added: extra.length };
}

function usedTodayQuota(campaign: HubBoardCampaign, today: string) {
  return campaign.keywords.filter((item) => {
    if (item.status === "scheduled" || item.status === "processing") {
      return Boolean(item.scheduledAt && seoulDateKey(item.scheduledAt) === today);
    }
    if (item.status === "published") {
      return Boolean(item.publishedAt && seoulDateKey(item.publishedAt) === today);
    }
    return false;
  }).length;
}

export function planHubCampaign(campaign: HubBoardCampaign, sites: OpsSite[], now = new Date()) {
  const today = seoulDateKey(now);
  if (!today || !campaign.schedule.enabled) return { planned: 0, campaign };
  const targets = orderedCampaignSites(campaign, sites);
  if (!targets.length) return { planned: 0, campaign };
  const { start, end } = seoulWindow(today, campaign.schedule.startHour, campaign.schedule.endHour);
  if (now >= end) {
    return { planned: 0, campaign: { ...campaign, schedule: { ...campaign.schedule, planDate: today } } };
  }
  const remaining = Math.max(0, campaign.dailyLimit - usedTodayQuota(campaign, today));
  const queued = campaign.keywords.filter((item) => item.status === "queued");
  const take = Math.min(remaining, queued.length);
  if (!take) {
    return { planned: 0, campaign: { ...campaign, schedule: { ...campaign.schedule, planDate: today } } };
  }
  const windowStart = now > start ? now : start;
  const slots = randomPublishSlots(take, windowStart, end);
  let index = campaign.nextSiteIndex || 0;
  const keywords = campaign.keywords.map((item) => ({ ...item }));
  queued.slice(0, take).forEach((item, i) => {
    const found = keywords.find((row) => row.id === item.id);
    if (!found) return;
    const site = targets[index % targets.length];
    found.status = "scheduled";
    found.siteId = site.id;
    found.domain = site.domain;
    found.scheduledAt = slots[i].toISOString();
    found.error = undefined;
    index += 1;
  });
  return {
    planned: take,
    campaign: {
      ...campaign,
      keywords,
      nextSiteIndex: index,
      schedule: { ...campaign.schedule, planDate: today },
      updatedAt: now.toISOString(),
    },
  };
}

export function dueHubKeywords(campaigns: HubBoardCampaign[], now = new Date()) {
  const due: { campaign: HubBoardCampaign; keyword: HubBoardKeyword }[] = [];
  for (const campaign of campaigns) {
    for (const keyword of campaign.keywords) {
      if (!canClaimDueKeyword(keyword.status, keyword.processingAt, now)) continue;
      if (!keyword.scheduledAt || new Date(keyword.scheduledAt).getTime() > now.getTime()) continue;
      due.push({ campaign, keyword });
    }
  }
  due.sort((a, b) => String(a.keyword.scheduledAt).localeCompare(String(b.keyword.scheduledAt)));
  return due;
}

export function findHubKeyword(campaigns: HubBoardCampaign[], campaignId: string, keywordId: string) {
  const campaign = campaigns.find((row) => row.id === campaignId);
  const keyword = campaign?.keywords.find((row) => row.id === keywordId);
  if (!campaign || !keyword) return null;
  return { campaign, keyword };
}

export function assignNextSite(campaign: HubBoardCampaign, keyword: HubBoardKeyword, sites: OpsSite[]) {
  const targets = orderedCampaignSites(campaign, sites);
  if (!targets.length) throw new Error("동의한 발행 사이트가 없습니다.");
  const existing = keyword.siteId ? targets.find((site) => site.id === keyword.siteId) : undefined;
  if (existing) return { campaign, keyword, site: existing };
  const site = targets[(campaign.nextSiteIndex || 0) % targets.length];
  const nextKeyword = { ...keyword, siteId: site.id, domain: site.domain };
  const nextCampaign: HubBoardCampaign = {
    ...campaign,
    nextSiteIndex: (campaign.nextSiteIndex || 0) + 1,
    keywords: campaign.keywords.map((row) => (row.id === keyword.id ? nextKeyword : row)),
    updatedAt: new Date().toISOString(),
  };
  return { campaign: nextCampaign, keyword: nextKeyword, site };
}

export function hubCampaignStats(campaign: HubBoardCampaign) {
  const published = campaign.keywords.filter((item) => item.status === "published").length;
  const failed = campaign.keywords.filter((item) => item.status === "failed").length;
  const queued = campaign.keywords.filter((item) => item.status === "queued").length;
  const scheduled = campaign.keywords.filter((item) => item.status === "scheduled" || item.status === "processing").length;
  const total = campaign.keywords.length;
  const remaining = queued + scheduled;
  const daysLeft = campaign.dailyLimit > 0 ? Math.ceil(remaining / campaign.dailyLimit) : remaining;
  return {
    total,
    published,
    failed,
    queued,
    scheduled,
    remaining,
    percent: total ? Math.round((published / total) * 100) : 0,
    daysLeft,
    dailyLimit: campaign.dailyLimit,
  };
}

export async function fetchSiteVoice(site: OpsSite) {
  try {
    const res = await fetch(`https://${site.domain}/api/ops/board`, {
      headers: { "x-infocs-master": masterSecret() },
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      writingTone?: string;
      writingPersona?: string;
      siteName?: string;
      siteTagline?: string;
    };
    if (!res.ok) return {};
    return {
      writingTone: String(data.writingTone || "").trim(),
      writingPersona: String(data.writingPersona || "").trim(),
      siteName: String(data.siteName || "").trim(),
      siteTagline: String(data.siteTagline || "").trim(),
    };
  } catch {
    return {};
  }
}

export function collectHubAvoidTitles(
  campaigns: HubBoardCampaign[],
  extra: Array<string | undefined | null> = []
) {
  return uniqueTextList([
    ...campaigns.flatMap((row) => row.keywords.map((item) => item.title)),
    ...extra,
  ]);
}

export function collectHubTodayKeywords(campaigns: HubBoardCampaign[], now = new Date()) {
  return collectTodayKeywords(
    campaigns.flatMap((row) => row.keywords),
    now
  );
}

export async function fetchSiteRecentPosts(site: OpsSite): Promise<{ titles: string[]; bodies: string[] }> {
  try {
    const res = await fetch(`https://${site.domain}/feed/posts.json`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      posts?: Array<{ title?: string; bodyPreview?: string; description?: string }>;
    };
    if (!res.ok || !Array.isArray(data.posts)) return { titles: [], bodies: [] };
    const rows = data.posts.slice(0, 40);
    return {
      titles: uniqueTextList(rows.map((post) => post.title)),
      bodies: rows.map((post) => String(post.bodyPreview || post.description || "").trim()).filter(Boolean),
    };
  } catch {
    return { titles: [], bodies: [] };
  }
}

export async function fetchSiteRecentTitles(site: OpsSite): Promise<string[]> {
  return (await fetchSiteRecentPosts(site)).titles;
}

export async function generateHubBoardArticle(
  campaign: HubBoardCampaign,
  keyword: HubBoardKeyword,
  site: OpsSite,
  settings: Settings,
  avoid?: { titles?: string[]; keywords?: string[]; bodies?: string[] }
) {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("허브 마스터설정에 제미나이 API 키가 없습니다.");
  const extraPrompt = trimText(campaign.extraPrompt);
  const keywordBan = bannedContentError(
    settings.publishBannedKeywords,
    keyword.keyword,
    campaign.vendorName,
    extraPrompt
  );
  if (keywordBan) throw new Error(keywordBan);
  const voice = await fetchSiteVoice(site);
  const writingStyle = resolveArticleStyle(campaign.writingStyle || "random", keyword.keyword);
  const siteName = voice.siteName || site.siteName || site.domain;
  const avoidTitles = uniqueTextList(avoid?.titles || []);
  const avoidKeywords = uniqueTextList(avoid?.keywords || []);
  const avoidBodies = (avoid?.bodies || []).map((item) => String(item || "").trim()).filter(Boolean);
  const place = extractPlaceName(keyword.keyword, site.concept, siteName) || "";
  const article = await withUniqueArticle(
    (nextAvoid) =>
      generateArticle({
        topic: keyword.keyword,
        writingStyle,
        category: FREE_BOARD_SLUG,
        categoryName: "자유게시판",
        notes: resolveGeminiNotes(
          [
            `이 글은 ${siteName} (${site.domain}) 자유게시판 광고 글이다. 사이트 컨셉: ${site.concept || "생활 정보 매거진"}${voice.siteTagline ? `. 소개: ${voice.siteTagline}` : ""}. 업체 ${campaign.vendorName || ""}를 자연스럽게 소개하되 과장 광고 문장은 피한다. 말투는 이 사이트 설정(합니다체/했어요체 등)을 그대로 따른다.`,
            extraPrompt ? `추가 프롬프트:\n${extraPrompt}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          ""
        ),
        focusKeyword: keyword.keyword,
        region: place,
        vendorName: campaign.vendorName,
        writingTone: voice.writingTone || settings.writingTone,
        writingPersona: voice.writingPersona || settings.writingPersona,
        experienceNotes: extraPrompt,
        avoidTitles: nextAvoid,
        avoidKeywords,
        apiKey,
        model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
      }),
    avoidTitles,
    avoidBodies,
    keyword.keyword
  );
  const generatedBan = bannedContentError(
    settings.publishBannedKeywords,
    collectPublishText({
      title: article.title,
      excerpt: article.excerpt,
      bodyHtml: article.bodyHtml,
      focusKeyword: keyword.keyword,
      tags: article.tags,
    })
  );
  if (generatedBan) throw new Error(generatedBan);
  let imagePool = campaign.imagePool || (campaign.coverImage ? [campaign.coverImage] : []);
  if (!imagePool.length && campaign.imageFolderUrl) {
    try {
      const found = await discoverWebFolderImages(campaign.imageFolderUrl);
      imagePool = found.urls;
    } catch {
      imagePool = [];
    }
  }
  const photos = pickRandomPostImages(imagePool, 1, 3);
  return {
    hubCampaignId: `${campaign.id}:${keyword.id}`,
    title: article.title,
    excerpt: article.excerpt || keyword.keyword,
    bodyHtml: cleanHtml(
      ensureVendorSlots(
        attachLocalFactBlocks({
          html: article.bodyHtml || "",
          place: extractPlaceName(article.title, keyword.keyword) || place,
          keyword: keyword.keyword,
          categoryName: "자유게시판",
          slug: article.slugHint,
          title: article.title,
        })
      )
    ),
    coverImage: photos.cover || "",
    extraImages: photos.extras,
    focusKeyword: keyword.keyword,
    faqItems: article.faqItems,
    regionInfo: article.regionInfo,
    nearbyAreas: parseNameList(article.nearbyAreas),
    nearbyStations: parseNameList(article.nearbyStations),
    slug: articleSlug(article.slugHint, keyword.keyword),
    vendorName: campaign.vendorName || "",
    vendorPhone: campaign.vendorPhone || "",
    vendorWebsite: campaign.vendorWebsite || "",
    vendorKakao: campaign.vendorKakao || "",
    vendorId: campaign.vendorId || "",
    vendorIds: campaign.vendorIds || (campaign.vendorId ? [campaign.vendorId] : []),
    region: extractPlaceName(article.title, keyword.keyword) || "",
    vendorRecruitSlot: Boolean(campaign.vendorRecruitSlot),
    hubVendorRegisterUrl: normalizeHttpUrl(settings.vendorRegisterUrl) || "",
  };
}

export async function pushBoardPost(site: OpsSite, payload: Record<string, unknown>) {
  const url = `https://${site.domain}/api/ops/board`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-infocs-master": masterSecret(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; post?: { id?: string }; duplicate?: boolean };
  if (!res.ok) throw new Error(data.error || `실패 (${res.status})`);
  return data;
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
    bodyHtml: cleanHtml(
      ensureVendorSlots(
        attachLocalFactBlocks({
          html: String(body.bodyHtml || ""),
          place: trimText(body.region),
          keyword: trimText(body.focusKeyword) || title,
          title,
        })
      )
    ),
    category: FREE_BOARD_SLUG,
    tags: Array.isArray(body.tags) ? body.tags.map((item) => String(item)).filter(Boolean) : ["자유게시판"],
    coverImage: trimText(body.coverImage) || undefined,
    extraImages: Array.isArray(body.extraImages)
      ? body.extraImages
          .map((item) => {
            if (typeof item === "string") return { url: item };
            if (item && typeof item === "object" && "url" in item) return { url: String((item as { url?: string }).url || "") };
            return null;
          })
          .filter((item): item is { url: string } => Boolean(item?.url))
      : undefined,
    focusKeyword: trimText(body.focusKeyword) || undefined,
    faqItems: parseFaqItems(body.faqItems),
    regionInfo: trimText(body.regionInfo) || undefined,
    nearbyAreas: parseNameList(body.nearbyAreas),
    nearbyStations: parseNameList(body.nearbyStations),
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    theme: "art-v1",
    hubCampaignId,
    region: trimText(body.region) || undefined,
    ...vendor,
    vendorRecruitSlot: Boolean(body.vendorRecruitSlot) || undefined,
    hubVendorRegisterUrl: normalizeHttpUrl(body.hubVendorRegisterUrl),
  };
}

export function alreadyHasCampaign(posts: Post[], hubCampaignId: string) {
  return posts.some((post) => post.hubCampaignId === hubCampaignId);
}

export { parseKeywordList };
