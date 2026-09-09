import type { Post } from "./types";
import {
  extractPlaceName,
  getNearbyDistricts,
  getNearbyStations,
  getRegionFact,
  isSamePlaceRegion,
} from "./region-geo";

export type RegionContext = {
  place: string;
  official: string;
  regionInfo: string;
  nearbyAreas: string[];
  nearbyStations: string[];
  nearbyHeading: string;
  nearbyLead: string;
  stationHeading: string;
  stationLead: string;
  nearbyLabels: string[];
  stationLabels: string[];
};

function topicPhrase(keyword: string, categoryName?: string) {
  const kw = keyword.trim();
  if (kw) return kw;
  return categoryName?.trim() || "이 주제";
}

function hasBatchim(word: string) {
  const ch = word.replace(/\s+/g, "").slice(-1);
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

function waGwa(word: string) {
  return hasBatchim(word) ? "과" : "와";
}

function iraRa(word: string) {
  return hasBatchim(word) ? "이라" : "라";
}

export function seedNumber(...parts: Array<string | undefined | null>) {
  const text = parts.filter(Boolean).join("|");
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[Math.abs(seed + offset * 17) % items.length];
}

function pairMarks(landmarks: string[], seed: number) {
  if (landmarks.length === 0) return { text: "", last: "" };
  if (landmarks.length === 1) return { text: landmarks[0], last: landmarks[0] };
  const a = landmarks[seed % landmarks.length];
  const b = landmarks[(seed + 3) % landmarks.length];
  if (a === b) {
    const alt = landmarks[(seed + 1) % landmarks.length];
    return { text: `${a}${waGwa(a)} ${alt}`, last: alt };
  }
  return { text: `${a}${waGwa(a)} ${b}`, last: b };
}

function seoulNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function weekdayName(date: Date) {
  return ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][date.getDay()];
}

function dayPart(hour: number) {
  if (hour < 6) return "새벽";
  if (hour < 11) return "아침";
  if (hour < 16) return "낮";
  if (hour < 18) return "오후";
  if (hour < 22) return "저녁";
  return "밤";
}

export function timeGreeting(_dateIso?: string | null, seed = 0): string {
  const now = seoulNow();
  const day = weekdayName(now);
  const part = dayPart(now.getHours());
  const lines = [
    `벌써 ${day} ${part}시간이네요.`,
    `${day} ${part}이 다 됐네요. 동선만 짧게 정리해 봅니다.`,
    `지금은 ${day} ${part}이라, 방문 순서를 다시 한번 적어 둡니다.`,
    `${day} ${part} 무렵에 맞춰 본 메모입니다.`,
    `오늘이 ${day}이라 ${part} 시간대 기준으로 현장을 나눠 봤어요.`,
    `${part} 시간대네요. ${day}에 나가보신다면 이 순서가 편합니다.`,
  ];
  return pick(lines, seed, 2);
}

function publishAside(dateIso?: string | null, seed = 0): string {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";
  const published = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = weekdayName(published);
  if (seed % 3 !== 0) return "";
  const lines = [
    `글은 ${day}에 먼저 적어 두었습니다.`,
    `${day}에 올려 둔 내용을 오늘 기준으로 다시 맞춰 봤습니다.`,
    `처음 정리한 날은 ${day}이었어요.`,
  ];
  return pick(lines, seed, 5);
}

