import { REGION_CATALOG } from "./region-catalog";

export type RegionFact = {
  official: string;
  landmarks: string[];
  hook: string;
  hooks?: string[];
};

const catalogFacts: Record<string, RegionFact> = {};
const catalogDistricts: Record<string, string[]> = {};
const catalogStations: Record<string, string[]> = {};
const catalogCoords: Record<string, { lat: number; lng: number }> = {};

for (const row of REGION_CATALOG) {
  const fact: RegionFact = {
    official: row.official,
    landmarks: row.landmarks,
    hook: row.hook,
  };
  for (const key of row.keys) {
    catalogFacts[key] = fact;
    catalogDistricts[key] = row.nearby;
    catalogStations[key] = row.stations;
    catalogCoords[key] = { lat: row.lat, lng: row.lng };
  }
}

/** Hand-tuned copy wins over the nationwide catalog for the same key. */
const HAND_NEARBY_DISTRICTS: Record<string, string[]> = {
  양재: ["서초동", "도곡동", "개포동", "내곡동", "우면동"],
  양재동: ["서초동", "도곡동", "개포동", "내곡동", "우면동"],
  서초: ["서초동", "반포동", "방배동", "양재동", "잠원동"],
  서초구: ["서초동", "반포동", "방배동", "양재동", "잠원동"],
  강남: ["신사동", "논현동", "역삼동", "삼성동", "대치동"],
  강남구: ["신사동", "논현동", "역삼동", "삼성동", "대치동"],
  역삼: ["강남동", "논현동", "삼성동", "서초동", "대치동"],
  삼성: ["대치동", "역삼동", "청담동", "잠실동", "논현동"],
  송파: ["잠실동", "문정동", "방이동", "석촌동", "가락동"],
  송파구: ["잠실동", "문정동", "방이동", "석촌동", "가락동"],
  잠실: ["신천동", "송파동", "석촌동", "방이동", "가락동"],
  부천: ["중동", "상동", "심곡동", "소사동", "역곡동"],
  중동: ["상동", "심곡동", "약대동", "송내동", "심곡본동"],
  상동: ["중동", "송내동", "심곡동", "약대동", "도당동"],
  송내: ["중동", "상동", "심곡동", "소사동", "역곡동"],
  역곡: ["소사동", "심곡본동", "원종동", "고강동", "오류동"],
  부평: ["삼산동", "부평동", "청천동", "갈산동", "십정동"],
  인천: ["부평구", "남동구", "연수구", "계양구", "서구"],
  송도: ["연수동", "청학동", "동춘동", "옥련동", "항동"],
  수원: ["영통동", "광교동", "매탄동", "인계동", "우만동"],
  영통: ["광교동", "매탄동", "망포동", "원천동", "이의동"],
  광교: ["이의동", "원천동", "하동", "영통동", "상현동"],
  성남: ["분당", "판교동", "서현동", "야탑동", "이매동"],
  분당: ["서현동", "야탑동", "이매동", "정자동", "수내동"],
  판교: ["백현동", "삼평동", "서현동", "정자동", "금토동"],
  일산: ["일산동", "백석동", "정발산동", "주엽동", "탄현동"],
  고양: ["일산동", "백석동", "화정동", "탄현동", "대화동"],
  용인: ["죽전동", "동백동", "보정동", "신봉동", "성복동"],
  동탄: ["청계동", "목동", "능동", "오산동", "반송동"],
  김포: ["장기동", "구래동", "운양동", "사우동", "풍무동"],
  과천: ["별양동", "중앙동", "갈현동", "부림동", "문원동"],
  마포: ["서교동", "합정동", "망원동", "연남동", "상수동"],
  홍대: ["서교동", "합정동", "연남동", "상수동", "망원동"],
  용산: ["이태원동", "한남동", "후암동", "원효로", "한강로"],
};

