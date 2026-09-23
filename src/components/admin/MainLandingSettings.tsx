"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  MAIN_DESIGNS,
  defaultMainLandingConfig,
  parseMainLandingConfig,
  type MainLandingConfig,
} from "@/lib/main-landing";

export function MainLandingSettings() {
  const [cfg, setCfg] = useState<MainLandingConfig>(defaultMainLandingConfig());
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCfg(parseMainLandingConfig(data.settings?.mainLanding));
        // 마스터가 아니면 hasKey가 안 올 수 있음 → 키 칸은 항상 입력 가능하게
        setHasStoredKey(Boolean(data.settings?.hasKey));
        if (typeof data.settings?.geminiApiKey === "string" && data.settings.geminiApiKey.includes("•")) {
          setHasStoredKey(true);
        }
      })
      .catch(() => setError("설정을 불러오지 못했습니다."));
  }, []);

  function patchVendor<K extends keyof MainLandingConfig["vendor"]>(
    key: K,
    value: MainLandingConfig["vendor"][K]
  ) {
    setCfg((prev) => ({ ...prev, vendor: { ...prev.vendor, [key]: value } }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainLanding: cfg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage(
        "저장했습니다. 메인 랜딩을 켜 두면 홈이 두피문신 디자인으로 바뀌고, 블로그는 /posts 입니다."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function onEnrich() {
    setEnriching(true);
    setError("");
    setMessage("");
    try {
      const typedKey = geminiApiKey.trim();
      if (!hasStoredKey && !typedKey) {
        throw new Error("제미나이 API 키를 아래에 입력하세요. (마스터 설정에 넣었다면 키를 다시 붙여 넣어도 됩니다)");
      }

      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainLanding: { ...cfg, enabled: true } }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saveData.error || "저장 후 보충할 수 없습니다.");

      const res = await fetch("/api/admin/main-landing/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainLanding: { ...cfg, enabled: true },
          enable: true,
          ...(typedKey && !typedKey.includes("•") ? { geminiApiKey: typedKey } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "내용 보충 실패");
      if (data.mainLanding) setCfg(parseMainLandingConfig(data.mainLanding));
      if (typedKey && !typedKey.includes("•")) {
        setHasStoredKey(true);
        setGeminiApiKey("");
      }
      setMessage(data.message || "메인 내용을 다르게 보충했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "내용 보충 실패");
    } finally {
      setEnriching(false);
    }
  }

  const hasEnriched = Boolean(cfg.copyOverride?.heroLead || cfg.copyOverride?.aboutBody);

  return (
    <form className="admin-card admin-form" onSubmit={onSave}>
      <h2>메인 사이트</h2>
      <div className="ml-field-map">
        <strong>최소 입력 → 필릭스형 페이지 자동 구성</strong>
        <br />
        아래만 넣으면 기본 뼈대로 홈이 만들어집니다. 문장이 사이트마다 같으면{" "}
        <b>내용 보충</b>을 눌러 제미나이로 본문을 다시 씁니다(섹션 구조는 유지).
        <br />
        <b>문의 폼은 없습니다.</b> 카카오/전화만 노출됩니다.
        {hasEnriched && cfg.enrichedAt ? (
          <>
            <br />
            <span style={{ color: "#86efac" }}>
              내용 보충됨 · {new Date(cfg.enrichedAt).toLocaleString("ko-KR")}
            </span>
          </>
        ) : null}
      </div>

      <label className="admin-check-all">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => setCfg((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        메인 랜딩 사용
      </label>

      <label>메인 디자인</label>
      <select
        value={cfg.designId}
        onChange={(e) =>
          setCfg((prev) => ({
            ...prev,
            designId: e.target.value as MainLandingConfig["designId"],
          }))
        }
      >
        {MAIN_DESIGNS.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label} — {row.description}
          </option>
        ))}
      </select>

      <h3 className="admin-subhead">필수·선택 입력</h3>
      <div className="admin-grid-2">
        <div>
          <label>사이트이름 (메인 SEO 키워드)</label>
          <p className="ml-field-hint">히어로 큰 제목·메뉴 브랜드·FAQ 제목 (예: 평택두피문신)</p>
          <input
            value={cfg.vendor.keyword}
            onChange={(e) => patchVendor("keyword", e.target.value)}
            placeholder="평택두피문신"
            required
          />
        </div>
        <div>
          <label>업체명</label>
          <p className="ml-field-hint">히어로 부제·소개·푸터 (예: 필릭스스칼프)</p>
          <input
            value={cfg.vendor.name}
            onChange={(e) => patchVendor("name", e.target.value)}
            placeholder="필릭스스칼프"
            required
          />
        </div>
        <div>
          <label>전화번호</label>
          <p className="ml-field-hint">하단 고정 CTA·푸터. 없으면 미노출</p>
          <input
            value={cfg.vendor.phone}
            onChange={(e) => patchVendor("phone", e.target.value)}
            placeholder="010-0000-0000"
          />
        </div>
        <div>
          <label>카카오톡 링크</label>
          <p className="ml-field-hint">헤더·CTA·푸터. 없으면 미노출</p>
          <input
            value={cfg.vendor.kakao}
            onChange={(e) => patchVendor("kakao", e.target.value)}
            placeholder="https://open.kakao.com/o/..."
          />
        </div>
        <div>
          <label>주소</label>
          <p className="ml-field-hint">소개·FAQ·푸터. 지역명도 여기서 추정합니다</p>
          <input
            value={cfg.vendor.address}
            onChange={(e) => patchVendor("address", e.target.value)}
            placeholder="경기 평택시 …"
          />
        </div>
        <div>
          <label>사업자등록번호</label>
          <p className="ml-field-hint">있으면 푸터에만 표시, 없으면 영역 자체 미노출</p>
          <input
            value={cfg.vendor.businessNumber}
            onChange={(e) => patchVendor("businessNumber", e.target.value)}
            placeholder="000-00-00000"
          />
        </div>
      </div>

      <label>이미지 폴더 주소</label>
      <p className="ml-field-hint">01.webp 형식 폴더. 히어로·소개·시술·갤러리 자동 배정</p>
      <input
        value={cfg.imageFolderUrl}
        onChange={(e) => setCfg((prev) => ({ ...prev, imageFolderUrl: e.target.value }))}
        placeholder="https://image.example.com/folder"
      />

      <label>추가 요청사항 (선택)</label>
      <p className="ml-field-hint">내용 보충 시 제미나이에 함께 전달됩니다</p>
      <textarea
        value={cfg.prompt}
        onChange={(e) => setCfg((prev) => ({ ...prev, prompt: e.target.value }))}
        rows={3}
        placeholder="예: 교육 문의 강조, 주차 안내 한 줄 등"
      />

      <h3 className="admin-subhead">내용 보충 (제미나이)</h3>
      <p className="ml-field-hint" style={{ marginTop: 0 }}>
        {hasStoredKey
          ? "이 사이트에 키가 저장되어 있습니다. 바꾸려면 새 키를 입력하세요. 내용 보충 시 키도 함께 저장됩니다."
          : "마스터 설정에 넣은 키가 이 사이트에 없으면 여기에도 같은 키를 넣으세요. 보충 시 이 사이트에 저장됩니다."}
      </p>
      <label>Gemini API Key</label>
      <input
        type="password"
        value={geminiApiKey}
        onChange={(e) => setGeminiApiKey(e.target.value)}
        placeholder={hasStoredKey ? "저장됨 · 바꾸려면 새 키 입력" : "AIza..."}
        autoComplete="off"
      />

      {error ? <p className="notice">{error}</p> : null}
      {message ? <p className="notice ok">{message}</p> : null}
      <div className="admin-actions">
        <button className="btn btn-primary" disabled={busy || enriching}>
          {busy ? "저장 중…" : "메인 사이트 저장"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || enriching || !cfg.vendor.keyword || !cfg.vendor.name}
          onClick={() => void onEnrich()}
        >
          {enriching ? "내용 보충 중… (제미나이)" : hasEnriched ? "내용 다시 보충" : "내용 보충"}
        </button>
      </div>
    </form>
  );
}
