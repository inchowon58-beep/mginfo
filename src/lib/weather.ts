import { getRegionFact, lookupRegionCoords, normalizePlaceKey } from "./region-geo";

function hasBatchim(word: string) {
  const ch = word.replace(/\s+/g, "").slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function eunNeun(word: string) {
  return hasBatchim(word) ? "은" : "는";
}

function iGa(word: string) {
  return hasBatchim(word) ? "이" : "가";
}

type WeatherSnap = {
  code: number;
  temp: number | null;
  label: string;
};

const cache = new Map<string, { at: number; snap: WeatherSnap | null }>();
const TTL = 30 * 60 * 1000;

function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code <= 3) return "구름";
  if (code <= 48) return "안개";
  if (code <= 57) return "이슬비";
  if (code <= 67 || (code >= 80 && code <= 82)) return "비";
  if (code <= 77 || code === 85 || code === 86) return "눈";
  if (code >= 95) return "뇌우";
  return "흐림";
}

export function lookupCoords(place: string): { lat: number; lng: number } | null {
  return lookupRegionCoords(place);
}

export async function getPlaceWeather(place: string): Promise<WeatherSnap | null> {
  const key = normalizePlaceKey(place) || place.trim();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.snap;
  const coords = lookupCoords(key);
  if (!coords) {
    cache.set(key, { at: Date.now(), snap: null });
    return null;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=weather_code,temperature_2m&timezone=Asia%2FSeoul`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error("weather");
    const data = (await res.json()) as {
      current?: { weather_code?: number; temperature_2m?: number };
    };
    const code = Number(data.current?.weather_code);
    if (Number.isNaN(code)) throw new Error("weather-code");
    const snap: WeatherSnap = {
      code,
      temp: typeof data.current?.temperature_2m === "number" ? data.current.temperature_2m : null,
      label: weatherLabel(code),
    };
    cache.set(key, { at: Date.now(), snap });
    return snap;
  } catch {
    cache.set(key, { at: Date.now(), snap: null });
    return null;
  }
}

export function weatherSentence(place: string, snap: WeatherSnap | null, seed: number): string {
  if (!snap) return "";
  const name = getRegionFact(place)?.official || place;
  const raining = snap.label === "비" || snap.label === "이슬비" || snap.label === "뇌우";
  const temp = snap.temp != null ? ` ${Math.round(snap.temp)}도쯤이고` : "";
  const lines = raining
    ? [
        `오늘 ${name}${eunNeun(name)} ${snap.label} 소식이 있는데, 다른 동네는 어떤지 모르겠네요.`,
        `오늘은 ${name}에 ${snap.label} 예보라서, 현장 보러 가실 분은 동선을 짧게 잡는 게 편합니다.`,
        `${name} 쪽으로는 오늘 ${snap.label}${iGa(snap.label)} 걸려 있네요. 실내 상담부터 잡아도 괜찮습니다.`,
        `${name}${eunNeun(name)} 오늘${temp} ${snap.label}${iGa(snap.label)} 있어, 우산 없이 길게 걷기엔 애매합니다.`,
      ]
    : snap.label === "맑음"
      ? [
          `오늘 ${name}${eunNeun(name)} 하늘이 맑아서, 한번 둘러보기 나쁘지 않은 날씨입니다.`,
          `오늘은 ${name} 쪽이 맑습니다. 다른 곳은 잘 모르겠지만, 여기서는 걷기 괜찮은 편이에요.`,
          `맑은 날이라 ${name} 공원을 끼고 현장을 보기 좋습니다.`,
          `${name}${eunNeun(name)} 오늘${temp} 맑아서 낮 시간대 방문이 부담 없습니다.`,
        ]
      : snap.label === "눈"
        ? [
            `오늘 ${name}${eunNeun(name)} 눈 소식이 있어서, 방문은 낮 시간대가 조금 더 편할 수 있습니다.`,
            `${name}${eunNeun(name)} 오늘 눈 소식이 있네요. 역 근처부터 짧게 보는 걸 권합니다.`,
            `오늘은 ${name}에 눈이 있어, 다른 동네 사정은 잘 모르겠지만 여기서는 동선을 줄이는 게 낫습니다.`,
          ]
        : [
            `오늘 ${name}${eunNeun(name)} ${snap.label}${iGa(snap.label)} 끼어 있어서, 실내부터 보고 바깥 산책은 나눠도 됩니다.`,
            `오늘은 ${name} 하늘이 ${snap.label} 쪽입니다. 다른 동네 날씨는 잘 모르겠네요.`,
            `${name}${eunNeun(name)} 오늘 ${snap.label} 낀 날씨라, 일정은 여유 있게 잡는 편이 좋습니다.`,
            `${name}${eunNeun(name)} 오늘${temp} ${snap.label}라 사진보다 실제 동선이 더 중요합니다.`,
          ];
  return lines[Math.abs(seed) % lines.length] || lines[0];
}
