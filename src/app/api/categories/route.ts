import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { makeCategory, isFreeBoardSlug } from "@/lib/categories";
import { readStore, updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";

export async function GET() {
  const store = await readStore();
  const categories = store.categories || [];
  const counts = Object.fromEntries(
    categories.map((c) => [c.slug, store.posts.filter((p) => p.category === c.slug).length])
  );
  return NextResponse.json({ categories, counts });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "카테고리 이름을 입력하세요." }, { status: 400 });
  try {
    const store = await readStore();
    const cats = store.categories || [];
    if (cats.some((c) => c.name === name)) {
      return NextResponse.json({ error: "같은 이름의 카테고리가 있습니다." }, { status: 400 });
    }
    const created = makeCategory(name, cats, String(body.geminiNotes || ""));
    await updateStore((s) => {
      s.categories ||= [];
      s.categories.push(created);
    });
    return NextResponse.json({ ok: true, category: created });
  } catch (err) {
    return persistFail(err);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "카테고리를 선택하세요." }, { status: 400 });
  try {
    let found = false;
    await updateStore((s) => {
      const cat = (s.categories || []).find((c) => c.slug === slug);
      if (!cat) return;
      found = true;
      if (typeof body.geminiNotes === "string") {
        cat.geminiNotes = body.geminiNotes.trim();
      }
      if (typeof body.name === "string" && body.name.trim() && !isFreeBoardSlug(slug)) {
        cat.name = body.name.trim();
      }
    });
    if (!found) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return persistFail(err);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "카테고리를 선택하세요." }, { status: 400 });
  if (isFreeBoardSlug(slug)) {
    return NextResponse.json({ error: "자유게시판은 필수 카테고리라 삭제할 수 없습니다." }, { status: 400 });
  }
  try {
    const store = await readStore();
    const count = store.posts.filter((p) => p.category === slug).length;
    if (count > 0) {
      return NextResponse.json(
        {
          error: `이 카테고리에 글 ${count}편이 있습니다. 글을 모두 삭제한 뒤에 카테고리를 지울 수 있습니다.`,
          count,
        },
        { status: 400 }
      );
    }
    await updateStore((s) => {
      s.categories = (s.categories || []).filter((c) => c.slug !== slug);
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return persistFail(err);
  }
}
