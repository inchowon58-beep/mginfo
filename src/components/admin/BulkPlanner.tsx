"use client";

import { useEffect, useMemo, useState } from "react";
import { ARTICLE_STYLE_OPTIONS, type ArticleStyleChoice } from "@/lib/article-style";
import { parseKeywordList } from "@/lib/bulk-keywords";
import { mergeImageUrls } from "@/lib/image-pool";
import { uid } from "@/lib/slug";
import type { BulkGroup, BulkPublishState, BulkSchedule, Category } from "@/lib/types";

type Stats = {
  total: number;
  published: number;
  failed: number;
  queued: number;
  scheduled: number;
  remaining: number;
  percent: number;
  daysLeft: number;
  dailyCapacity: number;
  todayScheduled: number;
  todayPublished: number;
  enabled: boolean;
  startHour: number;
  endHour: number;
  groups: {
    id: string;
    name: string;
    vendorName?: string;
    dailyLimit: number;
    total: number;
    done: number;
    remaining: number;
    percent: number;
  }[];
};

type GroupDraft = BulkGroup & { text: string };

function emptyGroup(category: string): GroupDraft {
  return {
    id: uid(),
    category,
    dailyLimit: 3,
    vendorName: "",
    vendorPhone: "",
    vendorWebsite: "",
    vendorKakao: "",
    writingStyle: "random" as ArticleStyleChoice,
    imagePool: [],
    imageCountMin: 1,
    imageCountMax: 3,
    keywords: [],
    text: "",
  };
}

const HOURS = Array.from({ length: 23 }, (_, i) => i + 1);

