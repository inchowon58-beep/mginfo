import { SITE } from "./categories";
import { decodeSlugParam } from "./slug";

function resolveSiteOrigin() {
  const fromEnv = String(process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  if (fromEnv) return `https://${fromEnv}`;
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return `https://${SITE.domain}`;
}

export const SITE_ORIGIN = resolveSiteOrigin();

/** IndexNow ownership key. Served at /{key}.txt */
export const INDEXNOW_KEY = "a8f31c94e6b24d7a9c15e0b8d4f26713";

export function siteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function postUrl(slug: string): string {
  const safe = encodeURI(decodeSlugParam(slug));
  return siteUrl(`/posts/${safe}`);
}

export const NAVER_VERIFICATION = "e9b6a1cf71d8146bc16b900775c17176cd622fc5";

export function parseNaverVerification(raw?: string): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  const fromContent = text.match(/content\s*=\s*["']([^"']+)["']/i);
  if (fromContent?.[1]) return fromContent[1].trim();
  const token = text.replace(/<[^>]+>/g, "").trim();
  if (/^[a-zA-Z0-9_-]{8,128}$/.test(token)) return token;
  return "";
}

export function resolveNaverVerification(stored?: string): string {
  return parseNaverVerification(stored) || NAVER_VERIFICATION;
}
