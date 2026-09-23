import {
  defaultMainLandingConfig,
  emptyMainLandingVendor,
  resolveMainDesignId,
  type MainLandingConfig,
  type MainLandingImageSlots,
  type MainLandingVendor,
} from "./types";

function trimStr(value: unknown) {
  return String(value ?? "").trim();
}

function parseVendor(raw: unknown): MainLandingVendor {
  const base = emptyMainLandingVendor();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;
  return {
    name: trimStr(row.name),
    keyword: trimStr(row.keyword),
    phone: trimStr(row.phone),
    address: trimStr(row.address),
    businessNumber: trimStr(row.businessNumber ?? row.bizNo ?? row.business_no),
    kakao: trimStr(row.kakao),
    industry: trimStr(row.industry),
    region: trimStr(row.region),
    intro: trimStr(row.intro),
    website: trimStr(row.website),
    strengths: trimStr(row.strengths),
  };
}

const SLOT_IMAGE_RE = /\.(webp|jpe?g|png|gif|avif)(?:\?|#|$)/i;

function isSlotImageUrl(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (/\/$/.test(url)) return false;
  return SLOT_IMAGE_RE.test(url);
}

function parseSlots(raw: unknown): MainLandingImageSlots {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const out: MainLandingImageSlots = {};
  for (const key of ["hero", "about", "gallery1", "gallery2", "gallery3", "contact"] as const) {
    const url = trimStr(row[key]);
    if (url && isSlotImageUrl(url)) out[key] = url;
  }
  return out;
}

export function parseMainLandingConfig(raw: unknown): MainLandingConfig {
  const fallback = defaultMainLandingConfig();
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const designId = resolveMainDesignId(row.designId);
  return {
    enabled: row.enabled === true || row.enabled === "true" || row.enabled === 1 || row.enabled === "1",
    designId,
    vendor: parseVendor(row.vendor),
    imageFolderUrl: trimStr(row.imageFolderUrl),
    slots: parseSlots(row.slots),
    prompt: trimStr(row.prompt),
    variationSeed: trimStr(row.variationSeed),
  };
}

export function mainLandingEnabled(settings: { mainLanding?: MainLandingConfig | null } | null | undefined) {
  return Boolean(settings?.mainLanding?.enabled);
}
