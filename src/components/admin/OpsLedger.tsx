"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apexDomain, groupOpsSites, type OpsSite } from "@/lib/ops-ledger";

function day(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const emptyForm = {
  id: "",
  siteName: "",
  domain: "",
  concept: "",
  vmName: "",
  naverId: "",
  naverPassword: "",
};

export function OpsLedger({ sites }: { sites: OpsSite[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sites.filter((site) =>
          [site.siteName, site.domain, site.apexDomain, site.concept, site.vmName, site.naverId]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : sites;
    return groupOpsSites(list);
  }, [sites, query]);

  function startCreate() {
    setForm(emptyForm);
    setOpen(true);
    setError("");
  }

  function startEdit(site: OpsSite) {
    setForm({
      id: site.id,
      siteName: site.siteName,
      domain: site.domain,
      concept: site.concept,
      vmName: site.vmName,
      naverId: site.naverId,
      naverPassword: site.naverPassword,
    });
    setOpen(true);
    setError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const next = sites.slice();
      const idx = next.findIndex((row) => row.id === form.id || row.domain === form.domain.trim().toLowerCase());
      const payload = { ...form, updatedAt: new Date().toISOString() };
      if (idx >= 0) next[idx] = { ...next[idx], ...payload };
      else next.unshift({ ...payload, createdAt: new Date().toISOString() } as OpsSite);
      const res = await fetch("/api/ops/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 사이트를 대장에서 삭제할까요? 실제 배포는 그대로입니다.")) return;
    const res = await fetch("/api/ops/sites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sites: sites.filter((row) => row.id !== id) }),
    });
    if (res.ok) router.refresh();
  }

  async function toggleConsent(site: OpsSite) {
    setBusy(true);
    setError("");
    try {
      const next = sites.map((row) =>
        row.id === site.id ? { ...row, boardAdsConsent: !row.boardAdsConsent, updatedAt: new Date().toISOString() } : row
      );
      const res = await fetch("/api/ops/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const visibleSites = useMemo(() => filtered.flatMap((group) => group.sites), [filtered]);
  const allConsented = visibleSites.length > 0 && visibleSites.every((site) => site.boardAdsConsent);

  async function setConsentAll(value: boolean) {
    const ids = new Set(visibleSites.map((site) => site.id));
    if (!ids.size) return;
    setBusy(true);
    setError("");
    try {
      const next = sites.map((row) =>
        ids.has(row.id) ? { ...row, boardAdsConsent: value, updatedAt: new Date().toISOString() } : row
      );
      const res = await fetch("/api/ops/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function shuffleLooks() {
    if (!visibleSites.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/ops/sites/shuffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteIds: visibleSites.map((site) => site.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "적용 실패");
      const failed = Array.isArray(data.results)
        ? (data.results as { domain?: string; ok?: boolean; error?: string }[])
            .filter((row) => !row.ok)
            .slice(0, 5)
            .map((row) => `${row.domain || ""}${row.error ? ` (${row.error})` : ""}`)
            .join(", ")
        : "";
      setNotice(
        data.failed
          ? `${data.updated}곳 적용, ${data.failed}곳 실패${failed ? ` · ${failed}` : ""}`
          : `${data.updated}곳에 말투와 디자인을 서로 다르게 넣었습니다.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "적용 실패");
    } finally {
      setBusy(false);
    }
  }

  const apexHint = form.domain.trim()
    ? `메인도메인 묶음: ${apexDomain(form.domain)}`
    : "서브도메인을 넣으면 메인도메인 아래에 묶입니다.";

  return (
    <div className="ops-ledger">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>사이트 대장</h2>
            <p className="field-hint" style={{ marginTop: 0 }}>
              마스터만 볼 수 있습니다. 메인도메인으로 묶이고, 각 서브도메인의 컨셉·VM·네이버 웹문서 계정이 남습니다.
              광고글 동의를 켠 사이트만 자유게시판 허브 광고 대상이 됩니다.
              말투·디자인 랜덤은 화면에 보이는 사이트에 서로 다른 말투와 디자인을 한 번 넣습니다. 허브는 건너뜁니다.
            </p>
          </div>
          <div className="admin-actions" style={{ margin: 0 }}>
            <button className="btn btn-ghost" type="button" disabled={busy || !visibleSites.length} onClick={shuffleLooks}>
              {busy ? "적용 중…" : "말투·디자인 랜덤"}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy || !visibleSites.length} onClick={() => setConsentAll(!allConsented)}>
              {allConsented ? "광고글 동의 전체 해제" : "광고글 동의 전체 선택"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreate}>
              대장에 추가
            </button>
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="도메인, VM, 네이버 아이디, 컨셉으로 찾기"
        />
        {notice ? <p className="field-hint">{notice}</p> : null}
        {error ? <p className="notice">{error}</p> : null}
      </div>

      {open ? (
        <form className="admin-card admin-form" onSubmit={save}>
          <h3>{form.id ? "사이트 수정" : "대장에 사이트 추가"}</h3>
          <label>사이트 이름</label>
          <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
          <label>도메인</label>
          <input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="magazine.agapet.co.kr"
            required
          />
          <p className="field-hint">{apexHint}</p>
          <label>메인 컨셉</label>
          <input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} />
          <label>VM 이름 / 번호</label>
          <input value={form.vmName} onChange={(e) => setForm({ ...form, vmName: e.target.value })} />
          <label>네이버 웹문서 아이디</label>
          <input value={form.naverId} onChange={(e) => setForm({ ...form, naverId: e.target.value })} />
          <label>네이버 비밀번호</label>
          <input
            type="password"
            value={form.naverPassword}
            onChange={(e) => setForm({ ...form, naverPassword: e.target.value })}
          />
          {error ? <p className="notice">{error}</p> : null}
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "저장 중…" : "저장"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
              취소
            </button>
          </div>
        </form>
      ) : null}

      {filtered.length === 0 ? (
        <div className="admin-card">
          <p className="field-hint">아직 대장이 비어 있습니다. Studio에서 사이트를 만들거나 여기서 추가하세요.</p>
        </div>
      ) : (
        filtered.map((group) => (
          <div className="admin-card ops-group" key={group.apex}>
            <h2>
              {group.apex} <small>서브 {group.count}개</small>
            </h2>
            <ul className="ops-site-list">
              {group.sites.map((site) => (
                <li key={site.id}>
                  <div>
                    <strong>{site.domain}</strong>
                    <span>
                      {site.siteName || "이름 없음"} · {day(site.createdAt)} · 컨셉 {site.concept || "-"} · VM{" "}
                      {site.vmName || "-"} · 네이버 {site.naverId || "-"}
                      {site.naverPassword
                        ? ` / ${showPw[site.id] ? site.naverPassword : "••••"}`
                        : ""}
                    </span>
                  </div>
                    <span>
                    {site.siteUrl ? (
                      <a className="btn btn-ghost" href={site.siteUrl} target="_blank" rel="noreferrer">
                        열기
                      </a>
                    ) : null}
                    <label className="ops-consent">
                      <input
                        type="checkbox"
                        checked={Boolean(site.boardAdsConsent)}
                        disabled={busy}
                        onChange={() => toggleConsent(site)}
                      />
                      광고글 동의
                    </label>
                    <button className="btn btn-ghost" type="button" onClick={() => setShowPw((m) => ({ ...m, [site.id]: !m[site.id] }))}>
                      {showPw[site.id] ? "비번숨김" : "비번보기"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(site)}>
                      수정
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => remove(site.id)}>
                      삭제
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

export function OpsUnlock() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "확인 실패");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "확인 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-card admin-form" onSubmit={onSubmit}>
      <h2>사이트 대장</h2>
      <p className="field-hint">마스터 비밀번호를 넣어야 볼 수 있습니다. 공개 사이트 관리자 계정으로는 열리지 않습니다.</p>
      <label>마스터 비밀번호</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error ? <p className="notice">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "확인 중…" : "열기"}
      </button>
    </form>
  );
}
