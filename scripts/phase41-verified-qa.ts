/**
 * Admin-API only: attach Verified profile + available 포메라니안 to an existing AdVendor.
 * Then run Planner QA with that vendorId.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { masterLoginPassword, masterLoginUsername } from "../src/lib/site-account";

const BASE = process.env.QA_BASE_URL || "https://mginfo.vercel.app";
const KEYWORD = "배곧포메라니안분양";
/** Prefer dog-related vendor with phone; address optional if phone present. */
const PREFERRED_VENDOR_ID = "mtsojc4a-4d1tlj"; // 오케이독

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

async function main() {
  const cookie = await cookieJar();
  const headers = { "Content-Type": "application/json", Cookie: cookie };

  const vendorsRes = await fetch(`${BASE}/api/ad-vendors`, { headers: { Cookie: cookie } });
  const vendorsData = await vendorsRes.json();
  const vendor =
    (vendorsData.vendors || []).find((v: { id: string }) => v.id === PREFERRED_VENDOR_ID) ||
    (vendorsData.vendors || [])[0];
  if (!vendor) throw new Error("no vendor");

  console.error(`using vendor ${vendor.id} ${vendor.name}`);

  const profileRes = await fetch(`${BASE}/api/vendor-profiles`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      action: "upsertProfile",
      vendorId: vendor.id,
      industryId: "ind-dog-adoption",
      businessHours: "평일 10:00-19:00 / 토 10:00-17:00",
      services: ["포메라니안 분양 상담", "방문 상담"],
      verifiedFacts: [
        {
          key: "specialty",
          label: "주요 취급",
          value: ["포메라니안"],
          verified: true,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      industryData: {
        consultationMethods: ["방문상담", "전화상담"],
        visitPolicy: "사전 예약제",
      },
    }),
  });
  const profileData = await profileRes.json();
  if (!profileRes.ok) throw new Error(JSON.stringify(profileData));

  const existing = ((profileData.store?.animals || []) as Array<{
    vendorId: string;
    breed: string;
    status: string;
  }>).some((a) => a.vendorId === vendor.id && a.breed.includes("포메라니안") && a.status === "available");

  if (!existing) {
    const animalRes = await fetch(`${BASE}/api/vendor-profiles`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        action: "upsertAnimal",
        vendorId: vendor.id,
        breed: "포메라니안",
        name: "코코",
        sex: "여아",
        birthDate: "2025-11-01",
        species: "dog",
        status: "available",
        media: [],
      }),
    });
    const animalData = await animalRes.json();
    if (!animalRes.ok) throw new Error(JSON.stringify(animalData));
    console.error("animal upserted");
  } else {
    console.error("animal already present");
  }

  console.error("running planner QA…");
  const runRes = await fetch(`${BASE}/api/admin/content-qa`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "planner",
      keyword: KEYWORD,
      vendorId: vendor.id,
      industryId: "ind-dog-adoption",
      writingStyle: "magazine",
    }),
  });
  const run = await runRes.json();
  if (!runRes.ok) throw new Error(JSON.stringify(run));

  const qa = run.result as Record<string, unknown>;
  const bodyHtml = String(qa.bodyHtml || "");
  const log = (qa.generationLog || {}) as Record<string, unknown>;

  function extractBlock(dataBlock: string): string {
    const re = new RegExp(
      `<div class="verified-block[^"]*" data-block="${dataBlock}"[\\s\\S]*?<\\/div>`,
      "i"
    );
    return bodyHtml.match(re)?.[0] || "";
  }

  const report = {
    keyword: KEYWORD,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorPhone: vendor.phone,
    vendorAddress: vendor.address,
    availableVerifiedBlocks: qa.verifiedBlocksAvailable || log.verifiedBlocksAvailable || [],
    renderedVerifiedBlocks: qa.verifiedBlocksRendered || log.verifiedBlocksRendered || [],
    removedVerifiedBlocks: log.removedVerifiedBlocks || log.verifiedBlocksRemoved || [],
    pagePlan: qa.pagePlan,
    contentAngle: qa.contentAngle,
    contentStrategy: qa.contentStrategy,
    title: qa.title,
    bodyHtml,
    faqItems: qa.faqItems,
    validation: qa.qualityChecks,
    validationIssues: qa.validationIssues,
    animalBlockHtml: extractBlock("available_animals"),
    storeBlockHtml: extractBlock("store_information") || extractBlock("company_information"),
    visitBlockHtml: extractBlock("visit_information"),
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
    generationMode: qa.generationMode,
  };

  writeFileSync(resolve("scripts/phase41-verified-qa.out.json"), JSON.stringify(report, null, 2), "utf8");
  console.error("wrote scripts/phase41-verified-qa.out.json");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
