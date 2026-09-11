function validYoutubeId(id: string): string | undefined {
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : undefined;
}

export function youtubeVideoId(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const bare = validYoutubeId(text);
  if (bare) return bare;
  try {
    const withProto = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      return validYoutubeId(url.pathname.split("/").filter(Boolean)[0] || "");
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = validYoutubeId(url.searchParams.get("v") || "");
      if (fromQuery) return fromQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
        return validYoutubeId(parts[1] || "");
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function normalizeYoutubeUrl(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const id = youtubeVideoId(text);
  if (!id) return undefined;
  return `https://www.youtube.com/watch?v=${id}`;
}

export type YoutubeUrlPair = {
  youtubeUrl1?: string;
  youtubeUrl2?: string;
};

function urlsFromIds(ids: Array<string | undefined>): YoutubeUrlPair {
  return {
    youtubeUrl1: ids[0] ? `https://www.youtube.com/watch?v=${ids[0]}` : undefined,
    youtubeUrl2: ids[1] ? `https://www.youtube.com/watch?v=${ids[1]}` : undefined,
  };
}

export function parseYoutubeUrlPair(
  body: Record<string, unknown>,
  current?: YoutubeUrlPair
): YoutubeUrlPair {
  const first =
    body.youtubeUrl1 !== undefined ? normalizeYoutubeUrl(body.youtubeUrl1) : current?.youtubeUrl1;
  const second =
    body.youtubeUrl2 !== undefined ? normalizeYoutubeUrl(body.youtubeUrl2) : current?.youtubeUrl2;
  const ids = [first, second].map((url) => youtubeVideoId(url)).filter((id): id is string => Boolean(id));
  return urlsFromIds(ids);
}

/** 앞쪽 쌍이 우선. 빈 칸만 뒤쪽(업체·그룹) 영상으로 채우고, 중복 없이 최대 2개. */
export function preferYoutubePair(
  primary?: YoutubeUrlPair | null,
  fallback?: YoutubeUrlPair | null
): YoutubeUrlPair & { youtubeIds: string[] } {
  const youtubeIds = youtubeIdsFromUrls(
    primary?.youtubeUrl1,
    primary?.youtubeUrl2,
    fallback?.youtubeUrl1,
    fallback?.youtubeUrl2
  );
  return { ...urlsFromIds(youtubeIds), youtubeIds };
}

export function youtubeIdsFromUrls(...urls: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const id = youtubeVideoId(url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 2) break;
  }
  return out;
}

export function youtubeEmbedSrc(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
