import { NextResponse } from "next/server";
import { allowCronOrAdmin } from "@/lib/cron-auth";
import { isOpsHub } from "@/lib/ops-hub";
import { publishDueHubBoard } from "@/lib/hub-board-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not-hub" });
  }
  const allowed = await allowCronOrAdmin(request);
  if (!allowed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await publishDueHubBoard();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
