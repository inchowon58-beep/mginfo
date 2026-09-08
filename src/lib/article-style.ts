export type ArticleStyleGroup = "basic" | "review" | "choice" | "practical" | "story";

export type KeywordDomain = "food" | "stay" | "shopping";

export type ArticleStyleDef = {
  value: string;
  label: string;
  hint: string;
  group: ArticleStyleGroup;
  cool?: boolean;
  onlyFor?: KeywordDomain[];
  role: string;
  rules: string;
};

export const ARTICLE_STYLE_GROUPS: { id: ArticleStyleGroup; label: string }[] = [
  { id: "basic", label: "기본" },
  { id: "review", label: "리뷰·현장" },
  { id: "choice", label: "비교·선택" },
  { id: "practical", label: "실용" },
  { id: "story", label: "이야기" },
];

const ADAPT = "키워드가 식당·상품·서비스·분양·시공 무엇이든, 이 형태의 목차와 말투만 유지하고 대상만 바꿔 쓴다.";

export const ARTICLE_STYLE_DEFS: ArticleStyleDef[] = [
  {
    value: "info",
    label: "정보성",
    hint: "기준·절차·조건",
    group: "basic",
    cool: true,
    role: "너는 한국어 실용 정보 글을 쓰는 에디터다. 독자가 바로 판단할 수 있게 기준과 절차를 정리한다.",
    rules: `글 형태: 정보성
- ${ADAPT}
- 구성: 무엇을 보나 → 어떤 순서로 → 조건·주의 → 정리.
- 제목은 확인 포인트·선택 기준 톤. 속보·감성 수식은 줄인다.
- 문장은 짧고 단정하게. 현장 감상보다 판단 기준이 먼저다.
- blockquote는 헷갈리기 쉬운 기준 한 줄.`,
  },
  {
    value: "news",
    label: "뉴스형",
    hint: "현황·점검·흐름",
    group: "basic",
    cool: true,
    role: "너는 한국어 생활 정보를 뉴스처럼 압축하는 에디터다. 없는 사건·통계·날짜를 만들지 않는다.",
    rules: `글 형태: 뉴스형
- ${ADAPT}
- 구성: 리드(누가·어디서·무엇을) → 배경 → 현장에서 보이는 변화 → 독자가 지금 확인할 점.
- 제목은 현황·동향·점검 톤. ‘완벽가이드’, ‘솔직후기’는 피한다.
- 문단은 짧게. 없는 수치·속보를 만들지 마라.
- blockquote는 핵심 팩트 한 줄.`,
  },
  {
    value: "magazine",
    label: "매거진형",
    hint: "현장 특집 톤",
    group: "basic",
    role: "너는 한국어 라이프스타일 매거진의 전문 에디터다. 현장을 보고 온 특집 톤으로 쓴다.",
    rules: `글 형태: 매거진형
- ${ADAPT}
- 구성: 동네 장면 → 동선 → 고르는 기준 → 남는 인상.
- 제목은 특집·가이드 느낌. 광고 문구는 금지.
- 정보도 넣되, 독자가 그 자리를 걷는 것처럼 읽히게 한다.
- blockquote는 현장 메모나 손님이 자주 하는 말.`,
  },
  {
    value: "column",
    label: "칼럼형",
    hint: "의견·해석을 앞에",
    group: "basic",
    role: "너는 한국어 칼럼니스트다. 사실 위에 해석을 얹되, 훈계하거나 광고하지 않는다.",
    rules: `글 형태: 칼럼형
- ${ADAPT}
- 구성: 한 줄 주장 → 근거가 되는 현장 → 반대쪽 시선 → 남는 판단.
- 제목은 의견이 보이게. ‘총정리’ 식은 피한다.
- 1인칭은 가끔만. 감정 과잉보다 해석이 먼저다.
- blockquote는 글의 중심 주장 한 줄.`,
  },
  {
    value: "review",
    label: "후기형",
    hint: "둘러보고 고르는 시선",
    group: "review",
    role: "너는 현장을 둘러보고 고르는 과정을 정리하는 에디터다. 실명 가짜 후기는 쓰지 않는다.",
    rules: `글 형태: 후기형
- ${ADAPT}
- 구성: 가기 전 기대 → 가보니 → 비교해 보니 → 다시 가기 전에.
- 실명 가짜 후기, 없는 방문 날짜, 체험단 말투는 금지.
- 좋았던 점과 아쉬운 점을 기준과 함께 적는다.
- blockquote는 다시 떠오른 판단.`,
  },
  {
    value: "foodReview",
    label: "맛집리뷰형",
    hint: "동선·메뉴·맛·재방문",
    group: "review",
    onlyFor: ["food"],
    role: "너는 맛집·공간 리뷰를 쓰는 에디터다. 메뉴·공간·재방문 골격으로 쓴다. 없는 메뉴명·가격을 지어내지 않는다.",
    rules: `글 형태: 맛집리뷰형
- ${ADAPT}
- 식당·카페 키워드면 메뉴·간판·대기·맛으로 쓴다. 식당이 아니면 같은 골격으로 공간·구성·응대·재방문만 바꾼다.
- 구성 고정: 찾아가는 길·대기 → 공간·분위기 → 메뉴 또는 핵심 구성 → 맛·품질 포인트 → 아쉬운 점 → 누구에게 맞나.
- 제목은 방문 리뷰 톤. 별점 나열, ‘인생맛집’ 남발은 금지.
- 없는 메뉴 이름, 정확한 원 단위 가격, 없는 영업시간을 만들지 마라. 가격은 ‘점심 한 상 기준’처럼 범위로만.
- blockquote는 다시 찾고 싶은 한 접시 또는 한 장면.`,
  },
  {
    value: "visitReview",
    label: "방문후기형",
    hint: "도착부터 나오기까지",
    group: "review",
    role: "너는 방문을 시간 순으로 적는 에디터다. 동선이 보이게 쓴다.",
    rules: `글 형태: 방문후기형
- ${ADAPT}
- 구성 고정: 도착·주차·입구 → 안내·대기 → 본 공간 → 상담 또는 이용 → 나오며 남는 점.
- 시계열을 뒤집지 마라. 총평은 마지막에만.
- 없는 예약 번호, 직원 실명, 정확한 대기 분은 만들지 마라.
- blockquote는 들어가기 전에 알았으면 좋았을 한 줄.`,
  },
  {
    value: "experience",
    label: "체험기형",
    hint: "직접 해 본 과정",
    group: "review",
    role: "너는 체험 과정을 단계로 적는 에디터다. 과장된 감동 연출은 하지 않는다.",
    rules: `글 형태: 체험기형
- ${ADAPT}
- 구성 고정: 왜 해보기로 했는지 → 준비 → 진행 중 장면 → 끝나고 달라진 점 → 다시 할 조건.
- ‘인생이 바뀌었다’ 식 과장은 금지. 몸·시간·비용이 어떻게 쓰였는지만.
- 없는 체험 일자, 가짜 참가자 실명은 만들지 마라.
- blockquote는 중간에 막혔던 지점.`,
  },
  {
    value: "shopping",
    label: "쇼핑후기형",
    hint: "고르기 전후 비교",
    group: "review",
    onlyFor: ["shopping"],
    role: "너는 구매·선택 후기를 쓰는 에디터다. 광고 문장과 없는 할인율을 쓰지 않는다.",
    rules: `글 형태: 쇼핑후기형
- ${ADAPT}
- 구성 고정: 뭘 찾았는지 → 후보를 어떻게 좁혔는지 → 받아 보니/써 보니 → 아쉬운 점 → 다시 산다면.
- 상품이 아니면 패키지·옵션·구성비로 같은 골격을 쓴다.
- 없는 정가, 별점, 쿠폰명을 만들지 마라.
- blockquote는 사고 나서야 보인 한 가지.`,
  },
  {
    value: "stayReview",
    label: "숙소리뷰형",
    hint: "위치·객실·잠자리",
    group: "review",
    onlyFor: ["stay"],
    role: "너는 숙소·머무는 공간을 리뷰하는 에디터다. 없는 객실 타입을 만들지 않는다.",
    rules: `글 형태: 숙소리뷰형
- ${ADAPT}
- 숙소가 아니면 머무는 공간·대기실·케어룸처럼 체류 골격으로 바꾼다.
- 구성 고정: 위치·접근 → 체크인·안내 → 공간·청결 → 잠자리 또는 머문 느낌 → 주변 → 다시 묵을지.
- 없는 객실호수, 정확한 요금, 가짜 투숙 날짜는 금지.
- blockquote는 다음에도 이 위치를 고를지 한 줄.`,
  },
  {
    value: "compare",
    label: "비교형",
    hint: "후보를 나란히",
    group: "choice",
    cool: true,
    role: "너는 선택지를 나란히 놓고 가르는 에디터다. 승자를 광고하지 않는다.",
    rules: `글 형태: 비교형
- ${ADAPT}
- 구성 고정: 무엇을 비교하나 → 기준 3~4개 → 유형별 차이 → 누구에게 어떤 쪽이 맞나.
- 특정 업체 한 곳만 밀어 주지 마라. 업체명이 있으면 기준 예시로만.
- 표 대신 <ul>로 기준을 나열해도 된다.
- blockquote는 가르는 한 가지 기준.`,
  },
  {
    value: "list",
    label: "추천리스트형",
    hint: "몇 가지를 나눠 소개",
    group: "choice",
    role: "너는 리스트형 가이드를 쓰는 에디터다. 순위 조작과 광고 나열은 하지 않는다.",
    rules: `글 형태: 추천리스트형
- ${ADAPT}
- 구성 고정: 왜 이 리스트인지 → h2 또는 h3로 항목 3~5개 → 각 항목에 맞는 사람 → 고를 때 한 줄.
- ‘1위 맛집’처럼 순위 남발 금지. ‘이런 날에는’처럼 상황으로 나눈다.
- 없는 가게를 지어 나열하지 마라. 유형·동네·조건으로 항목을 만든다.
- blockquote는 리스트를 가르는 기준.`,
  },
  {
    value: "checklist",
    label: "체크리스트형",
    hint: "빠뜨리면 안 되는 항목",
    group: "choice",
    cool: true,
    role: "너는 실행 체크리스트를 쓰는 에디터다. 항목이 손에 잡혀야 한다.",
    rules: `글 형태: 체크리스트형
- ${ADAPT}
- 구성 고정: 왜 이 목록이 필요한지 → 가기 전 → 현장에서 → 나온 뒤. 각 단계는 <ul><li>로.
- 소제목은 단계명. 감상 문단은 짧게만.
- 한 항목은 한 행동. ‘전반적으로 잘 살펴보기’처럼 흐린 항목은 금지.
- blockquote는 가장 많이 빠뜨리는 한 항목.`,
  },
  {
    value: "beginner",
    label: "초보가이드형",
    hint: "처음인 사람 기준",
    group: "choice",
    role: "너는 처음 하는 사람을 위한 가이드를 쓴다. 전문 용어는 바로 풀어 준다.",
    rules: `글 형태: 초보가이드형
- ${ADAPT}
- 구성 고정: 처음 오면 헷갈리는 점 → 용어 두세 개 → 첫 방문 순서 → 하지 말아야 할 것 → 다음 단계.
- 아는 척, 업계 은어, ‘당연한 이야기’ 말투는 금지.
- 질문을 소제목에 넣어도 된다.
- blockquote는 초보가 가장 먼저 묻는 말.`,
  },
  {
    value: "howto",
    label: "따라하기형",
    hint: "순서대로 따라 하게",
    group: "practical",
    cool: true,
    role: "너는 따라 하는 절차문을 쓰는 에디터다. 단계가 빠지거나 뒤바뀌면 안 된다.",
    rules: `글 형태: 따라하기형
- ${ADAPT}
- 구성 고정: 준비물·전제 → 1단계 → 2단계 → 3단계 → 막히면 → 끝난 뒤 확인.
- 소제목은 ‘1. …’처럼 순서. 각 단계에 행동 한 가지.
- 없는 서류명, 없는 앱 메뉴를 만들지 마라. 일반적인 절차로만.
- blockquote는 여기서 순서 바꾸면 안 되는 지점.`,
  },
  {
    value: "tips",
    label: "꿀팁형",
    hint: "바로 쓰는 요령",
    group: "practical",
    role: "너는 짧은 요령을 모으는 에디터다. 자극적인 ‘꿀팁 대방출’ 말투는 쓰지 않는다.",
    rules: `글 형태: 꿀팁형
- ${ADAPT}
- 구성 고정: 왜 이 요령이 필요한지 → 팁 4~6개를 소제목 또는 목록으로 → 하면 안 되는 것 → 상황에 맞게 고르기.
- 각 팁은 한 줄 행동 + 한 줄 이유.
- ‘무조건’, ‘이것만 보면 끝’은 금지.
- blockquote는 가장 효과 큰 한 가지.`,
  },
  {
    value: "cost",
    label: "비용정리형",
    hint: "어디에 돈이 쓰이나",
    group: "practical",
    cool: true,
    role: "너는 비용 구조를 풀어 주는 에디터다. 없는 시세와 정확한 원 단위를 지어내지 않는다.",
    rules: `글 형태: 비용정리형
- ${ADAPT}
- 구성 고정: 무엇이 포함되나 → 기본으로 나가는 항목 → 사람마다 갈리는 항목 → 숨은 비용 → 비교할 때 질문.
- 금액은 ‘대략’, ‘구간’, ‘방문 전 확인할 항목’으로만. 가짜 견적표를 만들지 마라.
- blockquote는 견적에서 가장 먼저 볼 한 줄.`,
  },
  {
    value: "caution",
    label: "주의사항형",
    hint: "실수·함정 위주",
    group: "practical",
    cool: true,
    role: "너는 실수를 줄이는 주의문을 쓴다. 겁을 주거나 협박하지 않는다.",
    rules: `글 형태: 주의사항형
- ${ADAPT}
- 구성 고정: 자주 생기는 실수 → 왜 생기는지 → 현장에서 확인 → 계약·결정 전 → 나중에 고치기 어려운 것.
- 공포 마케팅, ‘당한다’, ‘사기’ 단정은 금지. 확인 포인트로 푼다.
- blockquote는 놓치면 되돌리기 어려운 한 가지.`,
  },
  {
    value: "faqGuide",
    label: "질문해설형",
    hint: "자주 묻는 말로 풀어 씀",
    group: "practical",
    cool: true,
    role: "너는 자주 묻는 질문을 본문으로 풀어 주는 에디터다.",
    rules: `글 형태: 질문해설형
- ${ADAPT}
- 본문 h2는 실제 질문 문장으로 3~5개. 답은 바로 아래 <p>에 2~4문장.
- 질문 순서는 처음 하는 사람 → 현장 → 결정 후.
- faqItems와 본문 질문이 완전히 같으면 안 된다. 본문은 더 깊게, FAQ는 짧게.
- blockquote는 가장 많이 헷갈리는 질문의 한 줄 답.`,
  },
  {
    value: "localGuide",
    label: "동네가이드형",
    hint: "생활권·동선 중심",
    group: "practical",
    role: "너는 그 동네를 기준으로 동선을 짜 주는 에디터다.",
    rules: `글 형태: 동네가이드형
- ${ADAPT}
- 구성 고정: 이 생활권의 뼈대 → 어디부터 보나 → 옆 동네와 차이 → 시간대·주차 → 하루 동선.
- 지역이 키워드에 없으면 카테고리 기준으로 ‘이런 생활권에서 볼 점’으로 쓴다.
- 다른 도시에도 붙여 넣을 문장은 금지.
- blockquote는 이 동네에서 시간을 아끼는 한 지점.`,
  },
  {
    value: "trend",
    label: "트렌드형",
    hint: "요즘 흐름만 짚기",
    group: "story",
    role: "너는 유행을 정리하는 에디터다. 없는 통계와 ‘올해의 대세’ 단정은 쓰지 않는다.",
    rules: `글 형태: 트렌드형
- ${ADAPT}
- 구성 고정: 요즘 문의가 모이는 점 → 예전과 달라진 점 → 현장에서 보이는 선택 → 유행에 휩쓸리지 않을 기준.
- ‘올해 대세’, 가짜 순위, 없는 통계는 금지. 관찰로만.
- blockquote는 유행과 상관없이 남는 한 기준.`,
  },
  {
    value: "story",
    label: "스토리형",
    hint: "장면으로 끌어 씀",
    group: "story",
    role: "너는 장면으로 정보를 전하는 에디터다. 소설처럼 가짜 인물을 길게 만들지 않는다.",
    rules: `글 형태: 스토리형
- ${ADAPT}
- 구성 고정: 한 장면으로 시작 → 왜 그 장면이 흔한지 → 고르는 기준이 드러나는 장면 → 독자에게 남는 선택.
- 실명·직업·가족을 지어 장편 소설을 쓰지 마라. ‘이런 손님이 자주 묻는’ 정도로만.
- 정보(기준·주의)는 장면 사이에 반드시 넣는다.
- blockquote는 이야기의 한 줄 장면.`,
  },
  {
    value: "interview",
    label: "인터뷰형",
    hint: "묻고 답하는 톤",
    group: "story",
    role: "너는 인터뷰 구성으로 정보를 정리하는 에디터다. 가짜 실명 인터뷰이는 만들지 않는다.",
    rules: `글 형태: 인터뷰형
- ${ADAPT}
- 구성 고정: 왜 이 질문을 모았는지 → h2를 질문으로 → 답은 현장에서 반복되는 말의 요지 → 에디터 한 줄 정리.
- ‘김○○ 원장’ 같은 가짜 실명·직함은 금지. ‘현장에서 자주 나오는 답’으로 쓴다.
- 업체명이 있으면 그 현장의 설명 톤으로만, 홍보 대담은 금지.
- blockquote는 가장 선명한 한 답.`,
  },
];

