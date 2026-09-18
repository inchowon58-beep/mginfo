import fs from "fs";
import path from "path";
import { blobGetJson, blobSetJson, hasBlobStore } from "./blob-store";
import { PersistError } from "./db";
import { uid } from "./slug";
import type { QaResult, QaStore } from "./qa-types";

const LOCAL_PATH = path.join(process.cwd(), "data", "content-qa.json");
const BLOB_PATH = "infocs-content-qa.json";

function empty(): QaStore {
  return { results: [], updatedAt: new Date().toISOString() };
}

function normalize(raw: unknown): QaStore {
  if (!raw || typeof raw !== "object") return empty();
  const row = raw as Record<string, unknown>;
  const results = Array.isArray(row.results) ? (row.results as QaResult[]) : [];
  return {
    results: results
      .filter((r) => r && r.id && r.keyword)
      .slice(0, 200)
      .map((r) => ({
        ...r,
        bodyLength:
          r.bodyLength ||
          String(r.bodyHtml || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim().length,
      })),
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

async function load(): Promise<QaStore> {
  if (hasBlobStore()) {
    const remote = await blobGetJson<QaStore>(BLOB_PATH);
    if (remote) return normalize(remote);
    return empty();
  }
  try {
    if (!fs.existsSync(LOCAL_PATH)) return empty();
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return empty();
  }
}

async function save(store: QaStore): Promise<QaStore> {
  const next = { ...store, updatedAt: new Date().toISOString() };
  try {
    if (hasBlobStore()) {
      await blobSetJson(next, BLOB_PATH);
      return next;
    }
    if (process.env.VERCEL) {
      throw new PersistError("QA 결과는 Blob에서만 저장할 수 있습니다.");
    }
    fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(next, null, 2), "utf8");
    return next;
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "QA 저장 실패");
  }
}

export async function getQaStore(): Promise<QaStore> {
  return load();
}

export async function appendQaResult(
  result: Omit<QaResult, "id" | "generatedAt" | "bodyLength"> & Partial<QaResult>
) {
  const store = await load();
  const row: QaResult = {
    ...result,
    id: result.id || uid(),
    generatedAt: result.generatedAt || new Date().toISOString(),
    bodyLength:
      result.bodyLength ||
      String(result.bodyHtml || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim().length,
  };
  const results = [row, ...store.results].slice(0, 200);
  const saved = await save({ results, updatedAt: new Date().toISOString() });
  return { store: saved, result: row };
}

export async function getQaResult(id: string): Promise<QaResult | null> {
  const store = await load();
  return store.results.find((r) => r.id === id) || null;
}
