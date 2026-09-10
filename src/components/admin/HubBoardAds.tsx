"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ARTICLE_STYLE_OPTIONS } from "@/lib/article-style";
import { VendorPicker } from "@/components/admin/VendorPicker";
import { MultiFileButton } from "@/components/admin/MultiFileButton";
import { pickImageFiles, prepareUploadImage } from "@/lib/prepare-upload-image";
import { mergeImageUrls } from "@/lib/image-pool";

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
  vendorId?: string;
  writingStyle?: string;
  imagePool?: string[];
  imageFolderUrl?: string;
  extraPrompt?: string;
  dailyLimit: number;
  siteIds: string[];
  keywords: Keyword[];
  schedule: { enabled: boolean; startHour: number };
  stats?: { total: number; published: number; remaining: number; percent: number; daysLeft: number };
  vendorRecruitSlot?: boolean;
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
    vendorId: "",
    writingStyle: "random",
    imagePool: [],
    imageFolderUrl: "",
    extraPrompt: "",
    dailyLimit: 3,
    siteIds,
    keywords: [],
    schedule: { enabled: true, startHour: 9 },
    vendorRecruitSlot: false,
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
  const [sitesOpen, setSitesOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);

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

  async function importFolder() {
    const folder = (form.imageFolderUrl || "").trim();
    if (!folder) {
      setError("웹 폴더 주소를 넣으세요.");
      return;
    }
    setFolderBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/bulk/folder-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: folder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "폴더를 읽지 못했습니다.");
      const added = Array.isArray(data.urls) ? data.urls.map((item: unknown) => String(item || "")).filter(Boolean) : [];
      setForm((prev) => ({ ...prev, imagePool: mergeImageUrls(prev.imagePool || [], added) }));
      setMessage(`${added.length}장을 폴더에서 가져왔습니다. 아래 저장을 눌러 캠페인에 남기세요.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했습니다.");
    } finally {
      setFolderBusy(false);
    }
  }

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
          vendorId: form.vendorId,
          imagePool: form.imagePool || [],
          imageFolderUrl: form.imageFolderUrl || "",
          extraPrompt: form.extraPrompt || "",
          coverImage: (form.imagePool || [])[0] || "",
          writingStyle: form.writingStyle,
          dailyLimit: form.dailyLimit,
          siteIds: form.siteIds,
          keywords: form.keywords,
          schedule: form.schedule,
          vendorRecruitSlot: Boolean(form.vendorRecruitSlot),
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
                vendorId: fields.vendorId,
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

        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={Boolean(form.vendorRecruitSlot)}
            onChange={(e) => setForm({ ...form, vendorRecruitSlot: e.target.checked })}
          />
          제휴업체모집중
        </label>
        <p className="field-hint">
          켜면 받는 사이트 광고 글에도 제휴업체모집중 칸이 붙습니다. 이미 나간 글은 그대로이고, 새로 발행되는 글부터
          적용됩니다. 등록안내는 그 사이트 운영자가 사이트설정에 넣은 주소가 있으면 그쪽으로, 없으면 총관리자
          사이트설정의 등록안내 페이지로 이동합니다. 사이트 운영자가 카테고리에서 제휴업체모집중을 켜 두면 그 설정도
          그대로 적용됩니다.
        </p>

        <label>광고 이미지</label>
        <div className="cover-upload">
          <MultiFileButton
            label={uploading ? "올리는 중…" : "이미지 올리기"}
            busy={uploading || folderBusy}
            onFiles={async (files) => {
              const images = pickImageFiles(files);
              if (!images.length) {
                setError("선택한 파일에서 사진을 찾지 못했습니다.");
                return;
              }
              setUploading(true);
              setError("");
              try {
                const urls: string[] = [];
                for (const file of images) {
                  const prepared = await prepareUploadImage(file);
                  const dataForm = new FormData();
                  dataForm.append("file", prepared);
                  const res = await fetch("/api/upload", { method: "POST", body: dataForm });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "업로드 실패");
                  if (data.url) urls.push(String(data.url));
                }
                setForm((prev) => ({ ...prev, imagePool: mergeImageUrls(prev.imagePool || [], urls) }));
                setMessage(`${urls.length}장을 올렸습니다. 발행 때 대표·본문 사진으로 들어갑니다.`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "업로드 실패");
              } finally {
                setUploading(false);
              }
            }}
          />
          {(form.imagePool || []).length ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, imagePool: [] }))}
              disabled={uploading || folderBusy}
            >
              사진 비우기
            </button>
          ) : null}
        </div>
        <div className="bulk-folder-row">
          <label>
            웹 폴더 주소
            <input
              value={form.imageFolderUrl || ""}
              onChange={(e) => setForm({ ...form, imageFolderUrl: e.target.value })}
              placeholder="https://image.example.com/pome"
              disabled={uploading || folderBusy}
            />
          </label>
          <button className="btn" type="button" onClick={() => void importFolder()} disabled={uploading || folderBusy}>
            {folderBusy ? "가져오는 중…" : "폴더에서 가져오기"}
          </button>
        </div>
        <p className="field-hint">
          올린 사진이 자유게시판 광고 글의 대표 이미지와 본문 사진으로 쓰입니다. 폴더는 확장자·번호를 적을 필요 없이
          주소만 넣으면, 목록이 열려 있거나 01.webp처럼 번호 파일이면 알아서 가져옵니다.
        </p>
        {(form.imagePool || []).length ? (
          <ul className="bulk-thumbs">
            {(form.imagePool || []).map((url) => (
              <li key={url}>
                <img src={url} alt="" />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      imagePool: (prev.imagePool || []).filter((item) => item !== url),
                    }))
                  }
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <label>추가 프롬프트 (실제 방문 후기)</label>
        <textarea
          value={form.extraPrompt || ""}
          onChange={(e) => setForm({ ...form, extraPrompt: e.target.value })}
          rows={5}
          placeholder="이 캠페인 글에 공통으로 넣습니다. 예: 직접 가서 본 메뉴, 대기, 맛, 주차, 다시 갈지 여부. 강조하고 싶은 안내도 여기에 적습니다."
        />
        <p className="field-hint">
          제미나이가 글을 쓸 때 이 내용을 함께 봅니다. 직접 가서 본 것을 적으면 그 메모로 후기글을 완성하고, 비워 두면
          없는 방문담은 만들지 않습니다.
        </p>

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
            <div>
              <b>순차 발행 사이트 (위부터 한 키워드씩)</b>
              <p className="field-hint" style={{ margin: "4px 0 0" }}>
                {sites.length}곳 중 {form.siteIds.length}곳 선택
              </p>
            </div>
            <div className="admin-actions" style={{ margin: 0 }}>
              <button className="btn btn-ghost" type="button" onClick={() => setSitesOpen((open) => !open)}>
                {sitesOpen ? "접기" : "펼치기"}
              </button>
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
          </div>
          {sites.length === 0 ? (
            <p className="field-hint">동의한 사이트가 없습니다. 사이트 대장에서 광고글 동의를 켜 주세요.</p>
          ) : (
            <div className={`hub-board-sites-body${sitesOpen ? " is-open" : ""}`}>
              {grouped.map(([apex, rows]) => (
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
              ))}
            </div>
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
