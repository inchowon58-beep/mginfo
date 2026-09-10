"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdVendor } from "@/lib/types";

const emptyForm = {
  name: "",
  category: "",
  intro: "",
  phone: "",
  website: "",
  kakao: "",
  bizNo: "",
  address: "",
  notes: "",
  imageUrl: "",
  youtubeUrl1: "",
  youtubeUrl2: "",
};

export function AdVendorManager({ vendors }: { vendors: AdVendor[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editing = useMemo(
    () => vendors.find((row) => row.id === editingId) || null,
    [vendors, editingId]
  );

  function resetForm() {
    setMode("closed");
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startCreate() {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function startEdit(vendor: AdVendor) {
    setMode("edit");
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || "",
      category: vendor.category || "",
      intro: vendor.intro || "",
      phone: vendor.phone || "",
      website: vendor.website || "",
      kakao: vendor.kakao || "",
      bizNo: vendor.bizNo || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
      imageUrl: vendor.imageUrl || "",
      youtubeUrl1: vendor.youtubeUrl1 || "",
      youtubeUrl2: vendor.youtubeUrl2 || "",
    });
    setError("");
    setMessage("");
  }

  async function uploadImage(file: File) {
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const dataForm = new FormData();
      dataForm.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: dataForm });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setForm((current) => ({ ...current, imageUrl: String(data.url || "") }));
      setMessage("업체 이미지를 올렸습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(editingId ? `/api/ad-vendors/${editingId}` : "/api/ad-vendors", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage(editingId ? "업체 정보를 수정했습니다." : "업체를 추가했습니다.");
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 업체를 삭제할까요? 사이트 하단 제휴 영역에서도 빠집니다.")) return;
    await fetch(`/api/ad-vendors/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="vendor-book">
      <div className="admin-card">
        <div className="vendor-book-head">
          <div>
            <h2>광고업체정보설정</h2>
            <p className="field-hint" style={{ marginTop: 0 }}>
              등록한 업체는 사이트 하단 제휴 영역과 제휴 페이지에 바로 나갑니다. 새 글 작성과 예약발행에서는 업체명만
              고르면 연락처가 채워집니다.
            </p>
          </div>
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            업체추가
          </button>
        </div>

        {mode !== "closed" ? (
          <form className="admin-form vendor-book-form" onSubmit={onSubmit}>
            <h3>{editing ? "업체 수정" : "업체 추가"}</h3>
            <label>업체명</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 네이버 블로그"
              required
            />
            <label>구분</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="예: 블로그, 소셜, 검색"
            />
            <label>소개 문구</label>
            <input
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              placeholder="사이트 제휴 영역에 보이는 짧은 소개"
            />
            <label>전화번호</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="예: 032-000-0000"
            />
            <label>홈페이지 주소</label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://..."
            />
            <label>카카오톡 주소</label>
            <input
              value={form.kakao}
              onChange={(e) => setForm({ ...form, kakao: e.target.value })}
              placeholder="https://pf.kakao.com/..."
            />
            <label>사업자등록번호</label>
            <input
              value={form.bizNo}
              onChange={(e) => setForm({ ...form, bizNo: e.target.value })}
              placeholder="예: 123-45-67890"
            />
            <label>주소</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="예: 경기도 부천시 …"
            />
            <label>유튜브 영상 주소 1 (글 중간)</label>
            <input
              value={form.youtubeUrl1}
              onChange={(e) => setForm({ ...form, youtubeUrl1: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <label>유튜브 영상 주소 2 (글 하단)</label>
            <input
              value={form.youtubeUrl2}
              onChange={(e) => setForm({ ...form, youtubeUrl2: e.target.value })}
              placeholder="두 번째 영상이 있으면 넣습니다"
            />
            <p className="field-hint">
              글 작성 때 중간·하단 자리가 미리 만들어집니다. 주소를 빼면 그 자리의 영상만 사라집니다. 나중에 여기만
              고쳐도 이미 쓴 글에 그대로 반영됩니다.
            </p>
            <label>업체 이미지</label>
            <div className="cover-upload">
              <label className="btn btn-ghost cover-file-btn">
                {uploading ? "올리는 중…" : "내 컴퓨터에서 올리기"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadImage(file);
                  }}
                />
              </label>
              {form.imageUrl ? (
                <button className="btn btn-ghost" type="button" onClick={() => setForm({ ...form, imageUrl: "" })}>
                  이미지 빼기
                </button>
              ) : null}
            </div>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="또는 이미지 주소 https://..."
            />
            {form.imageUrl ? <img className="cover-preview vendor-logo-preview" src={form.imageUrl} alt="" /> : null}
            <p className="field-hint">이 이미지가 하단 제휴 영역과 제휴 페이지에 나갑니다.</p>
            <label>기본 업체내용</label>
            <textarea
              className="vendor-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="내가 알아보려고 적는 메모. 예: 부천 본점, 주말만 상담, 광고비 월 00"
            />
            <p className="field-hint">이 메모는 글에 들어가지 않습니다. 관리 화면에서만 보입니다.</p>
            {error ? <p className="notice">{error}</p> : null}
            {message ? <p className="notice ok">{message}</p> : null}
            <div className="admin-actions">
              <button className="btn btn-primary" disabled={busy || uploading}>
                {busy ? "저장 중…" : editing ? "수정 저장" : "업체 저장"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                취소
              </button>
            </div>
          </form>
        ) : message ? (
          <p className="notice ok">{message}</p>
        ) : null}
      </div>

      <div className="admin-card">
        <h2>등록된 업체</h2>
        {vendors.length === 0 ? (
          <p className="field-hint">아직 등록된 업체가 없습니다. 위에서 업체추가를 누르세요.</p>
        ) : (
          <ul className="vendor-name-list">
            {vendors.map((vendor) => (
              <li key={vendor.id}>
                <span className="vendor-name-main">
                  {vendor.imageUrl ? <img src={vendor.imageUrl} alt="" /> : <span className="vendor-name-fallback" />}
                  <strong>
                    {vendor.name}
                    {vendor.category ? <small>{vendor.category}</small> : null}
                    {vendor.youtubeUrl1 || vendor.youtubeUrl2 ? <small>유튜브</small> : null}
                  </strong>
                </span>
                <span>
                  <button className="btn btn-ghost" type="button" onClick={() => startEdit(vendor)}>
                    수정
                  </button>
                  <button className="btn btn-danger" type="button" onClick={() => remove(vendor.id)}>
                    삭제
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
