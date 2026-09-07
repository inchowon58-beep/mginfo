"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug, Post, PostStatus } from "@/lib/types";

export function PostEditor({ post }: { post?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [bodyHtml, setBodyHtml] = useState(post?.bodyHtml || "");
  const [category, setCategory] = useState<CategorySlug>(post?.category || "life");
  const [tags, setTags] = useState(post?.tags.join(", ") || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword || "");
  const [status, setStatus] = useState<PostStatus>(post?.status || "draft");
  const [theme, setTheme] = useState(post?.theme || "art-v1");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [notes, setNotes] = useState("뉴스기사·매거진 톤. 과장 없이, 실무 조언 포함.");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runGenerate(mode: "topic" | "rewrite") {
    setError("");
    setMessage("");
    if (mode === "topic" && !topic.trim()) {
      setError("제미나이로 쓰려면 주제를 입력하세요.");
      return;
    }
    if (mode === "rewrite" && !sourceUrl.trim()) {
      setError("재창조할 블로그 글 주소를 입력하세요.");
      return;
    }
    setGenBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          category,
          keywords,
          notes,
          focusKeyword,
          sourceUrl: mode === "rewrite" ? sourceUrl : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setTitle(data.article.title);
      setExcerpt(data.article.excerpt || "");
      setBodyHtml(data.article.bodyHtml || "");
      setTags((data.article.tags || []).join(", "));
      if (!slug && data.article.slugHint) setSlug(data.article.slugHint);
      setMessage(
        mode === "rewrite"
          ? "원문을 매거진 정보글로 재창조했습니다. 대표 이미지를 직접 넣은 뒤 발행하세요."
          : "제미나이 초안을 넣었습니다. 확인하고 발행하세요."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setGenBusy(false);
    }
  }

  async function save() {
    setError("");
    setMessage("");
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title,
        slug,
        excerpt,
        bodyHtml,
        category,
        tags,
        coverImage,
        focusKeyword,
        status,
        theme,
      };
      const res = await fetch(post ? `/api/posts/${post.id}` : "/api/posts", {
        method: post ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      const indexed =
        status === "published"
          ? data.indexNow?.ok
            ? " 네이버 색인 요청을 보냈습니다."
            : " 네이버 색인 요청은 나중에 다시 시도됩니다."
          : "";
      setMessage((status === "published" ? "발행했습니다." : "초안으로 저장했습니다.") + indexed);
      router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor-grid">
      <div className="admin-card admin-form">
        <h2>{post ? "글 수정" : "새 글 작성"}</h2>
        <label>제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="매거진 기사 제목" />
        <label>슬러그 (URL)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="비워 두면 제목에서 생성" />
        <label>카테고리</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)}>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label>메인 키워드 (SEO)</label>
        <input
          value={focusKeyword}
          onChange={(e) => setFocusKeyword(e.target.value)}
          placeholder="예: 부천강아지분양"
        />
        <p className="field-hint">제목·리드·본문이 이 키워드에 맞춰 검색되도록 작성됩니다.</p>
        <label>리드 / 요약</label>
        <textarea style={{ minHeight: 90 }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <label>본문 HTML (뉴스·매거진 형식)</label>
        <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        <label>태그 (쉼표로 구분)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
        <label>대표 이미지 URL (OG / 네이버 썸네일)</label>
        <input
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
        />
        <p className="field-hint">
          원문 이미지는 가져오지 않습니다. 직접 등록한 이미지가 글 상단과 네이버 검색 썸네일(og:image)로
          쓰입니다.
        </p>
        {coverImage ? (
          <img className="cover-preview" src={coverImage} alt="대표 이미지 미리보기" />
        ) : null}
        <label>본문 테마</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="art-v1">뉴스형</option>
          <option value="art-v2">매거진형</option>
          <option value="art-v3">리포트형</option>
          <option value="art-v4">칼럼형</option>
          <option value="art-v5">특집형</option>
        </select>
        <label>상태</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}>
          <option value="draft">초안</option>
          <option value="published">발행</option>
        </select>
        {error && <p className="notice">{error}</p>}
        {message && <p className="notice ok">{message}</p>}
        <div className="admin-actions">
          <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
            {busy ? "저장 중…" : status === "published" ? "발행하기" : "초안 저장"}
          </button>
        </div>
      </div>
      <div className="admin-card admin-form">
        <h2>제미나이로 작성</h2>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>
          메인 키워드를 넣으면 네이버 검색용 정보형 매거진 글로 씁니다. 저장 전에 꼭 검토하세요.
        </p>
        <label>메인 키워드 (SEO)</label>
        <input
          value={focusKeyword}
          onChange={(e) => setFocusKeyword(e.target.value)}
          placeholder="예: 부천강아지분양"
        />
        <label>주제</label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 부천 전세 계약 전 체크리스트" />
        <label>보조 키워드</label>
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="예: 등기부, 확정일자, 보증금" />
        <label>추가 지시</label>
        <textarea style={{ minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="admin-actions">
          <button className="btn btn-primary" type="button" onClick={() => runGenerate("topic")} disabled={genBusy}>
            {genBusy ? "작성 중…" : "초안 생성"}
          </button>
        </div>

        <div className="rewrite-box">
          <h3>다른 블로그 글 재창조</h3>
          <p>
            글 주소를 넣으면 텍스트만 읽어 매거진 정보글로 다시 씁니다. 이미지는 가져오지 않으니, 왼쪽에서
            대표 이미지를 직접 등록하세요.
          </p>
          <label>원문 주소</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://blog.naver.com/..."
          />
          <div className="admin-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => runGenerate("rewrite")}
              disabled={genBusy}
            >
              {genBusy ? "재창조 중…" : "재창조하기"}
            </button>
          </div>
        </div>
        <p style={{ color: "#64748b", fontSize: 12 }}>
          API 키는 <a href="/admin/settings">설정</a>에서 저장합니다.
        </p>
      </div>
    </div>
  );
}
