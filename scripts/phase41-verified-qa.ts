/**
 * PHASE 4.1: Ensure Verified vendor+animal on hub, then Planner QA for 배곧포메라니안분양.
 * Uses admin APIs only (no Gemini-invented vendor data).
 *
 * npx tsx scripts/phase41-verified-qa.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { masterLoginPassword, masterLoginUsername } from "../src/lib/site-account";

const BASE = process.env.QA_BASE_URL || "https://mginfo.vercel.app";
const KEYWORD = "배곧포메라니안분양";
const VENDOR_NAME = "배곧포메분양센터";

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

  const headers = { "Content-Type": "application/json", Cookie: cookie };

  const vendorsRes = await fetch(`${BASE}/api/ad-vendors`, { headers: { Cookie: cookie } });
  const vendorsData = await vendorsRes.json().catch(() => ({}));
  let vendors = (vendorsData.vendors || []) as Array<{
    id: string;
    name: string;
    phone?: string;
    address?: string;
  }>;
  let vendor = vendors.find((v) => v.name === VENDOR_NAME);

  if (!vendor) {
    console.error("=== create AdVendor ===");
    const create = await fetch(`${BASE}/api/ad-vendors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: VENDOR_NAME,
        phone: "031-123-4567",
        address: "경기도 시흥시 배곧동 123",
        website: "https://example.com",
        intro: "배곧 지역 포메라니안 분양 상담",
      }),
    });
    const created = await create.json().catch(() => ({}));
    if (!create.ok) {
      console.error("create vendor failed", created);
      process.exit(1);
    }
    vendor = created.vendor;
  }

  console.error(`vendorId=${vendor.id} name=${vendor.name}`);

  console.error("=== upsert VendorProfile ===");
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
  const profileData = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    console.error("profile failed", profileData);
    process.exit(1);
  }

  const animals = ((profileData.store?.animals || []) as Array<{ id: string; vendorId: string; breed: string; status: string }>).filter(
    (a) => a.vendorId === vendor.id && a.breed.includes("포메라니안") && a.status === "available"
  );
  if (!animals.length) {
    console.error("=== upsert Animal (포메라니안 available) ===");
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
    const animalData = await animalRes.json().catch(() => ({}));
    if (!animalRes.ok) {
      console.error("animal failed", animalData);
      process.exit(1);
    }
  }

  console.error("=== Planner QA with vendorId ===");
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
  const run = await runRes.json().catch(() => ({}));
  if (!runRes.ok) {
    console.error("QA failed", runRes.status, run);
    process.exit(1);
  }

  const qa = run.result as Record<string, unknown>;
  const bodyHtml = String(qa.bodyHtml || "");
  const log = (qa.generationLog || {}) as Record<string, unknown>;

  function extractBlock(dataBlock: string): string {
    const re = new RegExp(
      `<div class="verified-block[^"]*" data-block="${dataBlock}"[\\s\\S]*?<\\/div>`,
      "i"
    );
    const m = bodyHtml.match(re);
    return m?.[0] || "";
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

  const outPath = resolve(process.cwd(), "scripts/phase41-verified-qa.out.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error(`Wrote ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
