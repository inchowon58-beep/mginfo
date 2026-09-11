import { seoulDateKey } from "./publish-limits";

export function normalizeTitle(title: string): string {
  return String(title || "")
    .toLowerCase()
    .replace(/[\u00A0\s]+/g, " ")
    .replace(/["'`·\-–—|/\\[\](){}.,!?;:~*#@“”‘’]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(title: string): string[] {
  return normalizeTitle(title).split(" ").filter((token) => token.length >= 2);
}

export function titlesTooSimilar(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= 8 && longer.includes(shorter) && shorter.length / longer.length >= 0.84) return true;

  const ta = new Set(titleTokens(a));
  const tb = new Set(titleTokens(b));
  if (!ta.size || !tb.size) return false;
  let inter = 0;
  for (const token of ta) {
    if (tb.has(token)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  const jaccard = union ? inter / union : 0;
  if (jaccard >= 0.72) return true;

  const aa = titleTokens(a);
  const bb = titleTokens(b);
  if (aa.length >= 3 && bb.length >= 3 && aa.slice(0, 3).join(" ") === bb.slice(0, 3).join(" ")) {
    return jaccard >= 0.7;
  }
  return false;
}

export function findSimilarTitle(candidate: string, existing: string[]): string | null {
  for (const title of existing) {
    if (title && titlesTooSimilar(candidate, title)) return title;
  }
  return null;
}

export function uniqueTextList(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = normalizeTitle(text) || text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function collectRecentTitles(
  posts: Array<{ title?: string; publishedAt?: string | null; createdAt?: string }>,
  extra: Array<string | undefined | null> = [],
  now = new Date()
): string[] {
  const today = seoulDateKey(now);
  const todayTitles = posts
    .filter((post) => seoulDateKey(post.publishedAt || post.createdAt) === today)
    .map((post) => post.title);
  const recent = posts.slice(0, 40).map((post) => post.title);
  return uniqueTextList([...todayTitles, ...recent, ...extra]);
}

export function collectTodayKeywords(
  items: Array<{ keyword?: string; status?: string; publishedAt?: string }>,
  now = new Date()
): string[] {
  const today = seoulDateKey(now);
  return uniqueTextList(
    items
      .filter((item) => item.status === "published" && seoulDateKey(item.publishedAt) === today)
      .map((item) => item.keyword)
  );
}

export function differentiateTitle(title: string, existing: string[], hint?: string): string {
  const extras = [hint, "현장 기준", "오늘 체크", "비교 포인트"].filter((item): item is string => Boolean(item));
  for (const extra of extras) {
    if (normalizeTitle(title).includes(normalizeTitle(extra))) continue;
    const next = `${title} ${extra}`.trim();
    if (next.length <= 60 && !findSimilarTitle(next, existing)) return next;
  }
  const stamp = String(Date.now()).slice(-4);
  return `${title} · ${stamp}`;
}

export async function withUniqueTitle<T extends { title: string }>(
  generate: (avoidTitles: string[]) => Promise<T>,
  avoidTitles: string[],
  hint?: string
): Promise<T> {
  const existing = uniqueTextList(avoidTitles);
  let article = await generate(existing);
  if (!findSimilarTitle(article.title, existing)) return article;
  const retryAvoid = uniqueTextList([...existing, article.title]);
  article = await generate(retryAvoid);
  if (!findSimilarTitle(article.title, existing)) return article;
  return { ...article, title: differentiateTitle(article.title, existing, hint) };
}