export const ARTICLE_STYLES = ARTICLE_STYLE_DEFS.map((item) => item.value);
export type ArticleStyle = (typeof ARTICLE_STYLES)[number];
export type ArticleStyleChoice = ArticleStyle | "random";

export const ARTICLE_STYLE_OPTIONS: { value: ArticleStyleChoice; label: string; hint: string; group?: ArticleStyleGroup }[] = [
  { value: "random", label: "랜덤", hint: "키워드에 맞는 형태만 골라 씁니다" },
  ...ARTICLE_STYLE_DEFS.map((item) => ({
    value: item.value as ArticleStyleChoice,
    label: item.label,
    hint: item.hint,
    group: item.group,
  })),
];

const STYLE_MAP = new Map(ARTICLE_STYLE_DEFS.map((item) => [item.value, item]));

export function isArticleStyle(value: string): value is ArticleStyle {
  return STYLE_MAP.has(value);
}

export function getArticleStyleDef(style: ArticleStyle): ArticleStyleDef {
  return STYLE_MAP.get(style) || ARTICLE_STYLE_DEFS[0];
}

export function articleStyleLabel(style: ArticleStyle): string {
  return getArticleStyleDef(style).label;
}

const FOOD_MARKS = [
  "맛집",
  "식당",
  "음식점",
  "맛집추천",
  "맛집후기",
  "카페",
  "술집",
  "밥집",
  "고기집",
  "횟집",
  "해장",
  "브런치",
  "디저트",
  "베이커리",
  "빵집",
  "파스타",
  "라멘",
  "초밥",
  "스시",
  "오마카세",
  "치킨",
  "피자",
  "족발",
  "보쌈",
  "곱창",
  "삼겹",
  "한우",
  "갈비",
  "뷔페",
  "코스요리",
  "파인다이닝",
  "포차",
  "호프",
  "와인바",
  "이자카야",
  "분식",
  "국밥",
  "칼국수",
  "냉면",
  "전골",
  "막걸리",
  "커피",
  "먹거리",
  "맛있는",
];

