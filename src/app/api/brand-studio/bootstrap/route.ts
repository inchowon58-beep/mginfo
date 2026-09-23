import { NextResponse } from "next/server";
import { checkMasterPassword } from "@/lib/auth";
import { getSettings, updateStore } from "@/lib/db";
import { enrichMainLandingCopy, parseMainLandingConfig } from "@/lib/main-landing";
import { persistFail } from "@/lib/persist-api";
import { revalidatePublicSite } from "@/lib/public-cache";
import { isSiteThemeId } from "@/lib/site-theme";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorize(request: Request) {
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

/** Brand Studio(PC)가 클론 생성 직후 메인랜딩·테마·업체 정보를 심을 때 사용 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wantEnrich = body.enrich !== false && body.mainLanding !== undefined;
  const geminiFromStudio =
    typeof body.geminiApiKey === "string" && body.geminiApiKey.trim() && !body.geminiApiKey.includes("•")
      ? body.geminiApiKey.trim()
      : "";
  const geminiModel =
    typeof body.geminiModel === "string" && body.geminiModel.trim() ? body.geminiModel.trim() : "";

  try {
    await updateStore((s) => {
      if (typeof body.siteName === "string" && body.siteName.trim()) {
        s.settings.siteName = body.siteName.trim();
      }
      if (typeof body.company === "string") s.settings.company = body.company.trim();
      if (typeof body.phone === "string") s.settings.phone = body.phone.trim();
      if (typeof body.address === "string") s.settings.address = body.address.trim();
      if (typeof body.bizNo === "string") s.settings.bizNo = body.bizNo.trim();
      if (isSiteThemeId(body.siteTheme)) s.settings.siteTheme = body.siteTheme;
      if (typeof body.naverSiteVerification === "string") {
        s.settings.naverSiteVerification = body.naverSiteVerification.trim();
      }
      if (geminiFromStudio) s.settings.geminiApiKey = geminiFromStudio;
      if (geminiModel) s.settings.geminiModel = geminiModel;
      if (body.mainLanding !== undefined) {
        s.settings.mainLanding = parseMainLandingConfig({
          ...body.mainLanding,
          enabled: true,
        });
      }
    });

    let enriched = false;
    let enrichError = "";
    if (wantEnrich) {
      const settings = await getSettings();
      const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        enrichError =
          "제미나이 키 없음 — Studio 계정 설정에 Gemini API Key를 넣거나, 관리자 마스터 설정에 저장하세요.";
      } else {
        try {
          const config = parseMainLandingConfig(settings.mainLanding);
          const copyOverride = await enrichMainLandingCopy({
            config,
            siteName: settings.siteName || config.vendor.keyword,
            apiKey,
            model: settings.geminiModel,
          });
          const enrichedAt = new Date().toISOString();
          await updateStore((s) => {
            s.settings.mainLanding = parseMainLandingConfig({
              ...config,
              enabled: true,
              copyOverride,
              enrichedAt,
            });
          });
          enriched = true;
        } catch (err) {
          enrichError = err instanceof Error ? err.message : "내용 보충 실패";
        }
      }
    }

    revalidatePublicSite();
    return NextResponse.json({
      ok: true,
      enriched,
      ...(enrichError ? { enrichError } : {}),
    });
  } catch (err) {
    return persistFail(err);
  }
}
