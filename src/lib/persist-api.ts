import { NextResponse } from "next/server";
import { PersistError } from "@/lib/db";

export function persistFail(err: unknown) {
  if (err instanceof PersistError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "저장에 실패했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
