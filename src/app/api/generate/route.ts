import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { fetchSourceArticle } from "@/lib/fetch-source";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";
import { generateArticle } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const topic = String(body.topic || "").trim();
  const sourceUrl = String(body.sourceUrl || "").trim();
  if (!topic && !sourceUrl) {
    return NextResponse.json({ error: "주제 또는 원문 주소를 입력하세요." }, { status: 400 });
  }
  const category = CATEGORIES.some((c) => c.slug === body.category)
    ? (body.category as CategorySlug)
    : "life";
  const settings = getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "제미나이 API 키가 없습니다. 설정에서 키를 저장하세요." },
      { status: 400 }
    );
  }

  let sourceTitle = "";
  let sourceText = "";
  if (sourceUrl) {
    try {
      const source = await fetchSourceArticle(sourceUrl);
      sourceTitle = source.title;
      sourceText = source.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "원문을 가져오지 못했습니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const article = await generateArticle({
      topic: topic || sourceTitle,
      category,
      keywords: String(body.keywords || ""),
      notes: String(body.notes || ""),
      focusKeyword: String(body.focusKeyword || ""),
      sourceTitle,
      sourceUrl,
      sourceText,
      apiKey,
      model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
    });
    return NextResponse.json({ ok: true, article });
  } catch (err) {
    const message = err instanceof Error ? err.message : "생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
