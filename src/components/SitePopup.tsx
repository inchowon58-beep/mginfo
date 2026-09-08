"use client";

import { useEffect, useState } from "react";

const HIDE_KEY = "infocs_popup_hide";
const LEGACY_HIDE_KEY = "infocs_studio_popup_hide";

export function SitePopup({
  enabled,
  title,
  body,
  cta,
  href,
  image,
  themeId,
}: {
  enabled: boolean;
  title: string;
  body: string;
  cta: string;
  href: string;
  image?: string;
  themeId?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !(title || body || image)) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const hideUntil = localStorage.getItem(HIDE_KEY) || localStorage.getItem(LEGACY_HIDE_KEY);
      if (hideUntil === today) return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [enabled, title, body, image]);

  if (!open) return null;

  function close() {
    setOpen(false);
  }

  function hideToday() {
    try {
      localStorage.setItem(HIDE_KEY, new Date().toISOString().slice(0, 10));
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  const link = (href || "/posts").trim() || "/posts";

  return (
    <div
      className={`studio-popup${themeId ? ` is-${themeId}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || "안내"}
    >
      <button className="studio-popup-veil" type="button" aria-label="닫기" onClick={close} />
      <div className="studio-popup-card">
        <button className="studio-popup-x" type="button" onClick={close} aria-label="닫기">
          ×
        </button>
        {image ? (
          <img className="studio-popup-img" src={image} alt="" />
        ) : null}
        {title ? <h3>{title}</h3> : null}
        {body ? <p>{body}</p> : null}
        <a className="studio-cta" href={link} onClick={close}>
          {cta || "확인"}
        </a>
        <button className="studio-popup-today" type="button" onClick={hideToday}>
          오늘 하루 보지 않기
        </button>
      </div>
    </div>
  );
}
