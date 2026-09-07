import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { saveCoverFile } from "@/lib/cover-upload";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "이미지 파일을 선택하세요." }, { status: 400 });
  }
  try {
    const url = await saveCoverFile(file);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
