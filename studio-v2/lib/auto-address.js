/** 주소 미입력 시 키워드 지역 → 시/구/동 + 업체명 (studio-v2용 JS) */

const REGION_ADDRESS_HINTS = [
  { keys: ["청라"], hint: { city: "인천광역시 서구", dong: "청라동" } },
  { keys: ["송도"], hint: { city: "인천광역시 연수구", dong: "송도동" } },
  { keys: ["부평"], hint: { city: "인천광역시 부평구", dong: "부평동" } },
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
  { keys: ["강남"], hint: { city: "서울특별시", district: "강남구", dong: "역삼동" } },
  { keys: ["서초"], hint: { city: "서울특별시", district: "서초구", dong: "서초동" } },
  { keys: ["송파"], hint: { city: "서울특별시", district: "송파구", dong: "잠실동" } },
  { keys: ["서울"], hint: { city: "서울특별시", district: "강남구", dong: "역삼동" } },
  { keys: ["부산"], hint: { city: "부산광역시", district: "해운대구", dong: "우동" } },
  { keys: ["대구"], hint: { city: "대구광역시", district: "수성구", dong: "범어동" } },
  { keys: ["대전"], hint: { city: "대전광역시", district: "서구", dong: "둔산동" } },
  { keys: ["광주"], hint: { city: "광주광역시", district: "서구", dong: "치평동" } },
  { keys: ["제주"], hint: { city: "제주시", dong: "연동" } },
];

function findRegionHint(keyword) {
  const text = String(keyword || "");
  for (const row of REGION_ADDRESS_HINTS) {
    if (row.keys.some((key) => text.includes(key))) return row.hint;
  }
  return null;
}

function autoAddressFromKeyword(keyword, brandName) {
  const brand = String(brandName || "").trim() || "스튜디오";
  const hint = findRegionHint(keyword);
  if (hint) {
    return [hint.city, hint.district, hint.dong, brand].filter(Boolean).join(" ");
  }
  const region = String(keyword || "")
    .replace(/두피문신|스칼프문신|헤어라인문신|SMP|smp|시술|교육|센터|스튜디오/gi, "")
    .replace(/\s+/g, "")
    .trim();
  if (region) return `${region} ${brand}`.trim();
  return brand;
}

function resolveVendorAddress({ address, keyword, name }) {
  const typed = String(address || "").trim();
  if (typed) return typed;
  return autoAddressFromKeyword(keyword, name);
}

module.exports = { autoAddressFromKeyword, resolveVendorAddress };