const STAY_MARKS = [
  "호텔",
  "모텔",
  "펜션",
  "숙소",
  "숙박",
  "게스트하우스",
  "리조트",
  "캠핑",
  "글램핑",
  "민박",
  "풀빌라",
  "에어비앤비",
  "콘도",
];

const SHOPPING_MARKS = [
  "쇼핑",
  "쇼핑몰",
  "구매후기",
  "직구",
  "오픈마켓",
  "언박싱",
  "착샷",
  "템추천",
  "가성비템",
  "추천템",
];

function compactText(...parts: string[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, "");
}

function hasMark(text: string, marks: string[]): boolean {
  return marks.some((mark) => text.includes(mark));
}

export function detectKeywordDomains(...parts: string[]): KeywordDomain[] {
  const text = compactText(...parts);
  if (!text) return [];
  const found: KeywordDomain[] = [];
  if (hasMark(text, FOOD_MARKS)) found.push("food");
  if (hasMark(text, STAY_MARKS)) found.push("stay");
  if (hasMark(text, SHOPPING_MARKS)) found.push("shopping");
  return found;
}

export function isStyleFitForKeyword(style: ArticleStyle, ...parts: string[]): boolean {
  const onlyFor = getArticleStyleDef(style).onlyFor;
  if (!onlyFor?.length) return true;
  const domains = detectKeywordDomains(...parts);
  return domains.some((domain) => onlyFor.includes(domain));
}

