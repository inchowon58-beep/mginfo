import type { PostImage } from "./types";
import { MAX_POST_IMAGES } from "./post-images";

export const MAX_IMAGE_POOL = 80;

export function parseImageUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(text || "").split(/[\n\r,]+/)) {
    const url = part.trim();
    if (!url || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function mergeImageUrls(current: string[], incoming: string[], max = MAX_IMAGE_POOL): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...current, ...incoming]) {
    const next = String(url || "").trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= max) break;
  }
  return out;
}

export function expandNumberedFolder(input: {
  base: string;
  from: number;
  to: number;
  pad?: number;
  ext?: string;
}): string[] {
  const base = String(input.base || "").trim().replace(/\/+$/, "");
  if (!base) return [];
  const from = Math.max(0, Math.floor(Number(input.from) || 0));
  const to = Math.max(from, Math.floor(Number(input.to) || from));
  const pad = Math.min(4, Math.max(1, Math.floor(Number(input.pad) || 2)));
  const ext = String(input.ext || "webp").replace(/^\./, "").trim() || "webp";
  const span = Math.min(MAX_IMAGE_POOL, to - from + 1);
  const urls: string[] = [];
  for (let i = 0; i < span; i += 1) {
    const n = String(from + i).padStart(pad, "0");
    urls.push(`${base}/${n}.${ext}`);
  }
  return urls;
}

export function pickRandomPostImages(
  urls: string[],
  minCount = 1,
  maxCount = minCount
): { cover?: string; extras: PostImage[] } {
  const pool = mergeImageUrls([], urls);
  if (!pool.length) return { extras: [] };
  const high = Math.min(MAX_POST_IMAGES, Math.max(1, Math.floor(Number(maxCount) || 1)), pool.length);
  const low = Math.min(Math.max(1, Math.floor(Number(minCount) || 1)), high);
  const want = low + Math.floor(Math.random() * (high - low + 1));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, want);
  return {
    cover: picked[0],
    extras: picked.slice(1).map((url) => ({ url })),
  };
}
