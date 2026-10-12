import { NextResponse } from "next/server";
import { allowCronOrAdmin, isPreviewCron } from "@/lib/cron-auth";
import { isOpsHub } from "@/lib/ops-hub";
import { publishDueHubBoard } from "@/lib/hub-board-store";
import { isPublishingPaused, PUBLISHING_PAUSED_REASON } from "@/lib/publishing-paused";

export const dynamic = "force-dynamic";
/** Hub-only backup. Preview crons are skipped. bulk-publish already flushes overdue hub ads. */
export const maxDuration = 300;

export async function GET(request: Request) {
  if (isPublishingPaused()) {
    return NextResponse.json({ ok: true, skipped: true, reason: PUBLISHING_PAUSED_REASON });
  }
  if (isPreviewCron(request)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "preview" });
  }
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
