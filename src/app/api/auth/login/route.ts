import { NextResponse } from "next/server";
import { applyAdminCookie, checkMasterLogin, checkSiteLogin, createAdminToken } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");
  const master = checkMasterLogin(username, password);
  const site = master ? false : checkSiteLogin(username, password, await getSettings());
  if (!master && !site) {
    return NextResponse.json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  applyAdminCookie(res, token);
  return res;
}
