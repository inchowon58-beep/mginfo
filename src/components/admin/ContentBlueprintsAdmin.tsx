"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CatalogStatus,
  ContentBlueprintStore,
} from "@/lib/content-blueprint-types";

const STATUS_LABEL: Record<CatalogStatus, string> = {
  active: "ACTIVE",
  draft: "DRAFT",
  disabled: "DISABLED",
};

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
      <div className="admin-card">
        <p>{error || "Blueprint를 불러오는 중…"}</p>
      </div>
    );
  }

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <h2>콘텐츠 Blueprint (허브 공용)</h2>
        <p className="hint">
          Blueprint는 고정 목차가 아니라 <strong>업종별 블록·앵글 재료 풀</strong>입니다. 실제 페이지
          구조는 이후 Planner가 키워드마다 고릅니다. 지금은 조회와 ACTIVE/DRAFT만 관리합니다.
        </p>
        <p className="hint">저장: 허브 Blob `infocs-content-blueprints.json` · Override 슬롯 {store.overrides.length}개(예약)</p>
        {error ? <p className="error">{error}</p> : null}
        <div className="admin-inline-actions">
          <button type="button" className="ghost" disabled={busy} onClick={() => void load()}>
            새로고침
          </button>
          <button
            type="button"
            className="ghost"
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

      <div className="admin-card">
        <h3>업종</h3>
        <div className="admin-inline-actions">
          {store.industries.map((row) => (
            <button
              key={row.id}
              type="button"
              className={row.id === industry?.id ? "gold" : "ghost"}
              onClick={() => setOpenIndustry(row.id)}
            >
              {row.name} ({STATUS_LABEL[row.status]})
            </button>
          ))}
        </div>
        {industry ? <p className="hint">{industry.description}</p> : null}
      </div>

      {blueprints.map((bp) => (
        <div className="admin-card" key={bp.id}>
          <div className="admin-inline-actions" style={{ justifyContent: "space-between" }}>
            <div>
              <h3>
                Blueprint · {bp.name} <small>({bp.key})</small>
              </h3>
              <p className="hint">
                v{bp.version} · {STATUS_LABEL[bp.status]} · 블록 {bp.blockKeys.length} · 유형{" "}
                {bp.pageTypeKeys.length} · 앵글 {bp.angleKeys.length}
              </p>
            </div>
            <div className="admin-inline-actions">
              {(["active", "draft", "disabled"] as CatalogStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={bp.status === status ? "gold" : "ghost"}
                  disabled={busy || bp.status === status}
                  onClick={() => void patch({ action: "setBlueprintStatus", blueprintId: bp.id, status })}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">{bp.description}</p>
        </div>
      ))}

      <div className="admin-card">
        <h3>Content Blocks ({blocks.length})</h3>
        <p className="hint">풀의 재료입니다. 페이지마다 전부 쓰이지 않습니다.</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>key</th>
                <th>이름</th>
                <th>verified</th>
                <th>상태</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.key}</code>
                  </td>
                  <td>
                    <div>{row.name}</div>
                    <small className="hint">{row.description}</small>
                  </td>
                  <td>{row.verifiedDataRequired ? "필수" : "—"}</td>
                  <td>{STATUS_LABEL[row.status]}</td>
                  <td>
                    <div className="admin-inline-actions">
                      {(["active", "draft", "disabled"] as CatalogStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="ghost"
                          disabled={busy || row.status === status}
                          onClick={() => void patch({ action: "setBlockStatus", blockId: row.id, status })}
                        >
                          {STATUS_LABEL[status]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h3>Page Types ({pageTypes.length})</h3>
        <ul className="hint">
          {pageTypes.map((row) => (
            <li key={row.id}>
              <code>{row.key}</code> — {row.name} ({STATUS_LABEL[row.status]}): {row.description}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-card">
        <h3>Content Angles ({angles.length})</h3>
        <ul className="hint">
          {angles.map((row) => (
            <li key={row.id}>
              <code>{row.key}</code> — {row.name} ({STATUS_LABEL[row.status]}): {row.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
