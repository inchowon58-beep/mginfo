import { NextResponse } from "next/server";
import { checkMasterPassword } from "@/lib/auth";
import { FREE_BOARD_SLUG, withFreeBoard } from "@/lib/categories";
import { getSettings, updateStore } from "@/lib/db";
import { alreadyHasCampaign, makeBoardPost } from "@/lib/hub-board";
import { notifyPostIndexed } from "@/lib/indexnow";
import { persistFail } from "@/lib/persist-api";
import { isSiteThemeId } from "@/lib/site-theme";
import { isWritingToneId } from "@/lib/writing-tone";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const header = request.headers.get("x-infocs-master") || "";
  if (!checkMasterPassword(header)) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    writingTone: settings.writingTone || "",
    writingPersona: settings.writingPersona || "",
    siteTheme: settings.siteTheme || "",
    siteName: settings.siteName || "",
    siteTagline: settings.siteTagline || "",
  });
}

export async function PATCH(request: Request) {
  const header = request.headers.get("x-infocs-master") || "";
  if (!checkMasterPassword(header)) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const writingTone = isWritingToneId(body.writingTone) ? body.writingTone : "";
  const siteTheme = isSiteThemeId(body.siteTheme) ? body.siteTheme : "";
  if (!writingTone && !siteTheme) {
    return NextResponse.json({ error: "말투 또는 디자인을 보내 주세요." }, { status: 400 });
  }
  try {
    let next = { writingTone: "", siteTheme: "" };
    await updateStore((store) => {
      if (writingTone) store.settings.writingTone = writingTone;
      if (siteTheme) store.settings.siteTheme = siteTheme;
      next = { writingTone: store.settings.writingTone, siteTheme: store.settings.siteTheme };
    });
    return NextResponse.json({ ok: true, ...next });
  } catch (err) {
    return persistFail(err);
  }
}

export async function POST(request: Request) {
  const header = request.headers.get("x-infocs-master") || "";
  if (!checkMasterPassword(header)) {
    return NextResponse.json({ error: "마스터만 등록할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  const hubCampaignId = String(body.hubCampaignId || "").trim();

  try {
    let post = null as ReturnType<typeof makeBoardPost> | null;
    let duplicate = false;
    await updateStore((store) => {
      store.categories = withFreeBoard(store.categories);
      if (hubCampaignId && alreadyHasCampaign(store.posts, hubCampaignId)) {
        duplicate = true;
        post = store.posts.find((row) => row.hubCampaignId === hubCampaignId) || null;
        return;
      }
      post = makeBoardPost({ ...body, category: FREE_BOARD_SLUG }, store.posts);
      store.posts.unshift(post);
    });
    if (!post) return NextResponse.json({ error: "글을 만들지 못했습니다." }, { status: 500 });
    if (!duplicate) {
      await notifyPostIndexed(post.slug);
    }
    return NextResponse.json({ ok: true, duplicate, post });
  } catch (err) {
    return persistFail(err);
  }
}
