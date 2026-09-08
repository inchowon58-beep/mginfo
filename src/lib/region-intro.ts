import type { Post } from "./types";
import {
  extractPlaceName,
  getNearbyDistricts,
  getNearbyStations,
  getRegionFact,
} from "./region-geo";

export type RegionContext = {
  place: string;
  official: string;
  regionInfo: string;
  nearbyAreas: string[];
  nearbyStations: string[];
};

function topicPhrase(keyword: string, categoryName?: string) {
  const kw = keyword.trim();
  if (kw) return kw;
  return categoryName?.trim() || "이 주제";
}

function hasBatchim(word: string) {
  const ch = word[word.length - 1];
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function iGa(word: string) {
  return hasBatchim(word) ? "이" : "가";
}

function eulReul(word: string) {
  return hasBatchim(word) ? "을" : "를";
}

function eunNeun(word: string) {
  return hasBatchim(word) ? "은" : "는";
}

export function composeRegionInfo(input: {
  place: string;
  keyword: string;
  categoryName?: string;
  localNotes?: string;
}): string {
  const fact = getRegionFact(input.place);
  const topic = topicPhrase(input.keyword, input.categoryName);
  const note = (input.localNotes || "").trim();
  if (fact) {
    const marks = fact.landmarks.slice(0, 2);
    const last = marks[marks.length - 1] || fact.official;
    const markText = marks.length === 2 ? `${marks[0]}과 ${marks[1]}` : marks[0];
    const first = `${fact.official}${eunNeun(fact.official)} ${markText}${iGa(last)} 있어 ${topic}${eulReul(topic)} 알아볼 때도 ${fact.hook} 지역입니다.`;
    return note ? `${first} ${note}` : first;
  }
  if (input.place) {
    const nearby = getNearbyDistricts(input.place);
    const extra = nearby.length ? ` 인근 ${nearby.slice(0, 3).join(", ")}과도 생활권이 겹칩니다.` : "";
    const first = `${input.place}${eunNeun(input.place)} ${topic}${eulReul(topic)} 찾는 분들이 방문 동선과 생활권을 기준으로 함께 검색하는 지역입니다.${extra}`;
    return note ? `${first} ${note}` : first;
  }
  return "";
}

export function resolveRegionContext(
  post: Pick<Post, "region" | "focusKeyword" | "title" | "regionInfo" | "nearbyAreas" | "nearbyStations">,
  extra?: { categoryName?: string; localNotes?: string }
): RegionContext | null {
  const place =
    extractPlaceName(post.region, post.focusKeyword, post.title) || (post.region || "").trim();
  const keyword = (post.focusKeyword || post.title || "").trim();
  const storedInfo = (post.regionInfo || "").trim();
  const regionInfo =
    storedInfo ||
    composeRegionInfo({
      place,
      keyword,
      categoryName: extra?.categoryName,
      localNotes: extra?.localNotes,
    });
  if (!place && !regionInfo) return null;

  const nearbyAreas = post.nearbyAreas?.length ? post.nearbyAreas : place ? getNearbyDistricts(place) : [];
  const nearbyStations = post.nearbyStations?.length ? post.nearbyStations : place ? getNearbyStations(place) : [];

  return {
    place,
    official: getRegionFact(place)?.official || place,
    regionInfo,
    nearbyAreas,
    nearbyStations,
  };
}
