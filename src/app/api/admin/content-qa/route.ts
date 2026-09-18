import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { readStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";
import { getQaResult, getQaStore } from "@/lib/qa-store";
import { runCompareQa, runLegacyQa, runPlannerQa } from "@/lib/qa-runner";
import { summarizeAngleCounts } from "@/lib/content-validation";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    if (id) {
      const row = await getQaResult(id);
      if (!row) return NextResponse.json({ error: "없음" }, { status: 404 });
      return NextResponse.json({ ok: true, result: row });
    }
    const store = await getQaStore();
    const angleDist = summarizeAngleCounts(store.results);
    return NextResponse.json({ ok: true, store, angleDist });
  } catch (err) {
    return persistFail(err);
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "planner").trim();
  const keyword = String(body.keyword || "").trim();
  if (!keyword) return NextResponse.json({ error: "keyword 필요" }, { status: 400 });

  try {
    const store = await readStore();
    const apiKey = store.settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "제미나이 API 키 없음" }, { status: 400 });

    const group = {
      category: String(body.category || "life"),
      vendorName: String(body.vendorName || "").trim() || undefined,
      vendorId: String(body.vendorId || "").trim() || undefined,
      industryId: String(body.industryId || "").trim() || undefined,
      blueprintId: String(body.blueprintId || "").trim() || undefined,
      writingStyle: String(body.writingStyle || "magazine"),
    };

    if (action === "legacy") {
      const out = await runLegacyQa({ store, keyword, group, apiKey });
      return NextResponse.json({ ok: true, result: out.qa, model: store.settings.geminiModel || DEFAULT_GEMINI_MODEL });
    }
    if (action === "compare") {
      const out = await runCompareQa({ store, keyword, group, apiKey });
      return NextResponse.json({ ok: true, legacy: out.legacy, planner: out.planner, compare: out.compare });
    }
    const out = await runPlannerQa({ store, keyword, group, apiKey });
    return NextResponse.json({ ok: true, result: out.qa, article: { generationMode: out.article.generationMode } });
  } catch (err) {
    return persistFail(err);
  }
}
