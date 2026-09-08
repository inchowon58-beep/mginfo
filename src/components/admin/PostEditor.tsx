"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_GEMINI_NOTES, resolveGeminiNotes } from "@/lib/gemini-notes";
import type { Category, CategorySlug, FaqItem, Post, PostStatus } from "@/lib/types";

const EMPTY_FAQ: FaqItem = { question: "", answer: "" };

function padFaqs(items?: FaqItem[]): FaqItem[] {
  const next = (items || []).slice(0, 5);
  while (next.length < 4) next.push({ ...EMPTY_FAQ });
  return next;
}

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
  const [faqItems, setFaqItems] = useState<FaqItem[]>(padFaqs(post?.faqItems));
  const [status, setStatus] = useState<PostStatus>(post?.status || "draft");
  const [theme, setTheme] = useState(post?.theme || "art-v2");
  const [region, setRegion] = useState(post?.region || "");
  const [regionInfo, setRegionInfo] = useState(post?.regionInfo || "");
  const [nearbyAreas, setNearbyAreas] = useState((post?.nearbyAreas || []).join(", "));
  const [nearbyStations, setNearbyStations] = useState((post?.nearbyStations || []).join(", "));
  const [vendorName, setVendorName] = useState(post?.vendorName || "");
  const [vendorPhone, setVendorPhone] = useState(post?.vendorPhone || "");
  const [vendorWebsite, setVendorWebsite] = useState(post?.vendorWebsite || "");
  const [vendorKakao, setVendorKakao] = useState(post?.vendorKakao || "");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [notes, setNotes] = useState(DEFAULT_GEMINI_NOTES);
  const [localNotes, setLocalNotes] = useState("");
  const [experienceNotes, setExperienceNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorOpen, setVendorOpen] = useState(
    Boolean(post?.vendorName || post?.vendorPhone || post?.vendorWebsite || post?.vendorKakao)
  );
  const notesForCategory = useRef("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        const list: Category[] = data.categories || [];
        setCategories(list);
        setCategory((current) => {
          if (post) return current;
          if (list.length && !list.some((c) => c.slug === current)) return list[0].slug;
          return current;
        });
      })
      .catch(() => undefined);
  }, [post]);

  useEffect(() => {
    if (!categories.length) return;
    if (notesForCategory.current === category) return;
    notesForCategory.current = category;
    const cat = categories.find((c) => c.slug === category);
    setNotes(resolveGeminiNotes("", cat?.geminiNotes));
  }, [category, categories]);

  async function runGenerate() {
    setError("");
    setMessage("");
    if (!topic.trim()) {
      setError("제미나이로 쓰려면 주제를 입력하세요.");
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
          region,
          localNotes,
          experienceNotes,
          vendorName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setTitle(data.article.title);
      setExcerpt(data.article.excerpt || "");
      setBodyHtml(data.article.bodyHtml || "");
      setTags((data.article.tags || []).join(", "));
      if (data.article.faqItems) setFaqItems(padFaqs(data.article.faqItems));
      if (data.article.regionInfo) setRegionInfo(data.article.regionInfo);
      if (data.article.nearbyAreas) setNearbyAreas(data.article.nearbyAreas.join(", "));
      if (data.article.nearbyStations) setNearbyStations(data.article.nearbyStations.join(", "));
      if (!slug && data.article.slugHint) setSlug(data.article.slugHint);
      setMessage("제미나이 초안을 넣었습니다. 확인하고 발행하세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setGenBusy(false);
    }
  }

  async function uploadCover(file: File) {
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setCoverImage(data.url);
      setMessage("대표 이미지를 올렸습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError("");
    setMessage("");
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    if (!category) {
      setError("카테고리를 선택하세요.");
      return;
    }
    if (!bodyHtml.trim() && status === "published") {
      setError("본문을 입력하세요.");
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
        faqItems: faqItems.filter((item) => item.question.trim() && item.answer.trim()),
        status,
        theme,
        region,
        regionInfo,
        nearbyAreas,
        nearbyStations,
        vendorName,
        vendorPhone,
        vendorWebsite,
        vendorKakao,
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
        <p className="field-hint" style={{ marginTop: 0 }}>
          <span className="req">*</span> 표시는 필수입니다.
        </p>
        <label>
          제목 <span className="req">*</span>
        </label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="매거진 기사 제목" />
        <label>슬러그 (URL)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="비워 두면 제목에서 생성" />
        <label>
          카테고리 <span className="req">*</span>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)}>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
          {category && !categories.some((c) => c.slug === category) ? (
            <option value={category}>{category}</option>
          ) : null}
        </select>
        <label>메인 키워드 (SEO)</label>
        <input
          value={focusKeyword}
          onChange={(e) => setFocusKeyword(e.target.value)}
          placeholder="예: 부천강아지분양"
        />
        <p className="field-hint">제목·리드·본문이 이 키워드에 맞춰 검색되도록 작성됩니다.</p>
        <label>지역 (선택)</label>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="예: 경기 부천시 중동"
        />
        <p className="field-hint">예: 양재, 부천 중동. 이 값이 있으면 글 상단에 그 지역만의 소개 문단이 붙습니다.</p>
        <label>지역 소개 문단 (유사문서 회피)</label>
        <textarea
          style={{ minHeight: 90 }}
          value={regionInfo}
          onChange={(e) => setRegionInfo(e.target.value)}
          placeholder="예: 서울특별시 서초구 양재동은 양재시민의숲과 양재천이 있어 ..."
        />
        <p className="field-hint">비워 두면 지역명으로 자동 문단을 만들고, 제미나이 초안을 받으면 채워집니다.</p>
        <label>근방 동·구</label>
        <input value={nearbyAreas} onChange={(e) => setNearbyAreas(e.target.value)} placeholder="서초동, 도곡동, 개포동" />
        <label>인근 지하철역</label>
        <input
          value={nearbyStations}
          onChange={(e) => setNearbyStations(e.target.value)}
          placeholder="양재역, 양재시민의숲역, 매봉역"
        />
        <button className="vendor-toggle" type="button" onClick={() => setVendorOpen((open) => !open)}>
          {vendorOpen ? "소개 업체 닫기" : "소개 업체 작성"}
        </button>
        {vendorOpen ? (
          <div className="vendor-admin">
            <h3>소개 업체</h3>
            <p className="field-hint" style={{ marginTop: 0 }}>
              특정 업체를 소개할 때만 적으세요. 전화·홈페이지·카카오를 넣으면 글 하단에 버튼이 생깁니다.
            </p>
            <label>업체명</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="예: 인포씨에스" />
            <label>전화번호</label>
            <input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="예: 032-000-0000" />
            <label>홈페이지 주소</label>
            <input
              value={vendorWebsite}
              onChange={(e) => setVendorWebsite(e.target.value)}
              placeholder="https://..."
            />
            <label>카카오톡 주소</label>
            <input
              value={vendorKakao}
              onChange={(e) => setVendorKakao(e.target.value)}
              placeholder="https://pf.kakao.com/..."
            />
          </div>
        ) : null}
        <label>리드 / 요약</label>
        <textarea style={{ minHeight: 90 }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <label>자주 묻는 질문 (SEO)</label>
        <p className="field-hint" style={{ marginTop: 0 }}>
          유아독존처럼 검색어가 들어간 질문 3~4개를 넣으면 글 하단과 FAQ 스키마에 같이 나갑니다. 제미나이 초안에도 채워집니다.
        </p>
        {faqItems.map((item, index) => (
          <div className="faq-admin-row" key={`faq-${index}`}>
            <input
              value={item.question}
              onChange={(e) =>
                setFaqItems((rows) => rows.map((row, i) => (i === index ? { ...row, question: e.target.value } : row)))
              }
              placeholder={`질문 ${index + 1} (메인 키워드로 시작)`}
            />
            <textarea
              style={{ minHeight: 72 }}
              value={item.answer}
              onChange={(e) =>
                setFaqItems((rows) => rows.map((row, i) => (i === index ? { ...row, answer: e.target.value } : row)))
              }
              placeholder="답변"
            />
          </div>
        ))}
        <label>
          본문 HTML <span className="req">*</span>
        </label>
        <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        <label>태그 (쉼표로 구분)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
        <label>대표 이미지</label>
        <div className="cover-upload">
          <label className="btn btn-ghost cover-file-btn">
            {uploading ? "올리는 중…" : "내 컴퓨터에서 올리기"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadCover(file);
              }}
            />
          </label>
          {coverImage ? (
            <button className="btn btn-ghost" type="button" onClick={() => setCoverImage("")}>
              이미지 빼기
            </button>
          ) : null}
        </div>
        <input
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="또는 이미지 주소 https://..."
        />
        <p className="field-hint">
          파일을 올리거나 주소를 넣으면 됩니다. 이 이미지가 글 상단과 네이버 검색 썸네일로 쓰입니다.
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
          빨간 * 표시가 있는 항목만 채우면 초안을 만들 수 있습니다. 추가 지시는 카테고리에 넣어 둔 내용이 기본으로 들어갑니다.
        </p>
        <label>메인 키워드 (SEO)</label>
        <input
          value={focusKeyword}
          onChange={(e) => setFocusKeyword(e.target.value)}
          placeholder="예: 부천강아지분양"
        />
        <label>
          주제 <span className="req">*</span>
        </label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 부천 전세 계약 전 체크리스트" />
        <label>보조 키워드</label>
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="예: 등기부, 확정일자, 보증금" />
        <label>현장·지역 메모 (선택)</label>
        <textarea
          style={{ minHeight: 90 }}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder="알고 있는 동네 정보만. 예: 중동역 도보 8분, 공영주차장"
        />
        <label>경험·후기 메모 (선택)</label>
        <textarea
          style={{ minHeight: 90 }}
          value={experienceNotes}
          onChange={(e) => setExperienceNotes(e.target.value)}
          placeholder="실제로 들은 손님 질문, 동선만. 없으면 비워 두세요."
        />
        <label>추가 지시</label>
        <textarea
          style={{ minHeight: 100 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={DEFAULT_GEMINI_NOTES}
        />
        <p className="field-hint">비워 두면 이 카테고리의 기본 지시, 그것도 없으면 공통 기본 지시가 쓰입니다.</p>
        <div className="admin-actions">
          <button className="btn btn-primary" type="button" onClick={() => runGenerate()} disabled={genBusy}>
            {genBusy ? "작성 중…" : "초안 생성"}
          </button>
        </div>
        <p style={{ color: "#64748b", fontSize: 12 }}>
          API 키는 <a href="/admin/settings">설정</a>에서 저장합니다.
        </p>
      </div>
    </div>
  );
}
