import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { articleStyleLabel, resolveArticleStyle } from "@/lib/article-style";
import { getCategories, getSettings } from "@/lib/db";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";
import { generateArticle } from "@/lib/gemini";
import { resolveGeminiNotes } from "@/lib/gemini-notes";
import { ensureCategorySlug, getCategory } from "@/lib/categories";
import { extractPlaceName } from "@/lib/region-geo";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const focusKeyword = String(body.focusKeyword || "").trim();
  const topic = String(body.topic || "").trim();
  if (!focusKeyword && !topic) {
    return NextResponse.json({ error: "메인 키워드를 입력하세요." }, { status: 400 });
  }
  const writingStyle = resolveArticleStyle(
    String(body.writingStyle || ""),
    focusKeyword,
    topic,
    String(body.keywords || "")
  );
  const cats = await getCategories();
  const category = ensureCategorySlug(body.category, cats);
  const cat = getCategory(category, cats);
  const settings = await getSettings();
  const region =
    String(body.region || "").trim() ||
    extractPlaceName(focusKeyword, topic, String(body.keywords || ""));
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "제미나이 API 키가 없습니다. 설정에서 키를 저장하세요." },
      { status: 400 }
    );
  }

  try {
    const article = await generateArticle({
      topic: topic || focusKeyword,
      writingStyle,
      category,
      categoryName: cat?.name,
      keywords: String(body.keywords || ""),
      notes: resolveGeminiNotes(String(body.notes || ""), cat?.geminiNotes),
      focusKeyword: focusKeyword || topic,
      region,
      localNotes: String(body.localNotes || ""),
      experienceNotes: String(body.experienceNotes || ""),
      vendorName: String(body.vendorName || ""),
      writingTone: settings.writingTone,
      writingPersona: settings.writingPersona,
      apiKey,
      model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
    });
    return NextResponse.json({
      ok: true,
      article,
      region,
      writingStyle,
      writingStyleLabel: articleStyleLabel(writingStyle),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
