"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTitleWithHelp } from "@/components/admin/AdminHelpTip";
import type { QaResult } from "@/lib/qa-types";

type AngleDist = { angle: string; count: number };

function severityClass(severity: string) {
  if (severity === "PASS") return "badge badge-on";
  if (severity === "WARN") return "badge badge-draft";
  return "badge badge-off";
}

function ContentQaHelpBody() {
  return (
    <>
      <p>
        <strong>이건 뭔가요?</strong> 대량발행과 <em>같은</em> 생성 파이프라인을 돌리되,{" "}
        <em>사이트에 글을 발행하지 않는</em> 미리보기·품질 검사 화면입니다. AI 점수(82점 등)는 없고
        PASS / WARN / FAIL만 봅니다.
      </p>
      <p>
        <strong>쓰는 순서</strong> · 키워드 입력 → 아래 버튼 중 하나 클릭 → 수 분 대기 → 아래 목록에서
        결과 선택 → PLAN / FINAL 탭으로 확인.
      </p>
      <ol>
        <li>
          <strong>Planner Preview</strong>
          <br />
          지금 대량발행이 쓰는 새 경로입니다. Blueprint + Verified를 보고 Planner→Writer로 글을
          만듭니다. 「이 키워드면 새 파이프라인이 어떻게 나오는지」 볼 때 씁니다.
        </li>
        <li>
          <strong>Legacy Preview</strong>
          <br />
          예전 단일 Gemini 글쓰기 경로입니다. Blueprint/Verified 조합 없이 한 번에 씁니다. 예전
          품질과 비교하거나, Planner가 실패할 때 폴백되는 쪽을 확인할 때 씁니다.
        </li>
        <li>
          <strong>Legacy vs Planner 비교</strong>
          <br />
          같은 키워드로 Legacy와 Planner를 <em>둘 다</em> 돌린 뒤 나란히 보여 줍니다. Gemini 호출이
          두 배라서 시간이·비용이 더 듭니다. 본격 비교할 때만 쓰세요.
        </li>
        <li>
          <strong>Verified 업체</strong>
          <br />
          「광고업체정보설정」+「Verified 업체데이터」에 넣은 업체를 고르면 store_information /
          visit_information / available_animals 등이 실제 랜딩에 붙습니다. 비우면 breed_guide처럼 품종
          안내만 나올 수 있습니다.
        </li>
      </ol>
      <p>
        <strong>아래 화면</strong> · <em>Angle 분포</em>는 최근 QA에서 어떤 앵글이 많이 나왔는지
        관측용 · 목록 행을 클릭하면 상세 · <em>PLAN</em>은 섹션 계획·검사 코드 · <em>FINAL</em>은
        완성 HTML 미리보기입니다.
      </p>
      <p>
        <strong>주의</strong> · 발행·사이트맵·IndexNow에 영향 없음 · API 키·비용은 대량발행과 동일하게
        소모 · Verified/Blueprint가 비어 있으면 Planner 결과가 약하거나 Legacy로 보일 수 있음 ·
        비교 버튼은 호출 2회분입니다.
      </p>
    </>
  );
}

export function ContentQaAdmin() {
  const [keyword, setKeyword] = useState("배곧포메라니안분양");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<QaResult[]>([]);
  const [angleDist, setAngleDist] = useState<AngleDist[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [compareLegacy, setCompareLegacy] = useState<QaResult | null>(null);
  const [comparePlanner, setComparePlanner] = useState<QaResult | null>(null);
  const [view, setView] = useState<"plan" | "final">("final");

  const load = useCallback(async () => {
    const [qaRes, vRes] = await Promise.all([fetch("/api/admin/content-qa"), fetch("/api/ad-vendors")]);
    const data = await qaRes.json().catch(() => ({}));
    const vData = await vRes.json().catch(() => ({}));
    if (!qaRes.ok) {
      setError(data.error || "불러오기 실패");
      return;
    }
    setResults(data.store?.results || []);
    setAngleDist(data.angleDist || []);
    if (vRes.ok) {
      const list = ((vData.vendors || []) as Array<{ id: string; name: string }>).map((v) => ({
        id: v.id,
        name: v.name,
      }));
      setVendors(list);
      setVendorId((prev) => prev || list[0]?.id || "");
    }
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
        body: JSON.stringify({
          action,
          keyword,
          vendorId: vendorId || undefined,
          industryId: "ind-dog-adoption",
        }),
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
            <AdminTitleWithHelp title="콘텐츠 QA / Preview" helpTitle="콘텐츠 QA / Preview 사용법">
              <ContentQaHelpBody />
            </AdminTitleWithHelp>
            <p className="admin-muted">
              발행하지 않고 Planner→Writer 또는 Legacy 결과를 생성·비교합니다. 노란색 ? 를 누르면 버튼별
              사용법이 나옵니다.
            </p>
          </div>
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
        <div className="admin-form">
          <label>
            키워드
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </label>
          <label>
            Verified 업체 (AdVendor)
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">연결 없음</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <p className="admin-muted">
            업체를 고르면 VendorProfile·available 개체가 Planner의 availableVerifiedBlocks에 반영됩니다. 프로필·개체는
            「Verified 업체데이터」에서 입력하세요.
          </p>
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
