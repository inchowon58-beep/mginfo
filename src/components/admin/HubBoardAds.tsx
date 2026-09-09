"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ARTICLE_STYLE_OPTIONS } from "@/lib/article-style";
import { VendorPicker } from "@/components/admin/VendorPicker";

type BoardSite = { id: string; siteName: string; domain: string; apexDomain: string; concept?: string };

type Keyword = {
  id: string;
  keyword: string;
  status: string;
  siteId?: string;
  domain?: string;
  error?: string;
  title?: string;
  scheduledAt?: string;
};

type Campaign = {
  id: string;
  title: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  writingStyle?: string;
  dailyLimit: number;
  siteIds: string[];
  keywords: Keyword[];
  schedule: { enabled: boolean; startHour: number };
  stats?: { total: number; published: number; remaining: number; percent: number; daysLeft: number };
};

const HOURS = Array.from({ length: 23 }, (_, i) => i + 1);

function emptyCampaign(siteIds: string[]): Campaign {
  return {
    id: "",
    title: "",
    vendorName: "",
    vendorPhone: "",
    vendorWebsite: "",
    vendorKakao: "",
    writingStyle: "random",
    dailyLimit: 3,
    siteIds,
    keywords: [],
    schedule: { enabled: true, startHour: 9 },
  };
}

function statusLabel(status: string) {
  if (status === "published") return "발행";
  if (status === "scheduled") return "예약";
  if (status === "processing") return "작성중";
  if (status === "failed") return "실패";
  return "대기";
}