const HAND_NEARBY_STATIONS: Record<string, string[]> = {
  양재: ["양재역", "양재시민의숲역", "매봉역", "남부터미널역", "강남역"],
  양재동: ["양재역", "양재시민의숲역", "매봉역", "남부터미널역", "강남역"],
  서초: ["서초역", "교대역", "강남역", "양재역", "방배역"],
  서초구: ["서초역", "교대역", "강남역", "양재역", "방배역"],
  강남: ["강남역", "신논현역", "역삼역", "선릉역", "삼성역"],
  강남구: ["강남역", "신논현역", "역삼역", "선릉역", "삼성역"],
  역삼: ["역삼역", "강남역", "선릉역", "신논현역", "언주역"],
  삼성: ["삼성역", "선릉역", "종합운동장역", "봉은사역", "선정릉역"],
  송파: ["잠실역", "석촌역", "가락시장역", "문정역", "방이역"],
  송파구: ["잠실역", "석촌역", "가락시장역", "문정역", "방이역"],
  잠실: ["잠실역", "잠실새내역", "석촌역", "종합운동장역", "몽촌토성역"],
  부천: ["송내역", "중동역", "부천역", "역곡역", "소사역"],
  중동: ["중동역", "송내역", "부천시청역", "신중동역", "부천역"],
  상동: ["상동역", "부천시청역", "삼산체육관역", "송내역", "중동역"],
  송내: ["송내역", "중동역", "부천역", "역곡역", "소사역"],
  역곡: ["역곡역", "소사역", "부천역", "오류동역", "온수역"],
  부평: ["부평역", "부평구청역", "갈산역", "동암역", "부평시장역"],
  인천: ["인천역", "주안역", "부평역", "동춘역", "계양역"],
  송도: ["인천대입구역", "센트럴파크역", "테크노파크역", "동춘역", "캠퍼스타운역"],
  수원: ["수원역", "영통역", "광교역", "매탄권선역", "망포역"],
  영통: ["영통역", "망포역", "청명역", "매탄권선역", "광교역"],
  광교: ["광교역", "광교중앙역", "상현역", "영통역", "수지구청역"],
  성남: ["서현역", "이매역", "야탑역", "수내역", "정자역"],
  분당: ["서현역", "이매역", "야탑역", "수내역", "정자역"],
  판교: ["판교역", "정자역", "청계산입구역", "이매역", "서현역"],
  일산: ["일산역", "정발산역", "주엽역", "백석역", "탄현역"],
  고양: ["화정역", "백석역", "대화역", "일산역", "탄현역"],
  용인: ["기흥역", "수지구청역", "죽전역", "동백역", "보정역"],
  동탄: ["동탄역", "병점역", "서동탄역", "오산대역", "세마역"],
  김포: ["김포공항역", "풍무역", "구래역", "장기역", "운양역"],
  과천: ["과천역", "정부과천청사역", "선바위역", "대공원역", "경마공원역"],
  마포: ["홍대입구역", "합정역", "망원역", "공덕역", "마포역"],
  홍대: ["홍대입구역", "합정역", "상수역", "망원역", "신촌역"],
  용산: ["용산역", "이태원역", "녹사평역", "삼각지역", "신용산역"],
};

const HAND_COORDS: Record<string, { lat: number; lng: number }> = {
  양재: { lat: 37.4706, lng: 127.0407 },
  양재동: { lat: 37.4706, lng: 127.0407 },
  서초: { lat: 37.4837, lng: 127.0324 },
  강남: { lat: 37.4979, lng: 127.0276 },
  역삼: { lat: 37.5007, lng: 127.0366 },
  잠실: { lat: 37.5133, lng: 127.1001 },
  송파: { lat: 37.5146, lng: 127.106 },
  부천: { lat: 37.5035, lng: 126.766 },
  중동: { lat: 37.5036, lng: 126.766 },
  상동: { lat: 37.5058, lng: 126.7534 },
  송내: { lat: 37.4876, lng: 126.753 },
  역곡: { lat: 37.4851, lng: 126.8116 },
  소사: { lat: 37.4827, lng: 126.7956 },
  인천: { lat: 37.4563, lng: 126.7052 },
  성남: { lat: 37.4201, lng: 127.1266 },
  용인: { lat: 37.2411, lng: 127.1776 },
  김포: { lat: 37.6153, lng: 126.7156 },
  영통: { lat: 37.2595, lng: 127.0466 },
  수원: { lat: 37.2636, lng: 127.0286 },
  광교: { lat: 37.2947, lng: 127.0465 },
  분당: { lat: 37.3827, lng: 127.1189 },
  판교: { lat: 37.3948, lng: 127.1112 },
  일산: { lat: 37.658, lng: 126.7698 },
  고양: { lat: 37.6584, lng: 126.832 },
  송도: { lat: 37.3825, lng: 126.656 },
  부평: { lat: 37.4895, lng: 126.7245 },
  동탄: { lat: 37.1996, lng: 127.096 },
  과천: { lat: 37.4292, lng: 126.9879 },
  홍대: { lat: 37.5563, lng: 126.9236 },
  마포: { lat: 37.5663, lng: 126.9014 },
  용산: { lat: 37.5326, lng: 126.9905 },
};

