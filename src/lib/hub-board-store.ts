import fs from "fs";
import path from "path";
import { blobGetHubBoardJson, blobSetHubBoardJson, hasBlobStore } from "./blob-store";
import { hasRemoteStore, kvGetHubBoardJson, kvSetHubBoardJson } from "./kv";
import { PersistError } from "./db";
import { dueCampaigns, parseHubCampaigns, pushCampaignToSites, type HubBoardCampaign } from "./hub-board";
import { getOpsSites } from "./ops-store";

const LOCAL_PATH = path.join(process.cwd(), "data", "hub-board.json");

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
  return (await loadHubBoard()).campaigns;
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

export async function publishDueHubBoard() {
  const sites = await getOpsSites();
  const campaigns = await getHubCampaigns();
  const due = dueCampaigns(campaigns);
  const updated: HubBoardCampaign[] = [];
  for (const campaign of due) {
    const locked: HubBoardCampaign = {
      ...campaign,
      status: "publishing",
      updatedAt: new Date().toISOString(),
    };
    await upsertHubCampaign(locked);
    try {
      const next = await pushCampaignToSites(locked, sites);
      await upsertHubCampaign(next);
      updated.push(next);
    } catch (err) {
      const failed: HubBoardCampaign = {
        ...locked,
        status: "failed",
        updatedAt: new Date().toISOString(),
        results: [
          {
            siteId: "",
            domain: "",
            ok: false,
            error: err instanceof Error ? err.message : "발행 실패",
          },
        ],
      };
      await upsertHubCampaign(failed);
      updated.push(failed);
    }
  }
  return { ran: due.length, campaigns: updated };
}
