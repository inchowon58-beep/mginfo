import fs from "fs";
import path from "path";
import { seedBanners } from "./banners";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { seedPartners, seedPosts } from "./seed";
import type { Banner, Partner, Post, Settings, Store } from "./types";

const LOCAL_PATH = path.join(process.cwd(), "data", "store.json");
const TMP_PATH = path.join("/tmp", "infocs-store.json");

function dataPath(): string {
  return process.env.VERCEL ? TMP_PATH : LOCAL_PATH;
}

function defaultSettings(): Settings {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    siteName: "인포씨에스 매거진",
    siteTagline: "모든 생활 정보를 한눈에",
  };
}

function defaultStore(): Store {
  return JSON.parse(
    JSON.stringify({
      posts: seedPosts,
      partners: seedPartners,
      banners: seedBanners,
      settings: defaultSettings(),
    })
  ) as Store;
}

function normalize(parsed: Store): Store {
  parsed.posts ||= [];
  parsed.partners ||= [];
  parsed.banners = parsed.banners?.length ? parsed.banners : seedBanners;
  parsed.settings = { ...defaultSettings(), ...parsed.settings };
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

function persist(store: Store) {
  memory = store;
  const file = dataPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Vercel 등 읽기 전용 환경에서는 메모리만 유지
  }
}

let memory: Store | null = null;

function ensureStore(): Store {
  if (memory) return memory;
  const loaded = readFileStore(dataPath()) || readFileStore(LOCAL_PATH) || defaultStore();
  persist(loaded);
  return loaded;
}

let queue: Promise<unknown> = Promise.resolve();

export function readStore(): Store {
  return ensureStore();
}

export async function updateStore(mutator: (store: Store) => void): Promise<Store> {
  const run = queue.then(() => {
    const store = ensureStore();
    mutator(store);
    persist(store);
    return store;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getPublishedPosts(): Post[] {
  return readStore()
    .posts.filter((p) => p.status === "published")
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
}

export function getPostBySlug(slug: string): Post | undefined {
  return readStore().posts.find((p) => p.slug === slug);
}

export function getPostById(id: string): Post | undefined {
  return readStore().posts.find((p) => p.id === id);
}

export function getPartners(): Partner[] {
  return readStore().partners;
}

export function getSettings(): Settings {
  return readStore().settings;
}

export function getBanners(): Banner[] {
  return readStore().banners || [];
}

export function getEnabledBanners(): Banner[] {
  return getBanners().filter((b) => b.enabled);
}
