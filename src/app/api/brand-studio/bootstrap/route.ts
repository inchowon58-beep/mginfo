import { NextResponse } from "next/server";
import { checkMasterPassword } from "@/lib/auth";
import { updateStore } from "@/lib/db";
import { parseMainLandingConfig } from "@/lib/main-landing";
import { persistFail } from "@/lib/persist-api";
import { revalidatePublicSite } from "@/lib/public-cache";
import { isSiteThemeId } from "@/lib/site-theme";

export const dynamic = "force-dynamic";

function authorize(request: Request) {
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

/** Brand Studio(PC)가 클론 생성 직후 메인랜딩·테마·업체 정보를 심을 때 사용 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
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
      if (body.mainLanding !== undefined) {
        s.settings.mainLanding = parseMainLandingConfig({
          ...body.mainLanding,
          enabled: true,
        });
      }
    });
    revalidatePublicSite();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return persistFail(err);
  }
}
