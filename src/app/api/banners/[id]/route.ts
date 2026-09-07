import { NextResponse } from "next/server";
import { isBannerTheme, safeBannerHref } from "@/lib/banners";
import { isAdminSession } from "@/lib/auth";
import { getBanners, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";
import type { Banner, BannerKind } from "@/lib/types";

function applyPatch(current: Banner, body: Record<string, unknown>): Banner | { error: string } {
  const kind: BannerKind =
    body.kind === "image" || body.kind === "text" ? body.kind : current.kind;
  const title = String(body.title ?? current.title).trim();
  const imageUrl = String(body.imageUrl ?? current.imageUrl ?? "").trim();
  if (kind === "text" && !title) return { error: "텍스트 배너에는 제목이 필요합니다." };
  if (kind === "image" && !imageUrl) return { error: "이미지 배너에는 이미지 URL이 필요합니다." };
  const themeRaw = String(body.theme ?? current.theme);
  return {
    ...current,
    kind,
    enabled: body.enabled == null ? current.enabled : Boolean(body.enabled),
    href: body.href != null ? safeBannerHref(String(body.href)) : current.href,
    theme: isBannerTheme(themeRaw) ? themeRaw : current.theme,
    kicker:
      body.kicker != null ? String(body.kicker).trim() || undefined : current.kicker,
    title: title || current.title,
    subtitle:
      body.subtitle != null ? String(body.subtitle).trim() || undefined : current.subtitle,
    ctaLabel:
      body.ctaLabel != null ? String(body.ctaLabel).trim() || undefined : current.ctaLabel,
    imageUrl: kind === "image" ? imageUrl : imageUrl || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const current = (await getBanners()).find((b) => b.id === id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const next = applyPatch(current, body);
  if ("error" in next) {
    return NextResponse.json({ error: next.error }, { status: 400 });
  }
  try {
    await updateStore((s) => {
      const idx = s.banners.findIndex((b) => b.id === id);
      if (idx >= 0) s.banners[idx] = next;
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true, banner: next });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await updateStore((s) => {
      s.banners = (s.banners || []).filter((b) => b.id !== id);
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true });
}
