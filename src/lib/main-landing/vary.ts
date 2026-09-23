import { buildScalpTattooV1Base } from "./designs/scalp-tattoo-v1";
import type { MainLandingConfig, MainLandingCopy, MainLandingSectionId, MainLandingTheme } from "./types";

const THEMES: MainLandingTheme[] = [
  { accent: "#0a3d3c", teal: "#1bb8a9", tealDeep: "#0f8578", soft: "#cceee9", bg: "#ecf6f4" },
  { accent: "#0c3d4a", teal: "#1aa8b8", tealDeep: "#0e7a88", soft: "#c8eef2", bg: "#e8f4f6" },
  { accent: "#1a3d32", teal: "#22a88a", tealDeep: "#128066", soft: "#d0f0e6", bg: "#eaf6f1" },
  { accent: "#243d3c", teal: "#18a89a", tealDeep: "#0f7a70", soft: "#d4ebe8", bg: "#eef5f3" },
  { accent: "#123528", teal: "#2bb89a", tealDeep: "#149078", soft: "#d2f2ea", bg: "#e9f7f2" },
];

/** 필릭스 page.tsx 순서 (문의폼·지역아카이브 제외) */
const ORDERS: MainLandingSectionId[][] = [
  ["hero", "about", "process", "services", "gallery", "director", "reviews", "faq"],
  ["hero", "services", "gallery", "about", "process", "director", "reviews", "faq"],
  ["hero", "about", "services", "process", "gallery", "director", "reviews", "faq"],
];

function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveVariationSeed(config: MainLandingConfig, siteName: string) {
  const raw = String(config.variationSeed || "").trim();
  if (raw) return raw;
  return (
    [config.vendor.name, config.vendor.keyword, siteName, config.designId].filter(Boolean).join("|") || "scalp"
  );
}

export function buildMainLandingCopy(config: MainLandingConfig, siteName: string): MainLandingCopy {
  const seed = resolveVariationSeed(config, siteName);
  const rand = mulberry32(hashSeed(seed));
  const base = buildScalpTattooV1Base(config.vendor, siteName);
  const order = ORDERS[Math.floor(rand() * ORDERS.length)] || ORDERS[0];
  const theme = THEMES[Math.floor(rand() * THEMES.length)] || THEMES[0];

  const processSteps = [...base.processSteps];
  if (rand() > 0.65 && processSteps.length > 2) {
    const i = 1 + Math.floor(rand() * (processSteps.length - 1));
    const j = 1 + Math.floor(rand() * (processSteps.length - 1));
    [processSteps[i], processSteps[j]] = [processSteps[j], processSteps[i]];
  }
  const services = [...base.services];
  if (rand() > 0.5) services.reverse();
  const reviews = [...base.reviews];
  if (rand() > 0.45) {
    const i = Math.floor(rand() * reviews.length);
    const j = Math.floor(rand() * reviews.length);
    [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
  }

  const extra = String(config.prompt || "").trim();
  const heroLead = extra ? `${base.heroLead} ${extra.slice(0, 140)}` : base.heroLead;
  const aboutBody = extra && extra.length > 40 ? `${base.aboutBody} ${extra.slice(0, 100)}` : base.aboutBody;

  return {
    ...base,
    heroLead,
    aboutBody,
    processSteps,
    services,
    reviews,
    theme,
    accent: theme.accent,
    sectionOrder: order,
  };
}
