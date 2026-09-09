const STORE_KEY = "infocs-magazine-store";
const OPS_KEY = "infocs-ops-ledger";
const HUB_BOARD_KEY = "infocs-hub-board";

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function hasRemoteStore(): boolean {
  return Boolean(redisConfig());
}

export function hasPersistentStore(): boolean {
  if (hasRemoteStore()) return true;
  return !process.env.VERCEL;
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) return null;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`저장소 요청에 실패했습니다. (${res.status})`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}

export async function kvGetJson<T>(): Promise<T | null> {
  if (!redisConfig()) return null;
  const result = await redisCommand(["GET", STORE_KEY]);
  if (result == null) return null;
  if (typeof result === "object") return result as T;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function kvSetJson(value: unknown): Promise<void> {
  if (!redisConfig()) throw new Error("Redis가 연결되어 있지 않습니다.");
  await redisCommand(["SET", STORE_KEY, JSON.stringify(value)]);
}

export async function kvGetOpsJson<T>(): Promise<T | null> {
  if (!redisConfig()) return null;
  const result = await redisCommand(["GET", OPS_KEY]);
  if (result == null) return null;
  if (typeof result === "object") return result as T;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function kvSetOpsJson(value: unknown): Promise<void> {
  if (!redisConfig()) throw new Error("Redis가 연결되어 있지 않습니다.");
  await redisCommand(["SET", OPS_KEY, JSON.stringify(value)]);
}

export async function kvGetHubBoardJson<T>(): Promise<T | null> {
  if (!redisConfig()) return null;
  const result = await redisCommand(["GET", HUB_BOARD_KEY]);
  if (result == null) return null;
  if (typeof result === "object") return result as T;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function kvSetHubBoardJson(value: unknown): Promise<void> {
  if (!redisConfig()) throw new Error("Redis가 연결되어 있지 않습니다.");
  await redisCommand(["SET", HUB_BOARD_KEY, JSON.stringify(value)]);
}
