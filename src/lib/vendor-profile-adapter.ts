import type { AdVendor } from "./types";
import type { Animal, ProjectExample, VendorProfile, VerifiedFact } from "./vendor-profile-types";

/** Merge AdVendor base fields with VendorProfile overrides (profile wins when set). */
export type ResolvedVendorView = {
  vendorId: string;
  companyName: string;
  phone?: string;
  website?: string;
  kakao?: string;
  address?: string;
  bizNo?: string;
  imageUrl?: string;
  businessHours?: string;
  description?: string;
  serviceAreas: string[];
  verifiedFacts: VerifiedFact[];
  services: string[];
  credentials: VerifiedFact[];
  media: { url: string; alt?: string }[];
  industryId?: string;
  industryData: Record<string, unknown>;
  consultationMethod?: string;
  visitPolicy?: string;
};

export function emptyVendorProfile(vendorId: string, industryId?: string): VendorProfile {
  const now = new Date().toISOString();
  return {
    id: `vp-${vendorId}`,
    vendorId,
    industryId,
    verifiedFacts: [],
    services: [],
    credentials: [],
    media: [],
    industryData: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveVendorView(
  ad: AdVendor | null | undefined,
  profile: VendorProfile | null | undefined
): ResolvedVendorView | null {
  if (!ad && !profile) return null;
  const vendorId = profile?.vendorId || ad?.id || "";
  if (!vendorId) return null;
  const companyName = (profile?.companyName || ad?.name || "").trim();
  if (!companyName) return null;

  const industryData = { ...(profile?.industryData || {}) };
  const consultationRaw = industryData.consultationMethods ?? industryData.consultationMethod;
  let consultationMethod: string | undefined;
  if (Array.isArray(consultationRaw)) {
    consultationMethod = consultationRaw.map(String).filter(Boolean).join(", ") || undefined;
  } else if (consultationRaw != null && String(consultationRaw).trim()) {
    consultationMethod = String(consultationRaw).trim();
  }
  const visitPolicy =
    industryData.visitPolicy != null && String(industryData.visitPolicy).trim()
      ? String(industryData.visitPolicy).trim()
      : undefined;

  return {
    vendorId,
    companyName,
    phone: (profile?.phone || ad?.phone || "").trim() || undefined,
    website: (profile?.website || ad?.website || "").trim() || undefined,
    kakao: (ad?.kakao || "").trim() || undefined,
    address: (profile?.address || ad?.address || "").trim() || undefined,
    bizNo: (ad?.bizNo || "").trim() || undefined,
    imageUrl: (ad?.imageUrl || "").trim() || undefined,
    businessHours: (profile?.businessHours || "").trim() || undefined,
    description: (profile?.description || ad?.intro || "").trim() || undefined,
    serviceAreas: profile?.serviceAreas?.length ? [...profile.serviceAreas] : [],
    verifiedFacts: profile?.verifiedFacts?.filter((f) => f.verified) || [],
    services: profile?.services || [],
    credentials: profile?.credentials?.filter((f) => f.verified) || [],
    media: profile?.media?.length
      ? [...profile.media]
      : ad?.imageUrl
        ? [{ url: ad.imageUrl, alt: companyName }]
        : [],
    industryId: profile?.industryId,
    industryData,
    consultationMethod,
    visitPolicy,
  };
}

export function animalsForVendor(
  animals: Animal[],
  vendorId: string,
  opts?: { breed?: string; species?: string; availableOnly?: boolean }
): Animal[] {
  const breed = (opts?.breed || "").trim().toLowerCase();
  const species = (opts?.species || "").trim().toLowerCase();
  return animals.filter((a) => {
    if (a.vendorId !== vendorId) return false;
    if (opts?.availableOnly !== false && a.status !== "available") return false;
    if (breed && !a.breed.toLowerCase().includes(breed) && !breed.includes(a.breed.toLowerCase())) {
      return false;
    }
    if (species && a.species.toLowerCase() !== species) return false;
    return true;
  });
}

export function projectsForVendor(projects: ProjectExample[], vendorId: string): ProjectExample[] {
  return projects.filter((p) => p.vendorId === vendorId);
}

/** Map Blueprint requiredData / block keys → whether resolved view has data. */
export function hasDataKey(view: ResolvedVendorView, key: string, extras?: { animals?: Animal[]; projects?: ProjectExample[] }): boolean {
  switch (key) {
    case "vendorName":
      return Boolean(view.companyName);
    case "address":
      return Boolean(view.address);
    case "phone":
      return Boolean(view.phone);
    case "businessHours":
      return Boolean(view.businessHours);
    case "consultationMethod":
      return Boolean(view.consultationMethod);
    case "animals":
      return Boolean(extras?.animals?.length);
    case "projectCases":
      return Boolean(extras?.projects?.length);
    default: {
      const v = view.industryData[key];
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }
  }
}
