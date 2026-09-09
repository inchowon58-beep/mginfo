import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { pushToClones } from "@/lib/clone-remote";
import { getSettings } from "@/lib/db";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorizeOps(request: Request) {
  if (await isMasterSession()) return true;
  const header = request.headers.get("x-infocs-master") || "";
  return checkMasterPassword(header);
}

export async function POST(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 실행할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { geminiApiKey?: unknown; geminiModel?: unknown };
  const typedKey = typeof body.geminiApiKey === "string" ? body.geminiApiKey.trim() : "";
  const hub = await getSettings();
  const geminiApiKey = typedKey && !typedKey.includes("•") ? typedKey : hub.geminiApiKey;
  const geminiModel =
    typeof body.geminiModel === "string" && body.geminiModel.trim() ? body.geminiModel.trim() : hub.geminiModel;
  if (!geminiApiKey) {
    return NextResponse.json({ error: "적용할 제미나이 키가 없습니다. 키를 입력하거나 허브에 먼저 저장하세요." }, { status: 400 });
  }
  try {
    const results = await pushToClones(await getOpsSites(), { geminiApiKey, geminiModel });
    const updated = results.filter((row) => row.ok).length;
    return NextResponse.json({
      ok: true,
      total: results.length,
      updated,
      failed: results.length - updated,
      results,
    });
  } catch (err) {
    return persistFail(err);
  }
}
