import { INDEXNOW_KEY, SITE_ORIGIN } from "./seo";

const ENDPOINTS = [
  "https://searchadvisor.naver.com/indexnow",
  "https://api.indexnow.org/indexnow",
];

export async function notifyIndexNow(urls: string[]): Promise<{ ok: boolean; detail?: string }> {
  const list = [...new Set(urls.filter((u) => u.startsWith("https://")))];
  if (list.length === 0) return { ok: false, detail: "URL 없음" };

  const payload = {
    host: SITE_ORIGIN.replace(/^https:\/\//, ""),
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList: list,
  };

  const results = await Promise.allSettled(
    ENDPOINTS.map(async (endpoint) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok && res.status !== 202) {
        throw new Error(`${endpoint} ${res.status}`);
      }
      return res.status;
    })
  );

  const naver = results[0];
  if (naver.status === "fulfilled") return { ok: true };
  return {
    ok: false,
    detail: naver.status === "rejected" ? String(naver.reason) : "요청 실패",
  };
}

export async function notifyPostIndexed(slug: string): Promise<{ ok: boolean; detail?: string }> {
  return notifyIndexNow([
    siteUrlFromSlug(slug),
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/sitemap.xml`,
    `${SITE_ORIGIN}/rss.xml`,
  ]);
}

function siteUrlFromSlug(slug: string): string {
  return `${SITE_ORIGIN}/posts/${slug}`;
}
