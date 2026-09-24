"use client";

import { useEffect, useState } from "react";
import type { HubPortalConfig } from "@/lib/hub-portal";

export function HubPortalSettings() {
  const [cfg, setCfg] = useState<HubPortalConfig>({ enabled: false });
  const [opsHub, setOpsHub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refreshBusy, setRefreshBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setOpsHub(Boolean(data.opsHub));
        const hubPortal = data.settings?.hubPortal;
        setCfg({ enabled: Boolean(hubPortal?.enabled) });
      })
      .catch(() => setError("설정을 불러오지 못했습니다."));
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubPortal: cfg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("저장했습니다. 홈(/)에서 포털이 켜집니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function refreshFeed() {
    setRefreshBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/cron/hub-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "수집 실패");
      setMessage(`피드 갱신 완료 · 글 ${data.count ?? 0}개 · 사이트 ${data.sites ?? 0}곳`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수집 실패");
    } finally {
      setRefreshBusy(false);
    }
  }

  if (!opsHub) {
    return (
      <div className="admin-card">
        <h3>허브 포털</h3>
        <p className="muted">이 설정은 메인 허브 사이트에서만 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="admin-card" style={{ display: "grid", gap: 14 }}>
      <div>
        <h3 style={{ margin: 0 }}>허브 통합 포털</h3>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          켜면 허브 홈(/)이 클론 글을 모은 포털로 바뀝니다. 카드 클릭 시 해당 클론 글로 이동합니다. 피드는 1시간마다
          갱신됩니다.
        </p>
      </div>
      <label className="admin-check-all">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => setCfg({ enabled: e.target.checked })}
        />
        허브 포털 메인 사용
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={busy} onClick={save}>
          {busy ? "저장 중…" : "저장"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={refreshBusy} onClick={refreshFeed}>
          {refreshBusy ? "수집 중…" : "지금 피드 수집"}
        </button>
        <a className="btn btn-ghost" href="/" target="_blank" rel="noreferrer">
          홈 미리보기
        </a>
      </div>
      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
