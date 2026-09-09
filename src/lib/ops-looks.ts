import { isHubHost } from "./ops-hub";
import type { OpsSite } from "./ops-ledger";
import { shuffledSiteThemes } from "./site-theme";
import { shuffledWritingTones } from "./writing-tone";

function masterSecret() {
  return process.env.MASTER_PASSWORD || "ybijour80";
}

export type ShuffleLookResult = {
  domain: string;
  writingTone?: string;
  siteTheme?: string;
  ok: boolean;
  error?: string;
};

export async function shuffleCloneLooks(sites: OpsSite[]): Promise<ShuffleLookResult[]> {
  const targets = sites.filter((site) => site.domain && !isHubHost(site.domain));
  const tones = shuffledWritingTones();
  const themes = shuffledSiteThemes();
  const results: ShuffleLookResult[] = new Array(targets.length);
  let cursor = 0;
  const limit = Math.min(4, Math.max(1, targets.length));

  async function worker() {
    while (cursor < targets.length) {
      const index = cursor++;
      const site = targets[index];
      const writingTone = tones[index % tones.length];
      const siteTheme = themes[index % themes.length];
      try {
        const res = await fetch(`https://${site.domain}/api/ops/board`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-infocs-master": masterSecret(),
          },
          body: JSON.stringify({ writingTone, siteTheme }),
          signal: AbortSignal.timeout(12000),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          results[index] = {
            domain: site.domain,
            writingTone,
            siteTheme,
            ok: false,
            error: data.error || `HTTP ${res.status}`,
          };
          continue;
        }
        results[index] = { domain: site.domain, writingTone, siteTheme, ok: true };
      } catch (err) {
        results[index] = {
          domain: site.domain,
          writingTone,
          siteTheme,
          ok: false,
          error: err instanceof Error ? err.message : "연결 실패",
        };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
