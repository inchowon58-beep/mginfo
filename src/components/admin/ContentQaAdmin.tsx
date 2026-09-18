"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QaResult } from "@/lib/qa-types";

type AngleDist = { angle: string; count: number };

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
        <h2>콘텐츠 QA / Preview</h2>
        <p className="hint">
          발행하지 않고 Planner→Writer 또는 Legacy 결과를 생성·비교합니다. PASS/WARN/FAIL만 표시하며 AI 점수(82점 등)는
          없습니다.
        </p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          키워드
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <div className="admin-inline-actions">
          <button type="button" className="gold" disabled={busy || !keyword.trim()} onClick={() => void run("planner")}>
            Planner Preview
          </button>
          <button type="button" className="ghost" disabled={busy || !keyword.trim()} onClick={() => void run("legacy")}>
            Legacy Preview
          </button>
          <button type="button" className="ghost" disabled={busy || !keyword.trim()} onClick={() => void run("compare")}>
            Legacy vs Planner 비교
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => void load()}>
            새로고침
          </button>
        </div>
        {busy ? <p className="hint">생성 중… (최대 수 분)</p> : null}
      </div>

      <div className="admin-card">
        <h3>최근 Angle 분포 (관측용)</h3>
        <ul className="hint">
          {angleDist.map((row) => (
            <li key={row.angle}>
              {row.angle}: {row.count}
            </li>
          ))}
          {!angleDist.length ? <li>아직 QA 결과 없음</li> : null}
        </ul>
      </div>

      {compareLegacy && comparePlanner ? (
        <div className="admin-card">
          <h3>비교 · {keyword}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <h4>Legacy ({compareLegacy.plannerCalls || 0}+{compareLegacy.writerCalls || 1} calls)</h4>
              <p>
                <strong>{compareLegacy.title}</strong>
              </p>
              <div dangerouslySetInnerHTML={{ __html: compareLegacy.bodyHtml.slice(0, 4000) }} />
            </div>
            <div>
              <h4>
                Planner ({comparePlanner.plannerCalls}/{comparePlanner.writerCalls}) ·{" "}
                {comparePlanner.generationMode}
              </h4>
              <p>
                <strong>{comparePlanner.title}</strong>
              </p>
              <Checks checks={comparePlanner.qualityChecks} />
              <div dangerouslySetInnerHTML={{ __html: comparePlanner.bodyHtml.slice(0, 4000) }} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-card">
        <h3>QA 결과 목록</h3>
        <ul className="hint">
          {results.slice(0, 30).map((row) => (
            <li key={row.id}>
              <button type="button" className="linkish" onClick={() => setSelectedId(row.id)}>
                [{row.mode}] {row.keyword} — {row.title.slice(0, 40)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <div className="admin-card">
          <div className="admin-inline-actions">
            <button type="button" className={view === "plan" ? "gold" : "ghost"} onClick={() => setView("plan")}>
              PLAN VIEW
            </button>
            <button type="button" className={view === "final" ? "gold" : "ghost"} onClick={() => setView("final")}>
              FINAL PAGE VIEW
            </button>
          </div>
          {view === "plan" ? <PlanView row={selected} /> : <FinalView row={selected} />}
        </div>
      ) : null}
    </div>
  );
}

function Checks({ checks }: { checks?: QaResult["qualityChecks"] }) {
  if (!checks?.length) return <p className="hint">검사 결과 없음</p>;
  return (
    <ul className="hint">
      {checks.map((c, i) => (
        <li key={`${c.code}-${i}`}>
          <code>{c.code}</code> <strong>{c.severity}</strong> — {c.message}
        </li>
      ))}
    </ul>
  );
}

function PlanView({ row }: { row: QaResult }) {
  return (
    <div>
      <h3>Plan View</h3>
      <p className="hint">
        keyword: {row.keyword} · pageType: {row.pageType || "-"} · angle: {row.contentAngle || "-"} · mode:{" "}
        {row.generationMode}
      </p>
      <p className="hint">
        pipeline: {row.pipelineVersion} · plannerPrompt: {row.plannerPromptVersion} · writerPrompt:{" "}
        {row.writerPromptVersion}
      </p>
      <p className="hint">
        calls P/W: {row.plannerCalls}/{row.writerCalls} · tokens P/W:{" "}
        {row.plannerTokens?.totalTokens ?? "null"}/{row.writerTokens?.totalTokens ?? "null"}
      </p>
      {row.searchIntent ? (
        <pre className="hint">{JSON.stringify(row.searchIntent, null, 2)}</pre>
      ) : null}
      {row.contentStrategy ? (
        <pre className="hint">{JSON.stringify(row.contentStrategy, null, 2)}</pre>
      ) : null}
      <h4>Sections</h4>
      <ol className="hint">
        {(row.sections || []).map((s) => (
          <li key={s.blockKey}>
            <code>{s.blockKey}</code> — {s.heading}
            <br />
            purpose: {s.purpose}
          </li>
        ))}
      </ol>
      <h4>Verified availability</h4>
      <p className="hint">{(row.verifiedBlocksAvailable || []).join(", ") || "(없음)"}</p>
      <h4>Checks</h4>
      <Checks checks={row.qualityChecks} />
    </div>
  );
}

function FinalView({ row }: { row: QaResult }) {
  return (
    <div>
      <h3>Final Page View</h3>
      <Checks checks={row.qualityChecks} />
      <p className="hint">
        verified rendered: {(row.verifiedBlocksRendered || []).join(", ") || "(없음)"} · bodyLength: {row.bodyLength}
      </p>
      <h1 style={{ fontSize: "1.4rem" }}>{row.title}</h1>
      {row.metaDescription || row.excerpt ? <p className="hint">{row.metaDescription || row.excerpt}</p> : null}
      <article dangerouslySetInnerHTML={{ __html: row.bodyHtml }} />
      {row.faqItems?.length ? (
        <div>
          <h4>FAQ</h4>
          <ul>
            {row.faqItems.map((f, i) => (
              <li key={i}>
                <strong>{f.question}</strong>
                <br />
                {f.answer}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
