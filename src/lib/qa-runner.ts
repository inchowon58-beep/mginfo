import { ensureCategorySlug, getCategory } from "./categories";
import { generateBulkArticle, type PipelineArticle } from "./content-pipeline";
import { generateArticle } from "./gemini";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { resolveArticleStyle } from "./article-style";
import { resolveGeminiNotes } from "./gemini-notes";
import { extractPlaceName } from "./region-geo";
import { collectRecentTitles, collectTodayKeywords } from "./title-uniqueness";
import { appendQaResult } from "./qa-store";
import { PIPELINE_VERSION, PLANNER_PROMPT_VERSION, WRITER_PROMPT_VERSION } from "./quality-codes";
import type { QaResult } from "./qa-types";
import type { BulkGroup, BulkKeyword, Store } from "./types";
import { uid } from "./slug";

function fakeKeyword(keyword: string): BulkKeyword {
  return { id: uid(), keyword, status: "queued" };
}

function fakeGroup(partial?: Partial<BulkGroup>): BulkGroup {
  return {
    id: uid(),
    category: partial?.category || "life",
    dailyLimit: 10,
    vendorName: partial?.vendorName,
    vendorPhone: partial?.vendorPhone,
    vendorWebsite: partial?.vendorWebsite,
    vendorId: partial?.vendorId,
    vendorIds: partial?.vendorIds,
    writingStyle: partial?.writingStyle || "magazine",
    extraPrompt: partial?.extraPrompt,
    industryId: partial?.industryId,
    blueprintId: partial?.blueprintId,
    keywords: [],
    ...partial,
  };
}

export async function runPlannerQa(input: {
  store: Store;
  keyword: string;
  group?: Partial<BulkGroup>;
  apiKey: string;
}): Promise<{ article: PipelineArticle; qa: QaResult }> {
  const group = fakeGroup(input.group);
  const item = fakeKeyword(input.keyword);
  const cats = input.store.categories || [];
  const category = ensureCategorySlug(group.category, cats);
  const cat = getCategory(category, cats);
  const vendor =
    (group.vendorId && input.store.adVendors?.find((v) => v.id === group.vendorId)) ||
    (group.vendorName && input.store.adVendors?.find((v) => v.name === group.vendorName)) ||
    null;

  const article = await generateBulkArticle({
    store: input.store,
    group,
    item,
    category,
    categoryName: cat?.name,
    categoryNotes: cat?.geminiNotes,
    vendor,
    apiKey: input.apiKey,
  });

  const { result: qa } = await appendQaResult({
    keyword: input.keyword,
    mode: "planner",
    title: article.title,
    excerpt: article.excerpt,
    metaDescription: article.excerpt,
    bodyHtml: article.bodyHtml,
    faqItems: article.faqItems,
    pageType: article.pageType,
    contentAngle: article.contentAngle,
    contentStrategy: article.pagePlan?.contentStrategy,
    searchIntent: article.pagePlan?.searchIntent,
    sections: article.pagePlan?.sections,
    pagePlan: article.pagePlan,
    verifiedBlocksAvailable: article.generationLog.verifiedBlocksAvailable,
    verifiedBlocksRendered: article.generationLog.verifiedBlocksRendered,
    validationIssues: article.generationLog.validationIssues,
    qualityChecks: article.generationLog.qualityChecks,
    generationMode: article.generationMode,
    pipelineVersion: article.generationLog.pipelineVersion || PIPELINE_VERSION,
    plannerPromptVersion: article.generationLog.plannerPromptVersion || PLANNER_PROMPT_VERSION,
    writerPromptVersion: article.generationLog.writerPromptVersion || WRITER_PROMPT_VERSION,
    plannerCalls: article.generationLog.plannerCalls,
    writerCalls: article.generationLog.writerCalls,
    plannerTokens: article.generationLog.plannerTokens,
    writerTokens: article.generationLog.writerTokens,
    generationLog: article.generationLog,
  });

  return { article, qa };
}

export async function runLegacyQa(input: {
  store: Store;
  keyword: string;
  group?: Partial<BulkGroup>;
  apiKey: string;
}): Promise<{ title: string; bodyHtml: string; faqItems?: PipelineArticle["faqItems"]; qa: QaResult }> {
  const group = fakeGroup(input.group);
  const cats = input.store.categories || [];
  const category = ensureCategorySlug(group.category, cats);
  const cat = getCategory(category, cats);
  const writingStyle = resolveArticleStyle(group.writingStyle || "magazine", input.keyword);
  const place = extractPlaceName(input.keyword) || "";
  const article = await generateArticle({
    topic: input.keyword,
    writingStyle,
    category,
    categoryName: cat?.name,
    notes: resolveGeminiNotes("", cat?.geminiNotes),
    focusKeyword: input.keyword,
    region: place,
    vendorName: group.vendorName,
    writingTone: input.store.settings.writingTone,
    writingPersona: input.store.settings.writingPersona,
    experienceNotes: group.extraPrompt || "",
    avoidTitles: collectRecentTitles(input.store.posts),
    avoidKeywords: collectTodayKeywords(input.store.bulkPublish.groups.flatMap((g) => g.keywords)),
    apiKey: input.apiKey,
    model: input.store.settings.geminiModel || DEFAULT_GEMINI_MODEL,
  });

  const { result: qa } = await appendQaResult({
    keyword: input.keyword,
    mode: "legacy",
    title: article.title,
    excerpt: article.excerpt,
    metaDescription: article.excerpt,
    bodyHtml: article.bodyHtml,
    faqItems: article.faqItems,
    generationMode: "legacy",
    pipelineVersion: "legacy",
    plannerCalls: 0,
    writerCalls: 1,
    generationLog: {
      generationMode: "legacy",
      pipelineVersion: "legacy",
      keyword: input.keyword,
      plannerCalls: 0,
      writerCalls: 1,
      plannerRetries: 0,
      writerRetries: 0,
      removedVerifiedBlocks: [],
      validationIssues: [],
      errors: [],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    },
  });

  return { title: article.title, bodyHtml: article.bodyHtml, faqItems: article.faqItems, qa };
}

export async function runCompareQa(input: {
  store: Store;
  keyword: string;
  group?: Partial<BulkGroup>;
  apiKey: string;
}) {
  const legacy = await runLegacyQa(input);
  const planner = await runPlannerQa(input);
  // link pair
  const { result: compareRow } = await appendQaResult({
    ...planner.qa,
    id: uid(),
    mode: "compare",
    compareWithId: legacy.qa.id,
  });
  return { legacy: legacy.qa, planner: planner.qa, compare: compareRow };
}
