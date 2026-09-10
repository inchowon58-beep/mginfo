import fs from "fs";
import path from "path";
import { blobGetHubBoardJson, blobSetHubBoardJson, hasBlobStore } from "./blob-store";
import { PersistError, getSettings } from "./db";
import {
  assignNextSite,
  dueHubKeywords,
  generateHubBoardArticle,
  parseHubCampaigns,
  planHubCampaign,
  pruneStalePublishedKeywords,
  pushBoardPost,
  type HubBoardCampaign,
  type HubBoardKeyword,
} from "./hub-board";
import { hasRemoteStore, kvGetHubBoardJson, kvSetHubBoardJson } from "./kv";
import { getOpsSites, getBannedKeywords } from "./ops-store";
import { bannedContentError, collectPublishText } from "./banned-keywords";

const LOCAL_PATH = path.join(process.cwd(), "data", "hub-board.json");
const MAX_PER_TICK = 4;

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

export async function getHubCampaigns(): Promise<HubBoardCampaign[]> {
  const store = await loadHubBoard();
  const campaigns = store.campaigns.map((row) => pruneStalePublishedKeywords(row));
  const changed = campaigns.some((row, i) => row.keywords.length !== store.campaigns[i]?.keywords.length);
  if (changed) await saveHubBoard({ campaigns });
  return campaigns;
}

export async function setHubCampaigns(campaigns: HubBoardCampaign[]): Promise<HubBoardCampaign[]> {
  const next = { campaigns: parseHubCampaigns(campaigns) };
  await saveHubBoard(next);
  return next.campaigns;
}

export async function upsertHubCampaign(campaign: HubBoardCampaign): Promise<HubBoardCampaign[]> {
  const list = await getHubCampaigns();
  const idx = list.findIndex((row) => row.id === campaign.id);
  if (idx >= 0) list[idx] = campaign;
  else list.unshift(campaign);
  return setHubCampaigns(list);
}

function patchKeyword(campaign: HubBoardCampaign, keywordId: string, patch: Partial<HubBoardKeyword>) {
  return {
    ...campaign,
    updatedAt: new Date().toISOString(),
    keywords: campaign.keywords.map((row) => (row.id === keywordId ? { ...row, ...patch } : row)),
  };
}

async function publishOneKeyword(campaign: HubBoardCampaign, keyword: HubBoardKeyword) {
  const sites = await getOpsSites();
  const assigned = assignNextSite(campaign, keyword, sites);
  let next = patchKeyword(assigned.campaign, keyword.id, { status: "processing", error: undefined });
  await upsertHubCampaign(next);
  const current = next.keywords.find((row) => row.id === keyword.id) || assigned.keyword;
  try {
    const settings = await getSettings();
    const bannedList = await getBannedKeywords();
    const keywordBan = bannedContentError(bannedList, current.keyword, next.vendorName, next.extraPrompt);
    if (keywordBan) throw new Error(keywordBan);
    const article = await generateHubBoardArticle(next, current, assigned.site, settings);
    const pushed = await pushBoardPost(assigned.site, article);
    next = patchKeyword(next, keyword.id, {
      status: "published",
      postId: pushed.post?.id,
      title: article.title,
      domain: assigned.site.domain,
      siteId: assigned.site.id,
      publishedAt: new Date().toISOString(),
      error: undefined,
    });
    await upsertHubCampaign(next);
    return { ok: true, keyword: current.keyword, domain: assigned.site.domain, campaign: next };
  } catch (err) {
    const message = err instanceof Error ? err.message : "발행 실패";
    next = patchKeyword(next, keyword.id, { status: "failed", error: message });
    await upsertHubCampaign(next);
    return { ok: false, keyword: current.keyword, domain: assigned.site.domain, error: message, campaign: next };
  }
}

export async function publishHubKeyword(campaignId: string, keywordId: string) {
  const campaigns = await getHubCampaigns();
  const campaign = campaigns.find((row) => row.id === campaignId);
  const keyword = campaign?.keywords.find((row) => row.id === keywordId);
  if (!campaign || !keyword) return { ok: false, error: "키워드를 찾을 수 없습니다." };
  if (keyword.status === "published") return { ok: false, error: "이미 발행된 키워드입니다." };
  if (keyword.status === "processing") return { ok: false, error: "이미 작성 중입니다." };
  return publishOneKeyword(campaign, keyword);
}

export async function publishDueHubBoard() {
  const sites = await getOpsSites();
  let campaigns = await getHubCampaigns();
  let planned = 0;
  const plannedCampaigns: HubBoardCampaign[] = [];
  for (const campaign of campaigns) {
    const result = planHubCampaign(campaign, sites);
    planned += result.planned;
    plannedCampaigns.push(result.campaign);
  }
  if (planned) await setHubCampaigns(plannedCampaigns);
  campaigns = await getHubCampaigns();
  const due = dueHubKeywords(campaigns).slice(0, MAX_PER_TICK);
  const results: { keyword: string; ok: boolean; domain?: string; error?: string }[] = [];
  for (const item of due) {
    const latest = (await getHubCampaigns()).find((row) => row.id === item.campaign.id);
    const keyword = latest?.keywords.find((row) => row.id === item.keyword.id);
    if (!latest || !keyword || keyword.status === "published") continue;
    const published = await publishOneKeyword(latest, keyword);
    results.push({
      keyword: published.keyword,
      ok: published.ok,
      domain: published.domain,
      error: published.error,
    });
  }
  return { planned, processed: results.length, results };
}
