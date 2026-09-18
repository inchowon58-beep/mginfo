/**
 * PHASE 3 verified layer scenario checks (no Gemini).
 * Run: npx tsx scripts/phase3-verified-scenarios.ts
 */
import { seedContentBlueprintStore } from "../src/lib/content-blueprint-seed";
import { computeVerifiedAvailability, filterPlanWithVerifiedPack } from "../src/lib/verified-availability";
import { assembleHybridBodyHtml } from "../src/lib/hybrid-assemble";
import type { PagePlan } from "../src/lib/page-plan-types";
import type { VendorProfileStore } from "../src/lib/vendor-profile-types";
import type { AdVendor } from "../src/lib/types";
import type { WriterResult } from "../src/lib/page-plan-types";

function basePlan(keyword: string, sections: PagePlan["sections"]): PagePlan {
  return {
    planId: "plan-test",
    keyword,
    industryId: "ind-dog-adoption",
    blueprintId: "bp-local-pet-adoption",
    blueprintVersion: 1,
    pageType: "local_service",
    contentAngle: "beginner",
    angleReason: "test",
    searchIntent: {
      primary: "해당 지역에서 포메라니안 분양 관련 정보를 탐색",
      secondary: [],
      userGoal: "정보 확인",
    },
    contentStrategy: { summary: "test", rationale: "test" },
    topicContext: {
      region: "배곧",
      primaryTopic: "포메라니안",
      service: "강아지분양",
      subTopics: [],
    },
    titleHint: keyword,
    sections,
  };
}

function aiWriter(blockKeys: string[]): WriterResult {
  return {
    title: "테스트 제목",
    intro: "<p>도입문입니다. 키워드 맥락의 판단 포인트.</p>",
    sections: blockKeys.map((blockKey) => ({
      blockKey,
      heading: `H2 ${blockKey}`,
      html: `<p>${blockKey} 본문 내용입니다. 충분히 긴 문장으로 품질 기준을 맞춥니다. 추가 설명.</p>`,
    })),
    faqItems: [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
    ],
  };
}

