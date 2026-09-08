import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { bulkStats, publishBulkKeyword } from "@/lib/bulk-publish";
import { readStore, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const keywordId = String(body.keywordId || "").trim();
  if (!keywordId) {
    return NextResponse.json({ error: "키워드를 지정하세요." }, { status: 400 });
  }
  try {
    const store = await readStore();
    const result = await publishBulkKeyword(store, keywordId, { mutator: updateStore });
    const latest = await readStore();
    return NextResponse.json({
      ...result,
      stats: bulkStats(latest.bulkPublish, latest.categories || []),
      bulk: latest.bulkPublish,
    });
  } catch (err) {
    return persistFail(err);
  }
}
