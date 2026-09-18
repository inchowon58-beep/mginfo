/** PHASE 3 — Verified Business Data Layer (site-local, AdVendor-linked). */

export type MediaRef = {
  url: string;
  alt?: string;
};

export type VerifiedFact = {
  key: string;
  label: string;
  value: string | number | boolean | string[];
  verified: boolean;
  verifiedAt?: string;
  updatedAt?: string;
};

export type AnimalStatus = "available" | "reserved" | "completed" | "inactive";

export type Animal = {
  id: string;
  vendorId: string;
  species: string;
  breed: string;
  sex?: string;
  birthDate?: string;
  color?: string;
  name?: string;
  status: AnimalStatus;
  description?: string;
  media: MediaRef[];
  verifiedAt?: string;
  updatedAt: string;
  createdAt: string;
};

export type ProjectExample = {
  id: string;
  vendorId: string;
  title: string;
  projectType?: string;
  region?: string;
  description?: string;
  media: MediaRef[];
  completedAt?: string;
  verifiedAt?: string;
  updatedAt: string;
  createdAt: string;
};

/**
 * Extended vendor data linked to AdVendor by vendorId.
 * Base identity (name/phone/address/…) prefers AdVendor via adapter — avoid duplicating.
 */
export type VendorProfile = {
  id: string;
  /** Optional site marker; profiles are stored per-site blob. */
  siteId?: string;
  /** Required link to Store.adVendors[].id */
  vendorId: string;
  industryId?: string;
  /** Overrides only when set; else adapter reads AdVendor. */
  companyName?: string;
  phone?: string;
  website?: string;
  address?: string;
  serviceAreas?: string[];
  businessHours?: string;
  description?: string;
  verifiedFacts: VerifiedFact[];
  services: string[];
  credentials: VerifiedFact[];
  media: MediaRef[];
  /**
   * Industry-agnostic bag keyed by Blueprint requiredData / industry keys.
   * e.g. consultationMethods, visitPolicy, breeds, serviceTypes, wasteHandling
   */
  industryData: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
};

export type VendorProfileStore = {
  profiles: VendorProfile[];
  animals: Animal[];
  projectExamples: ProjectExample[];
  updatedAt: string;
};

/** Block keys rendered by code (not Gemini). */
export const CODE_RENDERED_BLOCK_KEYS = [
  "available_animals",
  "store_information",
  "visit_information",
  "company_information",
  "project_examples",
  "consultation",
] as const;

export type CodeRenderedBlockKey = (typeof CODE_RENDERED_BLOCK_KEYS)[number];

export function isCodeRenderedBlock(blockKey: string): boolean {
  return (CODE_RENDERED_BLOCK_KEYS as readonly string[]).includes(blockKey);
}
