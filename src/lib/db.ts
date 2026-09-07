import fs from "fs";
import path from "path";
import { seedBanners } from "./banners";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { hasPersistentStore, hasRemoteStore, kvGetJson, kvSetJson } from "./kv";
import { seedPartners, seedPosts } from "./seed";
import type { Banner, Partner, Post, Settings, Store } from "./types";

const LOCAL_PATH = path.join(process.cwd(), "data", "store.json");

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
    if (hasRemoteStore()) {
      await kvSetJson(store);
      return;
    }
    if (process.env.VERCEL) {
      throw new PersistError(
        "Vercel에서는 Redis(KV)를 연결해야 글이 저장됩니다. 프로젝트 → Storage에서 Upstash Redis를 만들고 이 프로젝트에 연결한 뒤 다시 배포하세요."
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
  return hasPersistentStore();
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
  return store.posts.find((p) => p.slug === slug);
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const store = await readStore();
  return store.posts.find((p) => p.id === id);
}

export async function getPartners(): Promise<Partner[]> {
  return (await readStore()).partners;
}

export async function getSettings(): Promise<Settings> {
  return (await readStore()).settings;
}

export async function getBanners(): Promise<Banner[]> {
  return (await readStore()).banners || [];
}

export async function getEnabledBanners(): Promise<Banner[]> {
  const banners = await getBanners();
  return banners.filter((b) => b.enabled);
}
