import { SITE } from "./categories";

export const SITE_ORIGIN = `https://${SITE.domain}`;

/** IndexNow ownership key. Served at /{key}.txt */
export const INDEXNOW_KEY = "a8f31c94e6b24d7a9c15e0b8d4f26713";

export function siteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function postUrl(slug: string): string {
  return siteUrl(`/posts/${slug}`);
}

export const NAVER_VERIFICATION = "e9b6a1cf71d8146bc16b900775c17176cd622fc5";
