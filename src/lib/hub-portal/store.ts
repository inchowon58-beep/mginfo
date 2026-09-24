import fs from "fs";
import path from "path";
import { blobGetHubPortalJson, blobSetHubPortalJson, hasBlobStore } from "../blob-store";
import { hasRemoteStore, kvGetHubPortalJson, kvSetHubPortalJson } from "../kv";
import type { HubPortalFeed } from "./types";

const LOCAL_PATH = path.join(process.cwd(), "data", "hub-portal-feed.json");

function emptyFeed(): HubPortalFeed {
  return {
    updatedAt: "",
    posts: [],
    categories: [],
    regions: [],
    sites: [],
  };
}

function normalizeFeed(raw: unknown): HubPortalFeed {
  if (!raw || typeof raw !== "object") return emptyFeed();
  const row = raw as Partial<HubPortalFeed>;
  return {
    updatedAt: String(row.updatedAt || ""),
    posts: Array.isArray(row.posts) ? row.posts : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    regions: Array.isArray(row.regions) ? row.regions : [],
    sites: Array.isArray(row.sites) ? row.sites : [],
  };
}

function readLocal(): HubPortalFeed {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return emptyFeed();
    return normalizeFeed(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return emptyFeed();
  }
}

function writeLocal(feed: HubPortalFeed) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(feed, null, 2), "utf8");
}

export async function loadHubPortalFeed(): Promise<HubPortalFeed> {
  if (hasBlobStore()) {
    const remote = await blobGetHubPortalJson<HubPortalFeed>();
    if (remote) return normalizeFeed(remote);
  }
  if (hasRemoteStore()) {
    const remote = await kvGetHubPortalJson<HubPortalFeed>();
    if (remote) return normalizeFeed(remote);
  }
  return readLocal();
}

export async function saveHubPortalFeed(feed: HubPortalFeed): Promise<void> {
  const next = normalizeFeed(feed);
  if (hasBlobStore()) {
    await blobSetHubPortalJson(next);
    return;
  }
  if (hasRemoteStore()) {
    await kvSetHubPortalJson(next);
    return;
  }
  writeLocal(next);
}
