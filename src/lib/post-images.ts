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

function textLen(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

type BodyPart = {
  index: number;
  part: string;
  isHeading: boolean;
  start: number;
  textLen: number;
};

function splitHeadingParts(bodyHtml: string): BodyPart[] {
  const chunks = String(bodyHtml || "").split(/(?=<h[23][\s>])/i);
  const parts: BodyPart[] = [];
  let start = 0;
  chunks.forEach((part) => {
    if (!part) return;
    const len = textLen(part);
    parts.push({
      index: parts.length,
      part,
      isHeading: /^<h[23][\s>]/i.test(part),
      start,
      textLen: len,
    });
    start += Math.max(1, len);
  });
  return parts;
}

function shouldSkipFirstHeading(parts: BodyPart[], hasCover: boolean) {
  if (!hasCover) return false;
  const headings = parts.filter((row) => row.isHeading);
  if (!headings.length) return false;
  const last = parts[parts.length - 1];
  const total = Math.max(1, last.start + last.textLen);
  return headings[0].start / total < 0.18;
}

function pickHeadingSlots(parts: BodyPart[], imageCount: number, skipFirstHeading: boolean) {
  const headings = parts.filter((row) => row.isHeading);
  const usable = skipFirstHeading && headings.length ? headings.slice(1) : headings;
  if (imageCount <= 0 || !usable.length) return [];

  const last = parts[parts.length - 1];
  const total = Math.max(1, last.start + last.textLen);
  const chosen: BodyPart[] = [];
  const used = new Set<number>();
  const count = Math.min(imageCount, usable.length);

  for (let i = 0; i < count; i += 1) {
    const target = ((i + 1) / (count + 1)) * total;
    const ranked = usable
      .filter((row) => !used.has(row.index))
      .sort((a, b) => Math.abs(a.start - target) - Math.abs(b.start - target));
    let pick = ranked[0];
    if (!pick) break;
    const hasRoom = ranked.length > 1;
    if (hasRoom && chosen.some((row) => Math.abs(row.index - pick.index) === 1)) {
      const spaced = ranked.find((row) => chosen.every((item) => Math.abs(item.index - row.index) > 1));
      if (spaced) pick = spaced;
    }
    used.add(pick.index);
    chosen.push(pick);
  }

  return chosen.sort((a, b) => a.index - b.index);
}

export function placeInlineImages(
  bodyHtml: string,
  images: PostImage[],
  alt: string,
  opts?: { hasCover?: boolean }
) {
  const leftover = images.filter((item) => item.url);
  const parts = splitHeadingParts(bodyHtml);
  if (!leftover.length || !parts.length) {
    return { html: bodyHtml, leftover };
  }

  const slots = new Set(
    pickHeadingSlots(parts, leftover.length, shouldSkipFirstHeading(parts, Boolean(opts?.hasCover))).map(
      (row) => row.index
    )
  );
  const out: string[] = [];
  for (const row of parts) {
    if (slots.has(row.index) && leftover.length) {
      out.push(figureMarkup(leftover.shift()!, alt));
    }
    out.push(row.part);
  }
  return { html: cleanHtml(out.join("")), leftover };
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
