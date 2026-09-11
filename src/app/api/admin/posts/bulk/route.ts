import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { ensureCategorySlug } from "@/lib/categories";
import { updateStore } from "@/lib/db";
import { persistFail } from "@/lib/persist-api";
import { parseSubmittedYoutubePair } from "@/lib/youtube";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const action =
    body.action === "category" || body.action === "delete" || body.action === "youtube" ? body.action : "";
  if (!action) {
    return NextResponse.json({ error: "작업을 선택하세요." }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)).filter(Boolean) : [];
  const allMatching = Boolean(body.allMatching);
  const matchCategory = String(body.matchCategory || "").trim();
  if (!allMatching && ids.length === 0) {
    return NextResponse.json({ error: "글을 선택하세요." }, { status: 400 });
  }
  const youtube = action === "youtube" ? parseSubmittedYoutubePair(body) : null;
  if (youtube && "error" in youtube) {
    return NextResponse.json({ error: youtube.error }, { status: 400 });
  }

  try {
    let count = 0;
    await updateStore((s) => {
      const idSet = new Set(ids);
      const matches = (id: string, category: string) => {
        if (allMatching) return matchCategory ? category === matchCategory : true;
        return idSet.has(id);
      };
      if (action === "delete") {
        const before = s.posts.length;
        s.posts = s.posts.filter((p) => !matches(p.id, p.category));
        count = before - s.posts.length;
        return;
      }
      if (action === "youtube" && youtube && !("error" in youtube)) {
        const now = new Date().toISOString();
        for (const post of s.posts) {
          if (!matches(post.id, post.category)) continue;
          post.youtubeUrl1 = youtube.youtubeUrl1;
          post.youtubeUrl2 = youtube.youtubeUrl2;
          post.updatedAt = now;
          count += 1;
        }
        return;
      }
      const category = ensureCategorySlug(body.category, s.categories || []);
      for (const post of s.posts) {
        if (!matches(post.id, post.category) || post.category === category) continue;
        post.category = category;
        post.updatedAt = new Date().toISOString();
        count += 1;
      }
    });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return persistFail(err);
  }
}
