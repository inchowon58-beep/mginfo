import { cleanHtml } from "./sanitize";
import type { PostImage } from "./types";

export const MAX_POST_IMAGES = 7;
export const DEFAULT_POST_IMAGES = 1;

export function extraImageLimit(enabled?: boolean) {
  return enabled ? MAX_POST_IMAGES - 1 : 0;
}

export function parsePostImages(raw: unknown, max = extraImageLimit(true)): PostImage[] {
  if (!Array.isArray(raw) || max <= 0) return [];
  const items: PostImage[] = [];
  for (const item of raw) {
    if (items.length >= max) break;
    if (typeof item === "string") {
      const url = item.trim();
      if (url) items.push({ url });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const url = String((item as { url?: string }).url || "").trim();
    if (!url) continue;
    const caption = String((item as { caption?: string }).caption || "").trim();
    items.push(caption ? { url, caption } : { url });
  }
  return items;
}

export function figureMarkup(image: PostImage, alt: string) {
  const caption = (image.caption || "").trim();
  const safeAlt = caption || alt;
  const captionHtml = caption ? `<figcaption>${escapeText(caption)}</figcaption>` : "";
  return `<figure class="article-photo"><img src="${escapeAttr(image.url)}" alt="${escapeAttr(safeAlt)}" />${captionHtml}</figure>`;
}

export function placeInlineImages(bodyHtml: string, images: PostImage[], alt: string) {
  const leftover = images.filter((item) => item.url);
  if (!leftover.length) return { html: bodyHtml, leftover: [] as PostImage[] };
  const parts = bodyHtml.split(/(?=<h[23][\s>])/i);
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^<h[23][\s>]/i.test(part) && leftover.length) {
      out.push(figureMarkup(leftover.shift()!, alt));
    }
    out.push(part);
  }
  return { html: cleanHtml(out.join("")), leftover };
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
