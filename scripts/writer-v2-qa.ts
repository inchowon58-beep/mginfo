/**
 * writer-v2 A/B QA: same PagePlan → writer-v1 archive + writer-v2.
 * Does NOT publish posts.
 *
 * npx tsx scripts/writer-v2-qa.ts
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  for (const name of [".env.production.local", ".env.local"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvLocal();

const KEYWORD = "배곧포메라니안분양";

async function main() {
  const { readStore } = await import("../src/lib/db");
  const { getContentBlueprintStore } = await import("../src/lib/content-blueprint-store");
  const { resolveIndustryForBulk } = await import("../src/lib/content-industry-resolve");
  const { callPlanner } = await import("../src/lib/content-planner");
  const { callWriter, buildWriterPrompt, buildWriterPromptV1Archive } = await import(
    "../src/lib/content-writer"
  );
  const { assembleHybridBodyHtml, planForWriter } = await import("../src/lib/hybrid-assemble");
  const { buildVerifiedContext } = await import("../src/lib/content-verified");
  const {
    computeVerifiedAvailability,
    filterPlanWithVerifiedPack,
  } = await import("../src/lib/verified-availability");
  const { getVendorProfileStore } = await import("../src/lib/vendor-profile-store");
  const { isCodeRenderedBlock } = await import("../src/lib/vendor-profile-types");
  const { collectRelatedPostSummaries } = await import("../src/lib/content-related-context");
  const { validateWriterOutput, extractH2ListFromHtml } = await import("../src/lib/content-validation");
  const { DEFAULT_GEMINI_MODEL } = await import("../src/lib/gemini-models");
  const { resolveArticleStyle } = await import("../src/lib/article-style");
  const { collectRecentTitles } = await import("../src/lib/title-uniqueness");
  const { collectRecentBodies } = await import("../src/lib/body-uniqueness");
  const { extractPlaceName } = await import("../src/lib/region-geo");
  const { stripGeneratedImages } = await import("../src/lib/sanitize");
  const { appendQaResult } = await import("../src/lib/qa-store");
  const { PIPELINE_VERSION, PLANNER_PROMPT_VERSION } = await import("../src/lib/quality-codes");
  const { uid } = await import("../src/lib/slug");

  const store = await readStore();
  const apiKey = process.env.GEMINI_API_KEY || store.settings.geminiApiKey || "";
  if (!apiKey) {
    console.error("No Gemini API key");
    process.exit(2);
  }

  const group = {
    id: uid(),
    category: "life" as const,
    dailyLimit: 10,
    writingStyle: "magazine",
    industryId: "ind-dog-adoption",
    keywords: [] as [],
  };

  const blueprintStore = await getContentBlueprintStore();
  const resolved = resolveIndustryForBulk(blueprintStore, KEYWORD, group, {});
  if (!resolved.ok) {
    console.error("resolve failed", resolved.reason);
    process.exit(1);
  }

  const profileStore = await getVendorProfileStore();
  const vendor =
    store.adVendors?.find((v) => v.id === group.vendorId) ||
    store.adVendors?.[0] ||
    null;
  const profile =
    (vendor?.id && profileStore.profiles.find((p) => p.vendorId === vendor.id)) || null;

  const verifiedPack = computeVerifiedAvailability({
    blocks: resolved.pool.blocks,
    adVendor: vendor,
    profile,
    store: profileStore,
    keyword: KEYWORD,
  });

  const verified = {
    ...buildVerifiedContext(group, vendor),
    ...(verifiedPack.view
      ? {
          vendorName: verifiedPack.view.companyName,
          phone: verifiedPack.view.phone,
          address: verifiedPack.view.address,
          website: verifiedPack.view.website,
          businessHours: verifiedPack.view.businessHours,
          consultationMethod: verifiedPack.view.consultationMethod,
        }
      : {}),
    animals: verifiedPack.matchingAnimals.length ? verifiedPack.matchingAnimals : undefined,
    projectCases: verifiedPack.projects.length ? verifiedPack.projects : undefined,
  };

  const related = collectRelatedPostSummaries(store.posts, KEYWORD, resolved.industryId, 8);
  const model = store.settings.geminiModel || DEFAULT_GEMINI_MODEL;
  const writingStyle = resolveArticleStyle("magazine", KEYWORD);
  const avoidTitles = collectRecentTitles(store.posts);
  const avoidBodies = collectRecentBodies(store.posts);
  const existingH2Lists = store.posts.slice(0, 40).map((p) => extractH2ListFromHtml(p.bodyHtml || ""));

  console.error("=== Planner (once) ===");
  const planned = await callPlanner({
    apiKey,
    model,
    keyword: KEYWORD,
    pool: resolved.pool,
    related,
    vendorName: verifiedPack.view?.companyName || vendor?.name,
    hasVerifiedVendor: Boolean(verified.vendorName && (verified.address || verified.phone)),
    hasVerifiedAnimals: Boolean(verified.animals || verified.projectCases),
    regionalFacts: { region: extractPlaceName(KEYWORD) || "", facts: [] },
    availableVerifiedBlocks: verifiedPack.availableVerifiedBlocks,
  });

  let plan = filterPlanWithVerifiedPack(planned.plan, resolved.pool.blocks, verifiedPack).plan;
  const writerPlan = planForWriter(plan);
  const upcomingVerifiedBlocks = plan.sections
    .filter((s) => isCodeRenderedBlock(s.blockKey))
    .map((s) => s.blockKey);

  const baseWriterInput = {
    apiKey,
    model,
    plan: writerPlan,
    verified,
    writingStyle,
    writingTone: store.settings.writingTone,
    writingPersona: store.settings.writingPersona,
    experienceNotes: "",
    categoryName: "라이프",
    avoidTitles,
    upcomingVerifiedBlocks,
  };

  async function writeVersion(version: "writer-v1" | "writer-v2") {
    const prompt =
      version === "writer-v1"
        ? buildWriterPromptV1Archive(baseWriterInput)
        : buildWriterPrompt(baseWriterInput);
    const out = await callWriter({
      ...baseWriterInput,
      promptOverride: prompt,
      promptVersionOverride: version,
    });
    let writerResult = out.result;
    let hybrid = assembleHybridBodyHtml({ plan, writer: writerResult, pack: verifiedPack });
    let bodyHtml = stripGeneratedImages(hybrid.bodyHtml);
    const validation = validateWriterOutput({
      plan: writerPlan,
      writer: writerResult,
      bodyHtml,
      existingTitles: avoidTitles,
      existingBodies: avoidBodies,
      existingH2Lists,
      hasVerifiedVendorFacts: Boolean(verified.vendorName && (verified.address || verified.phone)),
      focusKeyword: KEYWORD,
      relatedPosts: store.posts.slice(0, 20).map((p) => ({
        title: p.title,
        bodyHtml: p.bodyHtml,
        focusKeyword: p.focusKeyword,
      })),
    });
    if (validation.fixed) {
      writerResult = validation.fixed;
      hybrid = assembleHybridBodyHtml({ plan, writer: writerResult, pack: verifiedPack });
      bodyHtml = stripGeneratedImages(hybrid.bodyHtml);
    }
    return {
      version,
      title: writerResult.title,
      intro: writerResult.intro,
      excerpt: writerResult.excerpt,
      sections: writerResult.sections,
      faqItems: writerResult.faqItems,
      bodyHtml,
      verifiedBlocksAvailable: verifiedPack.availableVerifiedBlocks,
      verifiedBlocksRendered: hybrid.verifiedBlocksRendered,
      qualityChecks: validation.checks,
      validationIssues: validation.issues,
      writerCalls: out.calls,
      writerTokens: out.tokens,
      promptVersion: out.promptVersion,
    };
  }

  console.error("=== Writer v1 (archive, same plan) ===");
  const v1 = await writeVersion("writer-v1");
  console.error("=== Writer v2 (same plan) ===");
  const v2 = await writeVersion("writer-v2");

  const { result: qaV1 } = await appendQaResult({
    keyword: KEYWORD,
    mode: "planner",
    title: v1.title,
    excerpt: v1.excerpt,
    bodyHtml: v1.bodyHtml,
    faqItems: v1.faqItems,
    pageType: plan.pageType,
    contentAngle: plan.contentAngle,
    contentStrategy: plan.contentStrategy,
    searchIntent: plan.searchIntent,
    sections: plan.sections,
    pagePlan: plan,
    verifiedBlocksAvailable: v1.verifiedBlocksAvailable,
    verifiedBlocksRendered: v1.verifiedBlocksRendered,
    qualityChecks: v1.qualityChecks,
    validationIssues: v1.validationIssues,
    generationMode: "planner_writer_v1",
    pipelineVersion: PIPELINE_VERSION,
    plannerPromptVersion: planned.promptVersion || PLANNER_PROMPT_VERSION,
    writerPromptVersion: "writer-v1",
    plannerCalls: planned.calls,
    writerCalls: v1.writerCalls,
    plannerTokens: planned.tokens,
    writerTokens: v1.writerTokens,
  });

  const { result: qaV2 } = await appendQaResult({
    keyword: KEYWORD,
    mode: "planner",
    title: v2.title,
    excerpt: v2.excerpt,
    bodyHtml: v2.bodyHtml,
    faqItems: v2.faqItems,
    pageType: plan.pageType,
    contentAngle: plan.contentAngle,
    contentStrategy: plan.contentStrategy,
    searchIntent: plan.searchIntent,
    sections: plan.sections,
    pagePlan: plan,
    verifiedBlocksAvailable: v2.verifiedBlocksAvailable,
    verifiedBlocksRendered: v2.verifiedBlocksRendered,
    qualityChecks: v2.qualityChecks,
    validationIssues: v2.validationIssues,
    generationMode: "planner_writer_v1",
    pipelineVersion: PIPELINE_VERSION,
    plannerPromptVersion: planned.promptVersion || PLANNER_PROMPT_VERSION,
    writerPromptVersion: "writer-v2",
    plannerCalls: 0,
    writerCalls: v2.writerCalls,
    writerTokens: v2.writerTokens,
    compareWithId: qaV1.id,
  });

  const report = {
    keyword: KEYWORD,
    sharedPagePlan: plan,
    geminiCalls: {
      planner: planned.calls,
      writerV1: v1.writerCalls,
      writerV2: v2.writerCalls,
      total: planned.calls + v1.writerCalls + v2.writerCalls,
    },
    writerV1: { qaId: qaV1.id, ...v1 },
    writerV2: { qaId: qaV2.id, ...v2 },
  };

  const outPath = resolve(process.cwd(), "scripts/writer-v2-qa.out.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error(`Wrote ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
