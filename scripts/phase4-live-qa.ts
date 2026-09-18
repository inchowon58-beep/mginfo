/**
 * PHASE 4 live QA sample (requires GEMINI_API_KEY).
 * Does NOT publish posts — writes to data/content-qa.json only.
 *
 * npx tsx scripts/phase4-live-qa.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

async function main() {
  const { runPlannerQa, runCompareQa } = await import("../src/lib/qa-runner");
  const { readStore } = await import("../src/lib/db");

  const store = await readStore();
  const apiKey = process.env.GEMINI_API_KEY || store.settings.geminiApiKey || "";
  if (!apiKey) {
    console.error("No Gemini API key in env or store.settings — skip live QA");
    process.exit(2);
  }
  store.settings.geminiApiKey = apiKey;

  const dogKeywords = ["배곧포메라니안분양", "청라포메라니안분양", "송도포메라니안분양"];
  const demoKeywords = ["강남상가철거", "서초상가철거"];

  const outs: Array<{ keyword: string; title: string; mode: string; body: string; checks: unknown }> = [];

  for (const keyword of dogKeywords) {
    console.error(`\n=== PLANNER ${keyword} ===`);
    const { qa } = await runPlannerQa({
      store,
      keyword,
      apiKey,
      group: { industryId: "ind-dog-adoption", writingStyle: "magazine" },
    });
    outs.push({
      keyword,
      title: qa.title,
      mode: qa.generationMode || "",
      body: qa.bodyHtml,
      checks: qa.qualityChecks,
    });
    console.error(`title: ${qa.title}`);
    console.error(`mode: ${qa.generationMode} calls ${qa.plannerCalls}/${qa.writerCalls} len=${qa.bodyLength}`);
  }

  for (const keyword of demoKeywords) {
    console.error(`\n=== PLANNER ${keyword} ===`);
    const { qa } = await runPlannerQa({
      store,
      keyword,
      apiKey,
      group: { industryId: "ind-demolition", writingStyle: "magazine" },
    });
    outs.push({
      keyword,
      title: qa.title,
      mode: qa.generationMode || "",
      body: qa.bodyHtml,
      checks: qa.qualityChecks,
    });
    console.error(`title: ${qa.title}`);
    console.error(`mode: ${qa.generationMode} calls ${qa.plannerCalls}/${qa.writerCalls} len=${qa.bodyLength}`);
  }

  console.error("\n=== COMPARE 배곧포메라니안분양 ===");
  const cmp = await runCompareQa({
    store,
    keyword: "배곧포메라니안분양",
    apiKey,
    group: { industryId: "ind-dog-adoption", writingStyle: "magazine" },
  });
  console.error(`legacy: ${cmp.legacy.title}`);
  console.error(`planner: ${cmp.planner.title}`);

  // Print full articles as JSON for the report (stdout)
  console.log(JSON.stringify({ articles: outs, compare: { legacy: cmp.legacy, planner: cmp.planner } }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
