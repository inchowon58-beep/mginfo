"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { DEFAULT_BANNED_KEYWORDS } from "@/lib/banned-keywords";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from "@/lib/gemini-models";
import { emptyStaffNotice, type StaffNotice } from "@/lib/staff-notice";

type OpsSiteRow = {
  id: string;
  siteName: string;
  domain: string;
};

type MasterForm = {
  siteUsername: string;
  sitePassword: string;
  usableUntil: string;
  dailyPostLimit: string;
  naverRankWork: boolean;
  extraImagesEnabled: boolean;
  naverSiteVerification: string;
  geminiApiKey: string;
  geminiModel: string;
  hasKey: boolean;
};

const HUB_ID = "__hub__";
const HUB_HOST = "magazine.infocs.co.kr";

const emptyForm = (): MasterForm => ({
  siteUsername: "blog",
  sitePassword: "blog1234",
  usableUntil: "",
  dailyPostLimit: "0",
  naverRankWork: false,
  extraImagesEnabled: false,
  naverSiteVerification: "",
  geminiApiKey: "",
  geminiModel: DEFAULT_GEMINI_MODEL,
  hasKey: false,
});

function formFromSettings(s: Record<string, unknown>): MasterForm {
  return {
    siteUsername: String(s.siteUsername || "blog"),
    sitePassword: String(s.sitePassword || "blog1234"),
    usableUntil: String(s.usableUntil || ""),
    dailyPostLimit: String(s.dailyPostLimit ?? "0"),
    naverRankWork: Boolean(s.naverRankWork),
    extraImagesEnabled: Boolean(s.extraImagesEnabled),
    naverSiteVerification: String(s.naverSiteVerification || ""),
    geminiApiKey: String(s.geminiApiKey || ""),
    geminiModel: String(s.geminiModel || DEFAULT_GEMINI_MODEL),
    hasKey: Boolean(s.hasKey),
  };
}

