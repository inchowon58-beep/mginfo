import type { OpsSite } from "./ops-ledger";

/** Host only (no protocol), preserves www if present in SITE_DOMAIN. */
export function resolveCanonicalHost(): string {
  const fromEnv = String(process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (fromEnv) return fromEnv;
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
  return vercel;
}

export function stripHostPort(host: string): string {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

export function sameRegistrableHost(a: string, b: string): boolean {
  const left = stripHostPort(a).replace(/^www\./, "");
  const right = stripHostPort(b).replace(/^www\./, "");
  return Boolean(left && right && left === right);
}

/**
 * Public API/base origin for a clone site.
 * Prefer stored siteUrl (may include www); fall back to https://{domain}.
 */
export function siteRequestOrigin(site: Pick<OpsSite, "domain" | "siteUrl">): string {
  const fromUrl = String(site.siteUrl || "").trim().replace(/\/$/, "");
  if (/^https:\/\//i.test(fromUrl)) return fromUrl;
  if (/^http:\/\//i.test(fromUrl)) return `https://${fromUrl.replace(/^http:\/\//i, "")}`;
  const domain = String(site.domain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  return domain ? `https://${domain}` : "";
}
