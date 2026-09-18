"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type AdminHelpTipProps = {
  title: string;
  children: ReactNode;
  label?: string;
};

export function AdminHelpTip({ title, children, label = "사용법" }: AdminHelpTipProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="admin-help-btn"
        aria-label={`${title} ${label}`}
        title={label}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open ? (
        <div className="admin-help-popup" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button className="admin-help-veil" type="button" aria-label="닫기" onClick={() => setOpen(false)} />
          <div className="admin-help-card">
            <p className="admin-help-kicker">{label}</p>
            <h2 id={titleId}>{title}</h2>
            <div className="admin-help-body">{children}</div>
            <button className="btn btn-primary" type="button" onClick={() => setOpen(false)}>
              확인
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AdminTitleWithHelp({
  title,
  helpTitle,
  children,
}: {
  title: string;
  helpTitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-title-with-help">
      <h2>{title}</h2>
      <AdminHelpTip title={helpTitle || title}>{children}</AdminHelpTip>
    </div>
  );
}
