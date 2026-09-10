export type StaffNotice = {
  enabled: boolean;
  title: string;
  body: string;
  updatedAt: string;
};

export function emptyStaffNotice(): StaffNotice {
  return { enabled: false, title: "", body: "", updatedAt: "" };
}

function asBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function normalizeStaffNotice(raw: unknown, bumpTime = false): StaffNotice {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const enabled = asBool(row.enabled ?? row.staffNoticeEnabled, false);
  const title = String(row.title ?? row.staffNoticeTitle ?? "").trim();
  const body = String(row.body ?? row.staffNoticeBody ?? "").trim();
  const prev = String(row.updatedAt ?? row.staffNoticeUpdatedAt ?? "").trim();
  return {
    enabled,
    title,
    body,
    updatedAt: bumpTime ? new Date().toISOString() : prev,
  };
}

export function staffNoticeFromSettings(settings?: {
  staffNoticeEnabled?: boolean;
  staffNoticeTitle?: string;
  staffNoticeBody?: string;
  staffNoticeUpdatedAt?: string;
} | null): StaffNotice {
  return normalizeStaffNotice({
    enabled: settings?.staffNoticeEnabled,
    title: settings?.staffNoticeTitle,
    body: settings?.staffNoticeBody,
    updatedAt: settings?.staffNoticeUpdatedAt,
  });
}

export function staffNoticePatch(notice: StaffNotice) {
  return {
    staffNoticeEnabled: notice.enabled,
    staffNoticeTitle: notice.title,
    staffNoticeBody: notice.body,
    staffNoticeUpdatedAt: notice.updatedAt,
  };
}
