import { isOpsHub } from "@/lib/ops-hub";
import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { parseOpsSites } from "@/lib/ops-ledger";
import { getOpsSites, setOpsSites } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";

async function authorizeOps(request: Request) {
  if (await isMasterSession()) return true;
  const header = request.headers.get("x-infocs-master") || "";
  return checkMasterPassword(header);
}

export async function GET(request: Request) {
  if (!isOpsHub()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  return NextResponse.json({ sites: await getOpsSites() });
}

export async function PUT(request: Request) {
  if (!isOpsHub()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorizeOps(request))) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { sites?: unknown };
  try {
    const sites = await setOpsSites(parseOpsSites(body.sites));
    return NextResponse.json({ ok: true, sites });
  } catch (err) {
    return persistFail(err);
  }
}
