import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { bulkStats, planToday, publishDueBulk } from "@/lib/bulk-publish";
import { readStore, updateStore } from "@/lib/db";
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
  const allowed = isCronRequest(request) || (await isAdminSession());
  if (!allowed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let planned = 0;
  const before = await updateStore((s) => {
    planned = planToday(s).planned;
  });
  let hub = null as Awaited<ReturnType<typeof publishDueHubBoard>> | null;
  if (await isOpsHub()) {
    try {
      hub = await publishDueHubBoard();
    } catch {
      hub = null;
    }
  }
  if (!before.bulkPublish.schedule.enabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "off",
      planned: 0,
      hub,
      stats: bulkStats(before.bulkPublish, before.categories || []),
    });
  }

  const latest = await readStore();
  const published = await publishDueBulk(latest, { mutator: updateStore });
  const store = await readStore();
  return NextResponse.json({
    ok: true,
    skipped: false,
    planned,
    ...published,
    hub,
    stats: bulkStats(store.bulkPublish, store.categories || []),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
