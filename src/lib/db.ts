import fs from "fs";
import path from "path";
import { seedBanners } from "./banners";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { seedPartners, seedPosts } from "./seed";
import type { Banner, Partner, Post, Settings, Store } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "store.json");

function defaultSettings(): Settings {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    siteName: "인포씨에스 매거진",
    siteTagline: "모든 생활 정보를 한눈에",
  };
}

function defaultStore(): Store {
  return {
    posts: seedPosts,
    partners: seedPartners,
    banners: seedBanners,
    settings: defaultSettings(),
  };
}

function ensureStore(): Store {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    const initial = defaultStore();
    fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Store;
    parsed.posts ||= [];
    parsed.partners ||= [];
    parsed.settings = { ...defaultSettings(), ...parsed.settings };
    if (!parsed.banners?.length) {
      parsed.banners = seedBanners;
      fs.writeFileSync(DATA_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch {
    const fallback = defaultStore();
    fs.writeFileSync(DATA_PATH, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

let queue: Promise<unknown> = Promise.resolve();

export function readStore(): Store {
  return ensureStore();
}

export async function updateStore(mutator: (store: Store) => void): Promise<Store> {
  const run = queue.then(() => {
    const store = ensureStore();
    mutator(store);
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
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
