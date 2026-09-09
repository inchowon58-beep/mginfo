import fs from "fs";
import path from "path";
import { blobGetOpsJson, blobSetOpsJson, hasBlobStore } from "./blob-store";
import { hasRemoteStore, kvGetOpsJson, kvSetOpsJson } from "./kv";
import { PersistError } from "./db";
import { cleanHost, parseOpsSite, parseOpsSites, type OpsSite } from "./ops-ledger";

const LOCAL_PATH = path.join(process.cwd(), "data", "ops-ledger.json");

type OpsStore = { sites: OpsSite[] };

function normalize(raw: unknown): OpsStore {
  if (!raw || typeof raw !== "object") return { sites: [] };
  return { sites: parseOpsSites((raw as { sites?: unknown }).sites) };
}

function readFile(): OpsStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return { sites: [] };
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return { sites: [] };
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
    return { sites: [] };
  }
  if (hasRemoteStore()) {
    const remote = await kvGetOpsJson<OpsStore>();
    if (remote) return normalize(remote);
    return { sites: [] };
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
  const prev = (await loadOps()).sites;
  const byId = new Map(prev.map((row) => [row.id, row]));
  const byDomain = new Map(prev.map((row) => [row.domain, row]));
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
  await saveOps({ sites: out });
  return out;
}
