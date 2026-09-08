export const DEFAULT_LIKE_MIN = 20;
export const DEFAULT_LIKE_MAX = 200;
export const DEFAULT_COMMENT_MIN = 5;
export const DEFAULT_COMMENT_MAX = 48;

export type EngagementRange = {
  likeMin: number;
  likeMax: number;
  commentMin: number;
  commentMax: number;
};

export function clampCount(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(999999, Math.round(n)));
}

export function orderedRange(min: number, max: number) {
  return min <= max ? { min, max } : { min: max, max: min };
}

export function engagementFromSettings(settings?: {
  likeCountMin?: number;
  likeCountMax?: number;
  commentCountMin?: number;
  commentCountMax?: number;
}): EngagementRange {
  const likes = orderedRange(
    clampCount(settings?.likeCountMin, DEFAULT_LIKE_MIN),
    clampCount(settings?.likeCountMax, DEFAULT_LIKE_MAX)
  );
  const comments = orderedRange(
    clampCount(settings?.commentCountMin, DEFAULT_COMMENT_MIN),
    clampCount(settings?.commentCountMax, DEFAULT_COMMENT_MAX)
  );
  return {
    likeMin: likes.min,
    likeMax: likes.max,
    commentMin: comments.min,
    commentMax: comments.max,
  };
}

export function isEngageVisible(min: number, max: number) {
  return Math.max(min, max) > 0;
}

export function countInRange(id: string, salt: number, min: number, max: number) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo + 1;
  if (span <= 1) return lo;
  let hash = salt >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  }
  return lo + (hash % span);
}
