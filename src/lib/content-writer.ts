import type { PagePlan } from "./page-plan-types";
import { parseWriterResult, type WriterParseResult } from "./page-plan-schema";
import type { WriterResult } from "./page-plan-types";
import { formatVerifiedContextForPrompt, type VerifiedContext } from "./content-verified";
import { extractPlaceName, formatRegionMaterials, getNearbyDistricts, getNearbyStations } from "./region-geo";
import { articleStyleRole, articleStyleRules, articleStyleTemperature, type ArticleStyle } from "./article-style";
import { resolveWritingTone, writingTonePrompt } from "./writing-tone";
import { WRITER_PROMPT_VERSION } from "./quality-codes";
import { readGeminiTokenUsage } from "./gemini-usage";
import type { TokenUsage } from "./page-plan-types";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function buildWriterPrompt(input: {
  plan: PagePlan;
  verified: VerifiedContext;
  writingStyle: ArticleStyle;
  writingTone?: string;
  writingPersona?: string;
  experienceNotes?: string;
  categoryName?: string;
  avoidTitles?: string[];
  /** Code-rendered blocks that follow AI sections on the final page (Writer must not invent their facts). */
  upcomingVerifiedBlocks?: string[];
}): string {
  const plan = input.plan;
  const place = plan.topicContext.region || extractPlaceName(plan.keyword) || "";
  const materials = place ? formatRegionMaterials(place) : "";
  const sectionSpec = plan.sections
    .map(
      (s, i) =>
        `${i + 1}. blockKey=${s.blockKey}\n   heading(권장): ${s.heading}\n   intent: ${s.intent}\n   purpose: ${s.purpose}\n   mustUseVerifiedData: ${Boolean(s.mustUseVerifiedData)}\n   notes: ${s.notesForWriter || "-"}`
    )
    .join("\n\n");

  const avoid = (input.avoidTitles || [])
    .slice(0, 30)
    .map((t) => `- ${t}`)
    .join("\n");

  const hasRegionalFacts = Boolean(plan.regionalFacts?.facts?.length);
  const upcoming = (input.upcomingVerifiedBlocks || []).filter(Boolean);

  return `${articleStyleRole(input.writingStyle)}

당신은 Writer다 (writer-v2). Planner가 만든 PagePlan만 따른다. 새 목차·새 블록을 만들지 마라.
목표는 일반적인 AI 블로그가 아니라, 검색자가 분양·의뢰 전에 판단할 수 있는 구체적·실용적 SEO 랜딩 문장이다.

카테고리: ${input.categoryName || ""}
키워드(focusKeyword): ${plan.keyword}
pageType: ${plan.pageType}
contentAngle: ${plan.contentAngle}
titleHint: ${plan.titleHint}

중요: 아래 sections만 작성한다. 업체 정보·실제 개체·시공 사례·방문 정보 블록은 코드가 렌더하므로 Writer가 HTML로 쓰지 않는다.

searchIntent (본문에 그대로 출력 금지, 방향만 반영):
- primary: ${plan.searchIntent.primary}
- secondary: ${plan.searchIntent.secondary.join("; ")}
- userGoal: ${plan.searchIntent.userGoal}

contentStrategy (본문 출력 금지 — 섹션 구성·톤만 반영):
- summary: ${plan.contentStrategy.summary}
- rationale: ${plan.contentStrategy.rationale}

topicContext:
- region: ${plan.topicContext.region} (서비스 대상 지역·검색 범위. 성향·주거·소득·생활권 특성 추론 금지)
- primaryTopic: ${plan.topicContext.primaryTopic}
- service: ${plan.topicContext.service}
- subTopics: ${(plan.topicContext.subTopics || []).join(", ") || "(없음)"}

regionalFacts (있을 때만 사실로 사용):
${
  hasRegionalFacts
    ? plan.regionalFacts!.facts.map((f) => `- ${f}`).join("\n")
    : "(없음)"
}

===== writer-v2 작성 규칙 (필수) =====

1) 지역명 반복 금지
- regionalFacts가 비어 있으면 지역명을 실제 지역 특성처럼 쓰지 마라.
- 금지 예: "배곧 지역의 보호자들은…", "배곧 생활권 특성상…", "배곧에서는 이런 견종이…", "배곧신도시에서 분양할 때…"
- 지역명은 제목·도입·꼭 필요한 핵심 heading·서비스/방문 맥락 정도에서만 자연스럽게.
- SEO 목적으로 모든 Section에 지역명을 넣지 마라.

2) Keyword stuffing 금지
- focusKeyword를 횟수 맞춰 반복하지 마라. H2마다 키워드를 넣지 마라.
- Heading은 사람이 읽기 좋은 정보 제목을 우선한다.
- BAD: "배곧포메라니안분양에서 알아보는 털 관리"
- GOOD: "포메라니안 이중모는 어떻게 관리할까"

3) AI 상투 표현 억제 (반복·남발 금지)
많은 사랑을 받고 있어요 / 큰 매력이에요 / 매료되는 경우가 많아요 / 꼼꼼히 알아볼게요 /
세심하게 살펴볼게요 / 첫걸음이 돼요 / 도움이 돼요 / 중요해요 / 필수적이에요 /
신중하게 결정해야 해요 / 외모적 완성도를 높여줘요
의미 없는 감탄·수식 문장을 줄여라.

4) 정보 밀도
- 각 문단은 최소 하나 이상의 구체적 판단 정보가 있어야 한다.
- 정보 없는 연결 문장·감성 filler 금지.
- BAD: "포메라니안은 사랑스러운 외모로 많은 사람들에게 사랑받는 품종이에요."
- GOOD: "포메라니안은 작은 체구와 풍성한 이중모가 눈에 띄는 소형견이에요. 다만 털의 양이 많아 빗질과 건조 관리에 시간을 들일 수 있는지 먼저 생각해야 해요."

5) 장점만 쓰지 말 것
- 견종·서비스 설명은 특징 / 장점 / 관리 부담 / 주의할 점 / 보호자(의뢰인)가 판단할 부분을 균형 있게.
- 광고성 칭찬만 이어지지 않게.

6) 사실 단정 완화
- 개체차가 있는 특성을 절대 사실처럼 쓰지 마라.
- "반드시" "무조건" "빠르게 적응한다" "예방한다"는 근거가 있을 때만.
- 건강·진단·치료·예방을 확정적으로 쓰지 마라.
- BAD: "슬개골 탈구를 예방한다"
- GOOD: "미끄러짐을 줄이고 관절에 가해지는 부담을 줄이는 환경을 만드는 데 도움이 될 수 있다"

7) 검색자 판단에 연결
- 품종 백과사전으로 끝내지 마라. 각 Section은 가능하면 "그래서 분양/의뢰 전에 무엇을 판단해야 하는가"와 연결.
- 이중모 → 빗질·목욕·건조 부담 / 활동성 → 놀이·산책·생활패턴 / 성견 크기 → 개체차·생활환경

8) Verified 블록과의 연결
- 실제 업체 사실(상호·전화·주소·영업시간·개체·사례)을 Writer가 만들지 마라.
- 뒤에 코드로 붙는 Verified 섹션이 있다면, AI 섹션 끝이 그다음 정보로 자연스럽게 이어지도록 한두 문장만 허용하되 구체 업체 사실은 쓰지 마라.
${upcoming.length ? `- 이후 코드 렌더 예정 블록(참고): ${upcoming.join(", ")}` : ""}

9) Heading 품질
- H2를 SEO 키워드 저장소로 쓰지 마라. Heading만 읽어도 정보 흐름이 보여야 한다.
- 예: 성격 확인 이유 / 이중모와 관리 부담 / 성견 크기와 생활공간 / 분양 전 확인할 부분 / FAQ

10) Intro
- "이번 글에서는…" "꼼꼼히 정리했어요" "세심하게 알아보려고 해요" 같은 메타 문장 최소화.
- 바로 검색자가 알고 싶은 내용으로 들어가라.

11) FAQ
- 본문을 그대로 반복하는 FAQ 금지. 분양·의뢰 전 추가로 궁금할 질문을 우선.
- 답변은 짧고 구체적으로.

12) 문체
- 사이트의 존댓말 "요" 체 유지.
- 모든 문장을 "~해요/~좋아요/~중요해요" 동일 리듬으로 반복하지 마라. 짧은 문장과 설명 문장을 섞어라.

angleReason (내부용, 본문 출력 금지): ${plan.angleReason}

${articleStyleRules(input.writingStyle)}
${writingTonePrompt(resolveWritingTone(input.writingStyle, input.writingTone), input.writingPersona)}

검증된 사실(Verified context) — 여기 있는 것만 사실로 써라. 없으면 생략:
${formatVerifiedContextForPrompt(input.verified)}

절대 금지 (Verified에 없으면 생략. 일반 업체 표현으로 대체 금지):
업체 경력, 가격, 실제 개체/재고, 시공 사례, 고객 후기, 영업시간, 주소, 전화번호, 인증, 자격, 수상, 서비스 범위 단정, 통계.

internalLinkHints는 의도만이다. href, slug, URL, a 태그 금지.

지역 재료(공식 지명·역·근방만 — 인구·소득·주거 형태 단정 금지):
${materials || "(없음)"}

지역 grounding:
- 지역명은 서비스 대상·검색 범위로만.
- regionalFacts에 없는 지역 특성(고층 아파트, 해안 생활, 가족 중심 도시, 생활권 특성 등) 본문 금지.
- regionalFacts 없음 = 지역 특성을 지어내지 말 것.

경험 메모:
${(input.experienceNotes || "").trim() || "(없음)"}

이미 쓴 제목(비슷하게 쓰지 말 것):
${avoid || "(없음)"}

반드시 아래 sections 순서·blockKey를 그대로 지켜라. 추가 블록 금지.
FAQ 질문이 제안되면 참고하되 과장 없이·본문 복붙 금지:
${(plan.faqQuestions || []).map((q) => `- ${q}`).join("\n") || "(없음)"}

섹션 설계:
${sectionSpec}

반드시 JSON만 출력 (완성 bodyHtml 하나 금지. 섹션 단위):
{
  "title": "한국어 제목 (titleHint 참고, 그대로 복붙 금지)",
  "intro": "도입 HTML 또는 문단. <p> 가능. h2 금지. 메타 안내 문장 최소화",
  "excerpt": "2~3문장 요약 (구체 정보 포함)",
  "sections": [
    { "blockKey": "첫번째와동일", "heading": "정보형 제목(키워드 나열 금지)", "html": "<p>...</p> (해당 섹션만, h2 넣지 말 것)" }
  ],
  "faqItems": [{ "question": "...", "answer": "짧고 구체적으로" }],
  "regionInfo": "하단 지역 안내 3~5문장 (지역 특성 추측 금지, 검색·서비스 범위 정도만)",
  "nearbyAreas": ["..."],
  "nearbyStations": ["..."],
  "tags": ["..."],
  "slugHint": "english-kebab-case"
}

sections 배열 길이와 blockKey 순서는 Planner와 정확히 같아야 한다.
연락처·http 링크는 HTML에 넣지 마라. 이미지 태그 금지.`;
}

