"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_GEMINI_NOTES } from "@/lib/gemini-notes";
import { isFreeBoardSlug } from "@/lib/categories";
import type { Category } from "@/lib/types";

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [geminiNotes, setGeminiNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories || []);
    setCounts(data.counts || {});
  }

  useEffect(() => {
    load().catch(() => setError("카테고리를 불러오지 못했습니다."));
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("카테고리 이름을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geminiNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "추가 실패");
      setName("");
      setGeminiNotes("");
      setMessage("카테고리를 추가했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes(slug: string, notes: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, geminiNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("추가 지시사항을 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string, label: string, count: number) {
    setError("");
    setMessage("");
    if (count > 0) {
      setError(`${label}에 글 ${count}편이 있습니다. 글 목록에서 해당 글을 모두 삭제한 뒤에 카테고리를 지울 수 있습니다.`);
      return;
    }
    if (!confirm(`‘${label}’ 카테고리를 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      setMessage("카테고리를 삭제했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card admin-form">
      <h2>카테고리 설정</h2>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        카테고리마다 제미나이 추가 지시사항을 넣을 수 있습니다. 비워 두면 글 작성 때 기본 지시가 쓰입니다.
      </p>
      <ul className="admin-cat-list">
        {categories.map((c) => {
          const count = counts[c.slug] || 0;
          return (
            <li key={c.slug} className="admin-cat-item">
              <div className="admin-cat-row">
                <span className="admin-cat-dot" style={{ background: c.color }} />
                <b>{c.name}</b>
                <em>{count}편{isFreeBoardSlug(c.slug) ? " · 필수" : ""}</em>
                {isFreeBoardSlug(c.slug) ? (
                  <span className="field-hint" style={{ margin: 0 }}>삭제 불가</span>
                ) : (
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={busy}
                  onClick={() => remove(c.slug, c.name, count)}
                >
                  삭제
                </button>
                )}
              </div>
              <label>제미나이 추가 지시사항</label>
              <textarea
                value={c.geminiNotes || ""}
                onChange={(e) =>
                  setCategories((list) =>
                    list.map((item) => (item.slug === c.slug ? { ...item, geminiNotes: e.target.value } : item))
                  )
                }
                placeholder={DEFAULT_GEMINI_NOTES}
              />
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => saveNotes(c.slug, c.geminiNotes || "")}
              >
                이 카테고리 지시 저장
              </button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="admin-cat-create">
        <h3 className="admin-subhead">카테고리 추가</h3>
        <label>
          이름 <span className="req">*</span>
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 카테고리 이름" />
        <label>제미나이 추가 지시사항</label>
        <textarea
          value={geminiNotes}
          onChange={(e) => setGeminiNotes(e.target.value)}
          placeholder={DEFAULT_GEMINI_NOTES}
        />
        <p className="field-hint">비워 두면 기본 지시사항이 사용됩니다.</p>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "처리 중…" : "추가"}
        </button>
      </form>
      {error ? <p className="notice">{error}</p> : null}
      {message ? <p className="notice ok">{message}</p> : null}
    </div>
  );
}
