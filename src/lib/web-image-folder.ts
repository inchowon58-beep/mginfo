import { MAX_IMAGE_POOL, mergeImageUrls } from "./image-pool";

const IMAGE_EXT = /\.(webp|jpe?g|png|gif|avif)(?:\?|#|$)/i;
const EXTS = ["webp", "jpg", "jpeg", "png", "gif"];
const PADS = [2, 1, 3];

function folderBase(raw: string) {
  const text = String(raw || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  return text.replace(/\/+$/, "");
}

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, `${base}/`).toString();
  } catch {
    return "";
  }
}

function extractListingUrls(html: string, base: string): string[] {
  const found: string[] = [];
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (!IMAGE_EXT.test(href)) continue;
    const url = absoluteUrl(href, base);
    if (url) found.push(url);
  }
  return mergeImageUrls([], found);
}

async function looksLikeImage(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (head.ok) {
      const type = (head.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html")) return false;
      if (type.startsWith("image/")) return true;
      if (!type || type.includes("octet-stream") || type.includes("binary")) return true;
    }
    if (head.status === 404 || head.status === 410) return false;
    if (head.status === 405 || head.status === 501 || head.status === 403) {
      const get = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-64" },
        redirect: "follow",
        signal: AbortSignal.timeout(7000),
      });
      if (!get.ok) return false;
      const type = (get.headers.get("content-type") || "").toLowerCase();
      return type.startsWith("image/") || (!type.includes("text/html") && get.status < 400);
    }
    return false;
  } catch {
    return false;
  }
}

async function probeNumbered(base: string): Promise<string[]> {
  for (const pad of PADS) {
    for (const ext of EXTS) {
      const hits: string[] = [];
      let miss = 0;
      for (let n = 1; n <= MAX_IMAGE_POOL; n += 1) {
        const name = `${String(n).padStart(pad, "0")}.${ext}`;
        const url = `${base}/${name}`;
        if (await looksLikeImage(url)) {
          hits.push(url);
          miss = 0;
        } else {
          miss += 1;
          if (hits.length === 0 && n >= 4) break;
          if (hits.length && miss >= 4) break;
        }
      }
      if (hits.length) return hits;
    }
  }
  return [];
}

export async function discoverWebFolderImages(input: string): Promise<{ urls: string[]; method: "listing" | "probe" }> {
  const base = folderBase(input);
  if (!base) throw new Error("http(s)로 시작하는 폴더 주소를 넣으세요.");

  try {
    const res = await fetch(`${base}/`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (res.ok) {
      const type = (res.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html") || type.includes("application/xhtml")) {
        const html = await res.text();
        const listed = extractListingUrls(html, base);
        if (listed.length) return { urls: listed, method: "listing" };
      }
    }
  } catch {
    // listing 실패 시 번호 파일로 찾는다
  }

  const probed = await probeNumbered(base);
  if (!probed.length) {
    throw new Error("폴더에서 이미지를 찾지 못했습니다. 주소가 열려 있는지, 파일이 01.webp처럼 번호로 있는지 확인해 주세요.");
  }
  return { urls: probed, method: "probe" };
}
