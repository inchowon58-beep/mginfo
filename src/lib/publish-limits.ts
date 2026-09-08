import type { Post, Settings } from "./types";

export function seoulDateKey(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function normalizeUsableUntil(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function normalizeDailyPostLimit(value: unknown, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

export function isPublishExpired(usableUntil?: string | null) {
  const until = normalizeUsableUntil(usableUntil);
  if (!until) return false;
  const today = seoulDateKey();
  return Boolean(today && today > until);
}

export function countPostsCreatedToday(posts: Post[]) {
  const today = seoulDateKey();
  if (!today) return 0;
  return posts.filter((post) => seoulDateKey(post.createdAt) === today).length;
}

export function remainingPublishDays(usableUntil?: string | null) {
  const until = normalizeUsableUntil(usableUntil);
  const today = seoulDateKey();
  if (!until || !today) return null;
  const start = Date.parse(`${today}T00:00:00+09:00`);
  const end = Date.parse(`${until}T00:00:00+09:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86400000);
}

export function checkCanCreatePost(settings: Settings, posts: Post[]): string | null {
  const limit = normalizeDailyPostLimit(settings.dailyPostLimit);
  if (limit <= 0) return null;
  const used = countPostsCreatedToday(posts);
  if (used >= limit) {
    return `오늘 작성 가능 수량(${limit}편)을 모두 사용했습니다.`;
  }
  return null;
}

export function checkCanPublish(settings: Settings, alreadyPublished = false): string | null {
  if (alreadyPublished) return null;
  const until = normalizeUsableUntil(settings.usableUntil);
  if (!until) return null;
  if (isPublishExpired(until)) {
    return `사용가능일(${until})이 지나 더 이상 글을 발행할 수 없습니다.`;
  }
  return null;
}

export function masterDashboard(settings: Settings, posts: Post[]) {
  const until = normalizeUsableUntil(settings.usableUntil);
  const limit = normalizeDailyPostLimit(settings.dailyPostLimit);
  const used = countPostsCreatedToday(posts);
  const left = remainingPublishDays(until);
  const expired = isPublishExpired(until);
  let usableLabel = "제한 없음";
  if (until && expired) usableLabel = `${until} · 만료`;
  else if (until && left != null) usableLabel = left === 0 ? `${until} · 오늘까지` : `${until} · ${left}일 남음`;
  else if (until) usableLabel = until;

  return {
    usableUntil: until,
    usableLabel,
    expired,
    dailyUsed: used,
    dailyLimit: limit,
    dailyLabel: limit > 0 ? `${used} / ${limit}편` : `${used}편 · 제한 없음`,
    naverRankWork: Boolean(settings.naverRankWork),
  };
}
