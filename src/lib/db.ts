import fs from "fs";
import path from "path";
import { seedBanners } from "./banners";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { blobGetJson, blobSetJson, hasBlobStore } from "./blob-store";
import { hasRemoteStore, kvGetJson, kvSetJson } from "./kv";
import { adVendorToPartner } from "./ad-vendors";
import { seedAdVendors, seedPartners, seedPosts } from "./seed";
import { siteAccountFrom, DEFAULT_SITE_PASSWORD, DEFAULT_SITE_USERNAME } from "./site-account";
import { DEFAULT_WRITING_TONE, isWritingToneId, pickRandomWritingTone } from "./writing-tone";
import { DEFAULT_SITE_THEME, getSiteTheme, isSiteThemeId, pickRandomSiteTheme } from "./site-theme";
import { defaultBulkPublish, normalizeBulkPublish } from "./bulk-publish";
import type { AdminPostRow, AdVendor, Banner, Category, Partner, Post, Settings, Store } from "./types";
import { DEFAULT_CATEGORIES, SITE, withFreeBoard } from "./categories";
import { decodeSlugParam } from "./slug";
import {
  DEFAULT_COMMENT_MAX,
  DEFAULT_COMMENT_MIN,
  DEFAULT_LIKE_MAX,
  DEFAULT_LIKE_MIN,
} from "./engagement";

const LOCAL_PATH = path.join(process.cwd(), "data", "store.json");

function defaultSettings(): Settings {
  const customName = String(process.env.SITE_NAME || "").trim();
  const branded = Boolean(customName);
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    siteName: customName || SITE.name,
    siteTagline: "모든 생활 정보를 한눈에",
    siteTheme: DEFAULT_SITE_THEME,
    carrotKeywords: "",
    popupEnabled: true,
    popupTitle: "지금 바로 시작해 보세요",
    popupBody: "필요한 이야기만 골라 읽고, 실생활에 바로 쓰는 가이드를 확인하세요.",
    popupCta: "글 보러가기",
    popupHref: "/posts",
    popupImage: "",
    likeCountMin: DEFAULT_LIKE_MIN,
    likeCountMax: DEFAULT_LIKE_MAX,
    commentCountMin: DEFAULT_COMMENT_MIN,
    commentCountMax: DEFAULT_COMMENT_MAX,
    usableUntil: "",
    dailyPostLimit: 0,
    naverRankWork: false,
    naverSiteVerification: "",
    extraImagesEnabled: true,
    staffNoticeEnabled: false,
    staffNoticeTitle: "",
    staffNoticeBody: "",
    staffNoticeUpdatedAt: "",
    writingTone: DEFAULT_WRITING_TONE,
    writingPersona: "",
    siteUsername: DEFAULT_SITE_USERNAME,
    sitePassword: DEFAULT_SITE_PASSWORD,
    company: branded ? "" : SITE.company,
    ceo: branded ? "" : SITE.ceo,
    bizNo: branded ? "" : SITE.bizNo,
    address: branded ? "" : SITE.address,
    phone: "",
    email: branded ? "" : SITE.email,
  };
}

function defaultStore(): Store {
  return JSON.parse(
    JSON.stringify({
      posts: seedPosts,
      partners: seedPartners,
      adVendors: seedAdVendors,
      banners: seedBanners,
      categories: DEFAULT_CATEGORIES,
      settings: {
        ...defaultSettings(),
        writingTone: pickRandomWritingTone(),
        siteTheme: pickRandomSiteTheme(),
      },
      bulkPublish: defaultBulkPublish(),
    })
  ) as Store;
}

function normalize(parsed: Store): Store {
  parsed.posts ||= [];
  parsed.partners ||= [];
  parsed.adVendors = Array.isArray(parsed.adVendors) ? parsed.adVendors : [];
  if (shouldSeedDefaultVendors(parsed)) {
    parsed.adVendors = JSON.parse(JSON.stringify(seedAdVendors)) as AdVendor[];
    parsed.partners = JSON.parse(JSON.stringify(seedPartners)) as Partner[];
  }
  parsed.banners = parsed.banners?.length ? parsed.banners : seedBanners;
  parsed.categories = withFreeBoard(
    parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  ).map((c) => ({ ...c, geminiNotes: c.geminiNotes || "" }));
  parsed.settings = { ...defaultSettings(), ...parsed.settings };
  const account = siteAccountFrom(parsed.settings);
  parsed.settings.siteUsername = account.username;
  parsed.settings.sitePassword = account.password;
  parsed.settings.writingTone = isWritingToneId(parsed.settings.writingTone)
    ? parsed.settings.writingTone
    : DEFAULT_WRITING_TONE;
  parsed.settings.writingPersona = String(parsed.settings.writingPersona || "");
  parsed.bulkPublish = normalizeBulkPublish(parsed.bulkPublish);
  return parsed;
}

function writeFileStore(store: Store) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

export class PersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistError";
  }
}

