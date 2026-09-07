import { NextResponse } from "next/server";
import { isBannerTheme, safeBannerHref } from "@/lib/banners";
import { isAdminSession } from "@/lib/auth";
import { getBanners, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";
import { uid } from "@/lib/slug";
import type { Banner, BannerKind } from "@/lib/types";

function parseBanner(body: Record<string, unknown>, current?: Banner): Banner | { error: string } {
  const kind: BannerKind = body.kind === "image" ? "image" : "text";
  const title = String(body.title ?? current?.title ?? "").trim();
  const imageUrl = String(body.imageUrl ?? current?.imageUrl ?? "").trim();
  if (kind === "text" && !title) return { error: "텍스트 배너에는 제목이 필요합니다." };
  if (kind === "image" && !imageUrl) return { error: "이미지 배너에는 이미지 URL이 필요합니다." };

  const themeRaw = String(body.theme ?? current?.theme ?? "bronze");
  const now = new Date().toISOString();
  return {
    id: current?.id || uid(),
    kind,
    enabled: body.enabled == null ? current?.enabled ?? true : Boolean(body.enabled),
    href: safeBannerHref(String(body.href ?? current?.href ?? "/")),
    theme: isBannerTheme(themeRaw) ? themeRaw : "bronze",
    kicker: String(body.kicker ?? current?.kicker ?? "").trim() || undefined,
    title: title || "배너",
    subtitle: String(body.subtitle ?? current?.subtitle ?? "").trim() || undefined,
    ctaLabel: String(body.ctaLabel ?? current?.ctaLabel ?? "").trim() || undefined,
    imageUrl: imageUrl || undefined,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ banners: await getBanners() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseBanner(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    await updateStore((s) => {
      s.banners = s.banners || [];
      s.banners.unshift(parsed);
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true, banner: parsed });
}
