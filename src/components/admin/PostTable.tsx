"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { AdminPostRow, Category } from "@/lib/types";

function pageItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) items.push("…");
  for (let n = from; n <= to; n += 1) items.push(n);
  if (to < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function PostTable({
  posts,
  categories = [],
  total,
  page,
  pageSize,
  totalPages,
  category,
  allCount,
  counts = {},
}: {
  posts: AdminPostRow[];
  categories?: Category[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  category: string;
  allCount: number;
  counts?: Record<string, number>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [matchAll, setMatchAll] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);

  const pageIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allOnPage = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const selectedCount = matchAll ? total : selected.length;

  function hrefFor(next: { page?: number; cat?: string }) {
    const params = new URLSearchParams();
    const cat = next.cat === undefined ? category : next.cat;
    const p = next.page === undefined ? page : next.page;
    if (cat) params.set("cat", cat);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `/admin/posts?${q}` : "/admin/posts";
  }

  function go(next: { page?: number; cat?: string }) {
    setSelected([]);
    setMatchAll(false);
    router.push(hrefFor(next));
  }

  function toggleOne(id: string) {
    setMatchAll(false);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function togglePage(on: boolean) {
    setMatchAll(false);
    setSelected((cur) => {
      if (on) return Array.from(new Set([...cur, ...pageIds]));
      return cur.filter((id) => !pageIds.includes(id));
    });
  }

  async function runBulk(action: "delete" | "category") {
    if (selectedCount === 0) {
      alert("글을 선택하세요.");
      return;
    }
    if (action === "category") {
      if (!moveTo) {
        alert("바꿀 카테고리를 고르세요.");
        return;
      }
      const label = categories.find((c) => c.slug === moveTo)?.name || moveTo;
      if (!confirm(`선택한 ${selectedCount}편을 ‘${label}’(으)로 바꿀까요?`)) return;
    } else if (!confirm(`선택한 ${selectedCount}편을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: matchAll ? [] : selected,
          allMatching: matchAll,
          matchCategory: matchAll ? category : "",
          category: moveTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");
      setSelected([]);
      setMatchAll(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>글 목록</h2>
          <p className="admin-list-meta">
            전체 {allCount}편 · 이 목록 {total}편 · {from}–{to}번째 · 페이지당 {pageSize}편
          </p>
        </div>
        <div className="admin-head-actions">
          <Link className="btn" href="/admin/bulk">
            대량발행예약
          </Link>
          <Link className="btn btn-primary" href="/admin/posts/new">
            새 글
          </Link>
        </div>
      </div>

      <div className="admin-list-tools">
        <label className="admin-filter">
          카테고리
          <select value={category} onChange={(e) => go({ page: 1, cat: e.target.value })}>
            <option value="">전체 ({allCount})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({counts[c.slug] || 0})
              </option>
            ))}
          </select>
        </label>
        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={allOnPage || matchAll}
            onChange={(e) => togglePage(e.target.checked)}
          />
          이 페이지 전체
        </label>
        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={matchAll}
            onChange={(e) => {
              const on = e.target.checked;
              setMatchAll(on);
              setSelected(on ? pageIds : []);
            }}
          />
          현재 목록 전체 {total}편
        </label>
      </div>

      <div className="admin-bulk">
        <span>{selectedCount}편 선택됨</span>
        <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} disabled={busy || selectedCount === 0}>
          <option value="">카테고리 변경</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy || selectedCount === 0 || !moveTo}
          onClick={() => runBulk("category")}
        >
          변경
        </button>
        <button
          className="btn btn-danger"
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() => runBulk("delete")}
        >
          선택 삭제
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="admin-empty">이 목록에 글이 없습니다.</p>
      ) : (
        <table className="admin-table admin-post-table">
          <thead>
            <tr>
              <th className="admin-check">
                <input
                  type="checkbox"
                  checked={allOnPage || matchAll}
                  onChange={(e) => togglePage(e.target.checked)}
                  aria-label="이 페이지 전체 선택"
                />
              </th>
              <th className="admin-col-title">제목</th>
              <th className="admin-col-cat">카테고리</th>
              <th className="admin-col-status">상태</th>
              <th className="admin-col-date">날짜</th>
              <th className="admin-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="admin-check">
                  <input
                    type="checkbox"
                    checked={matchAll || selected.includes(post.id)}
                    onChange={() => toggleOne(post.id)}
                    aria-label={`${post.title} 선택`}
                  />
                </td>
                <td className="admin-col-title" data-label="제목">
                  <Link className="admin-post-title" href={`/admin/posts/${post.id}`}>
                    {post.title}
                  </Link>
                </td>
                <td className="admin-col-cat" data-label="카테고리">
                  {getCategory(post.category, categories)?.name || post.category}
                </td>
                <td className="admin-col-status" data-label="상태">
                  <span className={post.status === "published" ? "badge badge-on" : "badge badge-off"}>
                    {post.status === "published" ? "발행" : "초안"}
                  </span>
                </td>
                <td className="admin-col-date" data-label="날짜">
                  {formatDate(post.publishedAt || post.createdAt)}
                </td>
                <td className="admin-table-actions">
                  {post.status === "published" ? (
                    <Link href={`/posts/${post.slug}`} target="_blank">
                      보기
                    </Link>
                  ) : null}
                  <Link href={`/admin/posts/${post.id}`}>수정</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 ? (
        <nav className="admin-pager" aria-label="글 목록 페이지">
          {page > 1 ? (
            <Link className="admin-page-btn" href={hrefFor({ page: page - 1 })}>
              이전
            </Link>
          ) : null}
          {pageItems(page, totalPages).map((item, i) =>
            item === "…" ? (
              <span key={`e${i}`} className="admin-page-ellipsis">
                …
              </span>
            ) : (
              <Link
                key={item}
                className={`admin-page-btn ${item === page ? "active" : ""}`}
                href={hrefFor({ page: item })}
              >
                {item}
              </Link>
            )
          )}
          {page < totalPages ? (
            <Link className="admin-page-btn" href={hrefFor({ page: page + 1 })}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
