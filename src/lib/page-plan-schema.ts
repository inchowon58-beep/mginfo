import { uid } from "./slug";
import type {
  ContentStrategy,
  PagePlan,
  PagePlanSection,
  RegionalFacts,
  SearchIntent,
  TopicContext,
  WriterResult,
  WriterSectionResult,
} from "./page-plan-types";

function asString(value: unknown, max = 500): string {
  return String(value || "").trim().slice(0, max);
}

function asStringList(value: unknown, maxItems = 12, maxLen = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeSearchIntent(raw: unknown): SearchIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const primary = asString(row.primary, 200);
  const userGoal = asString(row.userGoal, 240);
  if (!primary || !userGoal) return null;
  return {
    primary,
    secondary: asStringList(row.secondary, 6, 160),
    userGoal,
  };
}

function normalizeTopicContext(raw: unknown): TopicContext | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const primaryTopic = asString(row.primaryTopic, 80);
  const service = asString(row.service, 80);
  if (!primaryTopic || !service) return null;
  return {
    region: asString(row.region, 40),
    primaryTopic,
    service,
    subTopics: asStringList(row.subTopics, 8, 80),
  };
}

function normalizeContentStrategy(raw: unknown): ContentStrategy | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const summary = asString(row.summary, 240);
  const rationale = asString(row.rationale, 400);
  if (!summary || !rationale) return null;
  return { summary, rationale };
}

function normalizeRegionalFacts(raw: unknown): RegionalFacts | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const region = asString(row.region, 40);
  const facts = asStringList(row.facts, 20, 200);
  if (!region && !facts.length) return undefined;
  const sourceRaw = asString(row.source, 32);
  const source =
    sourceRaw === "verified" ||
    sourceRaw === "public_data" ||
    sourceRaw === "vendor" ||
    sourceRaw === "user_input" ||
    sourceRaw === "system"
      ? sourceRaw
      : undefined;
  return { region, facts, source };
}

function normalizeSection(raw: unknown): PagePlanSection | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const blockKey = asString(row.blockKey, 64);
  const heading = asString(row.heading, 120);
  const intent = asString(row.intent, 200);
  const purpose = asString(row.purpose, 240);
  if (!blockKey || !heading || !intent || !purpose) return null;
  return {
    blockKey,
    heading,
    intent,
    purpose,
    mustUseVerifiedData: Boolean(row.mustUseVerifiedData),
    notesForWriter: asString(row.notesForWriter, 300) || undefined,
  };
}

export type PagePlanParseResult =
  | { ok: true; plan: PagePlan }
  | { ok: false; error: string };

