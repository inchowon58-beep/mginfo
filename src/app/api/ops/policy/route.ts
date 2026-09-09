import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { unpublishBannedPosts } from "@/lib/banned-keywords";
import { updateStore } from "@/lib/db";
import { pushToClones } from "@/lib/clone-remote";
import { isOpsHub } from "@/lib/ops-hub";
import { getBannedKeywords, getOpsSites, setBannedKeywords } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorizeOps(request: Request) {
  if (await isMasterSession()) return true;
  const header = request.headers.get("x-infocs-master") || "";
  return checkMasterPassword(header);
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  return NextResponse.json({ bannedKeywords: await getBannedKeywords() });
}

export async function PUT(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { bannedKeywords?: unknown; push?: unknown };
  try {
    const bannedKeywords = await setBannedKeywords(body.bannedKeywords);
    let unpublished = 0;
    await updateStore((store) => {
      store.settings.publishBannedKeywords = bannedKeywords;
      unpublished = unpublishBannedPosts(store.posts, bannedKeywords);
    });
    const push = body.push !== false;
    const results = push ? await pushToClones(await getOpsSites(), { publishBannedKeywords: bannedKeywords, unpublishBanned: true }) : [];
    const updated = results.filter((row) => row.ok).length;
    return NextResponse.json({
      ok: true,
      bannedKeywords,
      unpublished,
      pushed: push,
      total: results.length,
      updated,
      failed: results.length - updated,
      unpublishedClones: results.reduce((sum, row) => sum + (row.unpublished || 0), 0),
      results,
    });
  } catch (err) {
    return persistFail(err);
  }
}
