import { NextResponse } from "next/server";
import { isAdminSession, isMasterSession, siteAccountFrom, validateSiteAccount } from "@/lib/auth";
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
import { isOpsHub } from "@/lib/ops-hub";
import { applyMasterSettingsPatch } from "@/lib/settings-apply";
import { isSiteThemeId } from "@/lib/site-theme";
import { isWritingToneId } from "@/lib/writing-tone";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const master = await isMasterSession();
  const { geminiApiKey, geminiModel, naverSiteVerification, sitePassword, publishBannedKeywords, ...rest } = settings;
  return NextResponse.json({
    opsHub: await isOpsHub(),
    settings: {
      ...rest,
      geminiApiKey: master && geminiApiKey ? `${geminiApiKey.slice(0, 6)}••••${geminiApiKey.slice(-4)}` : "",
      geminiModel: master ? geminiModel : undefined,
      hasKey: master ? Boolean(geminiApiKey) : undefined,
      naverSiteVerification: master ? naverSiteVerification || "" : undefined,
      sitePassword: master ? sitePassword : undefined,
      publishBannedKeywords: master ? publishBannedKeywords || [] : undefined,
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
    body.naverRankWork !== undefined ||
    body.naverSiteVerification !== undefined ||
    body.extraImagesEnabled !== undefined ||
    body.siteUsername !== undefined ||
    body.sitePassword !== undefined ||
    body.publishBannedKeywords !== undefined ||
    body.staffNotice !== undefined ||
    body.staffNoticeEnabled !== undefined ||
    body.staffNoticeTitle !== undefined ||
    body.staffNoticeBody !== undefined;
  if (wantsMaster && !(await isMasterSession())) {
    return NextResponse.json(
      { error: "마스터 관리자만 마스터 설정을 바꿀 수 있습니다." },
      { status: 403 }
    );
  }
  let nextSiteUser = "";
  let nextSitePass = "";
  if (typeof body.siteUsername === "string" || typeof body.sitePassword === "string") {
    const current = siteAccountFrom(await getSettings());
    nextSiteUser = typeof body.siteUsername === "string" ? body.siteUsername.trim() : current.username;
    nextSitePass = typeof body.sitePassword === "string" ? body.sitePassword : current.password;
    const invalid = validateSiteAccount(nextSiteUser, nextSitePass);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
  }
  try {
    await updateStore((s) => {
      applyMasterSettingsPatch(s, body);
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
        "writingPersona",
      ] as const;
      for (const key of textKeys) {
        if (typeof body[key] === "string") {
          s.settings[key] = body[key].trim();
        }
      }
      if (isSiteThemeId(body.siteTheme)) {
        s.settings.siteTheme = body.siteTheme;
      }
      if (isWritingToneId(body.writingTone)) {
        s.settings.writingTone = body.writingTone;
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
