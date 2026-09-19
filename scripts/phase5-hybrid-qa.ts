/**
 * PHASE 5: Hybrid quality QA — 배곧 / 청라 / 송도 with same vendor.
 * npx tsx scripts/phase5-hybrid-qa.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { masterLoginPassword, masterLoginUsername } from "../src/lib/site-account";

const BASE = process.env.QA_BASE_URL || "https://mginfo.vercel.app";
const KEYWORDS = ["배곧포메라니안분양", "청라포메라니안분양", "송도포메라니안분양"];
const VENDOR_ID = "mtsojc4a-4d1tlj"; // 오케이독 (Verified already attached in 4.1)

async function cookieJar() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: masterLoginUsername(),
      password: masterLoginPassword(),
    }),
  });
  if (!login.ok) throw new Error(`login ${login.status}`);
  const setCookie = login.headers.getSetCookie?.() || [];
  return (
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    String(login.headers.get("set-cookie") || "")
      .split(",")
      .map((p) => p.split(";")[0].trim())
      .filter(Boolean)
      .join("; ")
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractH2(html: string): string[] {
  const out: string[] = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  return out.filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a.map((x) => x.toLowerCase()));
  const sb = new Set(b.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const uni = sa.size + sb.size - inter;
  return uni ? inter / uni : 0;
}

function textSim(a: string, b: string): number {
  const ta = stripTags(a).slice(0, 4000);
  const tb = stripTags(b).slice(0, 4000);
  if (!ta || !tb) return 0;
  const wa = new Set(ta.split(/\s+/).filter((w) => w.length > 1));
  const wb = new Set(tb.split(/\s+/).filter((w) => w.length > 1));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  const uni = wa.size + wb.size - inter;
  return uni ? inter / uni : 0;
}

function regionNorm(text: string): string {
  return text.replace(/배곧|청라|송도/g, "〈지역〉");
}

async function main() {
  const cookie = await cookieJar();
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const rows: Array<Record<string, unknown>> = [];

  for (const keyword of KEYWORDS) {
    console.error(`=== QA ${keyword} ===`);
    const runRes = await fetch(`${BASE}/api/admin/content-qa`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "planner",
        keyword,
        vendorId: VENDOR_ID,
        industryId: "ind-dog-adoption",
        writingStyle: "magazine",
      }),
    });
    const run = await runRes.json();
    if (!runRes.ok) throw new Error(`${keyword}: ${JSON.stringify(run)}`);
    const qa = run.result as Record<string, unknown>;
    const log = (qa.generationLog || {}) as Record<string, unknown>;
    const bodyHtml = String(qa.bodyHtml || "");
    rows.push({
      keyword,
      vendorId: VENDOR_ID,
      title: qa.title,
      contentAngle: qa.contentAngle,
      contentStrategy: qa.contentStrategy,
      pageType: qa.pageType,
      pagePlan: qa.pagePlan,
      bodyHtml,
      faqItems: qa.faqItems,
      h2: extractH2(bodyHtml),
      aiSectionKeys: ((qa.pagePlan as { sections?: Array<{ blockKey: string }> })?.sections || [])
        .map((s) => s.blockKey)
        .filter((k) => !["available_animals", "store_information", "visit_information", "faq"].includes(k)),
      availableVerifiedBlocks: qa.verifiedBlocksAvailable || log.verifiedBlocksAvailable || [],
      renderedVerifiedBlocks: qa.verifiedBlocksRendered || log.verifiedBlocksRendered || [],
      removedVerifiedBlocks: log.removedVerifiedBlocks || log.verifiedBlocksRemoved || [],
      validation: qa.qualityChecks,
      geminiCalls: {
        planner: qa.plannerCalls,
        writer: qa.writerCalls,
        total: Number(qa.plannerCalls || 0) + Number(qa.writerCalls || 0),
      },
      promptVersions: {
        pipeline: qa.pipelineVersion,
        planner: qa.plannerPromptVersion,
        writer: qa.writerPromptVersion,
      },
      bodyVisibleLen: stripTags(bodyHtml).length,
      hasAnimalCard: /verified-animal|품종 포메라니안/.test(bodyHtml),
      hasStore: /상호/.test(bodyHtml),
      hasVisit: /영업시간|상담|방문/.test(bodyHtml),
      storeHasHours: /매장[\s\S]{0,400}영업시간/.test(bodyHtml) && /상호[\s\S]{0,400}영업시간/.test(bodyHtml),
      hoursDupAcrossBlocks: (bodyHtml.match(/영업시간/g) || []).length > 1,
    });
  }

  const similarity: Array<Record<string, unknown>> = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      similarity.push({
        pair: `${a.keyword} vs ${b.keyword}`,
        sameAngle: a.contentAngle === b.contentAngle,
        h2Jaccard: Number(jaccard(a.h2 as string[], b.h2 as string[]).toFixed(3)),
        bodyTokenSim: Number(textSim(String(a.bodyHtml), String(b.bodyHtml)).toFixed(3)),
        bodyTokenSimRegionNorm: Number(
          textSim(regionNorm(String(a.bodyHtml)), regionNorm(String(b.bodyHtml))).toFixed(3)
        ),
        aiSectionsA: a.aiSectionKeys,
        aiSectionsB: b.aiSectionKeys,
        titleA: a.title,
        titleB: b.title,
      });
    }
  }

  const report = { rows, similarity };
  writeFileSync(resolve("scripts/phase5-hybrid-qa.out.json"), JSON.stringify(report, null, 2), "utf8");
  console.error("wrote scripts/phase5-hybrid-qa.out.json");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
