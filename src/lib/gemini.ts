import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { stripGeneratedImages } from "./sanitize";
import type { CategorySlug } from "./types";

export type GenerateInput = {
  topic?: string;
  category: CategorySlug;
  categoryName?: string;
  keywords?: string;
  notes?: string;
  focusKeyword?: string;
  region?: string;
  localNotes?: string;
  experienceNotes?: string;
  vendorName?: string;
  apiKey: string;
  model: string;
};

export type GenerateResult = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  tags: string[];
  slugHint?: string;
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function uniquenessRules(input: GenerateInput): string {
  const region = (input.region || "").trim();
  const localNotes = (input.localNotes || "").trim();
  const experienceNotes = (input.experienceNotes || "").trim();
  const vendorName = (input.vendorName || "").trim();

  return `유사문서 회피(네이버가 복제·유사 문서로 보지 않게):
- 흔한 총정리/완벽가이드 제목과 똑같은 목차를 쓰지 마라. 이 글만의 각도(지역 동선, 선택 기준, 현장 관찰)로 구성한다.
- 다른 지역에도 그대로 붙여 넣을 수 있는 문장은 줄인다. 지명, 역, 도로, 상권, 주차, 접근 동선처럼 그 동네만의 정보를 본문에 녹인다.
- 숫자·절차·주의점은 일반론으로만 끝내지 말고, 그 지역에서 실제로 생기는 장면으로 풀어 쓴다.
- 제목은 검색 의도를 담되, 다른 블로그와 겹치지 않는 표현을 고른다.

지역 정보:
- 지역: ${region || "(없음 — 주제에 지역이 있으면 시·구·동 단위로 구체화)"}
- 현장·지역 메모: ${localNotes || "(없음)"}
${region || localNotes ? "- 위 지역/메모를 본문 곳곳에 사실처럼 배치해, 검색이 ‘해당 지역 정보 문서’로 읽히게 한다." : ""}

매거진 문체:
- 너는 전문 매거진 에디터다. 독자에게 도움이 되는 특집 톤으로 쓴다.
- 고객 경험은 ‘실명 가짜 후기’가 아니라, 현장에서 반복되는 질문·방문 동선·선택 이유 같은 관찰로 쓴다.
- 경험·후기 메모: ${experienceNotes || "(없음 — 있으면 취재 근거로 쓰고, 없으면 과장된 체험담을 만들지 말 것)"}
- 인용 박스(<blockquote>)는 에디터의 현장 메모나 손님이 자주 하는 말의 요지로 1~2개.

업체 소개:
- 업체명: ${vendorName || "(없음)"}
${
  vendorName
    ? `- 본문에 "${vendorName}"을 2~4회, 광고 문장 없이 자연스럽게 녹인다. 예: 이 지역에서 기준을 맞춰 본 곳, 동선이 편한 현장 등.
- 최저가, 지금 예약, 클릭, 상담 폭주 같은 홍보 문구는 금지.
- 전화번호, 홈페이지, 카카오 주소, tel/http 링크는 본문 HTML에 넣지 마라. 연락은 글 하단 버튼으로 따로 붙는다.
- 마지막 소제목은 이 지역에서 고를 때 확인할 체크리스트로 닫고, 업체를 한 줄로 자연스럽게 언급해도 된다.`
    : "- 특정 업체 홍보 문장은 넣지 않는다."
}`;
}

function seoRules(focusKeyword: string): string {
  if (!focusKeyword) {
    return `메인 키워드가 없으면 카테고리와 주제에 맞는 자연스러운 정보형 제목을 쓴다.`;
  }
  return `메인 키워드: "${focusKeyword}"
네이버 SEO 규칙(반드시 지킬 것):
- 제목 앞쪽에 메인 키워드를 자연스럽게 넣는다. 제목은 검색 의도에 맞게 28~48자.
- 리드(excerpt) 첫 문장에 메인 키워드를 포함한다.
- 본문 첫 <p>에도 메인 키워드를 한 번 넣는다.
- h2 소제목 3~5개 중 1~2개에 메인 키워드 또는 핵심 의미의 자연스러운 변형을 넣는다.
- 본문 전체에 메인 키워드를 6~10회, 문맥에 맞게 분산해서 쓴다. 한 문장에 두 번 넣지 않는다.
- 키워드 나열, 숨은 텍스트, 의미 없는 반복, 광고 문구는 금지한다.
- 지역·서비스명이 키워드에 있으면 실제 선택 기준, 절차, 주의점을 정보로 풀어 쓴다.`;
}

export async function generateArticle(input: GenerateInput): Promise<GenerateResult> {
  const categoryName = input.categoryName || input.category;
  const focusKeyword = (input.focusKeyword || "").trim();
  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({
    model: input.model || DEFAULT_GEMINI_MODEL,
    generationConfig: {
      temperature: 0.82,
      maxOutputTokens: 8192,
    },
  });

  const prompt = `너는 한국어 라이프스타일 매거진의 전문 에디터다.
독자가 실제로 도움이 되는 특집 기사를 쓴다. 뉴스 속보가 아니라, 현장을 보고 온 매거진 톤이다.
과장 광고, 이모지, 영어 해시태그, ‘지금 클릭’ 식 문장은 쓰지 않는다.

카테고리: ${categoryName}
보조 키워드: ${input.keywords || "(없음)"}
추가 지시: ${input.notes || "(없음)"}
${seoRules(focusKeyword)}

${uniquenessRules(input)}

작업: 주제와 키워드로 매거진 정보글을 새로 작성한다.
주제: ${input.topic || "(없음)"}

반드시 JSON만 출력한다. 설명 문장이나 마크다운 울타리는 넣지 않는다.
형식:
{
  "title": "한국어 제목",
  "excerpt": "2~3문장 리드. 검색 스니펫으로도 읽히게. 지역이 있으면 지역명을 자연스럽게 포함",
  "bodyHtml": "HTML only. Use <h2>, <h3>, <p>, <blockquote>, <ul><li>. 본문 2000~2800자. h2 소제목 3~5개. 인용 박스 1~2개. 이미지 태그 금지",
  "tags": ["태그1", "태그2", "태그3"],
  "slugHint": "english-kebab-case-slug"
}

본문 HTML 규칙:
- <html>, <body> 없이 본문 조각만
- 첫 문단에 이 글의 결론과 지역 맥락을 먼저 보여 주기
- <img>, <figure>, 이미지 URL 금지
- 연락처·URL은 본문에 넣지 않기`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: GenerateResult;
  try {
    parsed = JSON.parse(extractJson(text)) as GenerateResult;
  } catch {
    throw new Error("제미나이가 JSON 형식으로 응답하지 않았습니다. 다시 시도해 주세요.");
  }
  if (!parsed.title || !parsed.bodyHtml) {
    throw new Error("제미나이 응답에 제목 또는 본문이 없습니다.");
  }
  const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
  if (focusKeyword && !tags.includes(focusKeyword)) {
    tags.unshift(focusKeyword);
  }
  return {
    title: parsed.title,
    excerpt: parsed.excerpt || "",
    bodyHtml: stripGeneratedImages(parsed.bodyHtml),
    tags: tags.slice(0, 8),
    slugHint: parsed.slugHint,
  };
}
