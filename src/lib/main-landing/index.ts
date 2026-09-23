export { resolveVendorAddress, autoAddressFromKeyword } from "./auto-address";
export { SCALP_TATTOO_V1 } from "./designs/scalp-tattoo-v1";
export { resolveMainLandingImages, isMainLandingImageUrl } from "./images";
export { mainLandingEnabled, parseMainLandingConfig } from "./parse";
export {
  MAIN_DESIGN_IDS,
  LEGACY_MAIN_DESIGN_MAP,
  defaultMainLandingConfig,
  emptyMainLandingVendor,
  isMainDesignId,
  resolveMainDesignId,
  type MainDesignId,
  type MainLandingConfig,
  type MainLandingCopy,
  type MainLandingImageSlots,
  type MainLandingResolvedImages,
  type MainLandingSectionId,
  type MainLandingVendor,
} from "./types";
export { buildMainLandingCopy, resolveVariationSeed } from "./vary";

export const MAIN_DESIGNS = [
  {
    id: "scalp-tattoo-v1" as const,
    label: "두피문신",
    description: "필릭스스칼프형 (원장·후기·FAQ 포함, 문의폼 없음)",
  },
];