export function parsePagePlan(
  raw: unknown,
  defaults: {
    keyword: string;
    industryId: string;
    blueprintId: string;
    blueprintVersion: number;
    allowedBlockKeys: Set<string>;
    allowedPageTypes: Set<string>;
    allowedAngles: Set<string>;
  }
): PagePlanParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "PagePlan이 객체가 아닙니다." };
  const row = raw as Record<string, unknown>;
  const searchIntent = normalizeSearchIntent(row.searchIntent);
  if (!searchIntent) return { ok: false, error: "searchIntent가 올바르지 않습니다." };
  const contentStrategy = normalizeContentStrategy(row.contentStrategy);
  if (!contentStrategy) return { ok: false, error: "contentStrategy가 올바르지 않습니다." };
  const topicContext = normalizeTopicContext(row.topicContext);
  if (!topicContext) return { ok: false, error: "topicContext가 올바르지 않습니다." };
  const regionalFacts = normalizeRegionalFacts(row.regionalFacts);
  const pageType = asString(row.pageType, 64);
  const contentAngle = asString(row.contentAngle, 64);
  const angleReason = asString(row.angleReason, 400);
  const titleHint = asString(row.titleHint, 80);
  if (!pageType || !defaults.allowedPageTypes.has(pageType)) {
    return { ok: false, error: `pageType이 Blueprint에 없습니다: ${pageType || "(empty)"}` };
  }
  if (!contentAngle || !defaults.allowedAngles.has(contentAngle)) {
    return { ok: false, error: `contentAngle이 Blueprint에 없습니다: ${contentAngle || "(empty)"}` };
  }
  if (!angleReason) return { ok: false, error: "angleReason이 없습니다." };
  if (!titleHint) return { ok: false, error: "titleHint가 없습니다." };

  const sectionsRaw = Array.isArray(row.sections) ? row.sections : [];
  const sections = sectionsRaw.map(normalizeSection).filter(Boolean) as PagePlanSection[];
  if (sections.length < 4 || sections.length > 12) {
    return { ok: false, error: `sections는 4~12개여야 합니다 (현재 ${sections.length}).` };
  }
  for (const section of sections) {
    if (!defaults.allowedBlockKeys.has(section.blockKey)) {
      return { ok: false, error: `알 수 없는 blockKey: ${section.blockKey}` };
    }
  }
  const keys = sections.map((s) => s.blockKey);
  if (new Set(keys).size !== keys.length) {
    return { ok: false, error: "sections에 중복 blockKey가 있습니다." };
  }

  return {
    ok: true,
    plan: {
      planId: asString(row.planId, 64) || `plan-${uid()}`,
      keyword: asString(row.keyword, 120) || defaults.keyword,
      industryId: asString(row.industryId, 64) || defaults.industryId,
      blueprintId: asString(row.blueprintId, 64) || defaults.blueprintId,
      blueprintVersion: Math.max(1, Number(row.blueprintVersion) || defaults.blueprintVersion),
      pageType,
      contentAngle,
      angleReason,
      searchIntent,
      contentStrategy,
      topicContext,
      regionalFacts,
      titleHint,
      metaDescriptionHint: asString(row.metaDescriptionHint, 160) || undefined,
      excludeBlockKeys: asStringList(row.excludeBlockKeys, 20, 64),
      sections,
      faqQuestions: asStringList(row.faqQuestions, 6, 120),
      internalLinkHints: asStringList(row.internalLinkHints, 5, 120),
    },
  };
}

export type WriterParseResult =
  | { ok: true; result: WriterResult }
  | { ok: false; error: string };

function normalizeWriterSection(raw: unknown): WriterSectionResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const blockKey = asString(row.blockKey, 64);
  const heading = asString(row.heading, 120);
  const html = asString(row.html, 12000);
  if (!blockKey || !heading || !html) return null;
  return { blockKey, heading, html };
}

export function parseWriterResult(raw: unknown, expectedBlockKeys: string[]): WriterParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Writer 결과가 객체가 아닙니다." };
  const row = raw as Record<string, unknown>;
  const title = asString(row.title, 80);
  const intro = asString(row.intro, 4000);
  if (!title || !intro) return { ok: false, error: "title 또는 intro가 없습니다." };
  const sectionsRaw = Array.isArray(row.sections) ? row.sections : [];
  const sections = sectionsRaw.map(normalizeWriterSection).filter(Boolean) as WriterSectionResult[];
  if (sections.length !== expectedBlockKeys.length) {
    return {
      ok: false,
      error: `Writer sections 개수 불일치 (기대 ${expectedBlockKeys.length}, 실제 ${sections.length}).`,
    };
  }
  for (let i = 0; i < expectedBlockKeys.length; i++) {
    if (sections[i].blockKey !== expectedBlockKeys[i]) {
      return {
        ok: false,
        error: `Writer section 순서/키 불일치: index ${i} 기대 ${expectedBlockKeys[i]}, 실제 ${sections[i].blockKey}`,
      };
    }
    if (!sections[i].html.includes("<")) {
      return { ok: false, error: `section ${sections[i].blockKey} html이 비어 있거나 태그가 없습니다.` };
    }
  }
  const faqItems = Array.isArray(row.faqItems)
    ? row.faqItems
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const faq = item as Record<string, unknown>;
          const question = asString(faq.question, 120);
          const answer = asString(faq.answer, 450);
          if (!question || !answer) return null;
          return { question, answer };
        })
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    ok: true,
    result: {
      title,
      intro,
      excerpt: asString(row.excerpt, 400) || undefined,
      sections,
      faqItems: faqItems.length ? (faqItems as WriterResult["faqItems"]) : undefined,
      regionInfo: asString(row.regionInfo, 800) || undefined,
      nearbyAreas: asStringList(row.nearbyAreas, 8, 40),
      nearbyStations: asStringList(row.nearbyStations, 8, 40),
      tags: asStringList(row.tags, 8, 40),
      slugHint: asString(row.slugHint, 80) || undefined,
    },
  };
}

