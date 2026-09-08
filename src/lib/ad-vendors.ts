import { normalizeHttpUrl, normalizePhone } from "./vendor";
import type { AdVendor } from "./types";
import { uid } from "./slug";

function trimOrUndef(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function parseAdVendor(body: Record<string, unknown>, current?: AdVendor): AdVendor | { error: string } {
  const name = String(body.name ?? current?.name ?? "").trim();
  if (!name) return { error: "업체명을 입력하세요." };
  const now = new Date().toISOString();
  return {
    id: current?.id || uid(),
    name,
    phone: body.phone !== undefined ? normalizePhone(body.phone) : current?.phone,
    website: body.website !== undefined ? normalizeHttpUrl(body.website) : current?.website,
    kakao: body.kakao !== undefined ? normalizeHttpUrl(body.kakao) : current?.kakao,
    notes: body.notes !== undefined ? trimOrUndef(body.notes) : current?.notes,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

export function vendorFieldsFromAd(vendor: AdVendor) {
  return {
    vendorName: vendor.name || "",
    vendorPhone: vendor.phone || "",
    vendorWebsite: vendor.website || "",
    vendorKakao: vendor.kakao || "",
  };
}
