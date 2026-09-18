import type { ContentBlock } from "./content-blueprint-types";
import type { PagePlan, PagePlanSection } from "./page-plan-types";
import type { AdVendor, BulkGroup } from "./types";

/** Verified facts available to Writer. Missing keys mean “do not invent”. */
export type VerifiedContext = {
  vendorName?: string;
  phone?: string;
  address?: string;
  website?: string;
  kakao?: string;
  placeUrl?: string;
  bizNo?: string;
  notes?: string;
  /** Present only when real animal inventory is available (PHASE 2: usually absent). */
  animals?: unknown;
  projectCases?: unknown;
  businessHours?: string;
  consultationMethod?: string;
};

export function buildVerifiedContext(group: BulkGroup, vendor?: AdVendor | null): VerifiedContext {
  const ctx: VerifiedContext = {};
  const name = (vendor?.name || group.vendorName || "").trim();
  const phone = (vendor?.phone || group.vendorPhone || "").trim();
  const address = (vendor?.address || "").trim();
  const website = (vendor?.website || group.vendorWebsite || "").trim();
  const kakao = (vendor?.kakao || group.vendorKakao || "").trim();
  const placeUrl = (group.vendorPlaceUrl || "").trim();
  const bizNo = (vendor?.bizNo || "").trim();
  const notes = (vendor?.notes || "").trim();
  if (name) ctx.vendorName = name;
  if (phone) ctx.phone = phone;
  if (address) ctx.address = address;
  if (website) ctx.website = website;
  if (kakao) ctx.kakao = kakao;
  if (placeUrl) ctx.placeUrl = placeUrl;
  if (bizNo) ctx.bizNo = bizNo;
  if (notes) ctx.notes = notes;
  // animals / projectCases / businessHours intentionally omitted until real DBs exist
  return ctx;
}

function hasVerifiedData(block: ContentBlock, verified: VerifiedContext): boolean {
  if (!block.verifiedDataRequired) return true;
  const required = block.requiredData.length ? block.requiredData : inferRequiredKeys(block.key);
  if (!required.length) {
    // verified required but no keys listed — treat vendorName as minimum for store/company blocks
    if (block.key.includes("store") || block.key.includes("company") || block.key.includes("information")) {
      return Boolean(verified.vendorName);
    }
    return false;
  }
  return required.every((key) => {
    const value = (verified as Record<string, unknown>)[key];
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function inferRequiredKeys(blockKey: string): string[] {
  switch (blockKey) {
    case "available_animals":
      return ["animals"];
    case "project_examples":
      return ["projectCases"];
    case "store_information":
    case "company_information":
      return ["vendorName"];
    case "visit_information":
      return ["businessHours"];
    case "consultation":
      return ["consultationMethod"];
    default:
      return [];
  }
}

export function effectiveVerifiedRequired(block: ContentBlock | undefined, section: PagePlanSection): boolean {
  return Boolean(block?.verifiedDataRequired) || Boolean(section.mustUseVerifiedData);
}

export type FilterPlanResult = {
  plan: PagePlan;
  removed: Array<{ blockKey: string; reason: string }>;
};

/**
 * Drop sections that need verified data we do not have.
 * Blueprint.verifiedDataRequired always wins over Planner mustUseVerifiedData=false.
 */
export function filterPlanVerifiedSections(
  plan: PagePlan,
  blocks: ContentBlock[],
  verified: VerifiedContext
): FilterPlanResult {
  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const removed: Array<{ blockKey: string; reason: string }> = [];
  const sections: PagePlanSection[] = [];

  for (const section of plan.sections) {
    const block = byKey.get(section.blockKey);
    if (!block) {
      removed.push({ blockKey: section.blockKey, reason: "Blueprint에 없는 블록" });
      continue;
    }
    if (block.status === "disabled") {
      removed.push({ blockKey: section.blockKey, reason: "블록 disabled" });
      continue;
    }
    const needsVerified = effectiveVerifiedRequired(block, section);
    if (needsVerified && !hasVerifiedData(block, verified)) {
      removed.push({
        blockKey: section.blockKey,
        reason: `verifiedDataRequired인데 데이터 없음 (required: ${(block.requiredData.length
          ? block.requiredData
          : inferRequiredKeys(block.key)
        ).join(", ") || "n/a"})`,
      });
      continue;
    }
    sections.push({
      ...section,
      mustUseVerifiedData: needsVerified,
    });
  }

  return {
    plan: { ...plan, sections },
    removed,
  };
}

export function formatVerifiedContextForPrompt(verified: VerifiedContext): string {
  const lines: string[] = [];
  if (verified.vendorName) lines.push(`- 업체명: ${verified.vendorName}`);
  if (verified.address) lines.push(`- 주소: ${verified.address}`);
  if (verified.phone) lines.push(`- 전화: ${verified.phone}`);
  if (verified.website) lines.push(`- 웹사이트: ${verified.website}`);
  if (verified.kakao) lines.push(`- 카카오: ${verified.kakao}`);
  if (verified.bizNo) lines.push(`- 사업자번호: ${verified.bizNo}`);
  if (verified.businessHours) lines.push(`- 영업시간: ${verified.businessHours}`);
  if (verified.consultationMethod) lines.push(`- 상담방식: ${verified.consultationMethod}`);
  if (verified.notes) lines.push(`- 검증된 메모: ${verified.notes}`);
  if (verified.animals) lines.push(`- 개체 데이터: (제공됨)`);
  if (verified.projectCases) lines.push(`- 시공 사례: (제공됨)`);
  if (!lines.length) return "(검증된 업체·개체·사례 데이터 없음. 사실 단정 금지.)";
  return lines.join("\n");
}
