import fs from "fs";
import path from "path";
import { blobGetHubBoardJson, blobSetHubBoardJson, hasBlobStore } from "./blob-store";
import { PersistError, getSettings } from "./db";
import {
  assignNextSite,
  collectHubAvoidTitles,
  collectHubTodayKeywords,
  fetchSiteRecentPosts,
  generateHubBoardArticle,
  parseHubCampaign,
  parseHubCampaigns,
  pickHubTickKeywords,
  planHubCampaign,
  pruneStalePublishedKeywords,
  pushBoardPost,
  removeCampaignKeyword,
  HUB_TICK_SOLO,
  type HubBoardCampaign,
  type HubBoardKeyword,
} from "./hub-board";
import { hasRemoteStore, kvGetHubBoardJson, kvSetHubBoardJson } from "./kv";
import { getOpsSites, getBannedKeywords } from "./ops-store";
import { bannedContentError } from "./banned-keywords";
import { canClaimDueKeyword, canClaimManualKeyword } from "./publish-claim";
import { uid } from "./slug";

const LOCAL_PATH = path.join(process.cwd(), "data", "hub-board.json");
/** Stop starting new Gemini jobs before Vercel `maxDuration` (300s) hard-timeout. */
const TICK_BUDGET_MS = 240_000;

type HubBoardStore = { campaigns: HubBoardCampaign[] };

function normalize(raw: unknown): HubBoardStore {
  if (!raw || typeof raw !== "object") return { campaigns: [] };
  return { campaigns: parseHubCampaigns((raw as { campaigns?: unknown }).campaigns) };
}

function readFile(): HubBoardStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return { campaigns: [] };
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return { campaigns: [] };
  }
}

function writeFile(store: HubBoardStore) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function loadHubBoard(): Promise<HubBoardStore> {
  if (hasBlobStore()) {
    const remote = await blobGetHubBoardJson<HubBoardStore>();
    if (remote) return normalize(remote);
    return { campaigns: [] };
  }
  if (hasRemoteStore()) {
    const remote = await kvGetHubBoardJson<HubBoardStore>();
    if (remote) return normalize(remote);
    return { campaigns: [] };
  }
  return readFile();
}

async function saveHubBoard(store: HubBoardStore) {
  try {
    if (hasBlobStore()) {
      await blobSetHubBoardJson(store);
      return;
    }
    if (hasRemoteStore()) {
      await kvSetHubBoardJson(store);
      return;
    }
    if (process.env.VERCEL) {
      throw new PersistError("허브 광고 저장소를 이 사이트에서 쓸 수 없습니다.");
    }
    writeFile(store);
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "광고 캠페인을 저장하지 못했습니다.");
  }
}

let hubQueue: Promise<unknown> = Promise.resolve();

