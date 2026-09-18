import fs from "fs";
import path from "path";
import { blobGetContentBlueprintsJson, blobSetContentBlueprintsJson, hasBlobStore } from "./blob-store";
import { seedContentBlueprintStore } from "./content-blueprint-seed";
import type {
  CatalogStatus,
  ContentAngle,
  ContentBlock,
  ContentBlueprint,
  ContentBlueprintStore,
  BlueprintOverride,
  Industry,
  PageType,
} from "./content-blueprint-types";
import { PersistError } from "./db";
import { hasRemoteStore, kvGetContentBlueprintsJson, kvSetContentBlueprintsJson } from "./kv";

const LOCAL_PATH = path.join(process.cwd(), "data", "content-blueprints.json");

const STATUSES = new Set<CatalogStatus>(["draft", "active", "disabled"]);

function asStatus(value: unknown, fallback: CatalogStatus = "draft"): CatalogStatus {
  const raw = String(value || "").trim().toLowerCase();
  return STATUSES.has(raw as CatalogStatus) ? (raw as CatalogStatus) : fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeIndustry(raw: unknown): Industry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const key = String(row.key || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !key || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    key,
    name,
    description: String(row.description || "").trim() || undefined,
    status: asStatus(row.status, "active"),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeBlock(raw: unknown): ContentBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const industryId = String(row.industryId || "").trim();
  const key = String(row.key || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !industryId || !key || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    industryId,
    key,
    name,
    description: String(row.description || "").trim(),
    allowedPageTypes: asStringList(row.allowedPageTypes),
    requiredData: asStringList(row.requiredData),
    verifiedDataRequired: Boolean(row.verifiedDataRequired),
    optional: row.optional === undefined ? true : Boolean(row.optional),
    status: asStatus(row.status, "active"),
    version: Math.max(1, Number(row.version) || 1),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizePageType(raw: unknown): PageType | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const industryId = String(row.industryId || "").trim();
  const key = String(row.key || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !industryId || !key || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    industryId,
    key,
    name,
    description: String(row.description || "").trim(),
    status: asStatus(row.status, "active"),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeAngle(raw: unknown): ContentAngle | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const industryId = String(row.industryId || "").trim();
  const key = String(row.key || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !industryId || !key || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    industryId,
    key,
    name,
    description: String(row.description || "").trim(),
    status: asStatus(row.status, "active"),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeBlueprint(raw: unknown): ContentBlueprint | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const industryId = String(row.industryId || "").trim();
  const key = String(row.key || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !industryId || !key || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    industryId,
    key,
    name,
    description: String(row.description || "").trim(),
    blockKeys: asStringList(row.blockKeys),
    pageTypeKeys: asStringList(row.pageTypeKeys),
    angleKeys: asStringList(row.angleKeys),
    status: asStatus(row.status, "active"),
    version: Math.max(1, Number(row.version) || 1),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeOverride(raw: unknown): BlueprintOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const baseBlueprintId = String(row.baseBlueprintId || "").trim();
  const scope = String(row.scope || "").trim() === "vendor" ? "vendor" : "site";
  if (!id || !baseBlueprintId) return null;
  const now = new Date().toISOString();
  return {
    id,
    scope,
    siteId: String(row.siteId || "").trim() || undefined,
    vendorId: String(row.vendorId || "").trim() || undefined,
    baseBlueprintId,
    blockKeysAdd: asStringList(row.blockKeysAdd),
    blockKeysRemove: asStringList(row.blockKeysRemove),
    pageTypeKeysAdd: asStringList(row.pageTypeKeysAdd),
    pageTypeKeysRemove: asStringList(row.pageTypeKeysRemove),
    angleKeysAdd: asStringList(row.angleKeysAdd),
    angleKeysRemove: asStringList(row.angleKeysRemove),
    name: String(row.name || "").trim() || undefined,
    description: String(row.description || "").trim() || undefined,
    status: asStatus(row.status, "draft"),
    version: Math.max(1, Number(row.version) || 1),
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

export function normalizeContentBlueprintStore(raw: unknown): ContentBlueprintStore {
  if (!raw || typeof raw !== "object") return seedContentBlueprintStore();
  const row = raw as Record<string, unknown>;
  const industries = Array.isArray(row.industries) ? row.industries.map(normalizeIndustry).filter(Boolean) : [];
  const blueprints = Array.isArray(row.blueprints) ? row.blueprints.map(normalizeBlueprint).filter(Boolean) : [];
  const blocks = Array.isArray(row.blocks) ? row.blocks.map(normalizeBlock).filter(Boolean) : [];
  const pageTypes = Array.isArray(row.pageTypes) ? row.pageTypes.map(normalizePageType).filter(Boolean) : [];
  const angles = Array.isArray(row.angles) ? row.angles.map(normalizeAngle).filter(Boolean) : [];
  const overrides = Array.isArray(row.overrides) ? row.overrides.map(normalizeOverride).filter(Boolean) : [];
  if (!industries.length || !blueprints.length) {
    const seeded = seedContentBlueprintStore();
    return {
      ...seeded,
      overrides: overrides as BlueprintOverride[],
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    industries: industries as Industry[],
    blueprints: blueprints as ContentBlueprint[],
    blocks: blocks as ContentBlock[],
    pageTypes: pageTypes as PageType[],
    angles: angles as ContentAngle[],
    overrides: overrides as BlueprintOverride[],
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

function readFile(): ContentBlueprintStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return seedContentBlueprintStore();
    return normalizeContentBlueprintStore(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return seedContentBlueprintStore();
  }
}

function writeFile(store: ContentBlueprintStore) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function loadStore(): Promise<ContentBlueprintStore> {
  if (hasBlobStore()) {
    const remote = await blobGetContentBlueprintsJson<ContentBlueprintStore>();
    if (remote) return normalizeContentBlueprintStore(remote);
    const seeded = seedContentBlueprintStore();
    try {
      await blobSetContentBlueprintsJson(seeded);
    } catch {
      /* first write may fail in build */
    }
    return seeded;
  }
  if (hasRemoteStore()) {
    const remote = await kvGetContentBlueprintsJson<ContentBlueprintStore>();
    if (remote) return normalizeContentBlueprintStore(remote);
    const seeded = seedContentBlueprintStore();
    try {
      await kvSetContentBlueprintsJson(seeded);
    } catch {
      /* ignore */
    }
    return seeded;
  }
  return readFile();
}

async function saveStore(store: ContentBlueprintStore) {
  const next = { ...store, updatedAt: new Date().toISOString() };
  try {
    if (hasBlobStore()) {
      await blobSetContentBlueprintsJson(next);
      return next;
    }
    if (hasRemoteStore()) {
      await kvSetContentBlueprintsJson(next);
      return next;
    }
    if (process.env.VERCEL) {
      throw new PersistError("콘텐츠 Blueprint는 허브 Blob에서만 저장할 수 있습니다.");
    }
    writeFile(next);
    return next;
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "Blueprint를 저장하지 못했습니다.");
  }
}

export async function getContentBlueprintStore(): Promise<ContentBlueprintStore> {
  return loadStore();
}

export async function setBlueprintStatus(blueprintId: string, status: CatalogStatus) {
  const store = await loadStore();
  const idx = store.blueprints.findIndex((row) => row.id === blueprintId);
  if (idx < 0) return { ok: false as const, error: "Blueprint를 찾을 수 없습니다." };
  const next = {
    ...store,
    blueprints: store.blueprints.map((row, i) =>
      i === idx
        ? {
            ...row,
            status,
            version: status === "active" && row.status !== "active" ? row.version : row.version,
            updatedAt: new Date().toISOString(),
          }
        : row
    ),
  };
  const saved = await saveStore(next);
  return { ok: true as const, store: saved, blueprint: saved.blueprints[idx] };
}

export async function setBlockStatus(blockId: string, status: CatalogStatus) {
  const store = await loadStore();
  const idx = store.blocks.findIndex((row) => row.id === blockId);
  if (idx < 0) return { ok: false as const, error: "블록을 찾을 수 없습니다." };
  const next = {
    ...store,
    blocks: store.blocks.map((row, i) =>
      i === idx ? { ...row, status, updatedAt: new Date().toISOString() } : row
    ),
  };
  const saved = await saveStore(next);
  return { ok: true as const, store: saved, block: saved.blocks[idx] };
}

export async function resetContentBlueprintsToSeed() {
  const seeded = seedContentBlueprintStore();
  const saved = await saveStore(seeded);
  return saved;
}

/** Resolve global blueprint + optional override without mutating store (PHASE 2+). */
export function resolveBlueprintPool(
  store: ContentBlueprintStore,
  blueprintId: string,
  opts?: { siteId?: string; vendorId?: string }
) {
  const base = store.blueprints.find((row) => row.id === blueprintId);
  if (!base) return null;
  const override =
    store.overrides.find(
      (row) =>
        row.status === "active" &&
        row.baseBlueprintId === blueprintId &&
        ((opts?.vendorId && row.scope === "vendor" && row.vendorId === opts.vendorId) ||
          (opts?.siteId && row.scope === "site" && row.siteId === opts.siteId))
    ) || null;

  const blockKeys = new Set(base.blockKeys);
  const pageTypeKeys = new Set(base.pageTypeKeys);
  const angleKeys = new Set(base.angleKeys);
  if (override) {
    for (const key of override.blockKeysRemove || []) blockKeys.delete(key);
    for (const key of override.blockKeysAdd || []) blockKeys.add(key);
    for (const key of override.pageTypeKeysRemove || []) pageTypeKeys.delete(key);
    for (const key of override.pageTypeKeysAdd || []) pageTypeKeys.add(key);
    for (const key of override.angleKeysRemove || []) angleKeys.delete(key);
    for (const key of override.angleKeysAdd || []) angleKeys.add(key);
  }

  const industry = store.industries.find((row) => row.id === base.industryId) || null;
  const blocks = store.blocks.filter(
    (row) => row.industryId === base.industryId && blockKeys.has(row.key) && row.status !== "disabled"
  );
  const pageTypes = store.pageTypes.filter(
    (row) => row.industryId === base.industryId && pageTypeKeys.has(row.key) && row.status !== "disabled"
  );
  const angles = store.angles.filter(
    (row) => row.industryId === base.industryId && angleKeys.has(row.key) && row.status !== "disabled"
  );

  return {
    industry,
    blueprint: base,
    override,
    blockKeys: [...blockKeys],
    pageTypeKeys: [...pageTypeKeys],
    angleKeys: [...angleKeys],
    blocks,
    pageTypes,
    angles,
  };
}
