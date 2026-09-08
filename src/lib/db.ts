import fs from "fs";
import path from "path";
import { seedBanners } from "./banners";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { blobGetJson, blobSetJson, hasBlobStore } from "./blob-store";
import { hasRemoteStore, kvGetJson, kvSetJson } from "./kv";
import { seedPartners, seedPosts } from "./seed";
import { DEFAULT_SITE_THEME, getSiteTheme, isSiteThemeId } from "./site-theme";
import { defaultBulkPublish, normalizeBulkPublish } from "./bulk-publish";
import type { AdminPostRow, Banner, Category, Partner, Post, Settings, Store } from "./types";
import { DEFAULT_CATEGORIES, SITE } from "./categories";
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
    extraImagesEnabled: false,
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
      banners: seedBanners,
      categories: DEFAULT_CATEGORIES,
      settings: defaultSettings(),
      bulkPublish: defaultBulkPublish(),
    })
  ) as Store;
}

function normalize(parsed: Store): Store {
  parsed.posts ||= [];
  parsed.partners ||= [];
  parsed.banners = parsed.banners?.length ? parsed.banners : seedBanners;
  parsed.categories = parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  parsed.categories = parsed.categories.map((c) => ({ ...c, geminiNotes: c.geminiNotes || "" }));
  parsed.settings = { ...defaultSettings(), ...parsed.settings };
  parsed.bulkPublish = normalizeBulkPublish(parsed.bulkPublish);
  return parsed;
}

function readFileStore(file: string): Store | null {
  try {
    if (!fs.existsSync(file)) return null;
    return normalize(JSON.parse(fs.readFileSync(file, "utf8")) as Store);
  } catch {
    return null;
  }
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
  if (hasBlobStore()) {
    const remote = await blobGetJson<Store>();
    if (remote) return normalize(remote);
    const initial = defaultStore();
    await blobSetJson(initial);
    return initial;
  }
  if (hasRemoteStore()) {
    const remote = await kvGetJson<Store>();
    if (remote) return normalize(remote);
    const initial = defaultStore();
    await kvSetJson(initial);
    return initial;
  }
  return readFileStore(LOCAL_PATH) || defaultStore();
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
    categories: store.categories?.length ? store.categories : DEFAULT_CATEGORIES,
    counts,
    allCount: store.posts.length,
  };
}

export async function getPartners(): Promise<Partner[]> {
  return (await readStore()).partners;
}

export async function getSettings(): Promise<Settings> {
  return (await readStore()).settings;
}

export async function getCategories(): Promise<Category[]> {
  const store = await readStore();
  return store.categories?.length ? store.categories : DEFAULT_CATEGORIES;
}

export async function getBanners(): Promise<Banner[]> {
  return (await readStore()).banners || [];
}

export async function getEnabledBanners(): Promise<Banner[]> {
  const banners = await getBanners();
  return banners.filter((b) => b.enabled);
}

export async function resolveSiteTheme() {
  const settings = await getSettings();
  return getSiteTheme(isSiteThemeId(settings.siteTheme) ? settings.siteTheme : DEFAULT_SITE_THEME);
}