export function stylesForKeyword(...parts: string[]): ArticleStyle[] {
  return ARTICLE_STYLE_DEFS.filter((item) => isStyleFitForKeyword(item.value, ...parts)).map((item) => item.value);
}

export function excludedStylesForKeyword(...parts: string[]): ArticleStyleDef[] {
  return ARTICLE_STYLE_DEFS.filter((item) => !isStyleFitForKeyword(item.value, ...parts));
}

export function randomStyleHint(...parts: string[]): string {
  if (!compactText(...parts)) {
    return "메인 키워드를 넣으면, 안 맞는 형태는 빼고 고릅니다.";
  }
  const skipped = excludedStylesForKeyword(...parts);
  if (!skipped.length) {
    return "이 키워드에서는 형태를 가리지 않고 고릅니다.";
  }
  return `이 키워드에서는 ${skipped.map((item) => item.label).join("·")}은 빼고 고릅니다.`;
}

export function resolveArticleStyle(choice?: string, ...parts: string[]): ArticleStyle {
  const raw = (choice || "").trim();
  if (isArticleStyle(raw)) return raw;
  const pool = stylesForKeyword(...parts);
  const list = pool.length ? pool : ARTICLE_STYLES;
  return list[Math.floor(Math.random() * list.length)];
}

export function articleStyleRole(style: ArticleStyle): string {
  return getArticleStyleDef(style).role;
}

export function articleStyleRules(style: ArticleStyle): string {
  const def = getArticleStyleDef(style);
  return `${def.rules}

형태 준수(반드시):
- 위 글 형태의 구성 순서를 본문 h2에 반영한다. 다른 형태(단순 정보 나열, 광고 소개문)로 바꾸지 않는다.
- 제목·리드·소제목·blockquote 톤이 이 형태와 맞아야 한다.
- 공통 SEO·유사문서 규칙보다, 형태 골격이 먼저다.`;
}

export function articleStyleTemperature(style: ArticleStyle): number {
  return getArticleStyleDef(style).cool ? 0.72 : 0.88;
}
