import { extractPlaceName } from "./region-geo";
import { normalizeTitle, titleTokens } from "./title-uniqueness";

const PLACE_HINTS = [
  "배곧",
  "청라",
  "송도",
  "강남",
  "서초",
  "송파",
  "마포",
  "분당",
  "판교",
  "일산",
  "수원",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "동탄",
  "위례",
  "검단",
  "운정",
  "광교",
  "동탄",
];

/** Strip region tokens so region-swap clones can be detected. */
export function normalizeRegionAway(text: string, extraPlaces: string[] = []): string {
  let out = String(text || "");
  const places = [...new Set([...PLACE_HINTS, ...extraPlaces.map((p) => p.trim()).filter(Boolean)])];
  for (const place of places) {
    if (place.length < 2) continue;
    out = out.split(place).join(" ");
  }
  return normalizeTitle(out);
}

export function regionNormalizedSimilarity(a: string, b: string, places: string[] = []): number {
  const na = normalizeRegionAway(a, places);
  const nb = normalizeRegionAway(b, places);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(titleTokens(na));
  const tb = new Set(titleTokens(nb));
  if (!ta.size || !tb.size) {
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length <= nb.length ? nb : na;
    if (shorter.length >= 12 && longer.includes(shorter)) return shorter.length / longer.length;
    return 0;
  }
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

export function extractPlacesFromKeyword(keyword: string): string[] {
  const place = extractPlaceName(keyword);
  const found = PLACE_HINTS.filter((p) => keyword.includes(p));
  return [...new Set([place, ...found].filter(Boolean))] as string[];
}

/** Word-trigram Jaccard on region-normalized plain text. Soft threshold for WARN. */
export function regionNormalizedBodySimilarity(aHtml: string, bHtml: string, places: string[] = []): number {
  const plain = (html: string) =>
    normalizeRegionAway(
      html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
      places
    );
  const a = plain(aHtml);
  const b = plain(bHtml);
  if (a.length < 80 || b.length < 80) return 0;
  const grams = (text: string) => {
    const words = text.split(" ").filter((w) => w.length >= 2);
    const set = new Set<string>();
    for (let i = 0; i < words.length - 2; i++) set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter += 1;
  const union = ga.size + gb.size - inter;
  return union ? inter / union : 0;
}
