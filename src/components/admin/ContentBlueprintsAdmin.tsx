"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTitleWithHelp } from "@/components/admin/AdminHelpTip";
import type {
  CatalogStatus,
  ContentBlueprintStore,
} from "@/lib/content-blueprint-types";

const STATUS_OPTIONS: CatalogStatus[] = ["active", "draft", "disabled"];

function BlueprintHelpBody() {
  return (
    <>
      <p>
        <strong>이건 뭔가요?</strong> 업종별 <em>글 재료 풀</em>입니다. 고정 목차(템플릿)가 아니라, Planner가
        키워드마다 블록·앵글·페이지 유형을 골라 조합합니다. 허브(마스터)에서만 열립니다.
      </p>
      <p>
        <strong>Verified와 다른 점</strong> · Blueprint = “어떤 섹션을 쓸 수 있는지” 재료 목록 · Verified =
        “실제 업체·개체·사례 숫자/사실”. 둘 다 있어야 분양/철거 글이 Planner 경로로 잘 나갑니다.
      </p>
      <ol>
        <li>위 업종 탭에서 강아지분양 / 철거를 고릅니다.</li>
        <li>
          Blueprint 카드에서 상태를 바꿉니다.
          <br />
          <code>ACTIVE</code> = 대량발행 Planner가 사용 · <code>DRAFT</code>/<code>DISABLED</code> = 해당
          업종은 예전(Legacy) Gemini 경로로 떨어질 수 있음
        </li>
        <li>
          Content Blocks 표에서 블록별 상태를 바꿉니다.
          <br />
          Planner는 <code>ACTIVE</code> 블록만 고릅니다. <code>DRAFT</code>/<code>DISABLED</code>는 사실상
          미사용입니다.
        </li>
        <li>
          verified 열이 「필수」인 블록은 Verified 업체데이터가 있을 때만 글에 들어갑니다. 없으면 빼고,
          AI가 지어내지 않습니다.
        </li>
        <li>Page Types / Angles는 조회용입니다. (이 화면에서 상태 변경 불가)</li>
        <li>
          「시드로 초기화」는 강아지분양·철거 기본값으로 <em>전부 덮어씁니다</em>. 운영 중 상태 변경이
          사라지니 신중히 쓰세요.
        </li>
      </ol>
      <p>
        <strong>대량발행과의 연결</strong> · 키워드에 분양/견종·철거 표현이 있으면 업종이 자동 매칭됩니다 ·
        Blueprint가 ACTIVE이고 블록이 ACTIVE여야 Planner→Writer 경로를 탑니다 · 실패하면 Legacy로
        폴백합니다.
      </p>
    </>
  );
}

const STATUS_LABEL: Record<CatalogStatus, string> = {
  active: "ACTIVE",
  draft: "DRAFT",
  disabled: "DISABLED",
};

