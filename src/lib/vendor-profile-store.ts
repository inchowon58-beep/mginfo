import fs from "fs";
import path from "path";
import { blobGetVendorProfilesJson, blobSetVendorProfilesJson, hasBlobStore } from "./blob-store";
import { PersistError } from "./db";
import { hasRemoteStore, kvGetVendorProfilesJson, kvSetVendorProfilesJson } from "./kv";
import { uid } from "./slug";
import type {
  Animal,
  AnimalStatus,
  MediaRef,
  ProjectExample,
  VendorProfile,
  VendorProfileStore,
  VerifiedFact,
} from "./vendor-profile-types";

const LOCAL_PATH = path.join(process.cwd(), "data", "vendor-profiles.json");

const ANIMAL_STATUSES = new Set<AnimalStatus>(["available", "reserved", "completed", "inactive"]);

function emptyStore(): VendorProfileStore {
  return { profiles: [], animals: [], projectExamples: [], updatedAt: new Date().toISOString() };
}

function asMedia(raw: unknown): MediaRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = String(row.url || "").trim();
      if (!url) return null;
      return { url, alt: String(row.alt || "").trim() || undefined };
    })
    .filter(Boolean) as MediaRef[];
}

function asFacts(raw: unknown): VerifiedFact[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const key = String(row.key || "").trim();
      const label = String(row.label || "").trim();
      if (!key || !label) return null;
      let value: VerifiedFact["value"] = "";
      if (Array.isArray(row.value)) value = row.value.map((v) => String(v));
      else if (typeof row.value === "boolean" || typeof row.value === "number") value = row.value;
      else value = String(row.value ?? "").trim();
      return {
        key,
        label,
        value,
        verified: row.verified !== false,
        verifiedAt: String(row.verifiedAt || "").trim() || undefined,
        updatedAt: String(row.updatedAt || now),
      } as VerifiedFact;
    })
    .filter(Boolean) as VerifiedFact[];
}

