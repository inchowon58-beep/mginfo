import { NextResponse } from "next/server";
import { checkMasterPassword, isAdminSession } from "@/lib/auth";
import { getSettings, updateStore } from "@/lib/db";
import { enrichMainLandingCopy, parseMainLandingConfig } from "@/lib/main-landing";
import { persistFail } from "@/lib/persist-api";
import { revalidatePublicSite } from "@/lib/public-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function authorize(request: Request) {
  if (await isAdminSession()) return true;
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

/** 메인 랜딩 문장 보충(제미나이). 섹션 뼈대 유지, copyOverride 저장. */
export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const settings = await getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "제미나이 API 키가 없습니다. 마스터 설정에서 키를 저장하세요." },
      { status: 400 }
    );
  }

  const baseConfig = parseMainLandingConfig(
    body.mainLanding !== undefined ? body.mainLanding : settings.mainLanding
  );
  if (!baseConfig.vendor.keyword && !baseConfig.vendor.name) {
    return NextResponse.json(
      { error: "사이트이름(키워드)과 업체명을 먼저 입력·저장하세요." },
      { status: 400 }
    );
  }
  if (!baseConfig.variationSeed) {
    baseConfig.variationSeed = [
      baseConfig.vendor.keyword,
      baseConfig.vendor.name,
      settings.siteName,
      Date.now().toString(36),
    ]
      .filter(Boolean)
      .join("|");
  }

  try {
    const copyOverride = await enrichMainLandingCopy({
      config: baseConfig,
      siteName: settings.siteName || baseConfig.vendor.keyword,
      apiKey,
      model: settings.geminiModel,
    });
    const enrichedAt = new Date().toISOString();
    let saved = baseConfig;
    await updateStore((s) => {
      const next = parseMainLandingConfig({
        ...baseConfig,
        enabled: baseConfig.enabled || body.enable === true,
        copyOverride,
        enrichedAt,
        variationSeed: baseConfig.variationSeed,
      });
      s.settings.mainLanding = next;
      saved = next;
    });
    revalidatePublicSite();
    return NextResponse.json({
      ok: true,
      mainLanding: saved,
      message: "메인 내용을 사이트마다 다르게 보충했습니다. 홈을 새로고침해 보세요.",
    });
  } catch (err) {
    return persistFail(err);
  }
}
