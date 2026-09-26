import { extractPlaceName, getRegionFact } from "../region-geo";

/** Top region chips (modoo-style). Keys match normalized region labels. */
export const HUB_PORTAL_REGIONS: Array<{ key: string; label: string; aliases: string[] }> = [
  { key: "all", label: "전체", aliases: [] },
  { key: "seoul", label: "서울", aliases: ["서울", "서울시", "서울특별시"] },
  { key: "gyeonggi", label: "경기", aliases: ["경기", "경기도"] },
  { key: "incheon", label: "인천", aliases: ["인천", "인천시", "인천광역시"] },
  { key: "gangwon", label: "강원", aliases: ["강원", "강원도", "강원특별자치도"] },
  { key: "chungbuk", label: "충북", aliases: ["충북", "충청북도"] },
  { key: "chungnam", label: "충남", aliases: ["충남", "충청남도"] },
  { key: "daejeon", label: "대전", aliases: ["대전", "대전시", "대전광역시"] },
  { key: "sejong", label: "세종", aliases: ["세종", "세종시", "세종특별자치시"] },
  { key: "jeonbuk", label: "전북", aliases: ["전북", "전라북도", "전북특별자치도"] },
  { key: "jeonnam", label: "전남", aliases: ["전남", "전라남도"] },
  { key: "gwangju", label: "광주", aliases: ["광주광역시"] },
  { key: "gyeongbuk", label: "경북", aliases: ["경북", "경상북도"] },
  { key: "gyeongnam", label: "경남", aliases: ["경남", "경상남도"] },
  { key: "daegu", label: "대구", aliases: ["대구", "대구시", "대구광역시"] },
  { key: "ulsan", label: "울산", aliases: ["울산", "울산시", "울산광역시"] },
  { key: "busan", label: "부산", aliases: ["부산", "부산시", "부산광역시"] },
  { key: "jeju", label: "제주", aliases: ["제주", "제주도", "제주특별자치도"] },
];

function matchProvinceAliases(text: string): string {
  const value = String(text || "").trim();
  if (!value) return "";
  for (const row of HUB_PORTAL_REGIONS) {
    if (row.key === "all") continue;
    if (row.aliases.some((a) => value === a || value.startsWith(a))) return row.key;
  }
  for (const row of HUB_PORTAL_REGIONS) {
    if (row.key === "all") continue;
    if (row.aliases.some((a) => value.includes(a))) return row.key;
  }
  // 광주 alone → 광주광역시 (경기도 광주시는 catalog official로 분기)
  if (value === "광주" || value.startsWith("광주 ")) return "gwangju";
  return "";
}

/**
 * Map free-text region / title to a top-level province chip key.
 * Uses catalog place names (진주, 진해, 포항 …) so city titles land in 경남/경북 등.
 */
export function normalizeRegionKey(raw: string): string {
  const text = String(raw || "").trim();
  if (!text) return "";

  const direct = matchProvinceAliases(text);
  if (direct) return direct;

  const place = extractPlaceName(text);
  if (place) {
    const official = String(getRegionFact(place)?.official || "").trim();
    if (official) {
      const fromOfficial = matchProvinceAliases(official);
      if (fromOfficial) return fromOfficial;
    }
    const fromPlace = matchProvinceAliases(place);
    if (fromPlace) return fromPlace;
  }

  return "";
}

export function regionLabel(key: string): string {
  return HUB_PORTAL_REGIONS.find((r) => r.key === key)?.label || key;
}

/** Resolve chip key for a feed post (stored region, then title/description fallback). */
export function resolvePostRegionKey(post: {
  region?: string;
  title?: string;
  description?: string;
}): string {
  const stored = String(post.region || "").trim();
  if (stored && HUB_PORTAL_REGIONS.some((r) => r.key === stored)) return stored;
  return (
    normalizeRegionKey(stored) ||
    normalizeRegionKey(String(post.title || "")) ||
    normalizeRegionKey(String(post.description || "")) ||
    ""
  );
}
