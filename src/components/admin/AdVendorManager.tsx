"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdVendor } from "@/lib/types";

const emptyForm = {
  name: "",
  phone: "",
  website: "",
  kakao: "",
  notes: "",
};

export function AdVendorManager({ vendors }: { vendors: AdVendor[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
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
      phone: vendor.phone || "",
      website: vendor.website || "",
      kakao: vendor.kakao || "",
      notes: vendor.notes || "",
    });
    setError("");
    setMessage("");
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
    if (!confirm("이 업체를 삭제할까요?")) return;
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
              자주 쓰는 업체를 저장해 두면, 새 글 작성과 예약발행에서 업체명만 고르면 연락처가 채워집니다. 기본
              업체내용은 관리자만 보는 메모입니다.
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
              placeholder="예: 인포씨에스"
              required
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
              <button className="btn btn-primary" disabled={busy}>
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
                <strong>{vendor.name}</strong>
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
