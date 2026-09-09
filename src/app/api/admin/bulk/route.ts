import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  bulkStats,
  defaultBulkPublish,
  normalizeBulkPublish,
  planToday,
  sanitizeGroupsInput,
  sanitizeScheduleInput,
} from "@/lib/bulk-publish";
import { readStore, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = await readStore();
  const bulk = store.bulkPublish || defaultBulkPublish();
  return NextResponse.json({
    ok: true,
    bulk,
    stats: bulkStats(bulk, store.categories || []),
    categories: store.categories || [],
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const store = await updateStore((s) => {
      const current = normalizeBulkPublish(s.bulkPublish);
      if (body.schedule !== undefined) {
        current.schedule = sanitizeScheduleInput(body.schedule, current.schedule);
        if (body.resetPlan) current.schedule.planDate = "";
      }
      if (body.groups !== undefined) {
        current.groups = sanitizeGroupsInput(body.groups, s.categories || []);
      }
      s.bulkPublish = current;
      planToday(s);
    });
    return NextResponse.json({
      ok: true,
      bulk: store.bulkPublish,
      stats: bulkStats(store.bulkPublish, store.categories || []),
    });
  } catch (err) {
    return persistFail(err);
  }
}
