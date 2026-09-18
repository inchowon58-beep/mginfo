/**
 * Production live QA for writer-v2 (after deploy).
 * Logs into hub admin, runs Planner Preview for 배곧포메라니안분양,
 * preserves prior writer-v1 rows from QA store for comparison.
 *
 * npx tsx scripts/writer-v2-prod-qa.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { masterLoginPassword, masterLoginUsername } from "../src/lib/site-account";

const BASE = process.env.QA_BASE_URL || "https://mginfo.vercel.app";
const KEYWORD = "배곧포메라니안분양";

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: masterLoginUsername(),
      password: masterLoginPassword(),
    }),
  });
  const loginBody = await login.json().catch(() => ({}));
  if (!login.ok) {
    console.error("login failed", login.status, loginBody);
    process.exit(1);
  }
  const setCookie = login.headers.getSetCookie?.() || [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    String(login.headers.get("set-cookie") || "")
      .split(",")
      .map((p) => p.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
  if (!cookie) {
    console.error("no session cookie");
    process.exit(1);
  }

  const beforeRes = await fetch(`${BASE}/api/admin/content-qa`, {
    headers: { Cookie: cookie },
  });
  const before = await beforeRes.json().catch(() => ({}));
  if (!beforeRes.ok) {
    console.error("GET QA failed", before);
    process.exit(1);
  }

  const prior = ((before.store?.results || []) as Array<Record<string, unknown>>).filter(
    (r) => r.keyword === KEYWORD && r.mode === "planner"
  );
  const v1Prior = prior.find((r) => r.writerPromptVersion === "writer-v1") || prior[0] || null;

  console.error("=== POST Planner Preview (writer-v2 on prod) ===");
  const runRes = await fetch(`${BASE}/api/admin/content-qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      action: "planner",
      keyword: KEYWORD,
      industryId: "ind-dog-adoption",
      writingStyle: "magazine",
    }),
  });
  const run = await runRes.json().catch(() => ({}));
  if (!runRes.ok) {
    console.error("QA run failed", runRes.status, run);
    process.exit(1);
  }

  const v2 = run.result as Record<string, unknown>;
  const report = {
    keyword: KEYWORD,
    note:
      "Production QA: Planner runs again so PagePlan may differ from writer-v1. Same-plan local A/B needs GEMINI_API_KEY + Blob RW token.",
    geminiCalls: {
      planner: v2.plannerCalls,
      writer: v2.writerCalls,
      total: Number(v2.plannerCalls || 0) + Number(v2.writerCalls || 0),
    },
    writerV1Prior: v1Prior
      ? {
          id: v1Prior.id,
          writerPromptVersion: v1Prior.writerPromptVersion,
          title: v1Prior.title,
          bodyHtml: v1Prior.bodyHtml,
          faqItems: v1Prior.faqItems,
          pagePlan: v1Prior.pagePlan,
          sections: v1Prior.sections,
          verifiedBlocksAvailable: v1Prior.verifiedBlocksAvailable,
          verifiedBlocksRendered: v1Prior.verifiedBlocksRendered,
          qualityChecks: v1Prior.qualityChecks,
          generationMode: v1Prior.generationMode,
          plannerCalls: v1Prior.plannerCalls,
          writerCalls: v1Prior.writerCalls,
        }
      : null,
    writerV2: {
      id: v2.id,
      writerPromptVersion: v2.writerPromptVersion,
      title: v2.title,
      bodyHtml: v2.bodyHtml,
      faqItems: v2.faqItems,
      pagePlan: v2.pagePlan,
      sections: v2.sections,
      verifiedBlocksAvailable: v2.verifiedBlocksAvailable,
      verifiedBlocksRendered: v2.verifiedBlocksRendered,
      qualityChecks: v2.qualityChecks,
      generationMode: v2.generationMode,
      plannerCalls: v2.plannerCalls,
      writerCalls: v2.writerCalls,
      plannerTokens: v2.plannerTokens,
      writerTokens: v2.writerTokens,
      pipelineVersion: v2.pipelineVersion,
      plannerPromptVersion: v2.plannerPromptVersion,
    },
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
