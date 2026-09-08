import { NextResponse } from "next/server";
import { parseAdVendor } from "@/lib/ad-vendors";
import { isAdminSession } from "@/lib/auth";
import { getAdVendors, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const current = (await getAdVendors()).find((row) => row.id === id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const next = parseAdVendor(body, current);
  if ("error" in next) {
    return NextResponse.json({ error: next.error }, { status: 400 });
  }
  try {
    await updateStore((s) => {
      const idx = (s.adVendors || []).findIndex((row) => row.id === id);
      if (idx >= 0) s.adVendors[idx] = next;
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true, vendor: next });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await updateStore((s) => {
      s.adVendors = (s.adVendors || []).filter((row) => row.id !== id);
    });
  } catch (err) {
    return persistFail(err);
  }
  return NextResponse.json({ ok: true });
}
