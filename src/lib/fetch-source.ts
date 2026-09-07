import { stripHtml } from "./format";

const MAX_BYTES = 1_200_000;
const MAX_TEXT = 9000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (/^10(?:\.\d{1,3}){3}$/.test(h)) return true;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(h)) return true;
  if (/^169\.254(?:\.\d{1,3}){2}$/.test(h)) return true;
  return false;
}

export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("올바른 글 주소가 아닙니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("http 또는 https 주소만 사용할 수 있습니다.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("이 주소는 가져올 수 없습니다.");
  }
  return url;
}

function decode(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function metaContent(html: string, key: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
    "i"
  );
  return decode((html.match(re)?.[1] || html.match(re2)?.[1] || "").trim());
}

function tagText(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = stripHtml(decode(m[1])).trim();
    if (t) out.push(t);
  }
  return out;
}

export type SourceArticle = {
  url: string;
  title: string;
  text: string;
};

function normalizeSourceUrl(url: URL): string {
  const host = url.hostname.replace(/^m\./, "").toLowerCase();
  if (host === "blog.naver.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] && parts[0] !== "PostView.naver" && /^\d+$/.test(parts[1] || "")) {
      return `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(parts[0])}&logNo=${encodeURIComponent(parts[1])}`;
    }
    const blogId = url.searchParams.get("blogId");
    const logNo = url.searchParams.get("logNo");
    if (blogId && logNo) {
      return `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${encodeURIComponent(logNo)}`;
    }
  }
  return url.toString();
}

export async function fetchSourceArticle(rawUrl: string): Promise<SourceArticle> {
  const parsed = assertPublicHttpUrl(rawUrl);
  const target = normalizeSourceUrl(parsed);
  const res = await fetch(target, {
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; infocs-magazine/1.0; +https://magazine.infocs.co.kr)",
    },
  });
  if (!res.ok) {
    throw new Error(`원문을 가져오지 못했습니다. (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error("원문 페이지가 너무 큽니다.");
  }
  const html = new TextDecoder("utf-8").decode(buf);

  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    decode(stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")).trim() ||
    "제목 없음";

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<img\b[\s\S]*?>/gi, " ")
    .replace(/<picture[\s\S]*?<\/picture>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  const chunks = [
    ...tagText(cleaned, "h1"),
    ...tagText(cleaned, "h2"),
    ...tagText(cleaned, "h3"),
    ...tagText(cleaned, "p"),
    ...tagText(cleaned, "li"),
  ];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of chunks) {
    if (line.length < 8) continue;
    const key = line.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  let text = unique.join("\n\n").slice(0, MAX_TEXT).trim();
  if (text.length < 120) {
    text = stripHtml(cleaned).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  }
  if (text.length < 80) {
    throw new Error("원문에서 글을 충분히 읽지 못했습니다. 공개된 글 주소인지 확인해 주세요.");
  }
  return { url: parsed.toString(), title, text };
}
