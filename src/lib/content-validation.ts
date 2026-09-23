import type { PagePlan, WriterResult } from "./page-plan-types";
import { findSimilarTitle, titlesTooSimilar, normalizeTitle } from "./title-uniqueness";
import { findSimilarBody } from "./body-uniqueness";
import { QUALITY_CODES, type QualityCheck } from "./quality-codes";
import {
  extractPlacesFromKeyword,
  regionNormalizedBodySimilarity,
  regionNormalizedSimilarity,
} from "./region-normalize";
import { extractPlaceName } from "./region-geo";

export type ValidationIssue = {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  /** true if any FAIL (error) */
  hasFail: boolean;
  hasWarn: boolean;
  issues: ValidationIssue[];
  checks: QualityCheck[];
  fixed: WriterResult;
  bodyHtml: string;
};

function extractH2(html: string): string[] {
  const out: string[] = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  return out.filter(Boolean);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function h2ListsTooSimilar(a: string[], b: string[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  const na = a.map((h) => h.toLowerCase());
  const nb = b.map((h) => h.toLowerCase());
  let same = 0;
  for (const h of na) {
    if (nb.some((x) => titlesTooSimilar(h, x) || x === h)) same += 1;
  }
  return same / Math.max(na.length, nb.length) >= 0.75;
}

/** Vendor/career/price claims when Verified NAP facts are absent.
 * PHASE 6 candidate (BreedFacts / Reference Data Layer): breed numeric & health
 * memory claims (성견 체중·체고·관리 빈도·운동량·수명·질환 등). Do not promote
 * Gemini-invented numbers to Verified Facts. Blunt regex = high false positives. */
const CLAIM_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /(?:경력|운영)\s*\d+\s*년/, label: "경력 연수" },
  { re: /\d{1,3}(?:,\d{3})+\s*원|\d+\s*만원/, label: "가격" },
  { re: /고객\s*(?:후기|리뷰)|만족도\s*\d+/, label: "후기/통계" },
  { re: /(?:인증|자격증|수상|특허)/, label: "인증/수상" },
];

function countOccurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  const h = hay.toLowerCase();
  const s = needle.toLowerCase();
  while ((i = h.indexOf(s, i)) >= 0) {
    n += 1;
    i += s.length;
  }
  return n;
}

function detectRepeatedSentences(text: string): string | null {
  const sentences = text
    .split(/[.。!?？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);
  const seen = new Map<string, number>();
  for (const s of sentences) {
    const key = normalizeTitle(s);
    if (!key) continue;
    seen.set(key, (seen.get(key) || 0) + 1);
    if ((seen.get(key) || 0) >= 2) return s.slice(0, 60);
  }
  return null;
}

function detectRepeatedParagraphs(html: string): string | null {
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    normalizeTitle(m[1].replace(/<[^>]+>/g, ""))
  );
  const seen = new Set<string>();
  for (const p of paras) {
    if (p.length < 40) continue;
    if (seen.has(p)) return p.slice(0, 60);
    seen.add(p);
  }
  return null;
}

function htmlLooksBroken(html: string): boolean {
  const open = (html.match(/<(p|h2|h3|ul|ol|li|div)\b/gi) || []).length;
  const close = (html.match(/<\/(p|h2|h3|ul|ol|li|div)>/gi) || []).length;
  return open > 0 && Math.abs(open - close) > 3;
}

function toChecks(issues: ValidationIssue[]): QualityCheck[] {
  return issues.map((i) => {
    if (i.severity === "error") return { code: i.code, severity: "FAIL" as const, message: i.message };
    if (i.severity === "warn") return { code: i.code, severity: "WARN" as const, message: i.message };
    return { code: i.code, severity: "PASS" as const, message: i.message };
  });
}

