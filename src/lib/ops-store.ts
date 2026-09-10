import fs from "fs";
import path from "path";
import { blobGetOpsJson, blobSetOpsJson, hasBlobStore } from "./blob-store";
import { hasRemoteStore, kvGetOpsJson, kvSetOpsJson } from "./kv";
import { PersistError } from "./db";
import { cleanHost, parseOpsSite, parseOpsSites, type OpsSite } from "./ops-ledger";
import { DEFAULT_BANNED_KEYWORDS, normalizeBannedKeywords } from "./banned-keywords";
import { emptyStaffNotice, normalizeStaffNotice, type StaffNotice } from "./staff-notice";

const LOCAL_PATH = path.join(process.cwd(), "data", "ops-ledger.json");

type OpsStore = { sites: OpsSite[]; bannedKeywords: string[]; staffNotice: StaffNotice };

function normalize(raw: unknown): OpsStore {
  if (!raw || typeof raw !== "object") {
    return { sites: [], bannedKeywords: DEFAULT_BANNED_KEYWORDS, staffNotice: emptyStaffNotice() };
  }
  const row = raw as { sites?: unknown; bannedKeywords?: unknown; staffNotice?: unknown };
  return {
    sites: parseOpsSites(row.sites),
    bannedKeywords:
      row.bannedKeywords === undefined ? DEFAULT_BANNED_KEYWORDS : normalizeBannedKeywords(row.bannedKeywords),
    staffNotice: row.staffNotice === undefined ? emptyStaffNotice() : normalizeStaffNotice(row.staffNotice),
  };
}

function readFile(): OpsStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return normalize({});
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return normalize({});
  }
}

function writeFile(store: OpsStore) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function loadOps(): Promise<OpsStore> {
  if (hasBlobStore()) {
    const remote = await blobGetOpsJson<OpsStore>();
    if (remote) return normalize(remote);
    return normalize({});
  }
  if (hasRemoteStore()) {
    const remote = await kvGetOpsJson<OpsStore>();
    if (remote) return normalize(remote);
    return normalize({});
  }
  return readFile();
}

async function saveOps(store: OpsStore) {
  try {
    if (hasBlobStore()) {
      await blobSetOpsJson(store);
      return;
    }
    if (hasRemoteStore()) {
      await kvSetOpsJson(store);
      return;
    }
    if (process.env.VERCEL) {
      throw new PersistError("이 사이트 Blob에 대장을 저장할 수 없습니다. 허브 사이트에서 열어 주세요.");
    }
    writeFile(store);
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "대장을 저장하지 못했습니다.");
  }
}

export async function getOpsSites(): Promise<OpsSite[]> {
  return (await loadOps()).sites;
}

export async function setOpsSites(sites: OpsSite[]): Promise<OpsSite[]> {
  const prev = await loadOps();
  const byId = new Map(prev.sites.map((row) => [row.id, row]));
  const byDomain = new Map(prev.sites.map((row) => [row.domain, row]));
  const out: OpsSite[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(sites) ? sites : []) {
    const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const domain = cleanHost(String(raw.domain ?? ""));
    const id = String(raw.id ?? "").trim();
    const current = (id && byId.get(id)) || (domain && byDomain.get(domain)) || undefined;
    const site = parseOpsSite(item, current);
    if (!site || seen.has(site.domain)) continue;
    seen.add(site.domain);
    out.push(site);
  }
  await saveOps({ ...prev, sites: out });
  return out;
}

export async function getBannedKeywords(): Promise<string[]> {
  return (await loadOps()).bannedKeywords;
}

export async function setBannedKeywords(keywords: unknown): Promise<string[]> {
  const prev = await loadOps();
  const bannedKeywords = normalizeBannedKeywords(keywords);
  await saveOps({ ...prev, bannedKeywords });
  return bannedKeywords;
}

export async function getStaffNotice(): Promise<StaffNotice> {
  return (await loadOps()).staffNotice;
}

export async function setStaffNotice(raw: unknown): Promise<StaffNotice> {
  const prev = await loadOps();
  const staffNotice = normalizeStaffNotice(raw, true);
  await saveOps({ ...prev, staffNotice });
  return staffNotice;
}
