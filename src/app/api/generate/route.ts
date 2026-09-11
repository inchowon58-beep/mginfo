import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { attachLocalFactBlocks } from "@/lib/article-blocks";
import { articleStyleLabel, resolveArticleStyle } from "@/lib/article-style";
import { bannedContentError, collectPublishText } from "@/lib/banned-keywords";
import { collectRecentBodies } from "@/lib/body-uniqueness";
import { ensureCategorySlug, getCategory } from "@/lib/categories";
import { getCategories, getPublishedPosts, getSettings } from "@/lib/db";
import { generateArticle } from "@/lib/gemini";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";
import { resolveGeminiNotes } from "@/lib/gemini-notes";
import { extractPlaceName } from "@/lib/region-geo";
import { collectRecentTitles, withUniqueArticle } from "@/lib/title-uniqueness";

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
  const [settings, published] = await Promise.all([getSettings(), getPublishedPosts()]);
  const banned = bannedContentError(
    settings.publishBannedKeywords,
    collectPublishText({
      topic,
      focusKeyword,
      keywords: String(body.keywords || ""),
      notes: [String(body.notes || ""), String(body.experienceNotes || "")].filter(Boolean).join("\n"),
      region: String(body.region || ""),
    })
  );
  if (banned) return NextResponse.json({ error: banned }, { status: 400 });
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
    const article = await withUniqueArticle(
      (nextAvoid) =>
        generateArticle({
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
          avoidTitles: nextAvoid,
          apiKey,
          model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
        }),
      collectRecentTitles(published),
      collectRecentBodies(published),
      focusKeyword || topic
    );
    article.bodyHtml = attachLocalFactBlocks({
      html: article.bodyHtml,
      place: region,
      keyword: focusKeyword || topic,
      categoryName: cat?.name,
      slug: article.slugHint,
      title: article.title,
    });
    const generatedBan = bannedContentError(
      settings.publishBannedKeywords,
      collectPublishText({
        title: article.title,
        excerpt: article.excerpt,
        bodyHtml: article.bodyHtml,
        focusKeyword: article.tags?.join(" "),
      })
    );
    if (generatedBan) {
      return NextResponse.json({ error: generatedBan }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      article,
      region,
      writingStyle,
      writingStyleLabel: articleStyleLabel(writingStyle),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "생성에 실패했습니다.";
    const similar = /너무 비슷/.test(message);
    return NextResponse.json({ error: message }, { status: similar ? 409 : 500 });
  }
}
