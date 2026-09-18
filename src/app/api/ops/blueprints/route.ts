import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import {
  getContentBlueprintStore,
  resetContentBlueprintsToSeed,
  setBlockStatus,
  setBlueprintStatus,
} from "@/lib/content-blueprint-store";
import type { CatalogStatus } from "@/lib/content-blueprint-types";
import { isOpsHub } from "@/lib/ops-hub";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  if (await isMasterSession()) return true;
  const header = request.headers.get("x-infocs-master") || "";
  return checkMasterPassword(header);
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  try {
    const store = await getContentBlueprintStore();
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    return persistFail(err);
  }
}

export async function PATCH(request: Request) {
  if (!(await isOpsHub())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "").trim();
  const status = String(body.status || "").trim() as CatalogStatus;
  try {
    if (action === "setBlueprintStatus") {
      if (!["draft", "active", "disabled"].includes(status)) {
        return NextResponse.json({ error: "상태가 올바르지 않습니다." }, { status: 400 });
      }
      const result = await setBlueprintStatus(String(body.blueprintId || ""), status);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
      return NextResponse.json(result);
    }
    if (action === "setBlockStatus") {
      if (!["draft", "active", "disabled"].includes(status)) {
        return NextResponse.json({ error: "상태가 올바르지 않습니다." }, { status: 400 });
      }
      const result = await setBlockStatus(String(body.blockId || ""), status);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
      return NextResponse.json(result);
    }
    if (action === "resetSeed") {
      const store = await resetContentBlueprintsToSeed();
      return NextResponse.json({ ok: true, store });
    }
    return NextResponse.json({ error: "알 수 없는 동작입니다." }, { status: 400 });
  } catch (err) {
    return persistFail(err);
  }
}
