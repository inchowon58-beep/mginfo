import { siteAccountFrom, validateSiteAccount } from "./auth";
import { normalizeBannedKeywords } from "./banned-keywords";
import { parseNaverVerification } from "./seo";
import { normalizeDailyPostLimit, normalizeUsableUntil } from "./publish-limits";
import type { Settings, Store } from "./types";

export type MasterSettingsPatch = {
  usableUntil?: unknown;
  dailyPostLimit?: unknown;
  naverRankWork?: unknown;
  extraImagesEnabled?: unknown;
  naverSiteVerification?: unknown;
  siteUsername?: unknown;
  sitePassword?: unknown;
  geminiApiKey?: unknown;
  geminiModel?: unknown;
  publishBannedKeywords?: unknown;
};

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function applyMasterSettingsPatch(store: Store, body: MasterSettingsPatch) {
  if (typeof body.geminiApiKey === "string" && body.geminiApiKey && !body.geminiApiKey.includes("•")) {
    store.settings.geminiApiKey = body.geminiApiKey.trim();
  }
  if (typeof body.geminiModel === "string" && body.geminiModel.trim()) {
    store.settings.geminiModel = body.geminiModel.trim();
  }
  if (body.usableUntil !== undefined) {
    store.settings.usableUntil = normalizeUsableUntil(body.usableUntil);
  }
  if (body.dailyPostLimit !== undefined) {
    store.settings.dailyPostLimit = normalizeDailyPostLimit(body.dailyPostLimit, store.settings.dailyPostLimit);
  }
  if (body.naverRankWork !== undefined) {
    store.settings.naverRankWork = asBool(body.naverRankWork, store.settings.naverRankWork);
  }
  if (body.extraImagesEnabled !== undefined) {
    store.settings.extraImagesEnabled = asBool(body.extraImagesEnabled, store.settings.extraImagesEnabled);
  }
  if (typeof body.naverSiteVerification === "string") {
    store.settings.naverSiteVerification = parseNaverVerification(body.naverSiteVerification);
  }
  if (typeof body.siteUsername === "string" || typeof body.sitePassword === "string") {
    const current = siteAccountFrom(store.settings);
    const nextUser = typeof body.siteUsername === "string" ? body.siteUsername.trim() : current.username;
    const nextPass = typeof body.sitePassword === "string" ? String(body.sitePassword) : current.password;
    const invalid = validateSiteAccount(nextUser, nextPass);
    if (invalid) throw new Error(invalid);
    store.settings.siteUsername = nextUser;
    store.settings.sitePassword = nextPass;
  }
  if (body.publishBannedKeywords !== undefined) {
    store.settings.publishBannedKeywords = normalizeBannedKeywords(body.publishBannedKeywords);
  }
}

export function publicMasterSettings(settings: Settings) {
  const key = settings.geminiApiKey || "";
  return {
    writingTone: settings.writingTone || "",
    writingPersona: settings.writingPersona || "",
    siteTheme: settings.siteTheme || "",
    siteName: settings.siteName || "",
    siteTagline: settings.siteTagline || "",
    usableUntil: settings.usableUntil || "",
    dailyPostLimit: settings.dailyPostLimit || 0,
    naverRankWork: Boolean(settings.naverRankWork),
    extraImagesEnabled: Boolean(settings.extraImagesEnabled),
    naverSiteVerification: settings.naverSiteVerification || "",
    siteUsername: settings.siteUsername || "",
    sitePassword: settings.sitePassword || "",
    geminiModel: settings.geminiModel || "",
    geminiApiKey: key ? `${key.slice(0, 6)}••••${key.slice(-4)}` : "",
    hasKey: Boolean(key),
    publishBannedKeywords: Array.isArray(settings.publishBannedKeywords) ? settings.publishBannedKeywords : undefined,
  };
}