const HAND_FACTS: Record<string, RegionFact> = {
  양재: {
    official: "서울특별시 서초구 양재동",
    landmarks: ["양재시민의숲", "양재천", "양재역 일대", "매봉산"],
    hook: "산책과 야외 활동을 함께 보기 좋은 인프라를 갖춘",
    hooks: [
      "산책과 야외 활동을 함께 보기 좋은 인프라를 갖춘",
      "시민의숲을 기점으로 동선을 나누기 쉬운",
      "양재천을 끼고 현장을 이어서 보기 좋은",
    ],
  },
  양재동: {
    official: "서울특별시 서초구 양재동",
    landmarks: ["양재시민의숲", "양재천", "양재역 일대"],
    hook: "산책과 야외 활동을 함께 보기 좋은 인프라를 갖춘",
    hooks: [
      "산책과 야외 활동을 함께 보기 좋은 인프라를 갖춘",
      "시민의숲을 기점으로 동선을 나누기 쉬운",
    ],
  },
  서초: {
    official: "서울특별시 서초구",
    landmarks: ["예술의전당", "서리풀공원", "교대역 일대"],
    hook: "주거와 업무 동선이 겹쳐 현장을 비교하기 쉬운",
    hooks: ["주거와 업무 동선이 겹쳐 현장을 비교하기 쉬운", "교대·서초 사이를 짧게 오가며 보기 좋은"],
  },
  강남: {
    official: "서울특별시 강남구",
    landmarks: ["강남역 일대", "테헤란로", "코엑스"],
    hook: "방문 동선과 대중교통 접근을 같이 보기 좋은",
    hooks: ["방문 동선과 대중교통 접근을 같이 보기 좋은", "역세권 사이를 이어서 비교하기 쉬운"],
  },
  역삼: {
    official: "서울특별시 강남구 역삼동",
    landmarks: ["테헤란로", "역삼역 일대", "선릉역 일대"],
    hook: "업무 지구와 생활권이 붙어 있어 비교 방문이 쉬운",
  },
  잠실: {
    official: "서울특별시 송파구 잠실동",
    landmarks: ["한강공원 잠실", "석촌호수", "롯데월드타워"],
    hook: "넓은 야외 공간과 주거 단지가 맞닿은",
  },
  송파: {
    official: "서울특별시 송파구",
    landmarks: ["석촌호수", "올림픽공원", "가락시장"],
    hook: "공원과 주거 단지를 기준으로 동선을 잡기 좋은",
  },
  부천: {
    official: "경기도 부천시",
    landmarks: ["중앙공원", "부천시청 일대", "상동호수공원", "원미공원", "부천역 지하상가", "복사골문화센터"],
    hook: "중동·상동 생활권과 붙어 현장을 이어서 보기 좋은",
    hooks: [
      "중동·상동 생활권과 붙어 현장을 이어서 보기 좋은",
      "역세권과 단지 사이를 짧게 오가며 비교하기 좋은",
      "시청 일대부터 하루 동선을 잡아보기 쉬운",
      "공원과 상권이 가까워 방문 순서를 나누기 편한",
    ],
  },
  중동: {
    official: "경기도 부천시 중동",
    landmarks: ["부천중앙공원", "현대백화점 중동", "신중동역"],
    hook: "주거 단지와 상업 시설이 붙어 방문 동선이 짧은",
    hooks: ["주거 단지와 상업 시설이 붙어 방문 동선이 짧은", "시청·백화점 쪽을 기준으로 비교하기 쉬운"],
  },
  상동: {
    official: "경기도 부천시 상동",
    landmarks: ["상동호수공원", "부천시청", "상동역"],
    hook: "호수공원과 주거 단지를 기준으로 둘러보기 좋은",
    hooks: ["호수공원과 주거 단지를 기준으로 둘러보기 좋은", "시청 일대와 호수공원을 이어서 보기 쉬운"],
  },
  송내: {
    official: "경기도 부천시 송내동",
    landmarks: ["송내역 일대", "중동 신도시", "송내역 남부"],
    hook: "역세권과 주거권이 바로 이어지는",
    hooks: ["역세권과 주거권이 바로 이어지는", "1호선 기준으로 중동까지 짧게 이어지는"],
  },
  수원: {
    official: "경기도 수원시",
    landmarks: ["수원화성", "광교호수공원", "수원역"],
    hook: "구도심과 신도시를 한 동선으로 비교하기 좋은",
    hooks: ["구도심과 신도시를 한 동선으로 비교하기 좋은", "역세권과 화성 일대를 나눠 보기 쉬운"],
  },
  광교: {
    official: "경기도 수원시 영통구 광교동",
    landmarks: ["광교호수공원", "광교중앙역", "광교호수공원 수변"],
    hook: "호수공원과 주거 단지가 붙어 현장을 보기 쉬운",
    hooks: ["호수공원과 주거 단지가 붙어 현장을 보기 쉬운", "호수 둘레를 기준으로 동선을 잡기 좋은"],
  },
  분당: {
    official: "경기도 성남시 분당구",
    landmarks: ["탄천", "서현역 일대", "정자역 일대"],
    hook: "계획 도시 동선이 분명해 비교 방문이 수월한",
    hooks: ["계획 도시 동선이 분명해 비교 방문이 수월한", "탄천과 역세권을 이어서 보기 좋은"],
  },
  판교: {
    official: "경기도 성남시 분당구 판교동",
    landmarks: ["판교테크노밸리", "낙생대공원", "판교역"],
    hook: "업무 지구와 주거권이 붙어 시간을 나눠 보기 좋은",
    hooks: ["업무 지구와 주거권이 붙어 시간을 나눠 보기 좋은", "테크노밸리와 주거 단지를 따로 보기 쉬운"],
  },
  일산: {
    official: "경기도 고양시 일산",
    landmarks: ["호수공원", "라페스타", "웨스턴돔"],
    hook: "넓은 공원과 상업 가로가 붙어 하루 동선을 짜기 쉬운",
    hooks: ["넓은 공원과 상업 가로가 붙어 하루 동선을 짜기 쉬운", "호수공원부터 상권까지 이어서 보기 좋은"],
  },
  송도: {
    official: "인천광역시 연수구 송도동",
    landmarks: ["센트럴파크", "커낼워크", "트리플스트리트"],
    hook: "공원과 수변 공간을 기준으로 현장을 보기 좋은",
    hooks: ["공원과 수변 공간을 기준으로 현장을 보기 좋은", "센트럴파크를 기점으로 동선을 나누기 쉬운"],
  },
  부평: {
    official: "인천광역시 부평구",
    landmarks: ["부평역 지하상가", "부평공원", "부평시장"],
    hook: "역세권 상권과 주거권이 밀착된",
    hooks: ["역세권 상권과 주거권이 밀착된", "지하상가와 시장 쪽을 짧게 오가며 보기 좋은"],
  },
  동탄: {
    official: "경기도 화성시 동탄",
    landmarks: ["동탄역", "동탄호수공원", "메타폴리스"],
    hook: "신도시 단지와 공원 동선을 같이 확인하기 좋은",
    hooks: ["신도시 단지와 공원 동선을 같이 확인하기 좋은", "역과 호수공원을 나눠 보기 쉬운"],
  },
  과천: {
    official: "경기도 과천시",
    landmarks: ["서울대공원", "과천중앙공원", "정부과천청사"],
    hook: "녹지와 주거 단지가 가까워 야외 활동을 함께 보기 좋은",
    hooks: ["녹지와 주거 단지가 가까워 야외 활동을 함께 보기 좋은", "대공원과 청사 일대를 기준으로 보기 쉬운"],
  },
  홍대: {
    official: "서울특별시 마포구 서교동",
    landmarks: ["홍대앞 거리", "경의선숲길", "상수역 일대"],
    hook: "골목 상권과 산책 동선이 겹치는",
    hooks: ["골목 상권과 산책 동선이 겹치는", "숲길과 골목을 이어서 둘러보기 좋은"],
  },
  마포: {
    official: "서울특별시 마포구",
    landmarks: ["한강공원 망원", "경의선숲길", "홍대입구역"],
    hook: "한강과 골목 상권을 이어서 둘러보기 좋은",
    hooks: ["한강과 골목 상권을 이어서 둘러보기 좋은", "망원·합정 쪽을 묶어 비교하기 쉬운"],
  },
  용산: {
    official: "서울특별시 용산구",
    landmarks: ["용산역", "이태원 경리단길", "남산 아래"],
    hook: "역세권과 주거·상업 가로가 짧게 이어지는",
    hooks: ["역세권과 주거·상업 가로가 짧게 이어지는", "용산역부터 이태원 쪽을 나눠 보기 좋은"],
  },
};

