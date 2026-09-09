import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { isOpsHub } from "@/lib/ops-hub";
import { shuffleCloneLooks } from "@/lib/ops-looks";
import { getOpsSites } from "@/lib/ops-store";

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
  const body = (await request.json().catch(() => ({}))) as { siteIds?: unknown };
  const all = await getOpsSites();
  const ids = Array.isArray(body.siteIds) ? body.siteIds.map((id) => String(id)) : [];
  const wanted = ids.length ? all.filter((site) => ids.includes(site.id)) : all;
  const results = await shuffleCloneLooks(wanted);
  const ok = results.filter((row) => row.ok).length;
  return NextResponse.json({
    ok: true,
    total: results.length,
    updated: ok,
    failed: results.length - ok,
    results,
  });
}
