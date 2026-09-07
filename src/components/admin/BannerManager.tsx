"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BANNER_THEMES } from "@/lib/banners";
import { BannerMark } from "@/components/PromoBanner";
import type { Banner, BannerKind, BannerTheme } from "@/lib/types";

const emptyForm = {
  kind: "text" as BannerKind,
  enabled: true,
  href: "/",
  theme: "bronze" as BannerTheme,
  kicker: "infocs magazine",
  title: "",
  subtitle: "",
  ctaLabel: "바로가기",
  imageUrl: "",
};

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editing = useMemo(
    () => banners.find((b) => b.id === editingId) || null,
    [banners, editingId]
  );

  function fill(banner?: Banner) {
    if (!banner) {
      setEditingId(null);
      setForm(emptyForm);
      return;
    }
    setEditingId(banner.id);
    setForm({
      kind: banner.kind,
      enabled: banner.enabled,
      href: banner.href,
      theme: banner.theme,
      kicker: banner.kicker || "",
      title: banner.title,
      subtitle: banner.subtitle || "",
      ctaLabel: banner.ctaLabel || "바로가기",
      imageUrl: banner.imageUrl || "",
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(editingId ? `/api/banners/${editingId}` : "/api/banners", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage(editingId ? "배너를 수정했습니다." : "배너를 추가했습니다.");
      fill();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(banner: Banner) {
    await fetch(`/api/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !banner.enabled }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 배너를 삭제할까요?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    if (editingId === id) fill();
    router.refresh();
  }

  return (
    <div className="banner-admin">
      <form className="admin-card admin-form" onSubmit={onSubmit}>
        <h2>{editing ? "배너 수정" : "배너 추가"}</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 0 }}>
          텍스트는 다섯 가지 매거진 배경 중 하나를 고르고, 이미지는 URL을 등록하면 됩니다. 켜 둔
          배너가 여러 개면 메인에서 무작위로 하나가 보입니다.
        </p>
        <div className="banner-kind-row">
          <label className={form.kind === "text" ? "on" : ""}>
            <input
              type="radio"
              name="kind"
              checked={form.kind === "text"}
              onChange={() => setForm({ ...form, kind: "text" })}
            />
            텍스트 배너
          </label>
          <label className={form.kind === "image" ? "on" : ""}>
            <input
              type="radio"
              name="kind"
              checked={form.kind === "image"}
              onChange={() => setForm({ ...form, kind: "image" })}
            />
            이미지 배너
          </label>
        </div>
        {form.kind === "text" ? (
          <>
            <label>스타일</label>
            <div className="banner-theme-grid">
              {BANNER_THEMES.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  className={`banner-theme-card theme-${t.slug} ${form.theme === t.slug ? "active" : ""}`}
                  onClick={() => setForm({ ...form, theme: t.slug })}
                >
                  <BannerMark theme={t.slug} />
                  <strong>{t.name}</strong>
                  <span>{t.note}</span>
                </button>
              ))}
            </div>
            <label>작은 제목 (선택)</label>
            <input
              value={form.kicker}
              onChange={(e) => setForm({ ...form, kicker: e.target.value })}
              placeholder="infocs magazine"
            />
            <label>제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="매거진 원고를 무료로 배포합니다"
              required
            />
            <label>설명</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="네이버 검색 상단 노출까지 함께 진행합니다."
            />
            <label>버튼 문구</label>
            <input
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
              placeholder="바로가기"
            />
          </>
        ) : (
          <>
            <label>이미지 URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              required
            />
            <label>대체 텍스트</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="배너 설명"
            />
          </>
        )}
        <label>클릭 시 이동 주소</label>
        <input
          value={form.href}
          onChange={(e) => setForm({ ...form, href: e.target.value })}
          placeholder="/"
        />
        <label className="banner-check">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          메인에 노출
        </label>
        {error && <p className="notice">{error}</p>}
        {message && <p className="notice ok">{message}</p>}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "저장 중…" : editing ? "수정 저장" : "배너 추가"}
          </button>
          {editing ? (
            <button className="btn btn-ghost" type="button" onClick={() => fill()}>
              취소
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-card">
        <h2>등록된 배너</h2>
        {banners.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>아직 배너가 없습니다.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>내용</th>
                <th>유형</th>
                <th>노출</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td>
                    <strong>{banner.title || "이미지 배너"}</strong>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      {banner.kind === "text" ? BANNER_THEMES.find((t) => t.slug === banner.theme)?.name : "이미지"}{" "}
                      · {banner.href}
                    </div>
                  </td>
                  <td>{banner.kind === "text" ? "텍스트" : "이미지"}</td>
                  <td>
                    <span className={banner.enabled ? "badge badge-on" : "badge badge-off"}>
                      {banner.enabled ? "켜짐" : "꺼짐"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" type="button" onClick={() => fill(banner)}>
                      수정
                    </button>{" "}
                    <button className="btn btn-ghost" type="button" onClick={() => toggle(banner)}>
                      {banner.enabled ? "숨기기" : "켜기"}
                    </button>{" "}
                    <button className="btn btn-danger" type="button" onClick={() => remove(banner.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
