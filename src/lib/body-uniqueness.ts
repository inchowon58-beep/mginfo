import { stripHtml } from "./format";

const FACT_BLOCK_RE =
  /<(section|div)[^>]*class="[^"]*(?:public-facts-block|region-fact-block)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi;

export function stripFactBlocks(html: string): string {
  return String(html || "").replace(FACT_BLOCK_RE, " ");
}

export function htmlToCompareText(html: string): string {
  return stripHtml(stripFactBlocks(html))
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordShingles(text: string, size = 3): Set<string> {
  const words = text.split(/\s+/).filter((word) => word.length >= 2);
  const out = new Set<string>();
  if (words.length < size) {
    if (words.length) out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i <= words.length - size; i += 1) {
    out.add(words.slice(i, i + size).join(" "));
  }
  return out;
}

export function charShingles(text: string, size = 8): Set<string> {
  const compact = text.replace(/\s+/g, "");
  const out = new Set<string>();
  if (compact.length < size) {
    if (compact) out.add(compact);
    return out;
  }
  for (let i = 0; i <= compact.length - size; i += 1) {
    out.add(compact.slice(i, i + size));
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const item of a) {
    if (b.has(item)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

export function bodiesTooSimilar(a: string, b: string): boolean {
  const ta = htmlToCompareText(a);
  const tb = htmlToCompareText(b);
  if (!ta || !tb) return false;
  if (ta === tb) return true;
  const shorter = ta.length <= tb.length ? ta : tb;
  const longer = ta.length <= tb.length ? tb : ta;
  if (shorter.length >= 80 && longer.includes(shorter) && shorter.length / longer.length >= 0.86) return true;

  const wordScore = jaccard(wordShingles(ta, 3), wordShingles(tb, 3));
  if (wordScore >= 0.42) return true;
  const charScore = jaccard(charShingles(ta, 8), charShingles(tb, 8));
  return charScore >= 0.38;
}

export function findSimilarBody(candidate: string, existing: string[]): string | null {
  for (const body of existing) {
    if (body && bodiesTooSimilar(candidate, body)) return body;
  }
  return null;
}

export function collectRecentBodies(
  posts: Array<{ bodyHtml?: string; excerpt?: string }>,
  extra: Array<string | undefined | null> = []
): string[] {
  const fromPosts = posts.slice(0, 40).map((post) => String(post.bodyHtml || post.excerpt || "").trim());
  return [...fromPosts, ...extra.map((item) => String(item || "").trim())].filter(Boolean);
}
