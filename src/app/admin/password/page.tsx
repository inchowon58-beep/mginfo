"use client";

import { FormEvent, useEffect, useState } from "react";

export default function PasswordSettingsPage() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/site-account")
      .then((r) => r.json())
      .then((data) => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => setError("계정 정보를 불러오지 못했습니다."));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/site-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, username, password, passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("아이디와 비밀번호를 저장했습니다.");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
      if (data.username) setUsername(data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-card admin-form" onSubmit={save} style={{ maxWidth: 640 }}>
      <h2>비밀번호 설정</h2>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        이 사이트의 관리자 아이디와 비밀번호를 바꿉니다. 마스터 계정은 변경되지 않습니다.
      </p>
      <label>아이디</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      <label>현재 비밀번호</label>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        autoComplete="current-password"
      />
      <label>새 비밀번호</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <label>새 비밀번호 확인</label>
      <input
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {error ? <p className="notice">{error}</p> : null}
      {message ? <p className="notice ok">{message}</p> : null}
      <div className="admin-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
