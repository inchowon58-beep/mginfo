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
  { key: "gwangju", label: "광주", aliases: ["광주", "광주시", "광주광역시"] },
  { key: "gyeongbuk", label: "경북", aliases: ["경북", "경상북도"] },
  { key: "gyeongnam", label: "경남", aliases: ["경남", "경상남도"] },
  { key: "daegu", label: "대구", aliases: ["대구", "대구시", "대구광역시"] },
  { key: "ulsan", label: "울산", aliases: ["울산", "울산시", "울산광역시"] },
  { key: "busan", label: "부산", aliases: ["부산", "부산시", "부산광역시"] },
  { key: "jeju", label: "제주", aliases: ["제주", "제주도", "제주특별자치도"] },
];

export function normalizeRegionKey(raw: string): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  for (const row of HUB_PORTAL_REGIONS) {
    if (row.key === "all") continue;
    if (row.aliases.some((a) => text === a || text.startsWith(a))) return row.key;
  }
  // "영월", "부산 해운대" 등 — 광역명이 본문에 포함되면 매칭
  for (const row of HUB_PORTAL_REGIONS) {
    if (row.key === "all") continue;
    if (row.aliases.some((a) => text.includes(a))) return row.key;
  }
  return "";
}

export function regionLabel(key: string): string {
  return HUB_PORTAL_REGIONS.find((r) => r.key === key)?.label || key;
}