async function updateHubBoard(mutator: (store: HubBoardStore) => void): Promise<HubBoardStore> {
  const run = hubQueue.then(async () => {
    const store = await loadHubBoard();
    mutator(store);
    await saveHubBoard(store);
    return store;
  });
  hubQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function findHubRow(store: HubBoardStore, campaignId: string, keywordId: string) {
  const campaign = store.campaigns.find((row) => row.id === campaignId);
  const keyword = campaign?.keywords.find((row) => row.id === keywordId);
  if (!campaign || !keyword) return null;
  return { campaign, keyword };
}

function stillOwnsHubClaim(keyword: HubBoardKeyword | undefined, claim: string) {
  if (!keyword) return false;
  if (keyword.status === "published") return false;
  if (keyword.processingClaim && keyword.processingClaim !== claim) return false;
  return keyword.status === "processing";
}

export async function getHubCampaigns(): Promise<HubBoardCampaign[]> {
  const store = await loadHubBoard();
  const campaigns = store.campaigns.map((row) => pruneStalePublishedKeywords(row));
  const changed = campaigns.some((row, i) => row.keywords.length !== store.campaigns[i]?.keywords.length);
  if (changed) {
    await updateHubBoard((s) => {
      s.campaigns = s.campaigns.map((row) => pruneStalePublishedKeywords(row));
    });
  }
  return campaigns;
}

export async function setHubCampaigns(campaigns: HubBoardCampaign[]): Promise<HubBoardCampaign[]> {
  const next = { campaigns: parseHubCampaigns(campaigns) };
  await updateHubBoard((s) => {
    s.campaigns = next.campaigns;
  });
  return next.campaigns;
}

export async function upsertHubCampaign(campaign: HubBoardCampaign): Promise<HubBoardCampaign[]> {
  const parsed = parseHubCampaign(campaign) || campaign;
  const store = await updateHubBoard((s) => {
    const idx = s.campaigns.findIndex((row) => row.id === parsed.id);
    if (idx >= 0) s.campaigns[idx] = parsed;
    else s.campaigns.unshift(parsed);
  });
  return store.campaigns;
}

export async function deleteHubCampaign(campaignId: string) {
  let removed = false;
  const store = await updateHubBoard((s) => {
    const next = s.campaigns.filter((row) => row.id !== campaignId);
    removed = next.length !== s.campaigns.length;
    s.campaigns = next;
  });
  return { ok: removed, campaigns: store.campaigns };
}

export async function deleteHubKeyword(campaignId: string, keywordId: string) {
  let campaign: HubBoardCampaign | null = null;
  const store = await updateHubBoard((s) => {
    const idx = s.campaigns.findIndex((row) => row.id === campaignId);
    if (idx < 0) return;
    const next = removeCampaignKeyword(s.campaigns[idx], keywordId);
    if (!next) return;
    s.campaigns[idx] = next;
    campaign = next;
  });
  return { ok: Boolean(campaign), campaign, campaigns: store.campaigns };
}

export async function planOneHubCampaign(campaignId: string, opts?: { force?: boolean }) {
  const sites = await getOpsSites();
  const campaigns = await getHubCampaigns();
  const current = campaigns.find((row) => row.id === campaignId);
  if (!current) return { ok: false as const, error: "광고를 찾을 수 없습니다." };
  const forced = opts?.force
    ? {
        ...current,
        schedule: { ...current.schedule, enabled: true },
      }
    : current;
  const result = planHubCampaign(forced, sites, new Date(), { force: Boolean(opts?.force) });
  const list = await upsertHubCampaign(result.campaign);
  const saved = list.find((row) => row.id === campaignId) || result.campaign;
  return {
    ok: true as const,
    planned: result.planned,
    reason: result.reason,
    campaign: saved,
    campaigns: list,
  };
}

async function claimHubKeyword(campaignId: string, keywordId: string, mode: "due" | "manual") {
  const sites = await getOpsSites();
  const claim = uid();
  let owned = false;
  const store = await updateHubBoard((s) => {
    const found = findHubRow(s, campaignId, keywordId);
    if (!found) return;
    const allowed =
      mode === "due"
        ? canClaimDueKeyword(found.keyword.status, found.keyword.processingAt)
        : canClaimManualKeyword(found.keyword.status, found.keyword.processingAt);
    if (!allowed) return;
    const assigned = assignNextSite(found.campaign, found.keyword, sites);
    const idx = s.campaigns.findIndex((row) => row.id === campaignId);
    if (idx < 0) return;
    s.campaigns[idx] = assigned.campaign;
    const keyword = s.campaigns[idx].keywords.find((row) => row.id === keywordId);
    if (!keyword) return;
    keyword.status = "processing";
    keyword.processingAt = new Date().toISOString();
    keyword.processingClaim = claim;
    keyword.error = undefined;
    keyword.siteId = assigned.site.id;
    keyword.domain = assigned.site.domain;
    s.campaigns[idx].updatedAt = new Date().toISOString();
    owned = true;
  });
  const found = findHubRow(store, campaignId, keywordId);
  if (!owned || !found || found.keyword.processingClaim !== claim) return null;
  const site = sites.find((row) => row.id === found.keyword.siteId);
  if (!site) {
    await finishHubKeyword(campaignId, keywordId, claim, {
      status: "failed",
      error: "동의한 발행 사이트가 없습니다.",
    });
    return null;
  }
  return { claim, campaign: found.campaign, keyword: found.keyword, site, campaigns: store.campaigns };
}

async function finishHubKeyword(
  campaignId: string,
  keywordId: string,
  claim: string,
  patch: Partial<HubBoardKeyword>
) {
  let accepted = false;
  const store = await updateHubBoard((s) => {
    const found = findHubRow(s, campaignId, keywordId);
    if (!stillOwnsHubClaim(found?.keyword, claim)) return;
    Object.assign(found!.keyword, patch, { processingClaim: undefined, processingAt: undefined });
    found!.campaign.updatedAt = new Date().toISOString();
    accepted = true;
  });
  const campaign = store.campaigns.find((row) => row.id === campaignId) || null;
  return { accepted, campaign };
}

async function publishOneKeyword(campaignId: string, keywordId: string, mode: "due" | "manual") {
  const claimed = await claimHubKeyword(campaignId, keywordId, mode);
  if (!claimed) {
    return { ok: false, keyword: "", error: "이미 작성 중이거나 발행된 키워드입니다." };
  }
  try {
    const settings = await getSettings();
    const bannedList = await getBannedKeywords();
    const keywordBan = bannedContentError(
      bannedList,
      claimed.keyword.keyword,
      claimed.campaign.vendorName,
      claimed.campaign.extraPrompt
    );
    if (keywordBan) throw new Error(keywordBan);
    const recent = await fetchSiteRecentPosts(claimed.site);
    const article = await generateHubBoardArticle(claimed.campaign, claimed.keyword, claimed.site, settings, {
      titles: collectHubAvoidTitles(claimed.campaigns, recent.titles),
      keywords: collectHubTodayKeywords(claimed.campaigns),
      bodies: recent.bodies,
    });
    const pushed = await pushBoardPost(claimed.site, article);
    const finished = await finishHubKeyword(campaignId, keywordId, claimed.claim, {
      status: "published",
      postId: pushed.post?.id,
      title: article.title,
      domain: claimed.site.domain,
      siteId: claimed.site.id,
      publishedAt: new Date().toISOString(),
      error: undefined,
    });
    if (!finished.accepted) {
      return {
        ok: false,
        keyword: claimed.keyword.keyword,
        domain: claimed.site.domain,
        error: "다른 작업이 먼저 발행했습니다.",
        campaign: finished.campaign || claimed.campaign,
      };
    }
    return {
      ok: true,
      keyword: claimed.keyword.keyword,
      domain: claimed.site.domain,
      campaign: finished.campaign || claimed.campaign,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "발행 실패";
    const failed = await finishHubKeyword(campaignId, keywordId, claimed.claim, {
      status: "failed",
      error: message,
    });
    return {
      ok: false,
      keyword: claimed.keyword.keyword,
      domain: claimed.site.domain,
      error: message,
      campaign: failed.campaign || claimed.campaign,
    };
  }
}

export async function publishHubKeyword(campaignId: string, keywordId: string) {
  const campaigns = await getHubCampaigns();
  const campaign = campaigns.find((row) => row.id === campaignId);
  const keyword = campaign?.keywords.find((row) => row.id === keywordId);
  if (!campaign || !keyword) return { ok: false, error: "키워드를 찾을 수 없습니다." };
  if (keyword.status === "published") return { ok: false, error: "이미 발행된 키워드입니다." };
  if (keyword.status === "processing" && !canClaimManualKeyword(keyword.status, keyword.processingAt)) {
    return { ok: false, error: "이미 작성 중입니다." };
  }
  return publishOneKeyword(campaignId, keywordId, "manual");
}

export async function publishDueHubBoard(limit = HUB_TICK_SOLO, totalCap?: number) {
  const sites = await getOpsSites();
  let campaigns = await getHubCampaigns();
  let planned = 0;
  let dirty = false;
  const plannedCampaigns: HubBoardCampaign[] = [];
  for (const campaign of campaigns) {
    const result = planHubCampaign(campaign, sites);
    planned += result.planned;
    plannedCampaigns.push(result.campaign);
    if (result.planned > 0 || result.campaign.updatedAt !== campaign.updatedAt) dirty = true;
  }
  // Persist reclaim even when today's quota was already full (planned=0).
  if (dirty) await setHubCampaigns(plannedCampaigns);
  campaigns = await getHubCampaigns();
  const due = pickHubTickKeywords(campaigns, limit, new Date(), totalCap);
  const results: { keyword: string; ok: boolean; domain?: string; error?: string }[] = [];
  const tickStarted = Date.now();
  for (const item of due) {
    if (Date.now() - tickStarted >= TICK_BUDGET_MS) break;
    const published = await publishOneKeyword(item.campaign.id, item.keyword.id, "due");
    if (!published.keyword && !published.ok) continue;
    results.push({
      keyword: published.keyword || item.keyword.keyword,
      ok: published.ok,
      domain: published.domain,
      error: published.error,
    });
  }
  return { planned, processed: results.length, results };
}

/** Reclaim yesterday leftovers and assign today's slots without publishing. Used when the admin page loads. */
export async function planHubBoardToday(opts?: { force?: boolean }) {
  const sites = await getOpsSites();
  const campaigns = await getHubCampaigns();
  let planned = 0;
  let dirty = false;
  const reasons: string[] = [];
  const next: HubBoardCampaign[] = [];
  for (const campaign of campaigns) {
    const source = opts?.force
      ? { ...campaign, schedule: { ...campaign.schedule, enabled: true } }
      : campaign;
    const result = planHubCampaign(source, sites, new Date(), { force: Boolean(opts?.force) });
    planned += result.planned;
    next.push(result.campaign);
    if (result.reason && result.reason !== "ok" && result.reason !== "empty") {
      reasons.push(`${campaign.title || campaign.id}:${result.reason}`);
    }
    if (result.planned > 0 || result.campaign.updatedAt !== campaign.updatedAt) dirty = true;
  }
  // Return the planned list directly — re-reading Blob right away can still show old queued rows.
  const saved = dirty ? await setHubCampaigns(next) : campaigns;
  return { planned, reasons, campaigns: saved };
}
