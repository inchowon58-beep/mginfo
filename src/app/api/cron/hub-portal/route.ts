import { NextResponse } from "next/server";
import { allowCronOrAdmin, isPreviewCron } from "@/lib/cron-auth";
import { collectHubPortalFeed } from "@/lib/hub-portal";
import { isOpsHub } from "@/lib/ops-hub";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
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
  const feed = await collectHubPortalFeed();
  return NextResponse.json({
    ok: true,
    count: feed.posts.length,
    sites: feed.sites.length,
    updatedAt: feed.updatedAt,
    siteStats: feed.sites,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