export function BulkPlanner({
  initialBulk,
  initialStats,
  categories,
}: {
  initialBulk: BulkPublishState;
  initialStats: Stats;
  categories: Category[];
}) {
  const [schedule, setSchedule] = useState<BulkSchedule>(initialBulk.schedule);
  const [groups, setGroups] = useState<GroupDraft[]>(
    initialBulk.groups.length
      ? initialBulk.groups.map((g) => ({ ...g, text: "" }))
      : [emptyGroup(categories[0]?.slug || "life")]
  );
  const [stats, setStats] = useState(initialStats);
  const [busy, setBusy] = useState(false);
  const [tickBusy, setTickBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const previewAdd = useMemo(
    () => groups.reduce((sum, group) => sum + parseKeywordList(group.text).length, 0),
    [groups]
  );

  async function save(nextGroups = groups, nextSchedule = schedule, resetPlan = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetPlan,
          schedule: {
            enabled: nextSchedule.enabled,
            startHour: nextSchedule.startHour,
            endHour: 23,
          },
          groups: nextGroups.map((group) => ({
            id: group.id,
            category: group.category,
            dailyLimit: group.dailyLimit,
            vendorName: group.vendorName,
            vendorPhone: group.vendorPhone,
            vendorWebsite: group.vendorWebsite,
            vendorKakao: group.vendorKakao,
            writingStyle: group.writingStyle || "random",
            imagePool: group.imagePool || [],
            imageCountMin: group.imageCountMin || 1,
            imageCountMax: group.imageCountMax || 3,
            keywords: group.keywords,
            text: group.text,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setSchedule(data.bulk.schedule);
      setGroups(data.bulk.groups.map((g: BulkGroup) => ({ ...g, text: "" })));
      setStats(data.stats);
      setMessage("예약 목록을 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function runTick() {
    setTickBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/cron/bulk-publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실행 실패");
      if (data.stats) setStats(data.stats);
      if (data.skipped) {
        setMessage("매일 자동발행이 꺼져 있습니다. 스케줄에서 켜 주세요.");
        return;
      }
      const done = (data.results || []).filter((row: { ok: boolean }) => row.ok).length;
      const fail = (data.results || []).filter((row: { ok: boolean }) => !row.ok).length;
      setMessage(
        data.processed
          ? `대기 발행 ${data.processed}건 처리 · 성공 ${done} · 실패 ${fail}`
          : "지금은 발행 시각이 된 키워드가 없습니다. 오늘 분량이 예약되어 있으면 시간이 되면 나갑니다."
      );
      const fresh = await fetch("/api/admin/bulk");
      const body = await fresh.json();
      if (fresh.ok) {
        setGroups(body.bulk.groups.map((g: BulkGroup) => ({ ...g, text: "" })));
        setStats(body.stats);
        setSchedule(body.bulk.schedule);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setTickBusy(false);
    }
  }

  function updateGroup(id: string, patch: Partial<GroupDraft>) {
    setGroups((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function onFile(id: string, file?: File) {
    if (!file) return;
    const text = await file.text();
    const extra = parseKeywordList(text).join("\n");
    updateGroup(id, {
      text: [groups.find((row) => row.id === id)?.text, extra].filter(Boolean).join("\n"),
    });
  }

  function removeKeyword(groupId: string, keywordId: string) {
    setGroups((rows) =>
      rows.map((row) =>
        row.id === groupId
          ? { ...row, keywords: row.keywords.filter((item) => item.id !== keywordId) }
          : row
      )
    );
  }

  function retryFailed(groupId: string) {
    const next = groups.map((row) =>
      row.id === groupId
        ? {
            ...row,
            keywords: row.keywords.map((item) =>
              item.status === "failed" ? { ...item, status: "queued" as const, error: undefined } : item
            ),
          }
        : row
    );
    setGroups(next);
    save(next, schedule);
  }

  useEffect(() => {
    if (!schedule.enabled) return;
    const timer = window.setInterval(() => {
      fetch("/api/cron/bulk-publish", { method: "POST" }).catch(() => undefined);
    }, 4 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [schedule.enabled]);

  return (
    <div className="bulk-page">
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>스케줄 설정</h2>
            <p className="field-hint" style={{ marginTop: 6 }}>
              켜 두면 시작시간~밤 11시 사이에 오늘 분량을 시간 간격을 두고 발행합니다.
            </p>
          </div>
        </div>
        <div className="bulk-schedule admin-form">
          <div className="bulk-schedule-row">
            <label className="bulk-check">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(e) => setSchedule((s) => ({ ...s, enabled: e.target.checked }))}
              />
              매일 자동발행
            </label>
            <label>
              자동발행 시작시간
              <select
                value={schedule.startHour}
                onChange={(e) => setSchedule((s) => ({ ...s, startHour: Number(e.target.value) }))}
              >
                {HOURS.filter((h) => h < 23).map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-hint">종료는 밤 11시입니다. 오늘 총발행량을 나눠 랜덤 간격으로 올립니다.</p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-primary" type="button" onClick={() => save(groups, schedule, true)} disabled={busy}>
            {busy ? "저장 중…" : "스케줄 저장"}
          </button>
          <button className="btn" type="button" onClick={runTick} disabled={tickBusy}>
            {tickBusy ? "확인 중…" : "지금 대기분 처리"}
          </button>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>카테고리별 키워드</h2>
            <p className="field-hint" style={{ marginTop: 6 }}>
              같은 카테고리를 여러 칸으로 넣어도 됩니다. 칸마다 업체만 다르게 두면 그 키워드 글에 그 업체가 붙습니다.
              키워드는 한 줄에 하나, 또는 쉼표로 구분합니다. txt 불러오기도 같습니다.
              {previewAdd ? ` · 저장 시 ${previewAdd}개 추가` : ""}
            </p>
          </div>
          <button
            className="btn"
            type="button"
            onClick={() => setGroups((rows) => [...rows, emptyGroup(categories[0]?.slug || "life")])}
          >
            예약 칸 추가
          </button>
        </div>

        <div className="bulk-groups">
          {groups.map((group, index) => (
            <article key={group.id} className="bulk-group admin-form">
              <header>
                <strong>
                  예약 {index + 1}
                  {group.vendorName ? ` · ${group.vendorName}` : ""}
                </strong>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setGroups((rows) => rows.filter((row) => row.id !== group.id))}
                  disabled={groups.length <= 1}
                >
                  삭제
                </button>
              </header>
              <div className="bulk-group-grid">
                <label>
                  카테고리
                  <select
                    value={group.category}
                    onChange={(e) => updateGroup(group.id, { category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  하루발행수량
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={group.dailyLimit}
                    onChange={(e) => updateGroup(group.id, { dailyLimit: Number(e.target.value) || 1 })}
                  />
                </label>
                <label>
                  글방향
                  <select
                    value={group.writingStyle || "random"}
                    onChange={(e) => updateGroup(group.id, { writingStyle: e.target.value })}
                  >
                    {ARTICLE_STYLE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="bulk-vendor-grid">
                <label>
                  업체명
                  <input
                    value={group.vendorName || ""}
                    onChange={(e) => updateGroup(group.id, { vendorName: e.target.value })}
                    placeholder="이 칸 키워드에만 붙습니다"
                  />
                </label>
                <label>
                  전화번호
                  <input
                    value={group.vendorPhone || ""}
                    onChange={(e) => updateGroup(group.id, { vendorPhone: e.target.value })}
                    placeholder="032-000-0000"
                  />
                </label>
                <label>
                  홈페이지
                  <input
                    value={group.vendorWebsite || ""}
                    onChange={(e) => updateGroup(group.id, { vendorWebsite: e.target.value })}
                    placeholder="https://"
                  />
                </label>
                <label>
                  카카오톡
                  <input
                    value={group.vendorKakao || ""}
                    onChange={(e) => updateGroup(group.id, { vendorKakao: e.target.value })}
                    placeholder="https://pf.kakao.com/"
                  />
                </label>
              </div>
              <GroupImagePool
                urls={group.imagePool || []}
                minCount={group.imageCountMin || 1}
                maxCount={group.imageCountMax || 3}
                onChange={(patch) => updateGroup(group.id, patch)}
              />
              <label>
                키워드 작성
                <textarea
                  rows={6}
                  value={group.text}
                  onChange={(e) => updateGroup(group.id, { text: e.target.value })}
                  placeholder={"부천강아지분양\n인천고양이분양\n수원애견분양"}
                />
              </label>
              <label className="bulk-file">
                키워드 불러오기 (txt)
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={(e) => onFile(group.id, e.target.files?.[0])}
                />
              </label>
              <p className="field-hint">
                대기 {group.keywords.filter((k) => k.status === "queued" || k.status === "scheduled").length} · 발행{" "}
                {group.keywords.filter((k) => k.status === "published").length} · 실패{" "}
                {group.keywords.filter((k) => k.status === "failed").length}
              </p>
              {group.keywords.length ? (
                <ul className="bulk-keys">
                  {group.keywords.map((item) => (
                    <li key={item.id} className={`is-${item.status}`}>
                      <b>{item.keyword}</b>
                      <span>{statusLabel(item.status)}</span>
                      {item.status !== "published" && item.status !== "processing" ? (
                        <button type="button" onClick={() => removeKeyword(group.id, item.id)}>
                          빼기
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {group.keywords.some((item) => item.status === "failed") ? (
                <button className="btn" type="button" onClick={() => retryFailed(group.id)}>
                  실패분 다시 대기
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <div className="admin-actions">
          <button className="btn btn-primary" type="button" onClick={() => save()} disabled={busy}>
            {busy ? "저장 중…" : "키워드 저장"}
          </button>
        </div>
        {error ? <p className="notice">{error}</p> : null}
        {message ? <p className="notice ok">{message}</p> : null}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>예약 현황</h2>
        </div>
        <BulkProgress stats={stats} />
      </section>
    </div>
  );
}

function GroupImagePool({
  urls,
  minCount,
  maxCount,
  onChange,
}: {
  urls: string[];
  minCount: number;
  maxCount: number;
  onChange: (patch: { imagePool?: string[]; imageCountMin?: number; imageCountMax?: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [folderBase, setFolderBase] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (let i = 0; i < list.length; i += 1) {
        setProgress(`${i + 1}/${list.length}`);
        const form = new FormData();
        form.append("file", list[i]);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "업로드 실패");
        if (data.url) added.push(String(data.url));
      }
      onChange({ imagePool: mergeImageUrls(urls, added) });
    } catch (err) {
      if (added.length) onChange({ imagePool: mergeImageUrls(urls, added) });
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function importFolder() {
    if (!folderBase.trim()) {
      alert("웹 폴더 주소를 넣으세요.");
      return;
    }
    setBusy(true);
    setProgress("폴더 확인 중");
    try {
      const res = await fetch("/api/admin/bulk/folder-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: folderBase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "폴더를 읽지 못했습니다.");
      onChange({ imagePool: mergeImageUrls(urls, data.urls || []) });
    } catch (err) {
      alert(err instanceof Error ? err.message : "폴더를 읽지 못했습니다.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function setRange(nextMin: number, nextMax: number) {
    const max = Math.max(1, Math.min(7, nextMax));
    const min = Math.max(1, Math.min(max, nextMin));
    onChange({ imageCountMin: min, imageCountMax: max });
  }

  return (
    <div className="bulk-images">
      <div className="bulk-group-grid">
        <label>
          랜덤 최소
          <input
            type="number"
            min={1}
            max={7}
            value={minCount}
            onChange={(e) => setRange(Number(e.target.value) || 1, maxCount)}
          />
        </label>
        <label>
          랜덤 최대
          <input
            type="number"
            min={1}
            max={7}
            value={maxCount}
            onChange={(e) => setRange(minCount, Number(e.target.value) || 1)}
          />
        </label>
        <p className="field-hint bulk-image-hint">
          글마다 {minCount}~{maxCount}장 사이 무작위로 붙입니다. 등록 사진이 더 적으면 있는 장수만 씁니다. 지금 {urls.length}장.
        </p>
      </div>
      <div className="cover-upload">
        <label className="btn btn-ghost cover-file-btn">
          {busy && progress.includes("/") ? `올리는 중 ${progress}` : "사진 올리기"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={busy}
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              if (files?.length) void uploadFiles(files);
            }}
          />
        </label>
        <label className="btn btn-ghost cover-file-btn">
          {busy ? "처리 중…" : "폴더 올리기"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            {...{ webkitdirectory: "", directory: "" }}
            disabled={busy}
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              if (files?.length) void uploadFiles(files);
            }}
          />
        </label>
        {urls.length ? (
          <button className="btn btn-ghost" type="button" onClick={() => onChange({ imagePool: [] })}>
            사진 비우기
          </button>
        ) : null}
      </div>
      <div className="bulk-folder-row">
        <label>
          웹 폴더 주소
          <input
            value={folderBase}
            onChange={(e) => setFolderBase(e.target.value)}
            placeholder="https://image.example.com/pome"
            disabled={busy}
          />
        </label>
        <button className="btn" type="button" onClick={() => void importFolder()} disabled={busy}>
          {busy && progress === "폴더 확인 중" ? "가져오는 중…" : "폴더에서 가져오기"}
        </button>
      </div>
      <p className="field-hint">
        확장자·번호를 적을 필요 없습니다. 주소만 넣으면 목록이 열려 있거나 01.webp처럼 번호 파일이면 알아서 가져옵니다.
      </p>
      {urls.length ? (
        <ul className="bulk-thumbs">
          {urls.map((url) => (
            <li key={url}>
              <img src={url} alt="" />
              <button type="button" onClick={() => onChange({ imagePool: urls.filter((item) => item !== url) })}>
                빼기
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "published") return "발행";
  if (status === "scheduled") return "오늘예약";
  if (status === "processing") return "작성중";
  if (status === "failed") return "실패";
  return "대기";
}

export function BulkProgress({ stats }: { stats: Stats }) {
  return (
    <div className="bulk-progress">
      <div className="bulk-progress-head">
        <div>
          <span>완료 현황</span>
          <b>
            {stats.published} / {stats.total || 0}
          </b>
        </div>
        <em>{stats.percent}%</em>
      </div>
      <i className="admin-meter" aria-hidden="true">
        <i style={{ width: `${stats.percent}%` }} />
      </i>
      <div className="bulk-progress-meta">
        <span>남은 키워드 {stats.remaining}개</span>
        <span>
          {stats.dailyCapacity > 0
            ? `앞으로 약 ${stats.daysLeft}일`
            : stats.remaining
              ? "하루발행수량을 저장하세요"
              : "예약 없음"}
        </span>
        <span>
          오늘 {stats.todayPublished}/{stats.todayScheduled || stats.dailyCapacity}편
        </span>
      </div>
      {stats.groups.length ? (
        <div className="bulk-cat-bars">
          {stats.groups.map((group) => (
            <div key={group.id}>
              <div className="bulk-cat-label">
                <b>
                  {group.name}
                  {group.vendorName ? ` · ${group.vendorName}` : ""}
                </b>
                <span>
                  {group.done}/{group.total} · 하루 {group.dailyLimit}편
                </span>
              </div>
              <i className="admin-meter" aria-hidden="true">
                <i style={{ width: `${group.percent}%` }} />
              </i>
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-empty">아직 예약한 키가 없습니다.</p>
      )}
    </div>
  );
}
