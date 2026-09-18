import type { ContentBlueprintStore } from "./content-blueprint-types";
import { resolveBlueprintPool } from "./content-blueprint-store";
import type { BulkGroup } from "./types";

const DOG_HINT =
  /분양|강아지|반려견|애견|포메|푸들|말티|비숑|코커|시바|리트리버|허스키|치와와|요크|닥스|진도|웰시|골든|래브라도|스피츠|사모예드|보더콜리|프렌치|불독|시츄|페키|슈나|믹스견|반려견분양/;
const DEMO_HINT = /철거|해체|원상복구|폐기물처리|인테리어철거|상가철거|주택철거/;

export type ResolvedBlueprint = NonNullable<ReturnType<typeof resolveBlueprintPool>>;

export type IndustryResolveResult =
  | { ok: true; industryId: string; blueprintId: string; pool: ResolvedBlueprint; reason: string }
  | { ok: false; reason: string };

/**
 * Resolve industry/blueprint for bulk.
 * Prefer explicit BulkGroup fields; else keyword heuristics against active hub blueprints.
 */
export function resolveIndustryForBulk(
  store: ContentBlueprintStore,
  keyword: string,
  group: BulkGroup,
  opts?: { siteId?: string; vendorId?: string }
): IndustryResolveResult {
  const kw = String(keyword || "").trim();
  const explicitBlueprintId = String(group.blueprintId || "").trim();
  const explicitIndustryId = String(group.industryId || "").trim();

  if (explicitBlueprintId) {
    const pool = resolveBlueprintPool(store, explicitBlueprintId, {
      siteId: opts?.siteId,
      vendorId: opts?.vendorId || group.vendorId,
    });
    if (!pool?.blueprint || pool.blueprint.status === "disabled") {
      return { ok: false, reason: `지정 Blueprint를 쓸 수 없습니다: ${explicitBlueprintId}` };
    }
    if (pool.blueprint.status !== "active") {
      return { ok: false, reason: `Blueprint가 active가 아닙니다: ${explicitBlueprintId}` };
    }
    return {
      ok: true,
      industryId: pool.blueprint.industryId,
      blueprintId: pool.blueprint.id,
      pool,
      reason: "bulk_group.blueprintId",
    };
  }

  let industryId = explicitIndustryId;
  if (!industryId) {
    if (DEMO_HINT.test(kw)) industryId = "ind-demolition";
    else if (DOG_HINT.test(kw)) industryId = "ind-dog-adoption";
  }
  if (!industryId) {
    return { ok: false, reason: "키워드에서 업종을 찾지 못함 → legacy" };
  }

  const industry = store.industries.find((row) => row.id === industryId && row.status === "active");
  if (!industry) {
    return { ok: false, reason: `업종이 active가 아닙니다: ${industryId}` };
  }

  const blueprint =
    store.blueprints.find((row) => row.industryId === industryId && row.status === "active") ||
    store.blueprints.find((row) => row.industryId === industryId);
  if (!blueprint || blueprint.status === "disabled") {
    return { ok: false, reason: `업종에 사용 가능한 Blueprint 없음: ${industryId}` };
  }
  if (blueprint.status !== "active") {
    return { ok: false, reason: `Blueprint가 active가 아닙니다: ${blueprint.id}` };
  }

  const pool = resolveBlueprintPool(store, blueprint.id, {
    siteId: opts?.siteId,
    vendorId: opts?.vendorId || group.vendorId,
  });
  if (!pool) return { ok: false, reason: "Blueprint resolve 실패" };

  return {
    ok: true,
    industryId,
    blueprintId: blueprint.id,
    pool,
    reason: explicitIndustryId ? "bulk_group.industryId" : "keyword_heuristic",
  };
}
