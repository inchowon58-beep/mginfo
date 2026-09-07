import { GoogleGenerativeAI } from "@google/generative-ai";
import { CATEGORIES } from "./categories";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { stripGeneratedImages } from "./sanitize";
import type { CategorySlug } from "./types";

export type GenerateInput = {
  topic?: string;
  category: CategorySlug;
  keywords?: string;
  notes?: string;
  focusKeyword?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceText?: string;
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
  const category = CATEGORIES.find((c) => c.slug === input.category);
  const focusKeyword = (input.focusKeyword || "").trim();
  const isRewrite = Boolean(input.sourceText);
  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({
    model: input.model || DEFAULT_GEMINI_MODEL,
    generationConfig: {
      temperature: isRewrite ? 0.75 : 0.7,
      maxOutputTokens: 8192,
    },
  });

  const rewriteBlock = isRewrite
    ? `작업: 아래 원문을 참고만 해서 완전히 새로운 매거진 정보글로 재창조한다.
원문을 문장 단위로 옮기지 마라. 구성, 소제목, 표현을 새로 짠다.
원문에 있는 이미지는 무시한다. HTML에 <img>, <figure>, 이미지 URL을 절대 넣지 마라.
원문 주소: ${input.sourceUrl || "(없음)"}
원문 제목: ${input.sourceTitle || "(없음)"}
원문 텍스트:
"""
${input.sourceText}
"""
`
    : `작업: 주제와 키워드로 매거진 정보글을 새로 작성한다.
주제: ${input.topic || "(없음)"}
`;

  const prompt = `너는 한국어 매거진 에디터이자 네이버 검색용 SEO 문서 작성자다.
뉴스기사와 매거진 특집 사이의 톤으로, 독자에게 바로 도움이 되는 정보를 전달한다.
과장 광고, 이모지, 영어 해시태그, 업체 홍보 문장은 쓰지 않는다.

카테고리: ${category?.name || input.category}
보조 키워드: ${input.keywords || "(없음)"}
추가 지시: ${input.notes || "(없음)"}
${seoRules(focusKeyword)}

${rewriteBlock}

반드시 JSON만 출력한다. 설명 문장이나 마크다운 울타리는 넣지 않는다.
형식:
{
  "title": "한국어 제목",
  "excerpt": "2~3문장 리드. 검색 스니펫으로도 읽히게",
  "bodyHtml": "HTML only. Use <h2>, <h3>, <p>, <blockquote>, <ul><li>. 본문 1600~2400자. h2 소제목 3~5개. 인용 박스 1개. 마지막은 실무 조언으로 닫기. 이미지 태그 금지",
  "tags": ["태그1", "태그2", "태그3"],
  "slugHint": "english-kebab-case-slug"
}

본문 HTML 규칙:
- <html>, <body> 없이 본문 조각만
- 첫 문단에 결론을 먼저 보여 주기
- <img>, <figure>, 이미지 URL 금지
- 광고성 업체 홍보 문장은 넣지 않기`;

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
