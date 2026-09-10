"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_GEMINI_NOTES } from "@/lib/gemini-notes";
import { isFreeBoardSlug } from "@/lib/categories";
import { VendorPicker } from "@/components/admin/VendorPicker";
import { DEFAULT_VENDOR_SLOTS, MAX_VENDOR_SLOTS, parseRegionTerms, slotCountForCategory } from "@/lib/category-vendor-ads";
import type { AdVendor, Category, CategoryVendorAd } from "@/lib/types";

function adsFrom(category?: Category): CategoryVendorAd[] {
  return Array.isArray(category?.vendorAds) ? category.vendorAds.map((row) => ({ ...row, regions: [...(row.regions || [])], excludes: [...(row.excludes || [])] })) : [];
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [vendors, setVendors] = useState<AdVendor[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [geminiNotes, setGeminiNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [slotCount, setSlotCount] = useState(String(DEFAULT_VENDOR_SLOTS));
  const [recruitSlot, setRecruitSlot] = useState(false);
  const [ads, setAds] = useState<CategoryVendorAd[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => categories.find((item) => item.slug === selected),
    [categories, selected]
  );

  async function load(preferSlug?: string) {
    const [catRes, vendorRes] = await Promise.all([fetch("/api/categories"), fetch("/api/ad-vendors")]);
    const catData = await catRes.json();
    const vendorData = await vendorRes.json().catch(() => ({}));
    const rows: Category[] = catData.categories || [];
    setCategories(rows);
    setCounts(catData.counts || {});
    setVendors(Array.isArray(vendorData.vendors) ? vendorData.vendors : []);
    const nextSlug = preferSlug || selected || rows[0]?.slug || "";
    setSelected(nextSlug);
    const row = rows.find((item) => item.slug === nextSlug);
    setNotes(row?.geminiNotes || "");
    setSlotCount(String(slotCountForCategory(row)));
    setRecruitSlot(Boolean(row?.vendorRecruitSlot));
    setAds(adsFrom(row));
  }

  useEffect(() => {
    load().catch(() => setError("카테고리를 불러오지 못했습니다."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCategory(slug: string) {
    const row = categories.find((item) => item.slug === slug);
    setAdding(false);
    setSelected(slug);
    setNotes(row?.geminiNotes || "");
    setSlotCount(String(slotCountForCategory(row)));
    setRecruitSlot(Boolean(row?.vendorRecruitSlot));
    setAds(adsFrom(row));
    setError("");
    setMessage("");
  }

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
      setAdding(false);
      setMessage("카테고리를 추가했습니다.");
      await load(data.category?.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent() {
    if (!current) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: current.slug,
          geminiNotes: notes,
          vendorSlotCount: Number(slotCount),
          vendorRecruitSlot: recruitSlot,
          vendorAds: ads,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("카테고리 설정을 저장했습니다.");
      await load(current.slug);
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
      setSelected("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  function addVendor(vendorId: string) {
    if (ads.some((row) => row.vendorId === vendorId)) return;
    setAds((list) => [...list, { vendorId, mode: "all", regions: [], excludes: [] }]);
  }

  function vendorName(id: string) {
    return vendors.find((row) => row.id === id)?.name || id;
  }

  return (
    <div className="admin-card admin-form">
      <h2>카테고리 설정</h2>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        위쪽 이름으로 카테고리를 고르면 내용이 열립니다. 업체 광고는 카테고리마다 따로 정합니다.
      </p>
      <div className="admin-cat-tabs" role="tablist" aria-label="카테고리">
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            role="tab"
            className={`admin-cat-tab${selected === c.slug && !adding ? " is-on" : ""}`}
            aria-selected={selected === c.slug && !adding}
            onClick={() => openCategory(c.slug)}
          >
            <span className="admin-cat-dot" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
        <button
          type="button"
          className={`admin-cat-tab is-add${adding ? " is-on" : ""}`}
          onClick={() => {
            setAdding(true);
            setError("");
            setMessage("");
          }}
        >
          카테고리 추가
        </button>
      </div>

      {adding ? (
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
      ) : current ? (
        <div className="admin-cat-panel">
          <div className="admin-cat-row">
            <span className="admin-cat-dot" style={{ background: current.color }} />
            <b>{current.name}</b>
            <em>
              {counts[current.slug] || 0}편{isFreeBoardSlug(current.slug) ? " · 필수" : ""}
            </em>
            {isFreeBoardSlug(current.slug) ? (
              <span className="field-hint" style={{ margin: 0 }}>
                삭제 불가
              </span>
            ) : (
              <button
                className="btn btn-danger"
                type="button"
                disabled={busy}
                onClick={() => remove(current.slug, current.name, counts[current.slug] || 0)}
              >
                삭제
              </button>
            )}
          </div>
          <label>제미나이 추가 지시사항</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={DEFAULT_GEMINI_NOTES} />
          <h3 className="admin-subhead">업체 광고</h3>
          <p className="field-hint" style={{ marginTop: 0 }}>
            전체노출은 이 카테고리 글 모두에 나갑니다. 지역설정은 키워드·제목·지역에 넣은 지명이 있을 때만 나갑니다.
            부천만 넣으면 상동 같은 하부도 포함되고, 상동만 넣으면 상동 글에만 나갑니다. 제외 지역은 그 지명이 있으면
            빼줍니다. 글에 업체를 직접 넣은 경우에는 그 글 업체가 우선이고, 이 카테고리 업체는 나가지 않습니다.
            업체는 여러 곳 등록할 수 있고, 방문마다 노출 업체 수만큼만 무작위로 나갑니다. 빈 칸은 채우지 않습니다.
          </p>
          <label>노출 업체 수</label>
          <select value={slotCount} onChange={(e) => setSlotCount(e.target.value)}>
            {Array.from({ length: MAX_VENDOR_SLOTS }, (_, index) => String(index + 1)).map((value) => (
              <option key={value} value={value}>
                {value}개
              </option>
            ))}
          </select>
          <p className="field-hint">한 번에 보여줄 최대 개수입니다. 등록 업체가 더 많아도 이 수만큼만 랜덤 노출됩니다.</p>
          <label className="admin-check-all">
            <input type="checkbox" checked={recruitSlot} onChange={(e) => setRecruitSlot(e.target.checked)} />
            제휴업체모집중
          </label>
          <p className="field-hint">
            켜면 등록 업체가 없어도 제휴업체모집중 칸이 나갑니다. 업체가 있으면 그 아래에 하나 더 붙습니다. 칸이나
            등록안내를 누르면 사이트설정에 넣은 등록안내 페이지로 이동합니다.
          </p>
          <div className="bulk-vendor-pick" style={{ marginTop: 8 }}>
            <VendorPicker
              label="업체 추가"
              onPick={(fields) => {
                addVendor(fields.vendorId);
              }}
            />
          </div>
          {ads.length ? (
            <ul className="admin-cat-vendor-list">
              {ads.map((ad, index) => (
                <li key={ad.vendorId} className="admin-cat-vendor">
                  <div className="admin-cat-vendor-top">
                    <b>
                      {index + 1}. {vendorName(ad.vendorId)}
                    </b>
                    <select
                      value={ad.mode}
                      onChange={(e) => {
                        const mode = e.target.value === "region" ? "region" : "all";
                        setAds((list) =>
                          list.map((row) => (row.vendorId === ad.vendorId ? { ...row, mode } : row))
                        );
                      }}
                    >
                      <option value="all">전체노출</option>
                      <option value="region">지역설정</option>
                    </select>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setAds((list) => list.filter((row) => row.vendorId !== ad.vendorId))}
                    >
                      빼기
                    </button>
                  </div>
                  {ad.mode === "region" ? (
                    <div className="admin-cat-vendor-regions">
                      <label>
                        노출 지역
                        <input
                          value={(ad.regions || []).join(", ")}
                          onChange={(e) =>
                            setAds((list) =>
                              list.map((row) =>
                                row.vendorId === ad.vendorId
                                  ? { ...row, regions: parseRegionTerms(e.target.value) }
                                  : row
                              )
                            )
                          }
                          placeholder="예: 부천, 인천"
                        />
                      </label>
                      <label>
                        제외 지역
                        <input
                          value={(ad.excludes || []).join(", ")}
                          onChange={(e) =>
                            setAds((list) =>
                              list.map((row) =>
                                row.vendorId === ad.vendorId
                                  ? { ...row, excludes: parseRegionTerms(e.target.value) }
                                  : row
                              )
                            )
                          }
                          placeholder="예: 상동"
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">아직 업체가 없습니다. 제휴업체모집중을 켜면 모집 칸만 나갑니다.</p>
          )}
          <div className="admin-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => saveCurrent()}>
              {busy ? "저장 중…" : "이 카테고리 저장"}
            </button>
          </div>
        </div>
      ) : (
        <p className="field-hint">카테고리를 선택하세요.</p>
      )}
      {error ? <p className="notice">{error}</p> : null}
      {message ? <p className="notice ok">{message}</p> : null}
    </div>
  );
}