export const REGION_NEARBY_DISTRICTS: Record<string, string[]> = {
  ...catalogDistricts,
  ...HAND_NEARBY_DISTRICTS,
};

export const REGION_NEARBY_STATIONS: Record<string, string[]> = {
  ...catalogStations,
  ...HAND_NEARBY_STATIONS,
};

export const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  ...catalogCoords,
  ...HAND_COORDS,
};

export const REGION_FACTS: Record<string, RegionFact> = {
  ...catalogFacts,
  ...HAND_FACTS,
};

export function normalizePlaceKey(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, "")
    .replace(/(특별시|광역시|자치시|도)$/u, "")
    .replace(/(역|동|구|시|군|읍|면)$/u, "")
    .trim();
}

function lookupMap<T>(map: Record<string, T>, label: string): T | undefined {
  const trimmed = label.trim();
  const key = normalizePlaceKey(trimmed);
  return map[trimmed] || map[key] || map[`${key}동`] || map[`${key}구`];
}

export function getNearbyDistricts(label: string, limit = 5): string[] {
  return (lookupMap(REGION_NEARBY_DISTRICTS, label) || []).slice(0, limit);
}

export function getNearbyStations(label: string, limit = 5): string[] {
  return (lookupMap(REGION_NEARBY_STATIONS, label) || []).slice(0, limit);
}

