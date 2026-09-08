"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "로그인 실패");
      router.push(search.get("from") || "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="box admin-form" onSubmit={onSubmit}>
        <h1>관리자 로그인</h1>
        <p>인포씨에스 매거진 글을 발행하려면 로그인하세요.</p>
        <label>아이디</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
        />
        <label>비밀번호</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="notice">{error}</p>}
        <div className="admin-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "확인 중…" : "로그인"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