/** Archived writer-v1 prompt for A/B QA only — production path uses buildWriterPrompt (v2). */
export function buildWriterPromptV1Archive(input: {
  plan: PagePlan;
  verified: VerifiedContext;
  writingStyle: ArticleStyle;
  writingTone?: string;
  writingPersona?: string;
  experienceNotes?: string;
  categoryName?: string;
  avoidTitles?: string[];
}): string {
  const plan = input.plan;
  const place = plan.topicContext.region || extractPlaceName(plan.keyword) || "";
  const materials = place ? formatRegionMaterials(place) : "";
  const sectionSpec = plan.sections
    .map(
      (s, i) =>
        `${i + 1}. blockKey=${s.blockKey}\n   heading(권장): ${s.heading}\n   intent: ${s.intent}\n   purpose: ${s.purpose}\n   mustUseVerifiedData: ${Boolean(s.mustUseVerifiedData)}\n   notes: ${s.notesForWriter || "-"}`
    )
    .join("\n\n");
  const avoid = (input.avoidTitles || [])
    .slice(0, 30)
    .map((t) => `- ${t}`)
    .join("\n");

  return `${articleStyleRole(input.writingStyle)}

당신은 Writer다. Planner가 만든 PagePlan의 설계를 따른다. 새 목차를 만들지 마라.

카테고리: ${input.categoryName || ""}
키워드: ${plan.keyword}
pageType: ${plan.pageType}
contentAngle: ${plan.contentAngle}
titleHint: ${plan.titleHint}

중요: 아래 sections만 작성한다. 업체 정보·실제 개체·시공 사례·방문 정보 블록은 코드가 렌더하므로 Writer가 쓰지 않는다.

searchIntent (본문에 그대로 출력 금지, 방향만 반영):
- primary: ${plan.searchIntent.primary}
- secondary: ${plan.searchIntent.secondary.join("; ")}
- userGoal: ${plan.searchIntent.userGoal}

contentStrategy (본문 출력 금지 — 섹션 구성·톤만 반영):
- summary: ${plan.contentStrategy.summary}
- rationale: ${plan.contentStrategy.rationale}

topicContext:
- region: ${plan.topicContext.region} (서비스 대상 지역·지리적 범위. 성향·주거·소득 추론 금지)
- primaryTopic: ${plan.topicContext.primaryTopic}
- service: ${plan.topicContext.service}
- subTopics: ${(plan.topicContext.subTopics || []).join(", ") || "(없음)"}

regionalFacts (있을 때만 사실로 사용. 없으면 지역 특성 문장 금지):
${
  plan.regionalFacts?.facts?.length
    ? plan.regionalFacts.facts.map((f) => `- ${f}`).join("\n")
    : "(없음 — 지역명·공식 지명 재료만 사용. 고층·해안·가족형 도시 등 추측 금지)"
}

angleReason (내부용, 본문 출력 금지): ${plan.angleReason}

${articleStyleRules(input.writingStyle)}
${writingTonePrompt(resolveWritingTone(input.writingStyle, input.writingTone), input.writingPersona)}

검증된 사실(Verified context) — 여기 있는 것만 사실로 써라:
${formatVerifiedContextForPrompt(input.verified)}

절대 금지 (Verified에 없으면 생략. 일반 업체 표현으로 대체하지 말 것):
업체 경력, 가격, 실제 개체/재고, 시공 사례, 고객 후기, 영업시간, 주소, 전화번호, 인증, 자격, 수상, 서비스 범위 단정, 통계.

키워드 반복 횟수를 맞추지 마라. title·도입·주요 문맥에서 자연스럽게만 쓰고, 본문 전체에 횟수 강제 금지.

internalLinkHints는 의도만이다. href, slug, URL을 만들지 마라. 링크 태그를 넣지 마라.

지역 재료(공식 지명·역·근방만 — 인구·소득·주거 형태 단정 금지):
${materials || "(없음)"}

지역 grounding:
- 지역명은 서비스 대상·검색 범위로만 쓴다.
- regionalFacts에 없는 지역 특성(고층 아파트, 해안 생활, 가족 중심 도시 등)을 본문에 쓰지 마라.

경험 메모:
${(input.experienceNotes || "").trim() || "(없음)"}

이미 쓴 제목(비슷하게 쓰지 말 것):
${avoid || "(없음)"}

반드시 아래 sections 순서·blockKey를 그대로 지켜라. 추가 블록 금지. 짧은 도입/전환 문장만 허용.
FAQ 질문이 제안되면 참고하되 과장 없이:
${(plan.faqQuestions || []).map((q) => `- ${q}`).join("\n") || "(없음)"}

섹션 설계:
${sectionSpec}

반드시 JSON만 출력 (완성 bodyHtml 하나 금지. 섹션 단위):
{
  "title": "한국어 제목 (titleHint 참고, 그대로 복붙 금지)",
  "intro": "도입 HTML 또는 문단. <p> 가능. h2 금지",
  "excerpt": "2~3문장 요약",
  "sections": [
    { "blockKey": "첫번째와동일", "heading": "...", "html": "<p>...</p> (해당 섹션만, h2 넣지 말 것)" }
  ],
  "faqItems": [{ "question": "...", "answer": "..." }],
  "regionInfo": "하단 지역 안내 3~5문장",
  "nearbyAreas": ["..."],
  "nearbyStations": ["..."],
  "tags": ["..."],
  "slugHint": "english-kebab-case"
}

sections 배열 길이와 blockKey 순서는 Planner와 정확히 같아야 한다.
연락처·http 링크는 HTML에 넣지 마라. 이미지 태그 금지.`;
}

