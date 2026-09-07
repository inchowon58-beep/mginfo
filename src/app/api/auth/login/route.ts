import { NextResponse } from "next/server";
import { checkAdminCredentials, createAdminToken, setAdminCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");
  if (!checkAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = await createAdminToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