function statusBadgeClass(status: CatalogStatus) {
  if (status === "active") return "badge badge-on";
  if (status === "draft") return "badge badge-draft";
  return "badge badge-off";
}

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: CatalogStatus;
  disabled?: boolean;
  onChange: (status: CatalogStatus) => void;
}) {
  return (
    <select
      className="catalog-status-select"
      value={value}
      disabled={disabled}
      aria-label="상태 변경"
      onChange={(e) => onChange(e.target.value as CatalogStatus)}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}

export function ContentBlueprintsAdmin() {
  const [store, setStore] = useState<ContentBlueprintStore | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openIndustry, setOpenIndustry] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/ops/blueprints");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "불러오지 못했습니다.");
      return;
    }
    setStore(data.store as ContentBlueprintStore);
    const first = (data.store as ContentBlueprintStore)?.industries?.[0]?.id || "";
    setOpenIndustry((prev) => prev || first);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ops/blueprints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장 실패");
        return;
      }
      if (data.store) setStore(data.store as ContentBlueprintStore);
      else await load();
    } finally {
      setBusy(false);
    }
  }

  const industry = useMemo(
    () => store?.industries.find((row) => row.id === openIndustry) || store?.industries[0] || null,
    [store, openIndustry]
  );

  const blueprints = useMemo(
    () => (store && industry ? store.blueprints.filter((row) => row.industryId === industry.id) : []),
    [store, industry]
  );
  const blocks = useMemo(
    () => (store && industry ? store.blocks.filter((row) => row.industryId === industry.id) : []),
    [store, industry]
  );
  const pageTypes = useMemo(
    () => (store && industry ? store.pageTypes.filter((row) => row.industryId === industry.id) : []),
    [store, industry]
  );
  const angles = useMemo(
    () => (store && industry ? store.angles.filter((row) => row.industryId === industry.id) : []),
    [store, industry]
  );

  if (!store) {
    return (
      <div className="admin-stack">
        <div className="admin-card">
          <p className="admin-muted">{error || "Blueprint를 불러오는 중…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <AdminTitleWithHelp title="콘텐츠 Blueprint" helpTitle="콘텐츠 Blueprint 사용법">
              <BlueprintHelpBody />
            </AdminTitleWithHelp>
            <p className="admin-muted">
              고정 목차가 아니라 업종별 블록·앵글 재료 풀입니다. Planner가 키워드마다 조합합니다. 노란색 ?
              를 누르면 자세한 사용법이 나옵니다.
            </p>
          </div>
          <div className="admin-head-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void load()}>
              새로고침
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                if (!confirm("시드(강아지분양·철거)로 초기화할까요? 상태 변경이 사라집니다.")) return;
                void patch({ action: "resetSeed" });
              }}
            >
              시드로 초기화
            </button>
          </div>
        </div>
        <p className="admin-muted admin-meta-line">
          저장: 허브 Blob <code>infocs-content-blueprints.json</code> · Override {store.overrides.length}개
        </p>
        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-segment" role="tablist" aria-label="업종">
          {store.industries.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={row.id === industry?.id}
              className={row.id === industry?.id ? "is-active" : ""}
              onClick={() => setOpenIndustry(row.id)}
            >
              {row.name}
              <span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status]}</span>
            </button>
          ))}
        </div>
        {industry ? <p className="admin-muted">{industry.description}</p> : null}
      </div>

      {blueprints.map((bp) => (
        <div className="admin-card" key={bp.id}>
          <div className="admin-card-head">
            <div>
              <h2>
                {bp.name}{" "}
                <span className="admin-key">
                  <code>{bp.key}</code>
                </span>
              </h2>
              <p className="admin-muted">
                v{bp.version} · 블록 {bp.blockKeys.length} · 유형 {bp.pageTypeKeys.length} · 앵글{" "}
                {bp.angleKeys.length}
              </p>
            </div>
            <div className="admin-status-control">
              <span className={statusBadgeClass(bp.status)}>{STATUS_LABEL[bp.status]}</span>
              <StatusSelect
                value={bp.status}
                disabled={busy}
                onChange={(status) => void patch({ action: "setBlueprintStatus", blueprintId: bp.id, status })}
              />
            </div>
          </div>
          {bp.description ? <p className="admin-muted">{bp.description}</p> : null}
        </div>
      ))}

      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Content Blocks ({blocks.length})</h2>
            <p className="admin-muted">풀의 재료입니다. 페이지마다 전부 쓰이지 않습니다.</p>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table catalog-table">
            <thead>
              <tr>
                <th className="col-key">key</th>
                <th>이름 / 설명</th>
                <th className="col-flag">verified</th>
                <th className="col-status">상태</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((row) => (
                <tr key={row.id}>
                  <td data-label="key">
                    <code>{row.key}</code>
                  </td>
                  <td data-label="이름">
                    <div className="catalog-name">{row.name}</div>
                    {row.description ? <div className="admin-muted catalog-desc">{row.description}</div> : null}
                  </td>
                  <td data-label="verified">{row.verifiedDataRequired ? "필수" : "—"}</td>
                  <td data-label="상태" className="admin-table-actions">
                    <div className="admin-status-control">
                      <span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status]}</span>
                      <StatusSelect
                        value={row.status}
                        disabled={busy}
                        onChange={(status) => void patch({ action: "setBlockStatus", blockId: row.id, status })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!blocks.length ? (
                <tr>
                  <td colSpan={4} className="admin-muted">
                    블록 없음
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2>Page Types ({pageTypes.length})</h2>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table catalog-table">
            <thead>
              <tr>
                <th className="col-key">key</th>
                <th>이름 / 설명</th>
                <th className="col-status">상태</th>
              </tr>
            </thead>
            <tbody>
              {pageTypes.map((row) => (
                <tr key={row.id}>
                  <td data-label="key">
                    <code>{row.key}</code>
                  </td>
                  <td data-label="이름">
                    <div className="catalog-name">{row.name}</div>
                    {row.description ? <div className="admin-muted catalog-desc">{row.description}</div> : null}
                  </td>
                  <td data-label="상태" className="admin-table-actions">
                    <span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2>Content Angles ({angles.length})</h2>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table catalog-table">
            <thead>
              <tr>
                <th className="col-key">key</th>
                <th>이름 / 설명</th>
                <th className="col-status">상태</th>
              </tr>
            </thead>
            <tbody>
              {angles.map((row) => (
                <tr key={row.id}>
                  <td data-label="key">
                    <code>{row.key}</code>
                  </td>
                  <td data-label="이름">
                    <div className="catalog-name">{row.name}</div>
                    {row.description ? <div className="admin-muted catalog-desc">{row.description}</div> : null}
                  </td>
                  <td data-label="상태" className="admin-table-actions">
                    <span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
