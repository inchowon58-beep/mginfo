"use client";

import { useEffect, useState } from "react";
import { staffNoticeFromSettings } from "@/lib/staff-notice";

const PENDING_KEY = "infocs-staff-notice-pending";
const SEEN_KEY = "infocs-staff-notice-seen";

export function markStaffNoticePending() {
  try {
    sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    // ignore
  }
}

export function AdminStaffNotice() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const notice = staffNoticeFromSettings(data.settings || {});
        if (!notice.enabled || !notice.body) return;
        let pending = false;
        let seen = "";
        try {
          pending = sessionStorage.getItem(PENDING_KEY) === "1";
          seen = localStorage.getItem(SEEN_KEY) || "";
        } catch {
          pending = true;
        }
        if (!pending && seen === notice.updatedAt) return;
        setTitle(notice.title || "운영진 공지");
        setBody(notice.body);
        setOpen(true);
      })
      .catch(() => undefined);
  }, []);

  function close() {
    setOpen(false);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const notice = staffNoticeFromSettings(data.settings || {});
        try {
          sessionStorage.removeItem(PENDING_KEY);
          if (notice.updatedAt) localStorage.setItem(SEEN_KEY, notice.updatedAt);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          // ignore
        }
      });
  }

  if (!open) return null;

  return (
    <div className="admin-staff-popup" role="dialog" aria-modal="true" aria-labelledby="admin-staff-notice-title">
      <button className="admin-staff-popup-veil" type="button" aria-label="닫기" onClick={close} />
      <div className="admin-staff-popup-card">
        <p className="admin-staff-popup-kicker">운영진 공지</p>
        <h2 id="admin-staff-notice-title">{title}</h2>
        <p className="admin-staff-popup-body">{body}</p>
        <button className="btn btn-primary" type="button" onClick={close}>
          확인
        </button>
      </div>
    </div>
  );
}
