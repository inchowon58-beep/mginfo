import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { fetchCloneMaster, patchCloneMaster } from "@/lib/clone-remote";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";

async function authorizeOps(request: Request) {
  if (await isMasterSession()) return true;
  const header = request.headers.get("x-infocs-master") || "";
  return checkMasterPassword(header);
}

async function findSite(request: Request, body?: { siteId?: unknown; domain?: unknown }) {
  const url = new URL(request.url);
  const siteId = String(body?.siteId || url.searchParams.get("siteId") || "").trim();
  const domain = String(body?.domain || url.searchParams.get("domain") || "").trim();
  const all = await getOpsSites();
  return all.find((row) => (siteId && row.id === siteId) || (domain && row.domain === domain)) || null;
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  const site = await findSite(request);
  if (!site) {
    return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  }
  try {
    const data = await fetchCloneMaster(site.domain);
    return NextResponse.json({ ok: true, domain: site.domain, siteName: site.siteName, settings: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "불러오지 못했습니다." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    siteId?: unknown;
    domain?: unknown;
    settings?: Record<string, unknown>;
  };
  const site = await findSite(request, body);
  if (!site) {
    return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  }
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  try {
    const data = await patchCloneMaster(site.domain, settings);
    return NextResponse.json({ ok: true, domain: site.domain, ...data });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return persistFail(err);
  }
}
