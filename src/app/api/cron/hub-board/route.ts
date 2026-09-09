import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { isOpsHub } from "@/lib/ops-hub";
import { publishDueHubBoard } from "@/lib/hub-board-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-vercel-cron") === "1";
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not-hub" });
  }
  const allowed = isCronRequest(request) || (await isAdminSession());
  if (!allowed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await publishDueHubBoard();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
