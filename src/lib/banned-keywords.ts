import { stripHtml } from "./format";

export const DEFAULT_BANNED_KEYWORDS = [
  "도박",
  "카지노",
  "토토",
  "스포츠토토",
  "사설토토",
  "바카라",
  "슬롯머신",
  "대출",
  "대부",
  "카드론",
  "현금서비스",
  "무직자대출",
  "코인",
  "암호화폐",
  "비트코인",
  "가상화폐",
  "성인",
  "야동",
  "포르노",
  "성매매",
  "조건만남",
  "출장안마",
  "오피",
  "유흥",
  "룸살롱",
];

function compact(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, "");
}

export function normalizeBannedKeywords(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[\n,]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of values) {
    const word = String(item || "").trim();
    if (word.length < 2) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export function effectiveBannedKeywords(list?: string[] | null) {
  if (list == null) return DEFAULT_BANNED_KEYWORDS;
  return normalizeBannedKeywords(list);
}

export function findBannedKeyword(text: string, list?: string[] | null): string | null {
  const hay = compact(text);
  if (!hay) return null;
  const words = [...effectiveBannedKeywords(list)].sort((a, b) => b.length - a.length);
  for (const word of words) {
    if (hay.includes(compact(word))) return word;
  }
  return null;
}

export function collectPublishText(input: {
  title?: string;
  excerpt?: string;
  bodyHtml?: string;
  focusKeyword?: string;
  tags?: string[];
  keywords?: string;
  topic?: string;
  region?: string;
  notes?: string;
}) {
  return [
    input.title,
    input.excerpt,
    stripHtml(String(input.bodyHtml || "")),
    input.focusKeyword,
    ...(input.tags || []),
    input.keywords,
    input.topic,
    input.region,
    input.notes,
  ]
    .filter(Boolean)
    .join("\n");
}

export function bannedContentError(list: string[] | null | undefined, ...texts: Array<string | undefined | null>) {
  const hit = findBannedKeyword(texts.filter(Boolean).join("\n"), list);
  if (!hit) return null;
  return `발행금지 키워드(${hit})가 있어 작성·발행할 수 없습니다. 허브 마스터설정의 금지 목록에서 빼거나 다른 키워드로 바꿔 주세요.`;
}

export function unpublishBannedPosts<T extends { status: string; title?: string; excerpt?: string; bodyHtml?: string; focusKeyword?: string; tags?: string[] }>(
  posts: T[],
  list?: string[] | null
) {
  let count = 0;
  for (const post of posts) {
    if (post.status !== "published") continue;
    const hit = findBannedKeyword(
      collectPublishText({
        title: post.title,
        excerpt: post.excerpt,
        bodyHtml: post.bodyHtml,
        focusKeyword: post.focusKeyword,
        tags: post.tags,
      }),
      list
    );
    if (!hit) continue;
    post.status = "draft" as T["status"];
    count += 1;
  }
  return count;
}