export async function callWriter(input: {
  apiKey: string;
  model: string;
  plan: PagePlan;
  verified: VerifiedContext;
  writingStyle: ArticleStyle;
  writingTone?: string;
  writingPersona?: string;
  experienceNotes?: string;
  categoryName?: string;
  avoidTitles?: string[];
  upcomingVerifiedBlocks?: string[];
  /** QA A/B only */
  promptOverride?: string;
  promptVersionOverride?: string;
}): Promise<{ result: WriterResult; calls: number; tokens?: TokenUsage; promptVersion: string }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({
    model: input.model,
    generationConfig: {
      temperature: articleStyleTemperature(input.writingStyle),
      maxOutputTokens: 8192,
    },
  });

  const expectedKeys = input.plan.sections.map((s) => s.blockKey);
  const prompt = input.promptOverride || buildWriterPrompt(input);
  const promptVersion = input.promptVersionOverride || WRITER_PROMPT_VERSION;
  const result = await model.generateContent(prompt);
  const tokens = readGeminiTokenUsage(result.response);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new Error("Writer JSON 파싱 실패");
  }
  const checked: WriterParseResult = parseWriterResult(parsed, expectedKeys);
  if (!checked.ok) throw new Error(`Writer Schema 실패: ${checked.error}`);

  const place =
    input.plan.topicContext.region || extractPlaceName(input.plan.keyword, checked.result.title) || "";
  if (!checked.result.nearbyAreas?.length && place) {
    checked.result.nearbyAreas = getNearbyDistricts(place);
  }
  if (!checked.result.nearbyStations?.length && place) {
    checked.result.nearbyStations = getNearbyStations(place);
  }
  return { result: checked.result, calls: 1, tokens, promptVersion };
}
