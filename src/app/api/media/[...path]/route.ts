import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = path.map((part) => decodeURIComponent(part)).join("/");
  if (!pathname.startsWith("covers/") || pathname.includes("..")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const result = await get(pathname, { access: "private", useCache: true });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
