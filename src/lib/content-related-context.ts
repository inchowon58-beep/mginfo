import type { Post } from "./types";
import type { RelatedPostSummary } from "./page-plan-types";
import { extractH2ListFromHtml } from "./content-validation";
import { extractPlaceName } from "./region-geo";

/** Compact related posts for Planner — no full bodies. Max ~8. */
export function collectRelatedPostSummaries(
  posts: Post[],
  keyword: string,
  industryId?: string,
  limit = 8
): RelatedPostSummary[] {
  const place = extractPlaceName(keyword) || "";
  const topicBits = keyword.replace(place, "").trim();
  const scored = posts
    .filter((p) => p.status === "published")
    .map((post) => {
      let score = 0;
      if (industryId && post.industryId === industryId) score += 5;
      if (place && (post.region === place || post.title.includes(place) || (post.focusKeyword || "").includes(place))) {
        score += 3;
      }
      if (topicBits && (post.focusKeyword || post.title).includes(topicBits.slice(0, 4))) score += 2;
      if (post.pageType) score += 1;
      return { post, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const rows = scored.length
    ? scored.map((s) => s.post)
    : posts.filter((p) => p.status === "published").slice(0, limit);

  return rows.map((post) => ({
    keyword: post.focusKeyword,
    title: post.title,
    pageType: post.pageType,
    contentAngle: post.contentAngle,
    h2List: extractH2ListFromHtml(post.bodyHtml || ""),
  }));
}

/** e.g. "beginner×3, temperament×1 (최근 관련 4편)" */
export function summarizeAngleDistribution(related: RelatedPostSummary[]): string {
  const counts = new Map<string, number>();
  for (const row of related) {
    const angle = String(row.contentAngle || "").trim();
    if (!angle) continue;
    counts.set(angle, (counts.get(angle) || 0) + 1);
  }
  if (!counts.size) return "(기록된 angle 없음 — Blueprint 허용 angle 중 검색의도 충족분 선택)";
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([angle, n]) => `${angle}×${n}`);
  return `${parts.join(", ")} (최근 관련 ${related.length}편)`;
}