export function getRegionFact(label: string): RegionFact | undefined {
  return lookupMap(REGION_FACTS, label);
}

export function formatRegionMaterials(place: string): string {
  const label = String(place || "").trim();
  if (!label) return "";
  const fact = getRegionFact(label);
  const nearby = getNearbyDistricts(label);
  const stations = getNearbyStations(label);
  const hints = fact ? [fact.hook, ...(fact.hooks || [])].filter(Boolean) : [];
  if (!fact) {
    return `지역 재료(사실만. 문장 틀로 복사하지 말고 이 글 배경으로만 쓸 것):
- 지역명: ${label}
- 근방: ${nearby.join(", ") || "(없음)"}
- 인근 역: ${stations.join(", ") || "(없음)"}`;
  }
  return `지역 재료(카탈로그 사실. 문장 틀로 복사하지 말고, 이 키워드를 이 동네에서 찾는 이야기로 녹일 것):
- 공식 지명: ${fact.official}
- 랜드마크: ${fact.landmarks.join(", ")}
- 지역 힌트: ${hints.join(" / ") || "(없음)"}
- 근방 동·구: ${nearby.join(", ") || "(없음)"}
- 인근 역: ${stations.join(", ") || "(없음)"}`;
}

export function lookupRegionCoords(label: string): { lat: number; lng: number } | null {
  return lookupMap(REGION_COORDS, label) || null;
}

const PLACE_KEYS = [...new Set([...Object.keys(REGION_FACTS), ...Object.keys(REGION_NEARBY_DISTRICTS)])].sort(
  (a, b) => b.length - a.length
);

export function extractPlaceName(...texts: Array<string | undefined>): string {
  const hay = texts.filter(Boolean).join(" ");
  if (!hay) return "";
  for (const key of PLACE_KEYS) {
    if (hay.includes(key)) return key;
  }
  return "";
}

export function parseNameList(raw: unknown): string[] | undefined {
  let values: unknown[] = [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    values = trimmed.split(/[,/\n]/);
  } else if (Array.isArray(raw)) {
    values = raw;
  } else {
    return undefined;
  }
  const items = values.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5);
  return items.length ? items : undefined;
}