/** Assemble structured Writer output into bodyHtml for Post storage. */
export function assembleBodyHtml(writer: WriterResult): string {
  const parts: string[] = [];
  const intro = writer.intro.trim();
  if (intro) {
    if (intro.startsWith("<")) parts.push(intro);
    else parts.push(`<p>${intro}</p>`);
  }
  for (const section of writer.sections) {
    const heading = section.heading.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    parts.push(`<h2>${heading}</h2>`);
    let html = section.html.trim();
    html = html.replace(/^\s*<h2[^>]*>[\s\S]*?<\/h2>\s*/i, "");
    parts.push(html);
  }
  return parts.join("\n");
}

export const PAGE_PLAN_JSON_SCHEMA_DOC = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "infocs.pageplan.v1",
  title: "PagePlan",
  type: "object",
  required: [
    "planId",
    "keyword",
    "industryId",
    "blueprintId",
    "blueprintVersion",
    "pageType",
    "contentAngle",
    "angleReason",
    "searchIntent",
    "contentStrategy",
    "topicContext",
    "titleHint",
    "sections",
  ],
  additionalProperties: false,
  properties: {
    planId: { type: "string" },
    keyword: { type: "string" },
    industryId: { type: "string" },
    blueprintId: { type: "string" },
    blueprintVersion: { type: "integer", minimum: 1 },
    pageType: { type: "string" },
    contentAngle: { type: "string" },
    angleReason: { type: "string" },
    searchIntent: {
      type: "object",
      required: ["primary", "secondary", "userGoal"],
      properties: {
        primary: { type: "string" },
        secondary: { type: "array", items: { type: "string" } },
        userGoal: { type: "string" },
      },
    },
    contentStrategy: {
      type: "object",
      required: ["summary", "rationale"],
      properties: {
        summary: { type: "string" },
        rationale: { type: "string" },
      },
    },
    topicContext: {
      type: "object",
      required: ["region", "primaryTopic", "service", "subTopics"],
      properties: {
        region: { type: "string" },
        primaryTopic: { type: "string" },
        service: { type: "string" },
        subTopics: { type: "array", items: { type: "string" } },
      },
    },
    regionalFacts: {
      type: "object",
      properties: {
        region: { type: "string" },
        facts: { type: "array", items: { type: "string" } },
        source: { type: "string", enum: ["verified", "public_data", "vendor", "user_input", "system"] },
      },
    },
    titleHint: { type: "string", maxLength: 80 },
    metaDescriptionHint: { type: "string", maxLength: 160 },
    excludeBlockKeys: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      minItems: 4,
      maxItems: 12,
      items: {
        type: "object",
        required: ["blockKey", "heading", "intent", "purpose"],
        properties: {
          blockKey: { type: "string" },
          heading: { type: "string" },
          intent: { type: "string" },
          purpose: { type: "string" },
          mustUseVerifiedData: { type: "boolean" },
          notesForWriter: { type: "string" },
        },
      },
    },
    faqQuestions: { type: "array", maxItems: 6, items: { type: "string" } },
    internalLinkHints: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
      description: "Link intent only — never slug or URL",
    },
  },
} as const;
