import { seedNumber } from "./region-intro";

export const VENDOR_SLOT_NAMES = ["youtube-mid", "ad-mid", "youtube-end", "ad-end"] as const;
export type VendorSlotName = (typeof VENDOR_SLOT_NAMES)[number];

export function slotMarkup(name: VendorSlotName) {
  return `<div class="mw-slot" data-mw-slot="${name}"></div>`;
}

const SLOT_RE = /<div\s+class="mw-slot"\s+data-mw-slot="(youtube-mid|ad-mid|youtube-end|ad-end)"\s*><\/div>/gi;

function hasBatchim(word: string) {
  const ch = word.replace(/\s+/g, "").slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function eulReul(word: string) {
  return hasBatchim(word) ? "을" : "를";
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[Math.abs(seed + offset * 17) % items.length];
}

function insertAfterFraction(html: string, insert: string, fraction: number) {
  const chunks = html.split(/(?=<h[23][\s>])/i).filter(Boolean);
  if (chunks.length >= 3) {
    const idx = Math.min(chunks.length - 1, Math.max(1, Math.round(chunks.length * fraction)));
    chunks.splice(idx, 0, insert);
    return chunks.join("");
  }
  const parts = html.split(/(<\/p>)/i);
  const closes = parts
    .map((part, index) => (/<\/p>/i.test(part) ? index : -1))
    .filter((index) => index >= 0);
  if (closes.length >= 2) {
    const pickAt = closes[Math.min(closes.length - 1, Math.max(0, Math.floor(closes.length * fraction)))];
    parts.splice(pickAt + 1, 0, insert);
    return parts.join("");
  }
  return html ? `${html}${insert}` : insert;
}

export function ensureVendorSlots(html: string): string {
  const source = String(html || "");
  const have = new Set<string>();
  source.replace(SLOT_RE, (_all, name: string) => {
    have.add(name);
    return "";
  });
  const mid = [have.has("youtube-mid") ? "" : slotMarkup("youtube-mid"), have.has("ad-mid") ? "" : slotMarkup("ad-mid")].join(
    ""
  );
  const end = [have.has("youtube-end") ? "" : slotMarkup("youtube-end"), have.has("ad-end") ? "" : slotMarkup("ad-end")].join(
    ""
  );
  if (!mid && !end) return source;
  let next = source;
  if (mid) next = insertAfterFraction(next, mid, 0.42);
  if (end) next = `${next}${end}`;
  return next;
}

export function splitVendorSlots(html: string): Array<{ html?: string; slot?: VendorSlotName }> {
  const source = String(html || "");
  const out: Array<{ html?: string; slot?: VendorSlotName }> = [];
  const re = new RegExp(SLOT_RE.source, "gi");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) out.push({ html: source.slice(last, match.index) });
    out.push({ slot: match[1] as VendorSlotName });
    last = match.index + match[0].length;
  }
  if (last < source.length) out.push({ html: source.slice(last) });
  return out;
}

export function youtubeWatchCopy(keyword: string, seed: number, placement: "mid" | "end") {
  const kw = keyword.trim() || "이 주제";
  const mid = [
    `${kw}, 유튜브로도 한번 확인해 보세요.`,
    `${kw} 분위기는 영상으로 보면 더 잘 보입니다.`,
    `${kw}${eulReul(kw)} 영상으로도 한번 봐 두세요.`,
    `${kw}, 글로 본 뒤 영상으로 한번 더 확인하면 좋습니다.`,
  ];
  const end = [
    `${kw}, 아래 영상으로도 한번 확인해 보세요.`,
    `${kw} 마무리는 유튜브로 보면 감이 옵니다.`,
    `${kw}${eulReul(kw)} 영상으로 한 번 더 봐 두세요.`,
  ];
  return pick(placement === "end" ? end : mid, seed, placement === "end" ? 4 : 0);
}

export function articleSlotSeed(keyword: string, postId?: string, slug?: string) {
  return seedNumber(keyword, postId, slug);
}