export function composeRegionInfo(input: {
  place: string;
  keyword: string;
  categoryName?: string;
  localNotes?: string;
  seed?: number;
  publishedAt?: string | null;
  weatherLine?: string;
}): string {
  const seed = input.seed ?? seedNumber(input.place, input.keyword);
  const fact = getRegionFact(input.place);
  const topic = topicPhrase(input.keyword, input.categoryName);
  const note = (input.localNotes || "").trim();
  const nearby = input.place ? getNearbyDistricts(input.place) : [];
  const stations = input.place ? getNearbyStations(input.place) : [];
  const nearbyA = nearby[seed % Math.max(nearby.length, 1)] || "";
  const nearbyB = nearby[(seed + 2) % Math.max(nearby.length, 1)] || "";
  const nearbyC = nearby[(seed + 4) % Math.max(nearby.length, 1)] || "";
  const station = stations[seed % Math.max(stations.length, 1)] || "";
  const stationB = stations[(seed + 1) % Math.max(stations.length, 1)] || "";
  const greeting = timeGreeting(input.publishedAt, seed);
  const published = publishAside(input.publishedAt, seed);
  const chunks: string[] = [];

  if (fact) {
    const marks = pairMarks(fact.landmarks, seed);
    const markOne = fact.landmarks[seed % fact.landmarks.length];
    const markTwo = fact.landmarks[(seed + 1) % fact.landmarks.length];
    const hooks = fact.hooks?.length ? fact.hooks : [fact.hook];
    const hook = pick(hooks, seed, 1);
    const hookB = pick(hooks, seed, 4);
    const templates = [
      `${fact.official}${eunNeun(fact.official)} ${marks.text}${iGa(marks.last)} 있어 ${topic}${eulReul(topic)} 알아볼 때도 ${hook} 지역입니다.`,
      `${topic}${eulReul(topic)} ${fact.official}에서 찾을 때는 ${markOne} 쪽이 먼저 눈에 들어옵니다.`,
      `${fact.official} 생활권은 ${nearbyA || "인근 동"}${nearbyB && nearbyB !== nearbyA ? `·${nearbyB}` : ""}${waGwa(nearbyB && nearbyB !== nearbyA ? nearbyB : nearbyA || "동")} 맞닿아 있어 ${topic} 비교가 수월합니다.`,
      `${station ? `${station}에서 내리면 ` : ""}${fact.official} 중심으로 ${topic}${eulReul(topic)} 둘러보기 좋습니다. ${marks.text} 쪽이 이정표가 됩니다.`,
      `${fact.official}${eunNeun(fact.official)} ${hook} 편입니다. 특히 ${marks.text} 주변을 먼저 보면 동선이 빨리 잡힙니다.`,
      `${topic} 문의가 이어지는 ${fact.official}${eunNeun(fact.official)} ${markTwo}부터 천천히 보는 분들이 많습니다.`,
      `${nearbyA || fact.official}만 보지 말고 ${nearbyB || markOne}까지 이어서 보면 ${topic} 선택이 분명해집니다.`,
      `${station && stationB && station !== stationB ? `${station}${waGwa(station)} ${stationB} 사이` : fact.official}${eulReul(station && stationB && station !== stationB ? "사이" : fact.official)} 기준으로 ${topic}${eulReul(topic)} 짧게 훑는 동선이 잘 맞습니다.`,
      `${markOne} 근처에서 ${topic}${eulReul(topic)} 찾고 있다면, ${fact.official}${eunNeun(fact.official)} ${hookB} 곳입니다.`,
      `한낮이든 저녁이든 ${fact.official}에서는 ${nearbyC || nearbyA || "인근"}${eulReul(nearbyC || nearbyA || "인근")} 끼고 ${topic} 현장을 나눠 보기 좋습니다.`,
      `${topic}${eunNeun(topic)} ${fact.official}에서 검색량이 꾸준한 편입니다. ${markOne}${eulReul(markOne)} 기점으로 보면 헤매지 않습니다.`,
      `${fact.official}${eulReul(fact.official)} 처음 오시는 분은 ${station || markOne}부터 잡아 보세요. ${topic} 비교가 빨라집니다.`,
      `${hook} ${fact.official}${iraRa(fact.official)}, ${topic}${eulReul(topic)} 볼 때 ${nearbyA || "옆 동네"}${eulReul(nearbyA || "옆 동네")} 빼먹으면 아쉽습니다.`,
    ];
    chunks.push(pick(templates, seed));
  } else if (input.place) {
    const extra = nearby.length ? ` 인근 ${nearby.slice(0, 3).join(", ")}과도 생활권이 겹칩니다.` : "";
    const templates = [
      `${input.place}${eunNeun(input.place)} ${topic}${eulReul(topic)} 찾는 분들이 방문 동선과 생활권을 기준으로 함께 검색하는 지역입니다.${extra}`,
      `${topic}${eulReul(topic)} ${input.place}에서 볼 때는 ${nearbyA || "인근 생활권"}부터 이어서 보는 경우가 많습니다.`,
      `${input.place}${eunNeun(input.place)} 한 지점만 보기보다 ${nearbyA || "근처"}${nearbyB ? `${waGwa(nearbyA || "근처")} ${nearbyB}` : ""}${eulReul(nearbyB || nearbyA || "근처")} 묶어 비교하기 좋은 곳입니다.`,
      `${station ? `${station}${eulReul(station)} 기점으로 ` : ""}${input.place}에서 ${topic} 동선을 짧게 나누면 시간이 덜 듭니다.`,
      `${input.place} 쪽 ${topic}${eunNeun(topic)} ${nearbyA || "인근"}${eulReul(nearbyA || "인근")} 같이 검색하는 패턴이 반복됩니다.`,
      `${input.place}에서 ${topic} 문의가 오면, 한 지점보다 주변 생활권을 먼저 적어 두는 편이 낫습니다.`,
      `${topic}${eulReul(topic)} ${input.place} 기준으로 정리하면 방문 순서가 빨리 잡힙니다.`,
      `${input.place}${eunNeun(input.place)} 처음 오시는 분도 ${topic} 현장을 짧게 나눠 보기 좋은 편입니다.`,
    ];
    chunks.push(pick(templates, seed));
  }

  if (fact || input.place) {
    chunks.push(
      pick(
        [
          `${input.place || "이 지역"} 안에서도 동선을 둘로 나누면 비교가 빨라집니다.`,
          `한 곳만 보기보다 주변을 짧게 이어서 보는 편이 낫습니다.`,
          `${topic} 선택은 현장 두세 곳을 나란히 보면 분명해집니다.`,
          `같은 생활권이라도 들어가는 길부터 다르게 보는 분들이 많습니다.`,
          `방문 순서를 아침·저녁으로 나눠 적어도 ${topic} 비교가 수월합니다.`,
        ],
        seed,
        12
      )
    );
    if (greeting) chunks.push(greeting);
    if (input.weatherLine) chunks.push(input.weatherLine);
    if (published) chunks.push(published);
  }
  if (note) chunks.push(note);
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function rotate<T>(items: T[], seed: number) {
  if (items.length < 2) return items;
  const start = seed % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function nearbyHeading(place: string, seed: number) {
  return pick(
    [
      `${place} 인근에서 함께 찾는 곳`,
      `${place} 생활권에서 같이 보는 동네`,
      `${place} 근처, 같이 검색되는 곳`,
      `${place}와 이어서 둘러보는 근방`,
      `${place}에서 함께 비교하는 동네`,
    ],
    seed,
    6
  );
}

function nearbyLead(place: string, keyword: string, seed: number) {
  return pick(
    [
      `${place}에서 ${keyword} 알아보는 분들이 생활권으로 함께 검색하는 근방입니다.`,
      `${keyword}${eulReul(keyword)} ${place}에서 볼 때 옆동네까지 이어서 비교하는 경우가 많습니다.`,
      `${place}만 보지 않고 아래 동네를 같이 넣으면 ${keyword} 선택이 분명해집니다.`,
      `실제 방문 동선 기준으로 ${place} 주변에서 ${keyword}와 함께 검색되는 곳입니다.`,
      `${place} 생활권과 붙어 있어 ${keyword} 현장을 하루에 나눠 보기 좋습니다.`,
    ],
    seed,
    7
  );
}

function stationHeading(place: string, seed: number) {
  return pick(
    [
      `${place} 인근 지하철역`,
      `${place}에서 같이 검색되는 역`,
      `${place} 통학·방문 기준 역`,
      `${place} 동선에 자주 올라오는 역`,
    ],
    seed,
    8
  );
}

function stationLead(keyword: string, seed: number) {
  return pick(
    [
      `통학·방문 거리를 기준으로 함께 검색되는 역입니다.`,
      `${keyword} 현장을 볼 때 내려서 걷기 좋은 역을 모아 두었습니다.`,
      `역에서 내려 짧게 이동하는 분들이 자주 같이 찾는 곳입니다.`,
      `대중교통으로 비교 방문할 때 기준이 되는 역입니다.`,
    ],
    seed,
    9
  );
}

function formatNearbyLabel(area: string, keyword: string, seed: number, index: number) {
  return pick(
    [`${area} ${keyword}`, `${area}에서 보는 ${keyword}`, `${area} · ${keyword}`, `${area} 쪽 ${keyword}`],
    seed,
    10 + index
  );
}

function formatStationLabel(station: string, keyword: string, seed: number, index: number) {
  return pick(
    [`${station} ${keyword}`, `${station}에서 찾는 ${keyword}`, `${station} · ${keyword}`, `${keyword} ${station}`],
    seed,
    20 + index
  );
}

export function resolveRegionContext(
  post: Pick<
    Post,
    | "id"
    | "slug"
    | "region"
    | "focusKeyword"
    | "title"
    | "regionInfo"
    | "nearbyAreas"
    | "nearbyStations"
    | "publishedAt"
  >,
  extra?: { categoryName?: string; localNotes?: string; weatherLine?: string }
): RegionContext | null {
  const place =
    extractPlaceName(post.region, post.focusKeyword, post.title) || (post.region || "").trim();
  const keyword = (post.focusKeyword || post.title || "").trim();
  const seed = seedNumber(post.id, post.slug, post.publishedAt, keyword, place);
  const stored = String(post.regionInfo || "").trim();
  const infoPlace = extractPlaceName(stored);
  const regionInfo = stored && (!infoPlace || isSamePlaceRegion(place, infoPlace)) ? stored : "";
  if (!place) return null;

  const itemFits = (item: string) => {
    const found = extractPlaceName(item);
    if (!found) return true;
    return isSamePlaceRegion(place, found);
  };
  const storedAreas = post.nearbyAreas?.length ? post.nearbyAreas : [];
  const storedStations = post.nearbyStations?.length ? post.nearbyStations : [];
  const nearbyAreas = rotate(
    storedAreas.length && storedAreas.every(itemFits) ? storedAreas : place ? getNearbyDistricts(place) : storedAreas,
    seed
  );
  const nearbyStations = rotate(
    storedStations.length && storedStations.every(itemFits)
      ? storedStations
      : place
        ? getNearbyStations(place)
        : storedStations,
    seed + 3
  );

  return {
    place,
    official: getRegionFact(place)?.official || place,
    regionInfo,
    nearbyAreas,
    nearbyStations,
    nearbyHeading: nearbyHeading(place || "이 지역", seed),
    nearbyLead: nearbyLead(place || "이 지역", keyword || "이 주제", seed),
    stationHeading: stationHeading(place || "이 지역", seed),
    stationLead: stationLead(keyword || "이 주제", seed),
    nearbyLabels: nearbyAreas.map((area, index) => formatNearbyLabel(area, keyword || area, seed, index)),
    stationLabels: nearbyStations.map((station, index) => formatStationLabel(station, keyword || station, seed, index)),
  };
}
