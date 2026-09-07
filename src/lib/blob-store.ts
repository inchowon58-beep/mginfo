import { get, put } from "@vercel/blob";

const STORE_PATH = "infocs-magazine-store.json";

export function hasBlobStore(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export async function blobGetJson<T>(): Promise<T | null> {
  if (!hasBlobStore()) return null;
  const result = await get(STORE_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function blobSetJson(value: unknown): Promise<void> {
  if (!hasBlobStore()) throw new Error("Blob 저장소가 연결되어 있지 않습니다.");
  await put(STORE_PATH, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}
