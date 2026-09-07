import { NextResponse } from "next/server";
import {
  checkMasterPassword,
  createMasterToken,
  isAdminSession,
  isMasterSession,
  setMasterCookie,
} from "@/lib/auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ unlocked: await isMasterSession() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!checkMasterPassword(password)) {
    return NextResponse.json({ error: "마스터 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = await createMasterToken();
  await setMasterCookie(token);
  return NextResponse.json({ ok: true, unlocked: true });
}
