/**
 * 주소 미입력 시 키워드 지역 → 시/구/동 + 업체명 자동 주소
 * 예: 부천두피문신 + 필릭스스칼프 → "부천시 원미구 상동 필릭스스칼프"
 */

export type RegionAddressHint = {
  city: string;
  district?: string;
  dong: string;
};

/** 대표 지역 힌트 (키워드에 포함되면 매칭) — 긴 키부터 검사 */
export const REGION_ADDRESS_HINTS: Array<{ keys: string[]; hint: RegionAddressHint }> = [
  { keys: ["청라"], hint: { city: "인천광역시 서구", dong: "청라동" } },
  { keys: ["송도"], hint: { city: "인천광역시 연수구", dong: "송도동" } },
  { keys: ["부평"], hint: { city: "인천광역시 부평구", dong: "부평동" } },
  { keys: ["계양"], hint: { city: "인천광역시 계양구", dong: "계산동" } },
  { keys: ["인천"], hint: { city: "인천광역시 서구", dong: "청라동" } },
  { keys: ["부천"], hint: { city: "부천시", district: "원미구", dong: "상동" } },
  { keys: ["평택"], hint: { city: "평택시", dong: "비전동" } },
  { keys: ["안산"], hint: { city: "안산시", district: "단원구", dong: "고잔동" } },
  { keys: ["수원"], hint: { city: "수원시", district: "영통구", dong: "영통동" } },
  { keys: ["성남", "분당"], hint: { city: "성남시", district: "분당구", dong: "정자동" } },
  { keys: ["고양", "일산"], hint: { city: "고양시", district: "일산서구", dong: "주엽동" } },
  { keys: ["김포"], hint: { city: "김포시", dong: "장기동" } },
  { keys: ["파주"], hint: { city: "파주시", dong: "금촌동" } },
  { keys: ["시흥"], hint: { city: "시흥시", dong: "정왕동" } },
  { keys: ["화성", "동탄"], hint: { city: "화성시", dong: "반송동" } },
  { keys: ["용인"], hint: { city: "용인시", district: "수지구", dong: "죽전동" } },
  { keys: ["안양"], hint: { city: "안양시", district: "동안구", dong: "평촌동" } },
  { keys: ["의정부"], hint: { city: "의정부시", dong: "의정부동" } },
  { keys: ["남양주"], hint: { city: "남양주시", dong: "다산동" } },
  { keys: ["하남"], hint: { city: "하남시", dong: "미사동" } },
  { keys: ["광명"], hint: { city: "광명시", dong: "철산동" } },
  { keys: ["군포"], hint: { city: "군포시", dong: "산본동" } },
  { keys: ["오산"], hint: { city: "오산시", dong: "원동" } },
  { keys: ["강남"], hint: { city: "서울특별시", district: "강남구", dong: "역삼동" } },
  { keys: ["서초"], hint: { city: "서울특별시", district: "서초구", dong: "서초동" } },
  { keys: ["송파"], hint: { city: "서울특별시", district: "송파구", dong: "잠실동" } },
  { keys: ["강서"], hint: { city: "서울특별시", district: "강서구", dong: "마곡동" } },
  { keys: ["마포"], hint: { city: "서울특별시", district: "마포구", dong: "상암동" } },
  { keys: ["서울"], hint: { city: "서울특별시", district: "강남구", dong: "역삼동" } },
  { keys: ["수원"], hint: { city: "수원시", district: "영통구", dong: "영통동" } },
  { keys: ["대전"], hint: { city: "대전광역시", district: "서구", dong: "둔산동" } },
  { keys: ["대구"], hint: { city: "대구광역시", district: "수성구", dong: "범어동" } },
  { keys: ["부산"], hint: { city: "부산광역시", district: "해운대구", dong: "우동" } },
  { keys: ["광주"], hint: { city: "광주광역시", district: "서구", dong: "치평동" } },
  { keys: ["울산"], hint: { city: "울산광역시", district: "남구", dong: "삼산동" } },
  { keys: ["제주"], hint: { city: "제주시", dong: "연동" } },
];

export function extractRegionLabel(keyword: string): string {
  const stripped = String(keyword || "")
    .replace(/두피문신|스칼프문신|헤어라인문신|SMP|smp|시술|교육|센터|스튜디오/gi, "")
    .replace(/\s+/g, "")
    .trim();
  return stripped || "지역";
}

export function findRegionHint(keyword: string): RegionAddressHint | null {
  const text = String(keyword || "");
  for (const row of REGION_ADDRESS_HINTS) {
    if (row.keys.some((key) => text.includes(key))) return row.hint;
  }
  return null;
}

/** 주소 비었을 때: "부천시 원미구 상동 필릭스스칼프" */
export function autoAddressFromKeyword(keyword: string, brandName: string): string {
  const brand = String(brandName || "").trim() || "스튜디오";
  const hint = findRegionHint(keyword);
  if (hint) {
    return [hint.city, hint.district, hint.dong, brand].filter(Boolean).join(" ");
  }
  const region = extractRegionLabel(keyword);
  if (region && region !== "지역") {
    return `${region} ${brand}`.trim();
  }
  return brand;
}

export function resolveVendorAddress(input: {
  address?: string;
  keyword?: string;
  name?: string;
}): string {
  const typed = String(input.address || "").trim();
  if (typed) return typed;
  return autoAddressFromKeyword(String(input.keyword || ""), String(input.name || ""));
}
