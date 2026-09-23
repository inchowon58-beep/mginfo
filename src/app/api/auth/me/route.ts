import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = await isAdminSession();
  return NextResponse.json({ ok: true, admin });
}
