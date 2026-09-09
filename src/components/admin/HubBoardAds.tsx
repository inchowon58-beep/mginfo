"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { VendorPicker } from "@/components/admin/VendorPicker";

type BoardSite = { id: string; siteName: string; domain: string; apexDomain: string };

type BoardResult = { siteId: string; domain: string; ok: boolean; error?: string };

type Campaign = {
  id: string;
  title: string;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
  results?: BoardResult[];
};

function statusLabel(status: string) {
  if (status === "published") return "발행 완료";
  if (status === "partial") return "일부 성공";
  if (status === "failed") return "실패";
  if (status === "scheduled") return "예약";
  return status;
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function bodyToHtml(raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function HubBoardAds() {
  const [sites, setSites] = useState<BoardSite[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorWebsite, setVendorWebsite] = useState("");
  const [vendorKakao, setVendorKakao] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/ops/board-campaigns");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "불러오기 실패");
    setSites(data.sites || []);
    setCampaigns(data.campaigns || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "불러오기 실패"));
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

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((row) => row !== id) : [...list, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ops/board-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          bodyHtml: bodyToHtml(body),
          coverImage,
          vendorName,
          vendorPhone,
          vendorWebsite,
          vendorKakao,
          siteIds: selected,
          publishNow: mode === "now",
          scheduledAt: mode === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setTitle("");
      setExcerpt("");
      setBody("");
      setCoverImage("");
      setMessage(mode === "now" ? "선택한 사이트 자유게시판에 등록했습니다." : "예약했습니다. 시간이 되면 자동 등록됩니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hub-board">
      <form className="admin-card admin-form" onSubmit={submit}>
        <div className="admin-card-head">
          <div>
            <h2>자유게시판 광고</h2>
            <p className="field-hint" style={{ marginTop: 0 }}>
              사이트 대장에서 광고글 동의를 켠 사이트만 나옵니다. 선택한 업체 정보가 글과 함께 들어갑니다.
            </p>
          </div>
        </div>
        <label>제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>요약</label>
        <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="검색·목록에 쓰일 한 줄" />
        <label>본문</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} required />
        <label>커버 이미지 URL (선택)</label>
        <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
        <div className="hub-board-vendor">
          <div>
            <label>업체명</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </div>
          <VendorPicker
            onPick={(fields) => {
              setVendorName(fields.vendorName);
              setVendorPhone(fields.vendorPhone);
              setVendorWebsite(fields.vendorWebsite);
              setVendorKakao(fields.vendorKakao);
            }}
          />
        </div>
        <label>전화</label>
        <input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} />
        <label>홈페이지</label>
        <input value={vendorWebsite} onChange={(e) => setVendorWebsite(e.target.value)} />
        <label>카카오</label>
        <input value={vendorKakao} onChange={(e) => setVendorKakao(e.target.value)} />

        <div className="hub-board-mode">
          <label>
            <input type="radio" name="hub-board-mode" checked={mode === "now"} onChange={() => setMode("now")} />
            바로 등록
          </label>
          <label>
            <input type="radio" name="hub-board-mode" checked={mode === "later"} onChange={() => setMode("later")} />
            예약 등록
          </label>
        </div>
        {mode === "later" ? (
          <>
            <label>예약 시각</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          </>
        ) : null}

        <div className="hub-board-sites">
          <div className="hub-board-sites-head">
            <b>발행 사이트</b>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setSelected(selected.length === sites.length ? [] : sites.map((site) => site.id))}
            >
              {selected.length === sites.length ? "선택 해제" : "모두 선택"}
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
                    <input type="checkbox" checked={selected.includes(site.id)} onChange={() => toggle(site.id)} />
                    {site.domain}
                    {site.siteName ? ` · ${site.siteName}` : ""}
                  </label>
                ))}
              </div>
            ))
          )}
        </div>

        {error ? <p className="notice">{error}</p> : null}
        {message ? <p className="field-hint">{message}</p> : null}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "처리 중…" : mode === "now" ? "바로 등록" : "예약 등록"}
          </button>
        </div>
      </form>

      <div className="admin-card">
        <h2>최근 발행</h2>
        {campaigns.length === 0 ? (
          <p className="field-hint">아직 허브에서 보낸 광고글이 없습니다.</p>
        ) : (
          <ul className="hub-board-log">
            {campaigns.slice(0, 20).map((row) => (
              <li key={row.id}>
                <strong>{row.title}</strong>
                <span>
                  {statusLabel(row.status)}
                  {row.scheduledAt ? ` · ${toLocalInput(row.scheduledAt).replace("T", " ")}` : ""}
                </span>
                {row.results?.length ? (
                  <em>
                    {row.results.filter((item) => item.ok).length}/{row.results.length} 성공
                    {row.results
                      .filter((item) => !item.ok)
                      .slice(0, 3)
                      .map((item) => ` · ${item.domain}: ${item.error || "실패"}`)
                      .join("")}
                  </em>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
