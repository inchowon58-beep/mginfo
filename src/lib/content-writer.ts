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
  const prompt = buildWriterPrompt(input);
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
  return { result: checked.result, calls: 1, tokens, promptVersion: WRITER_PROMPT_VERSION };
}
