import type { HubPortalConfig } from "./types";

export function defaultHubPortalConfig(): HubPortalConfig {
  return { enabled: false };
}

export function parseHubPortalConfig(raw: unknown): HubPortalConfig {
  if (!raw || typeof raw !== "object") return defaultHubPortalConfig();
  const row = raw as Record<string, unknown>;
  return {
    enabled: Boolean(row.enabled),
  };
}

export function hubPortalEnabled(settings: { hubPortal?: HubPortalConfig | null } | null | undefined) {
  return Boolean(settings?.hubPortal?.enabled);
}