async function loadStore(): Promise<Store> {
  const building = process.env.NEXT_PHASE === "phase-production-build";
  if (hasBlobStore()) {
    const remote = await blobGetJson<Store>();
    if (remote) return persistSeededVendors(remote, building, (store) => blobSetJson(store));
    const initial = defaultStore();
    if (building) return initial;
    try {
      await blobSetJson(initial);
    } catch {
      return initial;
    }
    return initial;
  }
  if (hasRemoteStore()) {
    const remote = await kvGetJson<Store>();
    if (remote) return persistSeededVendors(remote, building, (store) => kvSetJson(store));
    const initial = defaultStore();
    await kvSetJson(initial);
    return initial;
  }
  if (!fs.existsSync(LOCAL_PATH)) return defaultStore();
  try {
    const raw = JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")) as Store;
    return persistSeededVendors(raw, false, async (store) => writeFileStore(store));
  } catch {
    return defaultStore();
  }
}

async function persistSeededVendors(
  raw: Store,
  building: boolean,
  persist: (store: Store) => Promise<void> | void
) {
  const hadVendors = Array.isArray(raw.adVendors) && raw.adVendors.length > 0;
  const next = normalize(raw);
  if (!building && !hadVendors && next.adVendors.length) {
    try {
      await persist(next);
    } catch {
      return next;
    }
  }
  return next;
}

async function saveStore(store: Store) {
  try {
    if (hasBlobStore()) {
      await blobSetJson(store);
      return;
    }
    if (hasRemoteStore()) {
      await kvSetJson(store);
      return;
    }
    if (process.env.VERCEL) {
      throw new PersistError(
        "Vercel Storage에서 Blob을 만든 뒤 mginfo에 연결하고 다시 배포하세요. Browse Stores 검색창에 Blob을 입력하면 나옵니다."
      );
    }
    writeFileStore(store);
  } catch (err) {
    if (err instanceof PersistError) throw err;
    throw new PersistError(err instanceof Error ? err.message : "글을 저장하지 못했습니다.");
  }
}

let queue: Promise<unknown> = Promise.resolve();

export function persistenceReady(): boolean {
  if (hasBlobStore() || hasRemoteStore()) return true;
  return !process.env.VERCEL;
}

export async function readStore(): Promise<Store> {
  return loadStore();
}

export async function updateStore(mutator: (store: Store) => void): Promise<Store> {
  const run = queue.then(async () => {
    const store = await loadStore();
    mutator(store);
    await saveStore(store);
    return store;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function getPublishedPosts(): Promise<Post[]> {
  const store = await readStore();
  return store.posts
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const store = await readStore();
  const wanted = decodeSlugParam(slug);
  return store.posts.find((p) => decodeSlugParam(p.slug) === wanted);
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const store = await readStore();
  return store.posts.find((p) => p.id === id);
}

export const ADMIN_POSTS_PAGE_SIZE = 25;

function toAdminPostRow(post: Post): AdminPostRow {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    category: post.category,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
  };
}

export async function listAdminPosts(opts: { page?: number; category?: string } = {}) {
  const store = await readStore();
  const pageSize = ADMIN_POSTS_PAGE_SIZE;
  const category = (opts.category || "").trim();
  const sorted = store.posts
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  const filtered = category ? sorted.filter((p) => p.category === category) : sorted;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(Math.max(1, opts.page || 1), totalPages);
  const start = (page - 1) * pageSize;
  const counts: Record<string, number> = {};
  for (const post of store.posts) {
    counts[post.category] = (counts[post.category] || 0) + 1;
  }
  return {
    posts: filtered.slice(start, start + pageSize).map(toAdminPostRow),
    total,
    page,
    pageSize,
    totalPages,
    categories: withFreeBoard(store.categories),
    counts,
    allCount: store.posts.length,
  };
}

function shufflePartners(list: Partner[]): Partner[] {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i];
    next[i] = next[j];
    next[j] = current;
  }
  return next;
}

export async function getPartners(): Promise<Partner[]> {
  const store = await readStore();
  const list = store.adVendors?.length ? store.adVendors.map(adVendorToPartner) : store.partners;
  return shufflePartners(list);
}

function shouldSeedDefaultVendors(store: Store) {
  if (store.adVendors.length) return false;
  if (!store.partners.length) return true;
  const recruiting = store.partners.filter((row) => row.name === "파트너 모집").length;
  const oldSeedIds = store.partners.every((row) => /^p[1-5]$/.test(row.id));
  return recruiting >= 2 || oldSeedIds;
}

export async function getSettings(): Promise<Settings> {
  return (await readStore()).settings;
}

export async function getCategories(): Promise<Category[]> {
  const store = await readStore();
  return withFreeBoard(store.categories);
}

export async function getBanners(): Promise<Banner[]> {
  return (await readStore()).banners || [];
}

export async function getAdVendors(): Promise<AdVendor[]> {
  return (await readStore()).adVendors || [];
}

export async function getEnabledBanners(): Promise<Banner[]> {
  const banners = await getBanners();
  return banners.filter((b) => b.enabled);
}

export async function resolveSiteTheme() {
  const settings = await getSettings();
  return getSiteTheme(isSiteThemeId(settings.siteTheme) ? settings.siteTheme : DEFAULT_SITE_THEME);
}