function normalizeProfile(raw: unknown): VendorProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const vendorId = String(row.vendorId || "").trim();
  if (!vendorId) return null;
  const now = new Date().toISOString();
  const industryData =
    row.industryData && typeof row.industryData === "object" && !Array.isArray(row.industryData)
      ? (row.industryData as Record<string, unknown>)
      : {};
  return {
    id: String(row.id || `vp-${vendorId}`).trim(),
    siteId: String(row.siteId || "").trim() || undefined,
    vendorId,
    industryId: String(row.industryId || "").trim() || undefined,
    companyName: String(row.companyName || "").trim() || undefined,
    phone: String(row.phone || "").trim() || undefined,
    website: String(row.website || "").trim() || undefined,
    address: String(row.address || "").trim() || undefined,
    serviceAreas: Array.isArray(row.serviceAreas)
      ? row.serviceAreas.map((s) => String(s || "").trim()).filter(Boolean)
      : [],
    businessHours: String(row.businessHours || "").trim() || undefined,
    description: String(row.description || "").trim() || undefined,
    verifiedFacts: asFacts(row.verifiedFacts),
    services: Array.isArray(row.services) ? row.services.map((s) => String(s || "").trim()).filter(Boolean) : [],
    credentials: asFacts(row.credentials),
    media: asMedia(row.media),
    industryData,
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeAnimal(raw: unknown): Animal | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const vendorId = String(row.vendorId || "").trim();
  const breed = String(row.breed || "").trim();
  if (!vendorId || !breed) return null;
  const now = new Date().toISOString();
  const statusRaw = String(row.status || "available").trim() as AnimalStatus;
  return {
    id: String(row.id || uid()).trim(),
    vendorId,
    species: String(row.species || "dog").trim() || "dog",
    breed,
    sex: String(row.sex || "").trim() || undefined,
    birthDate: String(row.birthDate || "").trim() || undefined,
    color: String(row.color || "").trim() || undefined,
    name: String(row.name || "").trim() || undefined,
    status: ANIMAL_STATUSES.has(statusRaw) ? statusRaw : "available",
    description: String(row.description || "").trim() || undefined,
    media: asMedia(row.media),
    verifiedAt: String(row.verifiedAt || "").trim() || undefined,
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

function normalizeProject(raw: unknown): ProjectExample | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const vendorId = String(row.vendorId || "").trim();
  const title = String(row.title || "").trim();
  if (!vendorId || !title) return null;
  const now = new Date().toISOString();
  return {
    id: String(row.id || uid()).trim(),
    vendorId,
    title,
    projectType: String(row.projectType || "").trim() || undefined,
    region: String(row.region || "").trim() || undefined,
    description: String(row.description || "").trim() || undefined,
    media: asMedia(row.media),
    completedAt: String(row.completedAt || "").trim() || undefined,
    verifiedAt: String(row.verifiedAt || "").trim() || undefined,
    createdAt: String(row.createdAt || now),
    updatedAt: String(row.updatedAt || now),
  };
}

export function normalizeVendorProfileStore(raw: unknown): VendorProfileStore {
  if (!raw || typeof raw !== "object") return emptyStore();
  const row = raw as Record<string, unknown>;
  return {
    profiles: Array.isArray(row.profiles)
      ? (row.profiles.map(normalizeProfile).filter(Boolean) as VendorProfile[])
      : [],
    animals: Array.isArray(row.animals) ? (row.animals.map(normalizeAnimal).filter(Boolean) as Animal[]) : [],
    projectExamples: Array.isArray(row.projectExamples)
      ? (row.projectExamples.map(normalizeProject).filter(Boolean) as ProjectExample[])
      : [],
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

function readFile(): VendorProfileStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return emptyStore();
    return normalizeVendorProfileStore(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")));
  } catch {
    return emptyStore();
  }
}

function writeFile(store: VendorProfileStore) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function loadStore(): Promise<VendorProfileStore> {
  if (hasBlobStore()) {
    const remote = await blobGetVendorProfilesJson<VendorProfileStore>();
    if (remote) return normalizeVendorProfileStore(remote);
    return emptyStore();
  }
  if (hasRemoteStore()) {
    const remote = await kvGetVendorProfilesJson<VendorProfileStore>();
    if (remote) return normalizeVendorProfileStore(remote);
    return emptyStore();
  }
  return readFile();
}

async function saveStore(store: VendorProfileStore) {
  const next = { ...store, updatedAt: new Date().toISOString() };
  try {
    if (hasBlobStore()) {
      await blobSetVendorProfilesJson(next);
      return next;
    }
    if (hasRemoteStore()) {
      await kvSetVendorProfilesJson(next);
      return next;
    }
    if (process.env.VERCEL) {
      throw new PersistError("업체 Verified 데이터는 Blob/KV에서만 저장할 수 있습니다.");
    }
    writeFile(next);
    return next;
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "VendorProfile 저장 실패");
  }
}

export async function getVendorProfileStore(): Promise<VendorProfileStore> {
  return loadStore();
}

export async function getProfileByVendorId(vendorId: string): Promise<VendorProfile | null> {
  const store = await loadStore();
  return store.profiles.find((p) => p.vendorId === vendorId) || null;
}

export async function upsertVendorProfile(input: Partial<VendorProfile> & { vendorId: string }) {
  const store = await loadStore();
  const now = new Date().toISOString();
  const idx = store.profiles.findIndex((p) => p.vendorId === input.vendorId);
  const base =
    idx >= 0
      ? store.profiles[idx]
      : {
          id: `vp-${input.vendorId}`,
          vendorId: input.vendorId,
          verifiedFacts: [],
          services: [],
          credentials: [],
          media: [],
          industryData: {},
          createdAt: now,
          updatedAt: now,
        };
  const nextProfile = normalizeProfile({
    ...base,
    ...input,
    updatedAt: now,
  });
  if (!nextProfile) throw new PersistError("VendorProfile이 올바르지 않습니다.");
  const profiles =
    idx >= 0
      ? store.profiles.map((p, i) => (i === idx ? nextProfile : p))
      : [...store.profiles, nextProfile];
  const saved = await saveStore({ ...store, profiles });
  return { store: saved, profile: nextProfile };
}

export async function upsertAnimal(input: Partial<Animal> & { vendorId: string; breed: string }) {
  const store = await loadStore();
  const now = new Date().toISOString();
  const normalized = normalizeAnimal({
    id: input.id || uid(),
    createdAt: now,
    ...input,
    updatedAt: now,
    verifiedAt: input.verifiedAt || now,
  });
  if (!normalized) throw new PersistError("Animal 데이터가 올바르지 않습니다.");
  const idx = store.animals.findIndex((a) => a.id === normalized.id);
  const animals =
    idx >= 0 ? store.animals.map((a, i) => (i === idx ? normalized : a)) : [...store.animals, normalized];
  const saved = await saveStore({ ...store, animals });
  return { store: saved, animal: normalized };
}

export async function deleteAnimal(animalId: string) {
  const store = await loadStore();
  const saved = await saveStore({
    ...store,
    animals: store.animals.filter((a) => a.id !== animalId),
  });
  return saved;
}

export async function upsertProjectExample(
  input: Partial<ProjectExample> & { vendorId: string; title: string }
) {
  const store = await loadStore();
  const now = new Date().toISOString();
  const normalized = normalizeProject({
    id: input.id || uid(),
    createdAt: now,
    ...input,
    updatedAt: now,
    verifiedAt: input.verifiedAt || now,
  });
  if (!normalized) throw new PersistError("ProjectExample이 올바르지 않습니다.");
  const idx = store.projectExamples.findIndex((p) => p.id === normalized.id);
  const projectExamples =
    idx >= 0
      ? store.projectExamples.map((p, i) => (i === idx ? normalized : p))
      : [...store.projectExamples, normalized];
  const saved = await saveStore({ ...store, projectExamples });
  return { store: saved, project: normalized };
}

export async function deleteProjectExample(projectId: string) {
  const store = await loadStore();
  const saved = await saveStore({
    ...store,
    projectExamples: store.projectExamples.filter((p) => p.id !== projectId),
  });
  return saved;
}

/** Replace full store (tests / seed). */
export async function replaceVendorProfileStore(next: VendorProfileStore) {
  return saveStore(normalizeVendorProfileStore(next));
}
