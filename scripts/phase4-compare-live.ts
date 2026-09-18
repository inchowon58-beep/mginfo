/**
 * Live QA: Legacy vs Planner for PHASE 4 review set.
 * Does not publish. Saves under data/qa-live-*.json
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const KEYWORDS: Array<{ k: string; industryId: string }> = [
  { k: "배곧포메라니안분양", industryId: "ind-dog-adoption" },
  { k: "청라포메라니안분양", industryId: "ind-dog-adoption" },
  { k: "송도포메라니안분양", industryId: "ind-dog-adoption" },
  { k: "강남상가철거", industryId: "ind-demolition" },
  { k: "서초상가철거", industryId: "ind-demolition" },
];

async function main() {
  const { runCompareQa } = await import("../src/lib/qa-runner");
  const { readStore } = await import("../src/lib/db");
  const store = await readStore();
  const apiKey = process.env.GEMINI_API_KEY || store.settings.geminiApiKey || "";
  if (!apiKey) {
    console.error("NO_API_KEY");
    process.exit(2);
  }
  store.settings.geminiApiKey = apiKey;

  const outDir = resolve(process.cwd(), "data");
  mkdirSync(outDir, { recursive: true });
  const summary: unknown[] = [];

  for (const row of KEYWORDS) {
    console.error(`COMPARE ${row.k}`);
    const out = await runCompareQa({
      store,
      keyword: row.k,
      apiKey,
      group: { industryId: row.industryId, writingStyle: "magazine" },
    });
    const safe = row.k.replace(/[^\w가-힣]+/g, "_");
    writeFileSync(resolve(outDir, `qa-live-${safe}-legacy.json`), JSON.stringify(out.legacy, null, 2), "utf8");
    writeFileSync(resolve(outDir, `qa-live-${safe}-planner.json`), JSON.stringify(out.planner, null, 2), "utf8");
    summary.push({
      keyword: row.k,
      legacy: {
        id: out.legacy.id,
        title: out.legacy.title,
        bodyLength: out.legacy.bodyLength,
        writerCalls: out.legacy.writerCalls,
      },
      planner: {
        id: out.planner.id,
        title: out.planner.title,
        bodyLength: out.planner.bodyLength,
        generationMode: out.planner.generationMode,
        pageType: out.planner.pageType,
        contentAngle: out.planner.contentAngle,
        contentStrategy: out.planner.contentStrategy,
        plannerCalls: out.planner.plannerCalls,
        writerCalls: out.planner.writerCalls,
        verifiedBlocksRendered: out.planner.verifiedBlocksRendered,
        qualityChecks: out.planner.qualityChecks,
        sectionKeys: (out.planner.sections || []).map((s) => s.blockKey),
        fallbackReason: out.planner.generationLog?.fallbackReason,
      },
    });
    console.error(
      `  legacy=${out.legacy.title.slice(0, 40)} | planner=${out.planner.title.slice(0, 40)} mode=${out.planner.generationMode}`
    );
  }

  writeFileSync(resolve(outDir, "qa-live-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.error(`DONE ${summary.length}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
