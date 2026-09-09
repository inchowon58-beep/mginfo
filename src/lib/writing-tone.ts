export type WritingToneId =
  | "formal"
  | "soft"
  | "plain"
  | "musing"
  | "spoken"
  | "news"
  | "memoir"
  | "guide"
  | "neighbor"
  | "curator"
  | "coach"
  | "tender"
  | "crisp"
  | "witty"
  | "essay";

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
  {
    id: "guide",
    label: "안내문",
    hint: "절차를 차분히 알려 주는 톤",
    rules: `말투: 안내문
- 종결은 ‘~하면 됩니다’, ‘~하시면 됩니다’, ‘~입니다’를 기본으로 한다.
- 순서를 말할 때도 ‘먼저’, ‘이어서’처럼 짧게만 잇는다. 매뉴얼 번호 나열은 과하지 않게.
- 명령조(~하라)와 광고 권유(~꼭 하세요)는 쓰지 않는다.
- 독자가 지금 확인할 수 있는 기준만 안내한다.`,
  },
  {
    id: "neighbor",
    label: "동네 이웃",
    hint: "우리 동네 이야기처럼 편한 해요체",
    rules: `말투: 동네 이웃
- 종결은 ‘~해요’, ‘~거든요’, ‘~잖아요’를 섞되 한 문단에 과하게 넣지 않는다.
- ‘우리 동네’, ‘이 근처’ 같은 말은 지역이 있을 때만 쓴다.
- 인터넷 유행어, 이모지, 특정 사람을 지칭하는 수다는 금지.
- 없는 이웃 대화, 없는 단골 에피소드는 만들지 마라.`,
  },
  {
    id: "curator",
    label: "큐레이터",
    hint: "고르는 기준을 짚어 주는 톤",
    rules: `말투: 큐레이터
- 종결은 ‘~좋아요’, ‘~어울립니다’, ‘~볼 만합니다’처럼 고르는 말투를 쓴다.
- 비교할 때는 우열 단정 대신 ‘이런 조건이면’으로 나눈다.
- 최애, 강추, 필수 같은 과한 추천 말은 쓰지 않는다.
- 없는 랭킹·별점·후기 점수는 만들지 마라.`,
  },
  {
    id: "coach",
    label: "실전 코치",
    hint: "짧고 분명한 실무 조언",
    rules: `말투: 실전 코치
- 종결은 ‘~하세요’, ‘~보세요’, ‘~됩니다’를 기본으로 한다.
- 한 문장은 한 가지 행동만. 잔소리처럼 조건을 길게 나열하지 마라.
- 훈계(~해야 마땅하다)와 위협(~안 하면 후회)은 쓰지 않는다.
- 현장 방문한 코치처럼 쓰지 말고, 준비 체크 관점으로만 말한다.`,
  },
  {
    id: "tender",
    label: "다정한 안내",
    hint: "걱정 덜어 주는 부드러운 존댓말",
    rules: `말투: 다정한 안내
- 종결은 ‘~어요’, ‘~이에요’, ‘~괜찮아요’를 기본으로 한다.
- 불안을 덜어 주되, 없는 보장(무조건 안전, 100%)은 쓰지 않는다.
- 아기 말투, 과도한 감탄, 이모지는 금지.
- 독자를 아이 취급하거나 위로만 반복하지 말고, 확인 포인트를 남긴다.`,
  },
  {
    id: "crisp",
    label: "짧은 단문",
    hint: "한 문장씩 끊는 짧은 호흡",
    rules: `말투: 짧은 단문
- 종결은 ‘~다’, ‘~이다’, ‘~한다’를 짧게. 한 문장은 20자 안팎을 목표로 한다.
- 접속사로 문장을 길게 잇지 마라. 마침표로 끊는다.
- 수식어와 비유는 최소한. 핵심 정보만 남긴다.
- 전보·속보 과장, 없는 수치 나열은 금지.`,
  },
  {
    id: "witty",
    label: "가벼운 재치",
    hint: "가벼운 한 줄을 섞은 설명",
    rules: `말투: 가벼운 재치
- 종결은 ‘~해요’, ‘~입니다’를 섞는다. 문단 앞에 짧은 한 줄을 둬도 된다.
- 재치는 상황 비유 한 번이면 충분하다. 농담을 연속하지 마라.
- 비하, 유행어, 인터넷 드립, 특정 업체 놀리기는 금지.
- 웃기려고 사실을 비틀지 마라. 정보는 정확히, 말만 가볍게.`,
  },
  {
    id: "essay",
    label: "에세이",
    hint: "조금 긴 호흡의 칼럼 문장",
    rules: `말투: 에세이
- 종결은 ‘~한다’, ‘~있다’, ‘~보인다’를 기본으로 한다.
- 문장은 조금 길어도 되지만, 한 문단에 주장은 하나다.
- 감상은 관찰에서 나오고, 없는 개인 일화로 글을 채우지 마라.
- 시적인 도치, 한자 남발, 번역투 긴 수식은 피한다.`,
  },
];

function shuffleIds<T>(ids: T[]): T[] {
  const next = ids.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function shuffledWritingTones(): WritingToneId[] {
  return shuffleIds(WRITING_TONES.map((item) => item.id));
}

export function pickRandomWritingTone(): WritingToneId {
  const ids = WRITING_TONES.map((item) => item.id);
  return ids[Math.floor(Math.random() * ids.length)] || DEFAULT_WRITING_TONE;
}

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
