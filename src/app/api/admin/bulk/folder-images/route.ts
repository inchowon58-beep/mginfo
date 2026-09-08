import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { discoverWebFolderImages } from "@/lib/web-image-folder";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  try {
    const found = await discoverWebFolderImages(url);
    return NextResponse.json({ ok: true, ...found, count: found.urls.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "폴더를 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
