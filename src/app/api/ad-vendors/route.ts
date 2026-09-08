import { NextResponse } from "next/server";
import { parseAdVendor } from "@/lib/ad-vendors";
import { isAdminSession } from "@/lib/auth";
import { getAdVendors, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ vendors: await getAdVendors() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseAdVendor(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    await updateStore((s) => {
      s.adVendors = s.adVendors || [];
      s.adVendors.unshift(parsed);
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true, vendor: parsed });
}
