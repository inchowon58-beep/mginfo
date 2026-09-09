import { isHubHost } from "./ops-hub";
import type { OpsSite } from "./ops-ledger";

export function opsMasterSecret() {
  return process.env.MASTER_PASSWORD || "ybijour80";
}

export type ClonePushResult = {
  domain: string;
  ok: boolean;
  error?: string;
  unpublished?: number;
};

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const n = Math.min(Math.max(1, limit), Math.max(1, items.length));
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    })
  );
  return results;
}

export function cloneTargets(sites: OpsSite[]) {
  return sites.filter((site) => site.domain && !isHubHost(site.domain));
}

export async function fetchCloneMaster(domain: string) {
  const res = await fetch(`https://${domain}/api/ops/board`, {
    headers: { "x-infocs-master": opsMasterSecret() },
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function patchCloneMaster(domain: string, body: Record<string, unknown>) {
  const res = await fetch(`https://${domain}/api/ops/board`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-infocs-master": opsMasterSecret(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; unpublished?: number };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function pushToClones(
  sites: OpsSite[],
  body: Record<string, unknown>
): Promise<ClonePushResult[]> {
  const targets = cloneTargets(sites);
  return mapPool(targets, 4, async (site) => {
    try {
      const data = await patchCloneMaster(site.domain, body);
      return { domain: site.domain, ok: true, unpublished: data.unpublished || 0 };
    } catch (err) {
      return {
        domain: site.domain,
        ok: false,
        error: err instanceof Error ? err.message : "연결 실패",
      };
    }
  });
}