export function HubMasterSettings() {
  const [sites, setSites] = useState<OpsSiteRow[]>([]);
  const [siteId, setSiteId] = useState(HUB_ID);
  const [form, setForm] = useState<MasterForm>(emptyForm);
  const [banned, setBanned] = useState<string[]>(DEFAULT_BANNED_KEYWORDS);
  const [draftWord, setDraftWord] = useState("");
  const [notice, setNotice] = useState<StaffNotice>(emptyStaffNotice);
  const [busy, setBusy] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selected = siteId === HUB_ID ? null : sites.find((row) => row.id === siteId) || null;
  const known = GEMINI_MODELS.some((item) => item.id === form.geminiModel);

  const loadHubForm = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setForm(formFromSettings(data.settings || {}));
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/ops/sites"), fetch("/api/ops/policy")])
      .then(async ([sitesRes, policyRes]) => {
        const sitesData = await sitesRes.json().catch(() => ({}));
        const policyData = await policyRes.json().catch(() => ({}));
        const list = Array.isArray(sitesData.sites) ? (sitesData.sites as OpsSiteRow[]) : [];
        setSites(list.filter((row) => row.domain && row.domain !== HUB_HOST));
        if (Array.isArray(policyData.bannedKeywords)) setBanned(policyData.bannedKeywords);
        if (policyData.staffNotice && typeof policyData.staffNotice === "object") {
          setNotice({
            enabled: Boolean(policyData.staffNotice.enabled),
            title: String(policyData.staffNotice.title || ""),
            body: String(policyData.staffNotice.body || ""),
            updatedAt: String(policyData.staffNotice.updatedAt || ""),
          });
        }
      })
      .catch(() => setError("사이트 목록을 불러오지 못했습니다."));
    loadHubForm().catch(() => undefined);
  }, [loadHubForm]);

  async function selectSite(nextId: string) {
    setSiteId(nextId);
    setError("");
    setMessage("");
    if (nextId === HUB_ID) {
      setLoadingSite(true);
      try {
        await loadHubForm();
      } catch {
        setError("허브 설정을 불러오지 못했습니다.");
      } finally {
        setLoadingSite(false);
      }
      return;
    }
    setLoadingSite(true);
    try {
      const res = await fetch(`/api/ops/sites/remote-settings?siteId=${encodeURIComponent(nextId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "불러오기 실패");
      setForm(formFromSettings((data.settings || {}) as Record<string, unknown>));
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoadingSite(false);
    }
  }

  function addBanned(word?: string) {
    const value = String(word || draftWord).trim();
    if (value.length < 2) return;
    setBanned((prev) => (prev.some((item) => item.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setDraftWord("");
  }

  async function savePolicy(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannedKeywords: banned, push: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      const unpublished = Number(data.unpublished || 0) + Number(data.unpublishedClones || 0);
      setMessage(
        `금지 키워드를 저장하고 전체 사이트에 반영했습니다. 막힌 사이트 ${data.updated || 0}/${data.total || 0}곳.` +
          (unpublished ? ` 기존 글 ${unpublished}편은 초안으로 내렸습니다.` : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function pushGemini() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/sites/push-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: form.geminiApiKey, geminiModel: form.geminiModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "적용 실패");
      setMessage(`제미나이 키를 ${data.updated || 0}/${data.total || 0}개 사이트에 넣었습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "적용 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveSite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const payload = {
      siteUsername: form.siteUsername,
      sitePassword: form.sitePassword,
      usableUntil: form.usableUntil,
      dailyPostLimit: form.dailyPostLimit,
      naverRankWork: form.naverRankWork,
      extraImagesEnabled: form.extraImagesEnabled,
      naverSiteVerification: form.naverSiteVerification,
      geminiApiKey: form.geminiApiKey,
      geminiModel: form.geminiModel,
    };
    try {
      if (siteId === HUB_ID) {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "저장 실패");
        setMessage("허브 마스터 설정을 저장했습니다.");
      } else {
        const res = await fetch("/api/ops/sites/remote-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, settings: payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "저장 실패");
        setMessage(`${selected?.domain || "사이트"} 설정을 저장했습니다.`);
      }
      if (form.geminiApiKey && !form.geminiApiKey.includes("•")) {
        setForm((prev) => ({ ...prev, hasKey: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotice(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffNotice: {
            enabled: notice.enabled,
            title: notice.title,
            body: notice.body,
          },
          push: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      if (data.staffNotice) {
        setNotice({
          enabled: Boolean(data.staffNotice.enabled),
          title: String(data.staffNotice.title || ""),
          body: String(data.staffNotice.body || ""),
          updatedAt: String(data.staffNotice.updatedAt || ""),
        });
      }
      setMessage(
        `운영진 공지를 저장하고 전체 사이트에 반영했습니다. 적용 ${data.updated || 0}/${data.total || 0}곳.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-stack">
      <form className="admin-card admin-form" onSubmit={saveNotice} style={{ maxWidth: 640 }}>
        <h2>운영진 공지</h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          허브와 모든 클론 관리자 페이지에 로그인하면 이 팝업이 뜹니다. 운영자에게 전달할 공지·안내를 적으세요.
        </p>
        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={notice.enabled}
            onChange={(e) => setNotice((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          관리자 로그인 시 팝업 보이기
        </label>
        <label>제목</label>
        <input
          value={notice.title}
          onChange={(e) => setNotice((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="예: 이번 주 발행 안내"
        />
        <label>내용</label>
        <textarea
          value={notice.body}
          onChange={(e) => setNotice((prev) => ({ ...prev, body: e.target.value }))}
          placeholder="운영자에게 전할 내용을 적습니다."
          style={{ minHeight: 140 }}
        />
        <p className="field-hint">저장하면 허브와 등록된 모든 사이트 관리자 화면에 같이 반영됩니다.</p>
        {error ? <p className="notice">{error}</p> : null}
        {message ? <p className="notice ok">{message}</p> : null}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "저장 중…" : "운영진 공지 저장 · 전체 반영"}
          </button>
        </div>
      </form>

      <form className="admin-card admin-form" onSubmit={savePolicy} style={{ maxWidth: 640 }}>
        <h2>발행금지 키워드</h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          네이버에서 문제가 되기 쉬운 단어입니다. 제목·키워드·본문에 있으면 생성·발행을 막고, 이미 올라간 글은 초안으로
          내립니다. 허브와 모든 클론에 같이 적용됩니다.
        </p>
        <div className="keyword-chips">
          {banned.map((word) => (
            <button
              key={word}
              type="button"
              className="keyword-chip"
              onClick={() => setBanned((prev) => prev.filter((item) => item !== word))}
            >
              {word} ×
            </button>
          ))}
        </div>
        <label>키워드 추가</label>
        <div className="admin-range">
          <input
            value={draftWord}
            onChange={(e) => setDraftWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBanned();
              }
            }}
            placeholder="예: 사설토토"
          />
          <button type="button" className="btn" onClick={() => addBanned()}>
            추가
          </button>
        </div>
        <p className="field-hint">칩을 누르면 목록에서 빠집니다. 저장해야 사이트에 반영됩니다.</p>
        <div className="admin-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => setBanned(DEFAULT_BANNED_KEYWORDS)}
          >
            기본 목록으로
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "저장 중…" : "금지 키워드 저장 · 전체 반영"}
          </button>
        </div>
      </form>

      <form className="admin-card admin-form" onSubmit={saveSite} style={{ maxWidth: 640 }}>
        <h2>사이트별 마스터 설정</h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          사이트를 고르면 그 사이트의 사용가능일, 하루 작성 수량, 관리자 계정만 나옵니다. 제미나이 키는 아래 사이트의
          칸에 넣거나, 한 번에 모든 사이트에 넣을 수 있습니다.
        </p>
        <label>설정할 사이트</label>
        <select value={siteId} onChange={(e) => selectSite(e.target.value)} disabled={loadingSite || busy}>
          <option value={HUB_ID}>허브 · {HUB_HOST}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {(site.siteName || site.domain) + " · " + site.domain}
            </option>
          ))}
        </select>
        {loadingSite ? <p className="field-hint">이 사이트 설정을 불러오는 중입니다.</p> : null}
        <h3 className="admin-subhead">사이트 관리자 계정</h3>
        <p className="field-hint" style={{ marginTop: 0 }}>
          고객이 로그인하는 아이디와 비밀번호입니다. 마스터 계정(admin)은 바뀌지 않습니다.
        </p>
        <label>사이트 아이디</label>
        <input
          value={form.siteUsername}
          onChange={(e) => setForm((prev) => ({ ...prev, siteUsername: e.target.value }))}
          autoComplete="off"
        />
        <label>사이트 비밀번호</label>
        <input
          value={form.sitePassword}
          onChange={(e) => setForm((prev) => ({ ...prev, sitePassword: e.target.value }))}
          autoComplete="off"
        />
        <h3 className="admin-subhead">사용가능일</h3>
        <label>사용 종료일</label>
        <input
          type="date"
          value={form.usableUntil}
          onChange={(e) => setForm((prev) => ({ ...prev, usableUntil: e.target.value }))}
        />
        <p className="field-hint">이 날짜까지 발행할 수 있습니다. 비우면 제한 없습니다.</p>
        <h3 className="admin-subhead">하루 글작성수량</h3>
        <label>하루 작성 가능 편수</label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={form.dailyPostLimit}
          onChange={(e) => setForm((prev) => ({ ...prev, dailyPostLimit: e.target.value }))}
        />
        <p className="field-hint">0이면 제한 없습니다. 오늘 새로 만든 글만 셉니다.</p>
        <h3 className="admin-subhead">네이버상위노출작업설정</h3>
        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={form.naverRankWork}
            onChange={(e) => setForm((prev) => ({ ...prev, naverRankWork: e.target.checked }))}
          />
          네이버 상위노출 작업 진행 중으로 표시
        </label>
        <h3 className="admin-subhead">네이버 서치어드바이저</h3>
        <label>네이버 메타태그</label>
        <textarea
          value={form.naverSiteVerification}
          onChange={(e) => setForm((prev) => ({ ...prev, naverSiteVerification: e.target.value }))}
          placeholder={'<meta name="naver-site-verification" content="여기에_코드" />'}
          style={{ minHeight: 88 }}
        />
        <h3 className="admin-subhead">추가사진사용설정</h3>
        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={form.extraImagesEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, extraImagesEnabled: e.target.checked }))}
          />
          글에 사진을 최대 7장까지 추가
        </label>
        <h3 className="admin-subhead">제미나이</h3>
        <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 0 }}>
          {siteId === HUB_ID
            ? "허브에 저장하는 키입니다. 모든 사이트에 같은 키를 넣으려면 아래 일괄 적용을 누르세요."
            : "이 사이트에만 저장됩니다."}
          {form.hasKey ? " 키가 이미 있습니다. 새 키를 넣으면 교체됩니다." : ""}
        </p>
        <label>Gemini API Key</label>
        <input
          value={form.geminiApiKey}
          onChange={(e) => setForm((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
          placeholder="AIza..."
          autoComplete="off"
        />
        <label>모델</label>
        <select value={form.geminiModel} onChange={(e) => setForm((prev) => ({ ...prev, geminiModel: e.target.value }))}>
          {GEMINI_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          {!known && form.geminiModel ? <option value={form.geminiModel}>{form.geminiModel} (이전 설정)</option> : null}
        </select>
        {error ? <p className="notice">{error}</p> : null}
        {message ? <p className="notice ok">{message}</p> : null}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy || loadingSite}>
            {busy ? "저장 중…" : selected ? `${selected.domain} 저장` : "허브 설정 저장"}
          </button>
          {siteId === HUB_ID ? (
            <button type="button" className="btn" disabled={busy} onClick={() => pushGemini()}>
              모든 사이트에 이 키 적용
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-card" style={{ maxWidth: 640 }}>
        <h2>책임 안내</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>
          글 하단과 사이트 푸터에 정보 제공·면책 문구가 붙습니다. 금지 키워드는 새로 쓰는 글과 이미 발행된 글을 같이
          막습니다. 다만 프로그램 문구만으로 법적 책임이 완전히 사라지지는 않습니다. 허위·불법·음란·사행 글은 올리지
          않는 것이 가장 확실한 보호입니다.
        </p>
      </div>
    </div>
  );
}
