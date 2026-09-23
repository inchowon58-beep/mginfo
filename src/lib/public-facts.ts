import { PUBLIC_FACTS, PUBLIC_FACTS_UPDATED, type PublicFactRow } from "./public-facts-data";

export { PUBLIC_FACTS_UPDATED };
import { getRegionFact } from "./region-geo";
import { seedNumber } from "./region-intro";

export type FactDomain = "pets" | "food" | "beauty" | "travel";

export type PublicFactRowItem = {
  label: string;
  value: string;
};

export type PublicFactSection = {
  heading: string;
  lead: string;
  items: string[];
  rows: PublicFactRowItem[];
  official: string;
  note: string;
};

export const PUBLIC_FACTS_BLOCK_CLASS = "public-facts-block";

const FIELDS = ["restaurants", "vets", "groomers", "salons", "stays", "shelters", "rescueDogs90", "tourSpots"] as const;

const byOfficial = new Map<string, PublicFactRow>();
for (const row of PUBLIC_FACTS) {
  byOfficial.set(row.official, row);
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[Math.abs(seed + offset * 17) % items.length];
}

function officialChain(official: string): string[] {
  const parts = official.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) out.push(parts.slice(0, i).join(" "));
  return out;
}

function mergeRows(official: string, rows: PublicFactRow[]): PublicFactRow {
  const merged: PublicFactRow = { official };
  for (const row of rows) {
    for (const key of FIELDS) {
      const n = Number(row[key] || 0);
      if (n > 0) merged[key] = Number(merged[key] || 0) + n;
    }
  }
  return merged;
}

export function detectFactDomain(keyword: string, categoryName?: string): FactDomain | null {
  const text = `${keyword} ${categoryName || ""}`;
  if (
    /분양|강아지|반려|펫\s|펫케어|고양이|동물병원|애견|견종|말티|푸들|포메|비숑|리트리버|코카|골든|두들|웰시|시바|치와와|스피츠|믹스견|입양|보호소|유기동물/.test(
      text
    )
  ) {
    return "pets";
  }
  if (/맛집|음식점|식당|카페|한식|중식|일식|고기집|횟집|베이커리|브런치|디저트|맛\s?집/.test(text)) return "food";
  if (/미용실|헤어|네일|피부관리|반영구|속눈썹|왁싱|메이크업|헤어샵/.test(text)) return "beauty";
  if (/여행|숙박|호텔|펜션|관광|캠핑|리조트|게스트하우스/.test(text)) return "travel";
  return null;
}

export function lookupPublicFacts(place: string): PublicFactRow | null {
  const label = String(place || "").trim();
  if (!label) return null;
  const official = getRegionFact(label)?.official || label;
  for (const key of officialChain(official)) {
    const hit = byOfficial.get(key);
    if (hit) return hit;
  }
  const kids = PUBLIC_FACTS.filter((row) => row.official === official || row.official.startsWith(`${official} `));
  if (!kids.length) return null;
  const merged = mergeRows(official, kids);
  return FIELDS.some((key) => Number(merged[key] || 0) > 0) ? merged : null;
}

function domainRows(row: PublicFactRow, domain: FactDomain): PublicFactRowItem[] {
  const items: PublicFactRowItem[] = [];
  const n = (value?: number) => Number(value || 0).toLocaleString("ko-KR");
  if (domain === "pets") {
    if (row.rescueDogs90) items.push({ label: "최근 90일 개 구조 공고", value: `${n(row.rescueDogs90)}건` });
    if (row.shelters) items.push({ label: "등록 동물보호센터", value: `${n(row.shelters)}곳` });
    if (row.vets) items.push({ label: "영업 중 동물병원 인허가", value: `${n(row.vets)}곳` });
    if (row.groomers) items.push({ label: "영업 중 동물미용 인허가", value: `${n(row.groomers)}곳` });
  }
  if (domain === "food" && row.restaurants) {
    items.push({ label: "영업 중 일반음식점 인허가", value: `${n(row.restaurants)}곳` });
  }
  if (domain === "beauty" && row.salons) {
    items.push({ label: "영업 중 미용업 인허가", value: `${n(row.salons)}곳` });
  }
  if (domain === "travel") {
    if (row.tourSpots) items.push({ label: "관광지 등록", value: `${n(row.tourSpots)}곳` });
    if (row.stays) items.push({ label: "관광숙박 인허가", value: `${n(row.stays)}곳` });
  }
  return items;
}

