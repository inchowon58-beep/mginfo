"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from "@/lib/gemini-models";

export default function SettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setGeminiModel(data.settings?.geminiModel || DEFAULT_GEMINI_MODEL);
        setHasKey(Boolean(data.settings?.hasKey));
        if (data.settings?.geminiApiKey) setGeminiApiKey(data.settings.geminiApiKey);
      })
      .catch(() => setError("설정을 불러오지 못했습니다."));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey, geminiModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMessage("설정을 저장했습니다.");
      setHasKey(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const known = GEMINI_MODELS.some((m) => m.id === geminiModel);

  return (
    <form className="admin-card admin-form" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <h2>제미나이 API 설정</h2>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        Google AI Studio에서 발급한 API 키를 저장하면 글 작성 화면에서 초안을 만들 수 있습니다.
        현재 Gemini 3.5 Flash부터 사용할 수 있습니다.
        {hasKey ? " 키가 이미 저장되어 있습니다. 새 키를 넣으면 교체됩니다." : ""}
      </p>
      <label>Gemini API Key</label>
      <input
        value={geminiApiKey}
        onChange={(e) => setGeminiApiKey(e.target.value)}
        placeholder="AIza..."
        autoComplete="off"
      />
      <label>모델</label>
      <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
        {GEMINI_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
        {!known && geminiModel ? <option value={geminiModel}>{geminiModel} (이전 설정)</option> : null}
      </select>
      {error && <p className="notice">{error}</p>}
      {message && <p className="notice ok">{message}</p>}
      <div className="admin-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
