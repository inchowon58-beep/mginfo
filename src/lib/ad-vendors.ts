import { normalizeHttpUrl, normalizePhone } from "./vendor";
import type { AdVendor, Partner } from "./types";
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
    category: body.category !== undefined ? trimOrUndef(body.category) : current?.category,
    intro: body.intro !== undefined ? trimOrUndef(body.intro) : current?.intro,
    phone: body.phone !== undefined ? normalizePhone(body.phone) : current?.phone,
    website: body.website !== undefined ? normalizeHttpUrl(body.website) : current?.website,
    kakao: body.kakao !== undefined ? normalizeHttpUrl(body.kakao) : current?.kakao,
    notes: body.notes !== undefined ? trimOrUndef(body.notes) : current?.notes,
    imageUrl: body.imageUrl !== undefined ? trimOrUndef(body.imageUrl) : current?.imageUrl,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

export function adVendorToPartner(vendor: AdVendor): Partner {
  return {
    id: vendor.id,
    name: vendor.name,
    category: vendor.category || "제휴",
    intro: vendor.intro || vendor.website || "",
    url: vendor.website,
    phone: vendor.phone,
    imageUrl: vendor.imageUrl,
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