export function validateWriterOutput(input: {
  plan: PagePlan;
  writer: WriterResult;
  bodyHtml: string;
  existingTitles: string[];
  existingBodies: string[];
  existingH2Lists: string[][];
  bannedKeywords?: string[];
  hasVerifiedVendorFacts: boolean;
  focusKeyword?: string;
  /** Full posts for region-swap WARN (title+body). */
  relatedPosts?: Array<{ title?: string; bodyHtml?: string; focusKeyword?: string }>;
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fixed: WriterResult = {
    ...input.writer,
    sections: input.writer.sections.map((s) => ({ ...s })),
    faqItems: input.writer.faqItems ? [...input.writer.faqItems] : undefined,
  };
  let bodyHtml = input.bodyHtml;
  const keyword = (input.focusKeyword || input.plan.keyword || "").trim();
  const places = extractPlacesFromKeyword(keyword);

  if (!fixed.title.trim()) {
    issues.push({ code: QUALITY_CODES.TITLE_MISSING, severity: "error", message: "제목 없음" });
  } else {
    if (fixed.title.length > 60) {
      issues.push({
        code: QUALITY_CODES.TITLE_TOO_LONG,
        severity: "warn",
        message: `제목 길음 (${fixed.title.length}자)`,
      });
    }
    if (keyword) {
      const topic = keyword.replace(extractPlaceName(keyword) || "", "").trim();
      const titleNorm = normalizeTitle(fixed.title);
      const hit =
        titleNorm.includes(normalizeTitle(keyword)) ||
        (topic.length >= 2 && titleNorm.includes(normalizeTitle(topic)));
      if (!hit) {
        issues.push({
          code: QUALITY_CODES.TITLE_KEYWORD_WEAK,
          severity: "warn",
          message: "제목에 키워드/주제 연관이 약함",
        });
      }
    }
  }

  const similarTitle = findSimilarTitle(fixed.title, input.existingTitles);
  if (similarTitle) {
    issues.push({
      code: QUALITY_CODES.TITLE_DUPLICATE,
      severity: "error",
      message: `제목 유사: ${similarTitle}`,
    });
  }

  // H1: public theme uses post title as H1 (no separate <h1> in bodyHtml)
  if (!fixed.title.trim()) {
    issues.push({
      code: QUALITY_CODES.H1_MISSING,
      severity: "error",
      message: "H1(제목) 없음",
    });
  } else {
    issues.push({
      code: QUALITY_CODES.H1_PRESENT,
      severity: "info",
      message: "H1=title (테마)",
    });
  }

  const h2s = extractH2(bodyHtml);
  if (!h2s.length) {
    issues.push({ code: QUALITY_CODES.H2_MISSING, severity: "error", message: "H2 없음" });
  }
  const h2Norm = new Set<string>();
  for (const h of h2s) {
    const key = h.toLowerCase();
    if (h2Norm.has(key)) {
      issues.push({ code: QUALITY_CODES.H2_DUPLICATE, severity: "error", message: `H2 중복: ${h}` });
    }
    h2Norm.add(key);
  }

  if (fixed.sections.length !== input.plan.sections.length) {
    issues.push({
      code: QUALITY_CODES.SECTION_COUNT,
      severity: "error",
      message: "AI section 개수가 PagePlan(AI분)과 다름",
    });
  }
  for (let i = 0; i < input.plan.sections.length; i++) {
    const expected = input.plan.sections[i];
    const actual = fixed.sections[i];
    if (!actual || actual.blockKey !== expected.blockKey) {
      issues.push({
        code: QUALITY_CODES.SECTION_ORDER,
        severity: "error",
        message: `section 순서 위반 @${i}`,
      });
      break;
    }
    const secLen = stripTags(actual.html || "").length;
    // FAQ body is often a short intro; real Q&A lives in faqItems — don't apply AI section min length.
    if (expected.blockKey === "faq") continue;
    if (secLen > 0 && secLen < 60) {
      issues.push({
        code: QUALITY_CODES.SECTION_TOO_SHORT,
        severity: "warn",
        message: `section 짧음: ${actual.blockKey} (${secLen}자)`,
      });
    }
  }

  const banned = (input.bannedKeywords || []).map((k) => k.trim()).filter(Boolean);
  const hay = `${fixed.title}\n${stripTags(bodyHtml)}`;
  for (const word of banned) {
    if (word && hay.includes(word)) {
      issues.push({
        code: QUALITY_CODES.BANNED_KEYWORD,
        severity: "error",
        message: `금지 키워드: ${word}`,
      });
    }
  }

  if (!input.hasVerifiedVendorFacts) {
    for (const pat of CLAIM_PATTERNS) {
      if (pat.re.test(hay)) {
        issues.push({
          code: QUALITY_CODES.UNVERIFIED_CLAIM,
          severity: "warn",
          message: `검증 없이 단정 가능 표현: ${pat.label}`,
        });
      }
    }
  }

  if (input.plan.faqQuestions?.length && (!fixed.faqItems || fixed.faqItems.length < 2)) {
    issues.push({ code: QUALITY_CODES.FAQ_THIN, severity: "warn", message: "FAQ가 너무 적음" });
  }
  if (fixed.faqItems) {
    const qSeen = new Set<string>();
    for (const item of fixed.faqItems) {
      if (!item.question || !item.answer) {
        issues.push({ code: QUALITY_CODES.FAQ_SCHEMA, severity: "error", message: "FAQ 누락" });
      }
      const qk = normalizeTitle(item.question);
      if (qk && qSeen.has(qk)) {
        issues.push({ code: QUALITY_CODES.FAQ_DUPLICATE, severity: "warn", message: "FAQ 질문 중복" });
      }
      qSeen.add(qk);
    }
  }

  for (const list of input.existingH2Lists.slice(0, 20)) {
    if (h2ListsTooSimilar(h2s, list)) {
      issues.push({
        code: QUALITY_CODES.H2_STRUCTURE_SIMILAR,
        severity: "error",
        message: "기존 글과 H2 구조가 지나치게 유사",
      });
      break;
    }
  }

  if (findSimilarBody(bodyHtml, input.existingBodies)) {
    issues.push({
      code: QUALITY_CODES.BODY_SIMILAR,
      severity: "error",
      message: "본문이 최근 글과 너무 비슷함",
    });
  }

  // Region-swap WARN (soft) — not FAIL
  for (const post of (input.relatedPosts || []).slice(0, 15)) {
    const otherKw = post.focusKeyword || "";
    const otherPlaces = extractPlacesFromKeyword(otherKw);
    const allPlaces = [...places, ...otherPlaces];
    const titleSim = regionNormalizedSimilarity(fixed.title, post.title || "", allPlaces);
    const bodySim = regionNormalizedBodySimilarity(bodyHtml, post.bodyHtml || "", allPlaces);
    if (titleSim >= 0.85 && bodySim >= 0.55) {
      issues.push({
        code: QUALITY_CODES.REGION_SWAP_SIMILARITY,
        severity: "warn",
        message: `지역명 normalize 후 유사 (title=${titleSim.toFixed(2)} body=${bodySim.toFixed(2)}): ${post.title}`,
      });
      break;
    }
  }

  // Visible text of final Hybrid HTML (AI + Verified). Tags stripped.
  const textLen = stripTags(bodyHtml).length;
  if (textLen < 800) {
    issues.push({
      code: QUALITY_CODES.BODY_TOO_SHORT,
      severity: "error",
      message: `본문 너무 짧음 (${textLen}자, Hybrid visible)`,
    });
  } else if (textLen < 1200) {
    issues.push({
      code: QUALITY_CODES.BODY_TOO_SHORT,
      severity: "warn",
      message: `본문 다소 짧음 (${textLen}자, Hybrid visible)`,
    });
  }

  if (keyword) {
    const kwCount = countOccurrences(hay, keyword);
    if (kwCount > 18) {
      issues.push({
        code: QUALITY_CODES.KEYWORD_OVERUSE,
        severity: "error",
        message: `focusKeyword 과다 반복 (${kwCount}회) — 문장을 줄이거나 대명사로 바꿔 주세요.`,
      });
    } else if (kwCount > 10) {
      issues.push({
        code: QUALITY_CODES.KEYWORD_OVERUSE,
        severity: "warn",
        message: `focusKeyword 과다 반복 (${kwCount}회)`,
      });
    }
  }
  for (const place of places) {
    if (place && countOccurrences(hay, place) > 14) {
      issues.push({
        code: QUALITY_CODES.REGION_NAME_OVERUSE,
        severity: "error",
        message: `지역명 과다 반복: ${place}`,
      });
    } else if (place && countOccurrences(hay, place) > 8) {
      issues.push({
        code: QUALITY_CODES.REGION_NAME_OVERUSE,
        severity: "warn",
        message: `지역명 과다 반복: ${place}`,
      });
    }
  }

  const repSent = detectRepeatedSentences(hay);
  if (repSent) {
    issues.push({
      code: QUALITY_CODES.SENTENCE_REPEAT,
      severity: "warn",
      message: `동일 문장 반복: ${repSent}`,
    });
  }
  const repPara = detectRepeatedParagraphs(bodyHtml);
  if (repPara) {
    issues.push({
      code: QUALITY_CODES.PARAGRAPH_REPEAT,
      severity: "warn",
      message: `동일 문단 반복: ${repPara}`,
    });
  }

  if (htmlLooksBroken(bodyHtml)) {
    issues.push({
      code: QUALITY_CODES.HTML_INVALID,
      severity: "warn",
      message: "HTML 태그 균형 이상",
    });
  }
  // Heading hierarchy: H2→H3→H2 is valid. Only flag skipped levels (e.g. H2→H4).
  const headingLevels: number[] = [];
  const headingRe = /<h([1-6])\b/gi;
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(bodyHtml))) {
    headingLevels.push(Number(hm[1]));
  }
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1];
    const cur = headingLevels[i];
    if (cur > prev + 1) {
      issues.push({
        code: QUALITY_CODES.HEADING_HIERARCHY,
        severity: "warn",
        message: `heading level skip (h${prev}→h${cur})`,
      });
      break;
    }
  }

  if (!bodyHtml.includes("<p>") && fixed.intro) {
    bodyHtml = `<p>${fixed.intro}</p>\n${bodyHtml}`;
    issues.push({ code: "intro_wrapped", severity: "info", message: "intro를 p로 감쌈" });
  }

  const hasFail = issues.some((i) => i.severity === "error");
  const hasWarn = issues.some((i) => i.severity === "warn");
  return {
    ok: !hasFail,
    hasFail,
    hasWarn,
    issues,
    checks: toChecks(issues),
    fixed,
    bodyHtml,
  };
}

export function extractH2ListFromHtml(html: string): string[] {
  return extractH2(html);
}

export function summarizeAngleCounts(
  rows: Array<{ contentAngle?: string }>
): Array<{ angle: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const a = String(row.contentAngle || "").trim() || "(none)";
    map.set(a, (map.get(a) || 0) + 1);
  }
  return [...map.entries()]
    .map(([angle, count]) => ({ angle, count }))
    .sort((a, b) => b.count - a.count);
}
