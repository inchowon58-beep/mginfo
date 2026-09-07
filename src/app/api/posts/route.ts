import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";
import { isAdminSession } from "@/lib/auth";
import { getPublishedPosts, readStore, updateStore } from "@/lib/db";
import { notifyPostIndexed } from "@/lib/indexnow";
import { persistFail } from "@/lib/persist-api";
import { cleanHtml } from "@/lib/sanitize";
import { slugify, uid } from "@/lib/slug";
import type { CategorySlug, PostStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = await isAdminSession();
  if (admin && searchParams.get("all") === "1") {
    return NextResponse.json({ posts: (await readStore()).posts });
  }
  return NextResponse.json({ posts: await getPublishedPosts() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });

  const category = CATEGORIES.some((c) => c.slug === body.category)
    ? (body.category as CategorySlug)
    : "life";
  const status: PostStatus = body.status === "published" ? "published" : "draft";
  let slug = slugify(String(body.slug || title));
  const store = await readStore();
  if (store.posts.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;

  const now = new Date().toISOString();
  const post = {
    id: uid(),
    slug,
    title,
    excerpt: String(body.excerpt || ""),
    bodyHtml: cleanHtml(String(body.bodyHtml || "")),
    category,
    tags: Array.isArray(body.tags)
      ? body.tags.map((t: string) => String(t)).filter(Boolean)
      : String(body.tags || "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
    coverImage: String(body.coverImage || "") || undefined,
    focusKeyword: String(body.focusKeyword || "").trim() || undefined,
    status,
    publishedAt: status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
    theme: String(body.theme || "art-v1"),
  };

  try {
    await updateStore((s) => {
      s.posts.unshift(post);
    });
  } catch (err) {
    return persistFail(err);
  }
  let indexNow: { ok: boolean; detail?: string } = { ok: false, detail: "초안" };
  if (status === "published") {
    indexNow = await notifyPostIndexed(post.slug);
  }
  return NextResponse.json({ ok: true, post, indexNow });
}
