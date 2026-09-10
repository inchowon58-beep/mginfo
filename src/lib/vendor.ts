import type { AdVendor, Post } from "./types";
import { parseYoutubeUrlPair, youtubeIdsFromUrls } from "./youtube";
import { parseVendorIds } from "./vendor-ads";

export type VendorKind = "phone" | "website" | "kakao" | "place";

export type VendorFields = {
  vendorId?: string;
  vendorIds?: string[];
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  vendorPlaceUrl?: string;
  youtubeUrl1?: string;
  youtubeUrl2?: string;
  vendorBizNo?: string;
  vendorAddress?: string;
  region?: string;
};

export type VendorLink = {
  kind: VendorKind;
  href: string;
  label: string;
};

function trimOrUndef(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function normalizeHttpUrl(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const withProto = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function normalizePhone(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8) return undefined;
  return text;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function normalizePlaceUrl(raw: unknown): string | undefined {
  return normalizeHttpUrl(raw);
}

export function parseVendorFields(body: Record<string, unknown>): VendorFields {
  const youtube = parseYoutubeUrlPair(body);
  return {
    vendorId: trimOrUndef(body.vendorId),
    vendorIds: parseVendorIds(body.vendorIds, trimOrUndef(body.vendorId)),
    vendorName: trimOrUndef(body.vendorName),
    vendorPhone: normalizePhone(body.vendorPhone),
    vendorWebsite: normalizeHttpUrl(body.vendorWebsite),
    vendorKakao: normalizeHttpUrl(body.vendorKakao),
    vendorPlaceUrl: normalizePlaceUrl(body.vendorPlaceUrl),
    youtubeUrl1: youtube.youtubeUrl1,
    youtubeUrl2: youtube.youtubeUrl2,
    vendorBizNo: trimOrUndef(body.vendorBizNo),
    vendorAddress: trimOrUndef(body.vendorAddress),
    region: trimOrUndef(body.region),
  };
}

export function vendorLinks(fields: VendorFields): VendorLink[] {
  const links: VendorLink[] = [];
  if (fields.vendorPhone) {
    links.push({ kind: "phone", href: telHref(fields.vendorPhone), label: "전화 문의" });
  }
  if (fields.vendorWebsite) {
    links.push({ kind: "website", href: fields.vendorWebsite, label: "홈페이지" });
  }
  if (fields.vendorKakao) {
    links.push({ kind: "kakao", href: fields.vendorKakao, label: "카카오톡" });
  }
  return links;
}

export function placeLink(fields: VendorFields): VendorLink | null {
  if (!fields.vendorPlaceUrl) return null;
  return { kind: "place", href: fields.vendorPlaceUrl, label: "플레이스바로가기" };
}

export function stickyVendorLinks(fields: VendorFields): VendorLink[] {
  const links = vendorLinks(fields);
  const place = placeLink(fields);
  if (place) links.push(place);
  return links;
}

export function adVendorToFields(vendor: AdVendor): VendorFields {
  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorPhone: vendor.phone,
    vendorWebsite: vendor.website,
    vendorKakao: vendor.kakao,
  };
}

export function hasStickyVendorBar(fields: VendorFields): boolean {
  return stickyVendorLinks(fields).length > 0;
}

export function vendorContactFields(
  vendor: AdVendor,
  extras?: Pick<VendorFields, "vendorPlaceUrl" | "region">
): VendorFields {
  return {
    ...adVendorToFields(vendor),
    vendorPlaceUrl: extras?.vendorPlaceUrl,
    region: extras?.region,
  };
}

export function hasAnyVendorSticky(vendors: AdVendor[], fallback: VendorFields): boolean {
  if (vendors.length) {
    return vendors.some((vendor) => stickyVendorLinks(vendorContactFields(vendor, fallback)).length > 0);
  }
  return hasStickyVendorBar(fallback);
}

export type LiveVendorView = VendorFields & {
  youtubeIds: string[];
};

export function liveVendorView(post: Post, vendor?: AdVendor | null): LiveVendorView {
  if (vendor) {
    return {
      vendorId: vendor.id,
      vendorName: vendor.name || post.vendorName,
      vendorPhone: vendor.phone || post.vendorPhone,
      vendorWebsite: vendor.website || post.vendorWebsite,
      vendorKakao: vendor.kakao || post.vendorKakao,
      vendorPlaceUrl: post.vendorPlaceUrl,
      youtubeUrl1: vendor.youtubeUrl1,
      youtubeUrl2: vendor.youtubeUrl2,
      youtubeIds: youtubeIdsFromUrls(vendor.youtubeUrl1, vendor.youtubeUrl2),
      vendorBizNo: vendor.bizNo || post.vendorBizNo,
      vendorAddress: vendor.address || post.vendorAddress,
      region: post.region,
    };
  }
  return {
    vendorId: post.vendorId,
    vendorName: post.vendorName,
    vendorPhone: post.vendorPhone,
    vendorWebsite: post.vendorWebsite,
    vendorKakao: post.vendorKakao,
    vendorPlaceUrl: post.vendorPlaceUrl,
    youtubeUrl1: post.youtubeUrl1,
    youtubeUrl2: post.youtubeUrl2,
    youtubeIds: youtubeIdsFromUrls(post.youtubeUrl1, post.youtubeUrl2),
    vendorBizNo: post.vendorBizNo,
    vendorAddress: post.vendorAddress,
    region: post.region,
  };
}