function domainItems(row: PublicFactRow, domain: FactDomain): string[] {
  return domainRows(row, domain).map((item) => `${item.label} ${item.value}`);
}

export function formatPublicFactMaterials(place: string, keyword: string, categoryName?: string): string {
  const domain = detectFactDomain(keyword, categoryName);
  if (!domain) return "";
  const row = lookupPublicFacts(place);
  if (!row) return "";
  const items = domainItems(row, domain);
  if (!items.length) return "";
  return `공공 저장본(사실 숫자만. 문장 틀로 복사하지 말 것. 상호를 지어내거나 추천 리스트로 쓰지 말 것):
- 지역: ${row.official}
- ${items.join("\n- ")}
- 기준일: ${PUBLIC_FACTS_UPDATED || "저장본"}
공공 숫자 표와 지역 기록은 서버가 본문 HTML 끝에 붙인다. 같은 표를 본문에 다시 쓰지 말고, 숫자는 이 동네에서 고르는 기준으로만 녹여라.`;
}

export function buildPublicFactSection(input: {
  place?: string;
  keyword?: string;
  categoryName?: string;
  postId?: string;
  slug?: string;
}): PublicFactSection | null {
  const place = String(input.place || "").trim();
  const keyword = String(input.keyword || "").trim();
  const domain = detectFactDomain(keyword, input.categoryName);
  if (!place || !keyword || !domain) return null;
  const row = lookupPublicFacts(place);
  if (!row) return null;
  const items = domainItems(row, domain);
  if (!items.length) return null;
  const seed = seedNumber(input.postId, input.slug, place, keyword, row.official);
  const where = row.official;
  const heading = pick(
    [
      `${place}에서 ${keyword}를 고를 때 숫자로 남는 맥락`,
      `${where} 공공 기록으로 본 ${keyword}`,
      `${keyword}, ${place}에서만 맞춰 보는 저장본`,
      `${place} ${keyword}를 다른 동네 글과 가르는 숫자`,
    ],
    seed,
    3
  );
  const lead = pick(
    [
      `아래는 ${where} 공개 통계 저장본입니다. 가게를 추천하는 목록이 아니라, 이 동네에서 ${keyword}를 볼 때 밀도와 여건을 가늠하는 재료입니다.`,
      `${keyword} 글을 ${place}에 붙이기 위해 인허가·보호 공고 숫자를 저장해 둔 값입니다. 상호를 나열하지 않습니다.`,
      `같은 업종이라도 ${where}의 규모가 다릅니다. 저장본 숫자만 사실이고, 방문 순서는 본문 기준으로 보시면 됩니다.`,
    ],
    seed,
    8
  );
  const note =
    PUBLIC_FACTS_UPDATED
      ? `저장본 ${PUBLIC_FACTS_UPDATED} · 국가동물보호정보시스템·지방인허가·한국관광공사 TourAPI. 폐업·이전은 반영이 늦을 수 있습니다.`
      : "공공 저장본. 폐업·이전은 반영이 늦을 수 있습니다.";
  return { heading, lead, items, rows: domainRows(row, domain), official: row.official, note };
}

export function hasPublicFactBlock(html: string): boolean {
  return new RegExp(`class="[^"]*${PUBLIC_FACTS_BLOCK_CLASS}`, "i").test(String(html || ""));
}

/** Region hub: show every stored count for the place, not one keyword domain. */
export function allPublicFactRows(place: string): PublicFactRowItem[] {
  const row = lookupPublicFacts(place);
  if (!row) return [];
  const domains: FactDomain[] = ["pets", "food", "beauty", "travel"];
  const seen = new Set<string>();
  const items: PublicFactRowItem[] = [];
  for (const domain of domains) {
    for (const item of domainRows(row, domain)) {
      if (seen.has(item.label)) continue;
      seen.add(item.label);
      items.push(item);
    }
  }
  return items;
}
