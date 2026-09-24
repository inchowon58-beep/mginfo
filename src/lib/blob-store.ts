import { get, put } from "@vercel/blob";

const STORE_PATH = "infocs-magazine-store.json";
const OPS_PATH = "infocs-ops-ledger.json";
const HUB_BOARD_PATH = "infocs-hub-board.json";
const CONTENT_BLUEPRINT_PATH = "infocs-content-blueprints.json";
const VENDOR_PROFILE_PATH = "infocs-vendor-profiles.json";
const REFERENCE_DATA_PATH = "infocs-reference-data.json";
const BRAND_STUDIO_PATH = "infocs-brand-studio.json";
const HUB_PORTAL_PATH = "infocs-hub-portal-feed.json";

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
    cacheControlMaxAge: 0,
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

export async function blobGetContentBlueprintsJson<T>(): Promise<T | null> {
  return blobGetJson<T>(CONTENT_BLUEPRINT_PATH);
}

export async function blobSetContentBlueprintsJson(value: unknown): Promise<void> {
  return blobSetJson(value, CONTENT_BLUEPRINT_PATH);
}

export async function blobGetVendorProfilesJson<T>(): Promise<T | null> {
  return blobGetJson<T>(VENDOR_PROFILE_PATH);
}

export async function blobSetVendorProfilesJson(value: unknown): Promise<void> {
  return blobSetJson(value, VENDOR_PROFILE_PATH);
}

export async function blobGetReferenceDataJson<T>(): Promise<T | null> {
  return blobGetJson<T>(REFERENCE_DATA_PATH);
}

export async function blobSetReferenceDataJson(value: unknown): Promise<void> {
  return blobSetJson(value, REFERENCE_DATA_PATH);
}

export async function blobGetBrandStudioJson<T>(): Promise<T | null> {
  return blobGetJson<T>(BRAND_STUDIO_PATH);
}

export async function blobSetBrandStudioJson(value: unknown): Promise<void> {
  return blobSetJson(value, BRAND_STUDIO_PATH);
}

export async function blobGetHubPortalJson<T>(): Promise<T | null> {
  return blobGetJson<T>(HUB_PORTAL_PATH);
}

export async function blobSetHubPortalJson(value: unknown): Promise<void> {
  return blobSetJson(value, HUB_PORTAL_PATH);
}
