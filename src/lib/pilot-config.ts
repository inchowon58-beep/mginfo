/**
 * PHASE 9 — Limited Bulk Production Pilot configuration.
 * Daily success cap is hard-coded; expansion requires a separate approval/code change.
 */
export const PILOT_DAILY_SUCCESS_LIMIT = 3;

/** User-facing name ind-pet-adoption maps to production ind-dog-adoption. */
export const PILOT_ALLOWED_INDUSTRY_IDS = [
  "ind-dog-adoption",
  "ind-pet-adoption",
  "ind-demolition",
] as const;

export type PilotAllowedIndustryId = (typeof PILOT_ALLOWED_INDUSTRY_IDS)[number];

export function isPilotAllowedIndustry(industryId?: string | null): boolean {
  const id = String(industryId || "").trim();
  if (!id) return false;
  return (PILOT_ALLOWED_INDUSTRY_IDS as readonly string[]).includes(id);
}

export type BulkPilotConfig = {
  /** When true, industry allowlist + pilot daily success cap + metrics apply. */
  enabled: boolean;
  dailySuccessLimit: number;
  allowedIndustryIds: string[];
  startedAt?: string;
};

export function defaultPilotConfig(): BulkPilotConfig {
  return {
    enabled: false,
    dailySuccessLimit: PILOT_DAILY_SUCCESS_LIMIT,
    allowedIndustryIds: [...PILOT_ALLOWED_INDUSTRY_IDS],
    startedAt: undefined,
  };
}

export function normalizePilotConfig(raw: unknown): BulkPilotConfig {
  const base = defaultPilotConfig();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Partial<BulkPilotConfig>;
  const limit = Number(row.dailySuccessLimit);
  return {
    enabled: Boolean(row.enabled),
    // Never auto-raise above pilot cap without code change.
    dailySuccessLimit: Math.min(
      PILOT_DAILY_SUCCESS_LIMIT,
      Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : PILOT_DAILY_SUCCESS_LIMIT)
    ),
    allowedIndustryIds:
      Array.isArray(row.allowedIndustryIds) && row.allowedIndustryIds.length
        ? row.allowedIndustryIds.map(String).filter(Boolean)
        : [...PILOT_ALLOWED_INDUSTRY_IDS],
    startedAt: typeof row.startedAt === "string" ? row.startedAt : undefined,
  };
}
