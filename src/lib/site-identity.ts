import type { Settings } from "./types";

export type SiteIdentityFields = Pick<Settings, "company" | "phone" | "address">;

/** Sold sites should fill real NAP. Empty fields stay empty — never invent an address. */
export function missingSiteIdentityFields(settings: SiteIdentityFields): string[] {
  const missing: string[] = [];
  if (!String(settings.company || "").trim()) missing.push("상호");
  if (!String(settings.phone || "").trim()) missing.push("연락처");
  if (!String(settings.address || "").trim()) missing.push("주소");
  return missing;
}

export function siteIdentityReady(settings: SiteIdentityFields): boolean {
  return missingSiteIdentityFields(settings).length === 0;
}
