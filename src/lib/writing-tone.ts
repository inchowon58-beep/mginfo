export type WritingToneId =
  | "formal"
  | "soft"
  | "plain"
  | "musing"
  | "spoken"
  | "news"
  | "memoir";

export type WritingTone = {
  id: WritingToneId;
  label: string;
  hint: string;
  rules: string;
};

export const DEFAULT_WRITING_TONE: WritingToneId = "formal";

export const WRITING_TONES: WritingTone[] = [
  {
    id: "formal",
    label: "합니다체",
    hint: "정중하고 단정한 정보 글",
    rules: `말투: 합니다체
- 종결은 ‘~합니다’, ‘~입니다’, ‘~됩니다’를 기본으로 한다.
- 1인칭(저/제)은 거의 쓰지 않는다.
- 감정 표현보다 기준·절차·주의가 먼저다.
- 문장은 짧고 분명하게. 추측(~것 같다)은 필요한 때만.`,
  },
  {
    id: "soft",
    label: "했어요체",
    hint: "부드럽고 가까운 설명",
    rules: `말투: 했어요체
- 종결은 ‘~했어요’, ‘~이에요’, ‘~돼요’를 기본으로 한다.
- 딱딱한 보도 문장, 속보 톤은 쓰지 않는다.
- 독자에게 말 거는 느낌은 유지하되, 이모지·인터넷 유행어는 금지.
- 과한 친근함(ㅋㅋ, 진짜 대박)은 쓰지 않는다.`,
  },
  {
    id: "plain",
    label: "한다체",
    hint: "설명문·칼럼에 가까운 단정",
    rules: `말투: 한다체
- 종결은 ‘~한다’, ‘~이다’, ‘~된다’를 기본으로 한다.
- 구어체 해요체는 쓰지 않는다.
- 주장과 근거를 나눠 쓰고, 감탄은 줄인다.`,
  },
  {
    id: "musing",
    label: "혼잣말",
    hint: "~것 같다, 혼자 정리하는 톤",
    rules: `말투: 혼잣말
- ‘~것 같다’, ‘~싶다’, ‘~보인다’처럼 단정을 조금 낮춘다.
- 종결은 ‘~것 같다’, ‘~싶다’, ‘~보인다’, 가끔 ‘~한다’.
- 확정 통계·없는 사실을 추측으로 포장하지 마라. 모르는 것은 확인 포인트로 돌린다.
- 첫째·둘째·셋째처럼 기계적으로 나열하지 마라.`,
  },
  {
    id: "spoken",
    label: "현장 구어",
    hint: "~더라고요, 현장에서 말하는 느낌",
    rules: `말투: 현장 구어
- ‘~더라고요’, ‘~거든요’, ‘~해요’를 섞되 과하지 않게.
- 방문 상담에서 자주 오가는 말처럼 풀어 쓴다.
- 특정 업체를 오늘 다녀온 가짜 일기는 쓰지 않는다.
- 문장은 구어여도 맞춤법과 정보는 정확하게.`,
  },
  {
    id: "news",
    label: "뉴스 단정",
    hint: "짧은 문장, 현황·점검 톤",
    rules: `말투: 뉴스 단정
- 종결은 ‘~한다’, ‘~이다’, ‘~했다’ 또는 짧은 ‘~합니다’.
- 해요체, 혼잣말, 1인칭 후기는 쓰지 않는다.
- 리드에 누가·어디서·무엇을 압축한다. 없는 날짜·통계·속보는 만들지 않는다.
- 문단은 2~4문장으로 짧게.`,
  },
  {
    id: "memoir",
    label: "경험담",
    hint: "1인칭이지만 가짜 현장 방문은 금지",
    rules: `말투: 경험담
- ‘저는’, ‘제가’를 가끔 쓴다. 종결은 ‘~합니다’ 또는 ‘~어요’를 섞는다.
- 사는 곳·가족·키우는 동물은 시선·비유에만 쓴다.
- 이 글의 업체·매장을 직접 방문한 것처럼, 거기서 아이를 데려온 것처럼 쓰지 마라.
- 경험은 ‘이런 점을 보게 된다’, ‘보호자들이 자주 묻는다’처럼 관찰로 남긴다.`,
  },
];

export function isWritingToneId(value: unknown): value is WritingToneId {
  return WRITING_TONES.some((item) => item.id === value);
}

export function getWritingTone(id?: string | null): WritingTone {
  return WRITING_TONES.find((item) => item.id === id) || WRITING_TONES[0];
}

export function resolveWritingTone(articleStyle?: string, preferred?: string | null): WritingToneId {
  if (articleStyle === "news") return "news";
  if (isWritingToneId(preferred)) return preferred;
  return DEFAULT_WRITING_TONE;
}

export function writingTonePrompt(toneId: WritingToneId, persona?: string): string {
  const tone = getWritingTone(toneId);
  const notes = String(persona || "").trim();
  const personaBlock =
    toneId === "news"
      ? `작성자 상황:
${notes || "(없음)"}
- 뉴스형에서는 이 상황을 말투에 쓰지 않는다. 1인칭·했어요체·혼잣말로 바꾸지 마라.
- 지역 감각이 필요할 때만 배경으로 한 줄 녹인다.`
      : `작성자 상황(말투·시선만 반영):
${notes || "(없음)"}
- 위 상황은 말투, 관심사, 사는 지역 감각, 비유에만 쓴다.
- 메인 키워드 현장·업체를 직접 다녀온 것처럼 쓰지 마라.
- 가족·반려동물을 그 분양장·매장에 데려간 이야기를 만들지 마라.`;

  return `${tone.rules}

${personaBlock}
- 없는 개인 후기, 없는 대화, 없는 수치는 만들지 마라.
- 글 형태(정보성·매거진형 등)의 목차·구성은 유지하되, 종결 말투는 이 작성 톤만 따른다.
- API·인공지능이 쓴 티가 나지 않게, 사람 에디터가 고친 문장처럼 쓴다. 같은 구조의 문장을 반복하지 마라.`;
}
