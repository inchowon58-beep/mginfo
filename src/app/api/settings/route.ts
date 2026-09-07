import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getSettings, updateStore } from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = getSettings();
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
  await updateStore((s) => {
    if (typeof body.geminiApiKey === "string" && body.geminiApiKey && !body.geminiApiKey.includes("•")) {
      s.settings.geminiApiKey = body.geminiApiKey.trim();
    }
    if (typeof body.geminiModel === "string" && body.geminiModel.trim()) {
      s.settings.geminiModel = body.geminiModel.trim();
    }
    if (typeof body.siteName === "string" && body.siteName.trim()) {
      s.settings.siteName = body.siteName.trim();
    }
    if (typeof body.siteTagline === "string" && body.siteTagline.trim()) {
      s.settings.siteTagline = body.siteTagline.trim();
    }
  });
  return NextResponse.json({ ok: true });
}
