import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getSettings, updateStore } from "@/lib/db";
import {
  DEFAULT_COMMENT_MAX,
  DEFAULT_COMMENT_MIN,
  DEFAULT_LIKE_MAX,
  DEFAULT_LIKE_MIN,
  clampCount,
  orderedRange,
} from "@/lib/engagement";
import { persistFail } from "@/lib/persist-api";
import { isSiteThemeId } from "@/lib/site-theme";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    settings: {
      ...settings,
      geminiApiKey: settings.geminiApiKey
        ? `${settings.geminiApiKey.slice(0, 6)}••••${settings.geminiApiKey.slice(-4)}`
        : "",
      hasKey: Boolean(settings.geminiApiKey),
    },
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    await updateStore((s) => {
      if (typeof body.geminiApiKey === "string" && body.geminiApiKey && !body.geminiApiKey.includes("•")) {
        s.settings.geminiApiKey = body.geminiApiKey.trim();
      }
      if (typeof body.geminiModel === "string" && body.geminiModel.trim()) {
        s.settings.geminiModel = body.geminiModel.trim();
      }
      const textKeys = [
        "siteName",
        "siteTagline",
        "company",
        "ceo",
        "bizNo",
        "address",
        "phone",
        "email",
        "carrotKeywords",
      ] as const;
      for (const key of textKeys) {
        if (typeof body[key] === "string") {
          s.settings[key] = body[key].trim();
        }
      }
      if (isSiteThemeId(body.siteTheme)) {
        s.settings.siteTheme = body.siteTheme;
      }
      if (body.likeCountMin != null || body.likeCountMax != null) {
        const likes = orderedRange(
          clampCount(body.likeCountMin, s.settings.likeCountMin ?? DEFAULT_LIKE_MIN),
          clampCount(body.likeCountMax, s.settings.likeCountMax ?? DEFAULT_LIKE_MAX)
        );
        s.settings.likeCountMin = likes.min;
        s.settings.likeCountMax = likes.max;
      }
      if (body.commentCountMin != null || body.commentCountMax != null) {
        const comments = orderedRange(
          clampCount(body.commentCountMin, s.settings.commentCountMin ?? DEFAULT_COMMENT_MIN),
          clampCount(body.commentCountMax, s.settings.commentCountMax ?? DEFAULT_COMMENT_MAX)
        );
        s.settings.commentCountMin = comments.min;
        s.settings.commentCountMax = comments.max;
      }
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true });
}
