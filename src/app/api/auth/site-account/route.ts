import { NextResponse } from "next/server";
import {
  canConfirmSiteAccount,
  isAdminSession,
  siteAccountFrom,
  validateSiteAccount,
} from "@/lib/auth";
import { getSettings, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const account = siteAccountFrom(await getSettings());
  return NextResponse.json({ username: account.username });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const passwordConfirm = String(body.passwordConfirm || "");
  const settings = await getSettings();
  if (!canConfirmSiteAccount(currentPassword, settings)) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "새 비밀번호가 서로 다릅니다." }, { status: 400 });
  }
  const invalid = validateSiteAccount(username, password);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }
  try {
    await updateStore((store) => {
      store.settings.siteUsername = username;
      store.settings.sitePassword = password;
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true, username });
}