const vendor: AdVendor = {
  id: "v-okdog",
  name: "오케이독",
  phone: "010-0000-0000",
  address: "시흥시 배곧동 1",
  website: "https://example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const demoVendor: AdVendor = {
  id: "v-demo",
  name: "강남철거",
  phone: "02-000-0000",
  address: "서울 강남구",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function run() {
  const bp = seedContentBlueprintStore();
  const dogBlocks = bp.blocks.filter((b) => b.industryId === "ind-dog-adoption");
  const demoBlocks = bp.blocks.filter((b) => b.industryId === "ind-demolition");

  // --- Test 1: 배곧포메라니안분양 + 포메 animal ---
  const store1: VendorProfileStore = {
    profiles: [
      {
        id: "vp-okdog",
        vendorId: "v-okdog",
        industryId: "ind-dog-adoption",
        businessHours: "10:00-19:00",
        verifiedFacts: [],
        services: [],
        credentials: [],
        media: [],
        industryData: { consultationMethods: ["방문상담"] },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    animals: [
      {
        id: "a1",
        vendorId: "v-okdog",
        species: "dog",
        breed: "포메라니안",
        sex: "여",
        birthDate: "2026-03-01",
        name: "초코",
        status: "available",
        media: [{ url: "https://example.com/pome.jpg", alt: "초코" }],
        verifiedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    projectExamples: [],
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  const pack1 = computeVerifiedAvailability({
    blocks: dogBlocks,
    adVendor: vendor,
    profile: store1.profiles[0],
    store: store1,
    keyword: "배곧포메라니안분양",
  });
  console.log("\n[1] 배곧포메라니안분양 availableVerifiedBlocks:", pack1.availableVerifiedBlocks);
  console.assert(pack1.availableVerifiedBlocks.includes("available_animals"), "animals should be available");
  console.assert(pack1.availableVerifiedBlocks.includes("store_information"), "store should be available");

  const plan1 = basePlan("배곧포메라니안분양", [
    { blockKey: "breed_intro", heading: "소개", intent: "i", purpose: "p" },
    { blockKey: "temperament", heading: "성격", intent: "i", purpose: "p" },
    { blockKey: "grooming", heading: "관리", intent: "i", purpose: "p" },
    { blockKey: "adoption_checklist", heading: "체크", intent: "i", purpose: "p" },
    { blockKey: "available_animals", heading: "현재 만나볼 수 있는 포메라니안", intent: "i", purpose: "p" },
    { blockKey: "store_information", heading: "오케이독 정보", intent: "i", purpose: "p" },
    { blockKey: "faq", heading: "FAQ", intent: "i", purpose: "p" },
  ]);
  const filtered1 = filterPlanWithVerifiedPack(plan1, dogBlocks, pack1);
  const hybrid1 = assembleHybridBodyHtml({
    plan: filtered1.plan,
    writer: aiWriter(["breed_intro", "temperament", "grooming", "adoption_checklist", "faq"]),
    pack: pack1,
  });
  console.log("[1] rendered:", hybrid1.verifiedBlocksRendered);
  console.assert(hybrid1.bodyHtml.includes("초코"), "animal name in html");
  console.assert(hybrid1.bodyHtml.includes("오케이독"), "store name in html");
  console.assert(!hybrid1.bodyHtml.includes("Gemini가 만든 가짜"), "ok");

  // --- Test 2: 청라말티푸분양 — no maltipoo animal ---
  const pack2 = computeVerifiedAvailability({
    blocks: dogBlocks,
    adVendor: vendor,
    profile: store1.profiles[0],
    store: store1,
    keyword: "청라말티푸분양",
  });
  console.log("\n[2] 청라말티푸분양 available:", pack2.availableVerifiedBlocks);
  console.assert(!pack2.availableVerifiedBlocks.includes("available_animals"), "no maltipoo → remove animals");
  const plan2 = basePlan("청라말티푸분양", [
    { blockKey: "breed_intro", heading: "소개", intent: "i", purpose: "p" },
    { blockKey: "temperament", heading: "성격", intent: "i", purpose: "p" },
    { blockKey: "grooming", heading: "관리", intent: "i", purpose: "p" },
    { blockKey: "available_animals", heading: "말티푸", intent: "i", purpose: "p" },
    { blockKey: "store_information", heading: "업체", intent: "i", purpose: "p" },
    { blockKey: "faq", heading: "FAQ", intent: "i", purpose: "p" },
  ]);
  plan2.topicContext = {
    region: "청라",
    primaryTopic: "말티푸",
    service: "강아지분양",
    subTopics: [],
  };
  const filtered2 = filterPlanWithVerifiedPack(plan2, dogBlocks, pack2);
  console.log(
    "[2] removed:",
    filtered2.removed.map((r) => `${r.blockKey}:${r.reason}`)
  );
  console.assert(
    filtered2.removed.some((r) => r.blockKey === "available_animals"),
    "animals section removed"
  );
  console.assert(
    !filtered2.plan.sections.some((s) => s.blockKey === "available_animals"),
    "not in plan"
  );

  // --- Test 3: 강남상가철거 + project ---
  const store3: VendorProfileStore = {
    profiles: [
      {
        id: "vp-demo",
        vendorId: "v-demo",
        industryId: "ind-demolition",
        verifiedFacts: [],
        services: ["상가철거"],
        credentials: [],
        media: [],
        industryData: { consultationMethods: ["현장실사"] },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    animals: [],
    projectExamples: [
      {
        id: "p1",
        vendorId: "v-demo",
        title: "강남 상가 인테리어 철거",
        projectType: "상가철거",
        region: "강남",
        description: "내부 마감 해체 및 폐기물 반출",
        media: [],
        completedAt: "2026-05-01",
        verifiedAt: "2026-05-02T00:00:00.000Z",
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  const pack3 = computeVerifiedAvailability({
    blocks: demoBlocks,
    adVendor: demoVendor,
    profile: store3.profiles[0],
    store: store3,
    keyword: "강남상가철거",
  });
  console.log("\n[3] 강남상가철거 available:", pack3.availableVerifiedBlocks);
  console.assert(pack3.availableVerifiedBlocks.includes("project_examples"), "projects available");
  const plan3: PagePlan = {
    ...basePlan("강남상가철거", [
      { blockKey: "project_type", heading: "유형", intent: "i", purpose: "p" },
      { blockKey: "work_process", heading: "과정", intent: "i", purpose: "p" },
      { blockKey: "safety", heading: "안전", intent: "i", purpose: "p" },
      { blockKey: "project_examples", heading: "실제 사례", intent: "i", purpose: "p" },
      { blockKey: "company_information", heading: "업체", intent: "i", purpose: "p" },
      { blockKey: "faq", heading: "FAQ", intent: "i", purpose: "p" },
    ]),
    industryId: "ind-demolition",
    blueprintId: "bp-local-demolition",
    topicContext: { region: "강남", primaryTopic: "상가철거", service: "철거", subTopics: [] },
  };
  const filtered3 = filterPlanWithVerifiedPack(plan3, demoBlocks, pack3);
  const hybrid3 = assembleHybridBodyHtml({
    plan: filtered3.plan,
    writer: aiWriter(["project_type", "work_process", "safety", "faq"]),
    pack: pack3,
  });
  console.log("[3] rendered:", hybrid3.verifiedBlocksRendered);
  console.assert(hybrid3.bodyHtml.includes("강남 상가 인테리어 철거"), "project title present");

  // --- Test 4: no projects ---
  const store4: VendorProfileStore = { ...store3, projectExamples: [] };
  const pack4 = computeVerifiedAvailability({
    blocks: demoBlocks,
    adVendor: demoVendor,
    profile: store3.profiles[0],
    store: store4,
    keyword: "강남상가철거",
  });
  console.log("\n[4] no projects available:", pack4.availableVerifiedBlocks);
  console.assert(!pack4.availableVerifiedBlocks.includes("project_examples"), "no fake projects");
  const filtered4 = filterPlanWithVerifiedPack(plan3, demoBlocks, pack4);
  console.assert(
    filtered4.removed.some((r) => r.blockKey === "project_examples"),
    "project block removed"
  );
  const hybrid4 = assembleHybridBodyHtml({
    plan: filtered4.plan,
    writer: aiWriter(
      filtered4.plan.sections.filter((s) => !["project_examples", "company_information"].includes(s.blockKey)).map((s) => s.blockKey)
    ),
    pack: pack4,
  });
  console.assert(!hybrid4.bodyHtml.includes("가짜 시공"), "no invented cases");
  console.assert(!hybrid4.verifiedBlocksRendered.includes("project_examples"), "not rendered");

  console.log("\nAll PHASE 3 verified scenarios passed.");
}

run();