export function HubBoardAds() {
  const [sites, setSites] = useState<BoardSite[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<Campaign>(emptyCampaign([]));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [nowId, setNowId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/ops/board-campaigns");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "불러오기 실패");
    const nextSites: BoardSite[] = data.sites || [];
    const nextCampaigns: Campaign[] = data.campaigns || [];
    setSites(nextSites);
    setCampaigns(nextCampaigns);
    return { sites: nextSites, campaigns: nextCampaigns };
  }

  useEffect(() => {
    load()
      .then(({ sites: nextSites, campaigns: nextCampaigns }) => {
        if (nextCampaigns[0]) setForm(nextCampaigns[0]);
        else setForm(emptyCampaign(nextSites.map((site) => site.id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "불러오기 실패"));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardSite[]>();
    for (const site of sites) {
      const key = site.apexDomain || site.domain;
      const rows = map.get(key) || [];
      rows.push(site);
      map.set(key, rows);
    }
    return [...map.entries()];
  }, [sites]);

  function toggleSite(id: string) {
    setForm((prev) => ({
      ...prev,
      siteIds: prev.siteIds.includes(id) ? prev.siteIds.filter((row) => row !== id) : [...prev.siteIds, id],
    }));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/board-campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          title: form.title || form.vendorName || "자유게시판 광고",
          vendorName: form.vendorName,
          vendorPhone: form.vendorPhone,
          vendorWebsite: form.vendorWebsite,
          vendorKakao: form.vendorKakao,
          writingStyle: form.writingStyle,
          dailyLimit: form.dailyLimit,
          siteIds: form.siteIds,
          keywords: form.keywords,
          schedule: form.schedule,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setText("");
      setForm(data.campaign);
      const fresh = await load();
      const saved = fresh.campaigns.find((row) => row.id === data.campaign.id) || data.campaign;
      setForm(saved);
      setMessage(
        data.planned
          ? `저장했습니다. 오늘 분량 ${data.planned}건을 위에서부터 사이트에 순서대로 예약했습니다.`
          : "키워드와 설정을 저장했습니다. 매일 자동발행을 켜 두면 순차로 나갑니다."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function runTick() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/cron/hub-board", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실행 실패");
      const done = (data.results || []).filter((row: { ok: boolean }) => row.ok).length;
      const fail = (data.results || []).filter((row: { ok: boolean }) => !row.ok).length;
      setMessage(
        data.processed
          ? `순차 발행 ${data.processed}건 · 성공 ${done} · 실패 ${fail}`
          : data.planned
            ? `오늘 분량 ${data.planned}건을 예약했습니다.`
            : "지금은 발행할 예약이 없습니다."
      );
      const fresh = await load();
      const current = fresh.campaigns.find((row) => row.id === form.id) || fresh.campaigns[0];
      if (current) setForm(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setBusy(false);
    }
  }

  async function publishNow(keywordId: string) {
    if (!form.id) {
      setError("먼저 저장하세요.");
      return;
    }
    setNowId(keywordId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/board-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: form.id, keywordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발행 실패");
      setMessage(`${data.keyword} → ${data.domain} 자유게시판에 등록했습니다.`);
      if (data.campaign) setForm(data.campaign);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "발행 실패");
    } finally {
      setNowId("");
    }
  }

  return (
    <div className="hub-board">
      <form className="admin-card admin-form" onSubmit={save}>
        <div className="admin-card-head">
          <div>
            <h2>자유게시판 광고</h2>
            <p className="field-hint" style={{ marginTop: 0 }}>
              키워드마다 제미나이가 다른 글을 만들고, 동의한 사이트 위부터 한 사이트에 하나씩 넣습니다.
              글방향은 이 화면 설정이 모든 키워드에 공통입니다. 말투·페르소나·사이트 이름·컨셉은 글을 받는 그 사이트 설정을 따릅니다.
            </p>
          </div>
        </div>

        {campaigns.length > 1 ? (
          <label>
            캠페인
            <select
              value={form.id}
              onChange={(e) => {
                const found = campaigns.find((row) => row.id === e.target.value);
                if (found) setForm(found);
                else setForm(emptyCampaign(sites.map((site) => site.id)));
              }}
            >
              {campaigns.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title || row.vendorName || row.id}
                </option>
              ))}
              <option value="">새 캠페인</option>
            </select>
          </label>
        ) : null}

        <label>캠페인 이름</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="예: 아가펫 4월 광고"
        />

        <div className="hub-board-vendor">
          <div>
            <label>업체명</label>
            <input value={form.vendorName || ""} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          </div>
          <VendorPicker
            onPick={(fields) =>
              setForm((prev) => ({
                ...prev,
                vendorName: fields.vendorName,
                vendorPhone: fields.vendorPhone,
                vendorWebsite: fields.vendorWebsite,
                vendorKakao: fields.vendorKakao,
                title: prev.title || fields.vendorName,
              }))
            }
          />
        </div>
        <label>전화</label>
        <input value={form.vendorPhone || ""} onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })} />
        <label>홈페이지</label>
        <input value={form.vendorWebsite || ""} onChange={(e) => setForm({ ...form, vendorWebsite: e.target.value })} />
        <label>카카오</label>
        <input value={form.vendorKakao || ""} onChange={(e) => setForm({ ...form, vendorKakao: e.target.value })} />

        <div className="bulk-group-grid">
          <label>
            하루발행수량
            <input
              type="number"
              min={1}
              max={40}
              value={form.dailyLimit}
              onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) || 1 })}
            />
          </label>
          <label>
            글방향
            <select value={form.writingStyle || "random"} onChange={(e) => setForm({ ...form, writingStyle: e.target.value })}>
              {ARTICLE_STYLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            매일 자동발행
            <select
              value={form.schedule.enabled ? "on" : "off"}
              onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, enabled: e.target.value === "on" } })}
            >
              <option value="on">켜기</option>
              <option value="off">끄기</option>
            </select>
          </label>
          <label>
            시작 시각
            <select
              value={form.schedule.startHour}
              onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, startHour: Number(e.target.value) } })}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}시
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>대량 키워드 (줄 또는 쉼표)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"부천 애견미용\n인천 펫샵 추천\n강아지 호텔"}
        />

        <div className="hub-board-sites">
          <div className="hub-board-sites-head">
            <b>순차 발행 사이트 (위부터 한 키워드씩)</b>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  siteIds: prev.siteIds.length === sites.length ? [] : sites.map((site) => site.id),
                }))
              }
            >
              {form.siteIds.length === sites.length ? "선택 해제" : "모두 선택"}
            </button>
          </div>
          {sites.length === 0 ? (
            <p className="field-hint">동의한 사이트가 없습니다. 사이트 대장에서 광고글 동의를 켜 주세요.</p>
          ) : (
            grouped.map(([apex, rows]) => (
              <div className="hub-board-group" key={apex}>
                <p>{apex}</p>
                {rows.map((site) => (
                  <label key={site.id}>
                    <input type="checkbox" checked={form.siteIds.includes(site.id)} onChange={() => toggleSite(site.id)} />
                    {site.domain}
                    {site.siteName ? ` · ${site.siteName}` : ""}
                  </label>
                ))}
              </div>
            ))
          )}
        </div>

        {form.stats ? (
          <p className="field-hint">
            키워드 {form.stats.total} · 발행 {form.stats.published} · 남은 {form.stats.remaining}
            {form.stats.daysLeft ? ` · 약 ${form.stats.daysLeft}일` : ""} · 하루 {form.dailyLimit}편
          </p>
        ) : null}
        {error ? <p className="notice">{error}</p> : null}
        {message ? <p className="field-hint">{message}</p> : null}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={runTick}>
            대기 발행 실행
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setForm(emptyCampaign(sites.map((site) => site.id)));
              setText("");
            }}
          >
            새 캠페인
          </button>
        </div>
      </form>

      <div className="admin-card">
        <h2>키워드 순차 현황</h2>
        {form.keywords.length === 0 ? (
          <p className="field-hint">키워드를 넣고 저장하면, 위에서부터 사이트 하나씩 배정됩니다.</p>
        ) : (
          <ul className="hub-board-log">
            {form.keywords.map((row) => (
              <li key={row.id}>
                <strong>{row.keyword}</strong>
                <span>
                  {statusLabel(row.status)}
                  {row.domain ? ` · ${row.domain}` : " · 아직 배정 전"}
                  {row.title ? ` · ${row.title}` : ""}
                  {row.error ? ` · ${row.error}` : ""}
                </span>
                {row.status !== "published" && row.status !== "processing" ? (
                  <button className="btn btn-ghost" type="button" disabled={Boolean(nowId) || busy} onClick={() => publishNow(row.id)}>
                    {nowId === row.id ? "작성 중…" : "지금 이 사이트에 발행"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
