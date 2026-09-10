"use client";

import { FormEvent, useEffect, useState } from "react";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { HubMasterSettings } from "@/components/admin/HubMasterSettings";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from "@/lib/gemini-models";
import { SITE_THEMES } from "@/lib/site-theme";
import { DEFAULT_WRITING_TONE, WRITING_TONES, isWritingToneId, type WritingToneId } from "@/lib/writing-tone";
import type { SiteThemeId } from "@/lib/types";

type SettingsTab = "basic" | "category" | "site" | "master";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "basic", label: "기본설정" },
  { id: "category", label: "카테고리설정" },
  { id: "site", label: "사이트설정" },
  { id: "master", label: "마스터설정" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("basic");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const [siteTheme, setSiteTheme] = useState<SiteThemeId>("press");
  const [carrotKeywords, setCarrotKeywords] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupBody, setPopupBody] = useState("");
  const [popupCta, setPopupCta] = useState("");
  const [popupHref, setPopupHref] = useState("/posts");
  const [popupImage, setPopupImage] = useState("");
  const [likeCountMin, setLikeCountMin] = useState("20");
  const [likeCountMax, setLikeCountMax] = useState("200");
  const [commentCountMin, setCommentCountMin] = useState("5");
  const [commentCountMax, setCommentCountMax] = useState("48");
  const [siteName, setSiteName] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [company, setCompany] = useState("");
  const [ceo, setCeo] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [writingTone, setWritingTone] = useState<WritingToneId>(DEFAULT_WRITING_TONE);
  const [writingPersona, setWritingPersona] = useState("");
  const [naverSiteVerification, setNaverSiteVerification] = useState("");
  const [vendorRegisterUrl, setVendorRegisterUrl] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [geminiUnlocked, setGeminiUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [usableUntil, setUsableUntil] = useState("");
  const [dailyPostLimit, setDailyPostLimit] = useState("0");
  const [naverRankWork, setNaverRankWork] = useState(false);
  const [extraImagesEnabled, setExtraImagesEnabled] = useState(false);
  const [siteUsername, setSiteUsername] = useState("blog");
  const [sitePassword, setSitePassword] = useState("blog1234");
  const [opsHub, setOpsHub] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        setOpsHub(Boolean(data.opsHub));
        setGeminiModel(s.geminiModel || DEFAULT_GEMINI_MODEL);
        setHasKey(Boolean(s.hasKey));
        if (s.geminiApiKey) setGeminiApiKey(s.geminiApiKey);
        if (s.siteTheme) setSiteTheme(s.siteTheme);
        if (typeof s.carrotKeywords === "string") setCarrotKeywords(s.carrotKeywords);
        setPopupEnabled(Boolean(s.popupEnabled));
        if (typeof s.popupTitle === "string") setPopupTitle(s.popupTitle);
        if (typeof s.popupBody === "string") setPopupBody(s.popupBody);
        if (typeof s.popupCta === "string") setPopupCta(s.popupCta);
        if (typeof s.popupHref === "string") setPopupHref(s.popupHref);
        if (typeof s.popupImage === "string") setPopupImage(s.popupImage);
        if (s.likeCountMin != null) setLikeCountMin(String(s.likeCountMin));
        if (s.likeCountMax != null) setLikeCountMax(String(s.likeCountMax));
        if (s.commentCountMin != null) setCommentCountMin(String(s.commentCountMin));
        if (s.commentCountMax != null) setCommentCountMax(String(s.commentCountMax));
        setSiteName(s.siteName || "");
        setSiteTagline(s.siteTagline || "");
        setCompany(s.company || "");
        setCeo(s.ceo || "");
        setBizNo(s.bizNo || "");
        setAddress(s.address || "");
        setPhone(s.phone || "");
        setEmail(s.email || "");
        if (s.geminiModel) setGeminiModel(s.geminiModel);
        if (typeof s.hasKey === "boolean") setHasKey(s.hasKey);
        if (s.geminiApiKey) setGeminiApiKey(s.geminiApiKey);
        if (typeof s.usableUntil === "string") setUsableUntil(s.usableUntil);
        if (s.dailyPostLimit != null) setDailyPostLimit(String(s.dailyPostLimit));
        setNaverRankWork(Boolean(s.naverRankWork));
        setExtraImagesEnabled(Boolean(s.extraImagesEnabled));
        if (typeof s.naverSiteVerification === "string") setNaverSiteVerification(s.naverSiteVerification);
        if (typeof s.vendorRegisterUrl === "string") setVendorRegisterUrl(s.vendorRegisterUrl);
        if (typeof s.siteUsername === "string" && s.siteUsername) setSiteUsername(s.siteUsername);
        if (typeof s.sitePassword === "string" && s.sitePassword) setSitePassword(s.sitePassword);
        if (isWritingToneId(s.writingTone)) setWritingTone(s.writingTone);
        if (typeof s.writingPersona === "string") setWritingPersona(s.writingPersona);
      })
      .catch(() => setError("설정을 불러오지 못했습니다."));
    fetch("/api/auth/master")
      .then((r) => r.json())
      .then((data) => {
        if (data.unlocked) setGeminiUnlocked(true);
      })
      .catch(() => undefined);
  }, []);

  function switchTab(next: SettingsTab) {
    setTab(next);
    setError("");
    setMessage("");
  }

  async function save(payload: Record<string, string | number | boolean>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("설정을 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    await save({ siteName, siteTagline, company, ceo, bizNo, address, phone, email, writingTone, writingPersona });
  }

  async function saveSite(e: FormEvent) {
    e.preventDefault();
    await save({
      siteTheme,
      carrotKeywords,
      popupEnabled,
      popupTitle,
      popupBody,
      popupCta,
      popupHref,
      popupImage,
      vendorRegisterUrl,
      likeCountMin,
      likeCountMax,
      commentCountMin,
      commentCountMax,
    });
  }

  async function saveMaster(e: FormEvent) {
    e.preventDefault();
    await save({
      geminiApiKey,
      geminiModel,
      usableUntil,
      dailyPostLimit,
      naverRankWork,
      extraImagesEnabled,
      naverSiteVerification,
      siteUsername,
      sitePassword,
    });
    if (geminiApiKey && !geminiApiKey.includes("•")) setHasKey(true);
  }

  async function unlockGemini(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: masterPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "확인 실패");
      setGeminiUnlocked(true);
      setMasterPassword("");
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      const s = settingsData.settings || {};
      setGeminiModel(s.geminiModel || DEFAULT_GEMINI_MODEL);
      setHasKey(Boolean(s.hasKey));
      setGeminiApiKey(s.geminiApiKey || "");
      if (typeof s.usableUntil === "string") setUsableUntil(s.usableUntil);
      if (s.dailyPostLimit != null) setDailyPostLimit(String(s.dailyPostLimit));
      setNaverRankWork(Boolean(s.naverRankWork));
      setExtraImagesEnabled(Boolean(s.extraImagesEnabled));
      if (typeof s.naverSiteVerification === "string") setNaverSiteVerification(s.naverSiteVerification);
      if (typeof s.siteUsername === "string" && s.siteUsername) setSiteUsername(s.siteUsername);
      if (typeof s.sitePassword === "string" && s.sitePassword) setSitePassword(s.sitePassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "확인 실패");
    } finally {
      setBusy(false);
    }
  }

  const known = GEMINI_MODELS.some((m) => m.id === geminiModel);

  return (
    <div className="settings-stack">
      <div className="admin-tabs" role="tablist" aria-label="설정 구분">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-tab ${tab === item.id ? "active" : ""}`}
            onClick={() => switchTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "basic" ? (
        <form className="admin-card admin-form" onSubmit={saveBasics}>
          <h2>기본 설정</h2>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            블로그 이름은 로고, 브라우저 제목, 글 상단, 푸터 저작권에 쓰입니다. 푸터 항목은 비워 두면 숨깁니다.
          </p>
          <label>블로그 이름</label>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="예: infocs 매거진"
          />
          <label>한줄 소개 (선택)</label>
          <input
            value={siteTagline}
            onChange={(e) => setSiteTagline(e.target.value)}
            placeholder="예: 모든 생활 정보를 한눈에"
          />
          <h3 className="admin-subhead">하단 푸터</h3>
          <div className="admin-form-grid">
            <div>
              <label>상호</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="비워 두면 표시하지 않음" />
            </div>
            <div>
              <label>대표</label>
              <input value={ceo} onChange={(e) => setCeo(e.target.value)} placeholder="비워 두면 표시하지 않음" />
            </div>
            <div>
              <label>사업자등록번호</label>
              <input value={bizNo} onChange={(e) => setBizNo(e.target.value)} placeholder="비워 두면 표시하지 않음" />
            </div>
            <div>
              <label>연락처</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="비워 두면 표시하지 않음" />
            </div>
          </div>
          <label>주소</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="비워 두면 표시하지 않음" />
          <label>이메일</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="비워 두면 표시하지 않음" />
          <h3 className="admin-subhead">작성 톤 · 나의 상황</h3>
          <p className="field-hint" style={{ marginTop: 0 }}>
            글방향(정보성, 뉴스형, 매거진형 등)은 글의 뼈대입니다. 여기서는 말투만 고릅니다. 사이트마다 다르게 두면
            같은 키워드라도 문장이 덜 닮습니다. 글방향이 뉴스형이면 그 글만 뉴스 단정으로 씁니다.
          </p>
          <label>기본 말투</label>
          <select
            value={writingTone}
            onChange={(e) => {
              if (isWritingToneId(e.target.value)) setWritingTone(e.target.value);
            }}
          >
            {WRITING_TONES.map((tone) => (
              <option key={tone.id} value={tone.id}>
                {tone.label} · {tone.hint}
              </option>
            ))}
          </select>
          <label>나의 상황 (선택)</label>
          <textarea
            value={writingPersona}
            onChange={(e) => setWritingPersona(e.target.value)}
            placeholder="예: 50대, 강아지 쪽을 오래 봤음. 포메라니안을 키움. 자녀 3명. 부천 거주."
            style={{ minHeight: 90 }}
          />
          <p className="field-hint">
            나이대, 관심사, 사는 곳처럼 글을 쓰는 사람 배경입니다. 말투와 비유에만 쓰입니다. 그 업체·분양장에 다녀온
            이야기나 가짜 후기는 만들지 않습니다.
          </p>
          {error ? <p className="notice">{error}</p> : null}
          {message ? <p className="notice ok">{message}</p> : null}
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "저장 중…" : "기본 설정 저장"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "category" ? <CategoryManager /> : null}

      {tab === "site" ? (
        <form className="admin-card admin-form" onSubmit={saveSite}>
          <h2>사이트 설정</h2>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            고른 디자인이 로고, 색, 홈 구성까지 한꺼번에 바뀝니다. 지금은 1~9번입니다.
          </p>
          <label>업체 등록안내 링크</label>
          <input
            value={vendorRegisterUrl}
            onChange={(e) => setVendorRegisterUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="field-hint">
            글 광고 배너 오른쪽 ‘등록안내’에 연결됩니다. 비워 두면 링크를 숨깁니다.
          </p>
          <div className="theme-picker">
            {SITE_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-pick ${siteTheme === theme.id ? "active" : ""}`}
                onClick={() => setSiteTheme(theme.id)}
              >
                <span className="theme-swatch" style={{ background: theme.paper, color: theme.accent }}>
                  {theme.number}
                </span>
                <b>
                  {theme.number}번 · {theme.name}
                  <small>{theme.nameEn}</small>
                </b>
                <p>{theme.description}</p>
              </button>
            ))}
          </div>
          <div className="admin-engage-fields">
            <h3 className="admin-subhead">입장 팝업</h3>
            <p className="field-hint" style={{ marginTop: 0 }}>
              모든 디자인에서 홈·글 화면에 뜹니다. 카드 기본 형태는 지금과 같고, 테마마다 색과 모서리만 조금
              달라집니다. 제목이나 내용을 비우면 팝업을 숨깁니다.
            </p>
            <label className="admin-check-all">
              <input
                type="checkbox"
                checked={popupEnabled}
                onChange={(e) => setPopupEnabled(e.target.checked)}
              />
              입장 팝업 사용
            </label>
            <label>제목</label>
            <input
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="지금 바로 시작해 보세요"
            />
            <label>내용</label>
            <textarea
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              placeholder="필요한 이야기만 골라 읽고, 실생활에 바로 쓰는 가이드를 확인하세요."
              style={{ minHeight: 90 }}
            />
            <label>버튼 문구</label>
            <input value={popupCta} onChange={(e) => setPopupCta(e.target.value)} placeholder="글 보러가기" />
            <label>버튼 링크</label>
            <input value={popupHref} onChange={(e) => setPopupHref(e.target.value)} placeholder="/posts" />
            <label>이미지 주소 (선택)</label>
            <input
              value={popupImage}
              onChange={(e) => setPopupImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {siteTheme === "carrot" ? (
            <>
              <label>인기 검색어</label>
              <textarea
                value={carrotKeywords}
                onChange={(e) => setCarrotKeywords(e.target.value)}
                placeholder={"반려동물, 뷰티, 인테리어\n맛집, 부동산"}
                style={{ minHeight: 90 }}
              />
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: -4 }}>
                쉼표 또는 줄바꿈으로 구분합니다. 홈 검색창 아래에 그대로 나갑니다.
              </p>
            </>
          ) : null}
          {siteTheme === "journal" || siteTheme === "talk" || siteTheme === "studio" ? (
            <div className="admin-engage-fields">
              <h3 className="admin-subhead">좋아요 · 댓글 표시</h3>
              <p className="field-hint" style={{ marginTop: 0 }}>
                글마다 이 구간 안에서 다른 숫자가 나갑니다. 같은 글은 항상 같은 숫자입니다. 최댓값까지 0이면 해당
                아이콘(하트·말풍선)은 사이트에 나오지 않습니다.
              </p>
              <label>좋아요 개수</label>
              <div className="admin-range">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={likeCountMin}
                  onChange={(e) => setLikeCountMin(e.target.value)}
                />
                <span>개 ~</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={likeCountMax}
                  onChange={(e) => setLikeCountMax(e.target.value)}
                />
                <span>개</span>
              </div>
              <label>댓글 개수</label>
              <div className="admin-range">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={commentCountMin}
                  onChange={(e) => setCommentCountMin(e.target.value)}
                />
                <span>개 ~</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={commentCountMax}
                  onChange={(e) => setCommentCountMax(e.target.value)}
                />
                <span>개</span>
              </div>
            </div>
          ) : null}
          {error ? <p className="notice">{error}</p> : null}
          {message ? <p className="notice ok">{message}</p> : null}
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "적용 중…" : "사이트 설정 저장"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "master" && !geminiUnlocked ? (
        <form className="admin-card admin-form" onSubmit={unlockGemini} style={{ maxWidth: 640 }}>
          <h2>마스터 설정</h2>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            마스터 관리자만 볼 수 있습니다. 비밀번호를 한 번 더 입력하세요.
          </p>
          <label>마스터 비밀번호</label>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="마스터 비밀번호"
            autoComplete="off"
          />
          {error ? <p className="notice">{error}</p> : null}
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy || !masterPassword.trim()}>
              {busy ? "확인 중…" : "확인"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "master" && geminiUnlocked && opsHub ? <HubMasterSettings /> : null}

      {tab === "master" && geminiUnlocked && !opsHub ? (
        <form className="admin-card admin-form" onSubmit={saveMaster} style={{ maxWidth: 640 }}>
          <h2>마스터 설정</h2>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            사용가능일과 하루 작성 수량은 대시보드에도 표시됩니다. 날짜가 지나면 추가 발행이 멈추고, 수량에 닿으면 그날
            새 글을 더 만들 수 없습니다.
          </p>
          <h3 className="admin-subhead">사이트 관리자 계정</h3>
          <p className="field-hint" style={{ marginTop: 0 }}>
            고객이 로그인하는 아이디와 비밀번호입니다. 분실하면 여기서 확인하고 알려 주면 됩니다. 마스터 계정
            (admin)은 바뀌지 않습니다.
          </p>
          <label>사이트 아이디</label>
          <input value={siteUsername} onChange={(e) => setSiteUsername(e.target.value)} autoComplete="off" />
          <label>사이트 비밀번호</label>
          <input value={sitePassword} onChange={(e) => setSitePassword(e.target.value)} autoComplete="off" />
          <h3 className="admin-subhead">사용가능일</h3>
          <label>사용 종료일</label>
          <input type="date" value={usableUntil} onChange={(e) => setUsableUntil(e.target.value)} />
          <p className="field-hint">이 날짜까지 발행할 수 있습니다. 다음 날부터는 추가 발행이 막힙니다. 비우면 제한 없습니다.</p>
          <h3 className="admin-subhead">하루 글작성수량</h3>
          <label>하루 작성 가능 편수</label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={dailyPostLimit}
            onChange={(e) => setDailyPostLimit(e.target.value)}
          />
          <p className="field-hint">0이면 제한 없습니다. 오늘 새로 만든 글만 세고, 이미 있는 글 수정은 세지 않습니다.</p>
          <h3 className="admin-subhead">네이버상위노출작업설정</h3>
          <label className="admin-check-all">
            <input
              type="checkbox"
              checked={naverRankWork}
              onChange={(e) => setNaverRankWork(e.target.checked)}
            />
            네이버 상위노출 작업 진행 중으로 표시
          </label>
          <p className="field-hint">체크하면 대시보드 맨 위에 “네이버상위노출작업진행중”이 뜹니다.</p>
          <h3 className="admin-subhead">네이버 서치어드바이저</h3>
          <label>네이버 메타태그</label>
          <textarea
            value={naverSiteVerification}
            onChange={(e) => setNaverSiteVerification(e.target.value)}
            placeholder={'<meta name="naver-site-verification" content="여기에_코드" />'}
            style={{ minHeight: 88 }}
          />
          <p className="field-hint">
            네이버 서치어드바이저에서 받은 메타 태그를 그대로 붙여 넣으면 됩니다. 저장하면 모든 페이지 헤드에
            들어가서 사이트 등록 확인에 쓰입니다. 코드만 넣어도 됩니다.
          </p>
          <h3 className="admin-subhead">추가사진사용설정</h3>
          <label className="admin-check-all">
            <input
              type="checkbox"
              checked={extraImagesEnabled}
              onChange={(e) => setExtraImagesEnabled(e.target.checked)}
            />
            글에 사진을 최대 7장까지 추가
          </label>
          <p className="field-hint">
            기본은 대표 이미지 1장입니다. 체크하면 글 작성에서 사진을 더 넣고, 소제목 앞과 하단 갤러리에 배치합니다.
          </p>
          <h3 className="admin-subhead">제미나이</h3>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 0 }}>
            Google AI Studio에서 발급한 API 키를 저장하면 글 작성 화면에서 초안을 만들 수 있습니다.
            {hasKey ? " 키가 이미 저장되어 있습니다. 새 키를 넣으면 교체됩니다." : ""}
          </p>
          <label>Gemini API Key</label>
          <input
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
          <label>모델</label>
          <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            {!known && geminiModel ? <option value={geminiModel}>{geminiModel} (이전 설정)</option> : null}
          </select>
          {error ? <p className="notice">{error}</p> : null}
          {message ? <p className="notice ok">{message}</p> : null}
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "저장 중…" : "마스터 설정 저장"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
