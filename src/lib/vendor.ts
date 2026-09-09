export type VendorKind = "phone" | "website" | "kakao";

export type VendorFields = {
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  vendorPlaceUrl?: string;
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
  return {
    vendorName: trimOrUndef(body.vendorName),
    vendorPhone: normalizePhone(body.vendorPhone),
    vendorWebsite: normalizeHttpUrl(body.vendorWebsite),
    vendorKakao: normalizeHttpUrl(body.vendorKakao),
    vendorPlaceUrl: normalizePlaceUrl(body.vendorPlaceUrl),
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

export function hasVendorCta(fields: VendorFields): boolean {
  return vendorLinks(fields).length > 0;
}
