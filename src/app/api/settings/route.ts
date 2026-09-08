import { NextResponse } from "next/server";
import { isAdminSession, isMasterSession } from "@/lib/auth";
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
import {
  normalizeDailyPostLimit,
  normalizeUsableUntil,
} from "@/lib/publish-limits";
import { isSiteThemeId } from "@/lib/site-theme";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const master = await isMasterSession();
  const { geminiApiKey, geminiModel, ...rest } = settings;
  return NextResponse.json({
    settings: {
      ...rest,
      geminiApiKey: master && geminiApiKey ? `${geminiApiKey.slice(0, 6)}••••${geminiApiKey.slice(-4)}` : "",
      geminiModel: master ? geminiModel : undefined,
      hasKey: master ? Boolean(geminiApiKey) : undefined,
    },
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wantsGemini =
    (typeof body.geminiApiKey === "string" && body.geminiApiKey && !body.geminiApiKey.includes("•")) ||
    typeof body.geminiModel === "string";
  const wantsMaster =
    wantsGemini ||
    body.usableUntil !== undefined ||
    body.dailyPostLimit !== undefined ||
    body.naverRankWork !== undefined;
  if (wantsMaster && !(await isMasterSession())) {
    return NextResponse.json(
      { error: "마스터 관리자만 마스터 설정을 바꿀 수 있습니다." },
      { status: 403 }
    );
  }
  try {
    await updateStore((s) => {
      if (typeof body.geminiApiKey === "string" && body.geminiApiKey && !body.geminiApiKey.includes("•")) {
        s.settings.geminiApiKey = body.geminiApiKey.trim();
      }
      if (typeof body.geminiModel === "string" && body.geminiModel.trim()) {
        s.settings.geminiModel = body.geminiModel.trim();
      }
      if (body.usableUntil !== undefined) {
        s.settings.usableUntil = normalizeUsableUntil(body.usableUntil);
      }
      if (body.dailyPostLimit !== undefined) {
        s.settings.dailyPostLimit = normalizeDailyPostLimit(body.dailyPostLimit, s.settings.dailyPostLimit);
      }
      if (typeof body.naverRankWork === "boolean") {
        s.settings.naverRankWork = body.naverRankWork;
      } else if (body.naverRankWork === "true" || body.naverRankWork === "1") {
        s.settings.naverRankWork = true;
      } else if (body.naverRankWork === "false" || body.naverRankWork === "0") {
        s.settings.naverRankWork = false;
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
        "popupTitle",
        "popupBody",
        "popupCta",
        "popupHref",
        "popupImage",
      ] as const;
      for (const key of textKeys) {
        if (typeof body[key] === "string") {
          s.settings[key] = body[key].trim();
        }
      }
      if (isSiteThemeId(body.siteTheme)) {
        s.settings.siteTheme = body.siteTheme;
      }
      if (typeof body.popupEnabled === "boolean") {
        s.settings.popupEnabled = body.popupEnabled;
      } else if (body.popupEnabled === "true" || body.popupEnabled === "1") {
        s.settings.popupEnabled = true;
      } else if (body.popupEnabled === "false" || body.popupEnabled === "0") {
        s.settings.popupEnabled = false;
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
