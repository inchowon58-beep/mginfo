"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QaResult } from "@/lib/qa-types";

type AngleDist = { angle: string; count: number };

function severityClass(severity: string) {
  if (severity === "PASS") return "badge badge-on";
  if (severity === "WARN") return "badge badge-draft";
  return "badge badge-off";
}

export function ContentQaAdmin() {
  const [keyword, setKeyword] = useState("배곧포메라니안분양");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<QaResult[]>([]);
  const [angleDist, setAngleDist] = useState<AngleDist[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [compareLegacy, setCompareLegacy] = useState<QaResult | null>(null);
  const [comparePlanner, setComparePlanner] = useState<QaResult | null>(null);
  const [view, setView] = useState<"plan" | "final">("final");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/content-qa");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "불러오기 실패");
      return;
    }
    setResults(data.store?.results || []);
    setAngleDist(data.angleDist || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => results.find((r) => r.id === selectedId) || results[0] || null,
    [results, selectedId]
  );

  async function run(action: "planner" | "legacy" | "compare") {
    setBusy(true);
    setError("");
    setCompareLegacy(null);
    setComparePlanner(null);
    try {
      const res = await fetch("/api/admin/content-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, keyword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "생성 실패");
        return;
      }
      if (action === "compare") {
        setCompareLegacy(data.legacy);
        setComparePlanner(data.planner);
        setSelectedId(data.planner?.id || "");
      } else if (data.result?.id) {
        setSelectedId(data.result.id);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>콘텐츠 QA / Preview</h2>
            <p className="admin-muted">
              발행하지 않고 Planner→Writer 또는 Legacy 결과를 생성·비교합니다. PASS/WARN/FAIL만 표시합니다.
            </p>
          </div>
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
        <div className="admin-form">
          <label>
            키워드
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </label>
          <div className="admin-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !keyword.trim()}
              onClick={() => void run("planner")}
            >
              Planner Preview
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !keyword.trim()}
              onClick={() => void run("legacy")}
            >
              Legacy Preview
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !keyword.trim()}
              onClick={() => void run("compare")}
            >
              Legacy vs Planner 비교
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void load()}>
              새로고침
            </button>
          </div>
          {busy ? <p className="admin-muted">생성 중… (최대 수 분)</p> : null}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2>최근 Angle 분포</h2>
        </div>
        {angleDist.length ? (
          <div className="admin-chip-row">
            {angleDist.map((row) => (
              <span key={row.angle} className="admin-chip">
                {row.angle} <b>{row.count}</b>
              </span>
            ))}
          </div>
        ) : (
          <p className="admin-muted">아직 QA 결과 없음</p>
        )}
      </div>

      {compareLegacy && comparePlanner ? (
        <div className="admin-card">
          <div className="admin-card-head">
            <h2>비교 · {keyword}</h2>
          </div>
          <div className="qa-compare-grid">
            <div className="qa-compare-pane">
              <h3>
                Legacy ({compareLegacy.plannerCalls || 0}+{compareLegacy.writerCalls || 1} calls)
              </h3>
              <p className="catalog-name">{compareLegacy.title}</p>
              <div
                className="qa-preview-html"
                dangerouslySetInnerHTML={{ __html: compareLegacy.bodyHtml.slice(0, 4000) }}
              />
            </div>
            <div className="qa-compare-pane">
              <h3>
                Planner ({comparePlanner.plannerCalls}/{comparePlanner.writerCalls}) ·{" "}
                {comparePlanner.generationMode}
              </h3>
              <p className="catalog-name">{comparePlanner.title}</p>
              <Checks checks={comparePlanner.qualityChecks} />
              <div
                className="qa-preview-html"
                dangerouslySetInnerHTML={{ __html: comparePlanner.bodyHtml.slice(0, 4000) }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-card">
        <div className="admin-card-head">
          <h2>QA 결과 목록</h2>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table catalog-table">
            <thead>
              <tr>
                <th className="col-flag">mode</th>
                <th>키워드</th>
                <th>제목</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 30).map((row) => (
                <tr
                  key={row.id}
                  className={`is-clickable${selected?.id === row.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td data-label="mode">
                    <code>{row.mode}</code>
                  </td>
                  <td data-label="키워드">{row.keyword}</td>
                  <td data-label="제목">{row.title.slice(0, 60)}</td>
                </tr>
              ))}
              {!results.length ? (
                <tr>
                  <td colSpan={3} className="admin-muted">
                    결과 없음
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="admin-card">
          <div className="admin-card-head">
            <h2>미리보기</h2>
            <div className="admin-segment" role="tablist" aria-label="뷰 전환">
              <button
                type="button"
                role="tab"
                aria-selected={view === "plan"}
                className={view === "plan" ? "is-active" : ""}
                onClick={() => setView("plan")}
              >
                PLAN
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "final"}
                className={view === "final" ? "is-active" : ""}
                onClick={() => setView("final")}
              >
                FINAL
              </button>
            </div>
          </div>
          {view === "plan" ? <PlanView row={selected} /> : <FinalView row={selected} />}
        </div>
      ) : null}
    </div>
  );
}

function Checks({ checks }: { checks?: QaResult["qualityChecks"] }) {
  if (!checks?.length) return <p className="admin-muted">검사 결과 없음</p>;
  return (
    <ul className="qa-check-list">
      {checks.map((c, i) => (
        <li key={`${c.code}-${i}`}>
          <span className={severityClass(c.severity)}>{c.severity}</span>
          <code>{c.code}</code>
          <span>{c.message}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanView({ row }: { row: QaResult }) {
  return (
    <div className="qa-detail">
      <p className="admin-muted">
        keyword: {row.keyword} · pageType: {row.pageType || "-"} · angle: {row.contentAngle || "-"} · mode:{" "}
        {row.generationMode}
      </p>
      <p className="admin-muted">
        pipeline: {row.pipelineVersion} · plannerPrompt: {row.plannerPromptVersion} · writerPrompt:{" "}
        {row.writerPromptVersion}
      </p>
      <p className="admin-muted">
        calls P/W: {row.plannerCalls}/{row.writerCalls} · tokens P/W:{" "}
        {row.plannerTokens?.totalTokens ?? "null"}/{row.writerTokens?.totalTokens ?? "null"}
      </p>
      {row.searchIntent ? <pre className="qa-json">{JSON.stringify(row.searchIntent, null, 2)}</pre> : null}
      {row.contentStrategy ? (
        <pre className="qa-json">{JSON.stringify(row.contentStrategy, null, 2)}</pre>
      ) : null}
      <h3>Sections</h3>
      <ol className="qa-section-list">
        {(row.sections || []).map((s) => (
          <li key={s.blockKey}>
            <code>{s.blockKey}</code> — {s.heading}
            <div className="admin-muted">purpose: {s.purpose}</div>
          </li>
        ))}
      </ol>
      <h3>Verified availability</h3>
      <p className="admin-muted">{(row.verifiedBlocksAvailable || []).join(", ") || "(없음)"}</p>
      <h3>Checks</h3>
      <Checks checks={row.qualityChecks} />
    </div>
  );
}

function FinalView({ row }: { row: QaResult }) {
  return (
    <div className="qa-detail">
      <Checks checks={row.qualityChecks} />
      <p className="admin-muted">
        verified rendered: {(row.verifiedBlocksRendered || []).join(", ") || "(없음)"} · bodyLength:{" "}
        {row.bodyLength}
      </p>
      <h3 className="qa-final-title">{row.title}</h3>
      {row.metaDescription || row.excerpt ? (
        <p className="admin-muted">{row.metaDescription || row.excerpt}</p>
      ) : null}
      <article className="qa-preview-html" dangerouslySetInnerHTML={{ __html: row.bodyHtml }} />
      {row.faqItems?.length ? (
        <div>
          <h3>FAQ</h3>
          <ul className="qa-section-list">
            {row.faqItems.map((f, i) => (
              <li key={i}>
                <strong>{f.question}</strong>
                <div className="admin-muted">{f.answer}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
