import { get, put } from "@vercel/blob";

const STORE_PATH = "infocs-magazine-store.json";
const OPS_PATH = "infocs-ops-ledger.json";
const HUB_BOARD_PATH = "infocs-hub-board.json";

export function hasBlobStore(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export async function blobGetJson<T>(pathname = STORE_PATH): Promise<T | null> {
  if (!hasBlobStore()) return null;
  try {
    const result =
      (await get(pathname, { access: "private", useCache: false }).catch(() => null)) ||
      (await get(pathname, { access: "public", useCache: false }).catch(() => null));
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function blobSetJson(value: unknown, pathname = STORE_PATH): Promise<void> {
  if (!hasBlobStore()) throw new Error("Blob 저장소가 연결되어 있지 않습니다.");
  const body = JSON.stringify(value);
  const options = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  } as const;
  try {
    await put(pathname, body, { ...options, access: "private" });
  } catch {
    await put(pathname, body, { ...options, access: "public" });
  }
}

export async function blobGetOpsJson<T>(): Promise<T | null> {
  return blobGetJson<T>(OPS_PATH);
}

export async function blobSetOpsJson(value: unknown): Promise<void> {
  return blobSetJson(value, OPS_PATH);
}

export async function blobGetHubBoardJson<T>(): Promise<T | null> {
  return blobGetJson<T>(HUB_BOARD_PATH);
}

export async function blobSetHubBoardJson(value: unknown): Promise<void> {
  return blobSetJson(value, HUB_BOARD_PATH);
}
