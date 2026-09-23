import type {
  MainLandingCopy,
  MainLandingCopyOverride,
} from "./types";

function trimStr(value: unknown) {
  return String(value ?? "").trim();
}

function asStringList(raw: unknown, min = 1): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => trimStr(item)).filter(Boolean).slice(0, Math.max(min, 12));
}

/** Gemini JSON → 저장용 override (뼈대 필드만, 구조 유지) */
export function parseCopyOverride(raw: unknown): MainLandingCopyOverride | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const out: MainLandingCopyOverride = {};

  for (const key of [
    "tagline",
    "heroKicker",
    "heroSubtitle",
    "heroLead",
    "heroHint",
    "aboutKicker",
    "aboutTitle",
    "aboutBody",
    "processKicker",
    "processTitle",
    "processLead",
    "servicesKicker",
    "servicesTitle",
    "servicesLead",
    "galleryKicker",
    "galleryTitle",
    "galleryLead",
    "directorKicker",
    "directorTitle",
    "directorLead",
    "reviewsKicker",
    "reviewsTitle",
    "reviewsLead",
    "faqKicker",
    "faqTitle",
    "faqLead",
    "footerTagline",
  ] as const) {
    const value = trimStr(row[key]);
    if (value) out[key] = value;
  }

  if (Array.isArray(row.aboutPromises)) {
    out.aboutPromises = row.aboutPromises
      .map((item, i) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const title = trimStr(r.title);
        const body = trimStr(r.body);
        if (!title || !body) return null;
        return { n: trimStr(r.n) || String(i + 1).padStart(2, "0"), title, body };
      })
      .filter(Boolean) as MainLandingCopyOverride["aboutPromises"];
  }

  if (Array.isArray(row.processSteps)) {
    out.processSteps = row.processSteps
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const title = trimStr(r.title);
        const body = trimStr(r.body);
        if (!title || !body) return null;
        return { title, body };
      })
      .filter(Boolean) as MainLandingCopyOverride["processSteps"];
  }

  if (Array.isArray(row.services)) {
    out.services = row.services
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const title = trimStr(r.title);
        const body = trimStr(r.body);
        if (!title || !body) return null;
        const tag = trimStr(r.tag);
        return tag ? { title, body, tag } : { title, body };
      })
      .filter(Boolean) as MainLandingCopyOverride["services"];
  }

  if (Array.isArray(row.directorGroups)) {
    out.directorGroups = row.directorGroups
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const title = trimStr(r.title);
        const items = asStringList(r.items, 2);
        if (!title || items.length < 2) return null;
        return { title, items };
      })
      .filter(Boolean) as MainLandingCopyOverride["directorGroups"];
  }

  if (Array.isArray(row.reviews)) {
    out.reviews = row.reviews
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const quote = trimStr(r.quote);
        const name = trimStr(r.name);
        const course = trimStr(r.course);
        if (!quote || !name) return null;
        return { quote, name, course: course || "시술" };
      })
      .filter(Boolean) as MainLandingCopyOverride["reviews"];
  }

  if (Array.isArray(row.faqs)) {
    out.faqs = row.faqs
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const q = trimStr(r.q ?? r.question);
        const a = trimStr(r.a ?? r.answer);
        if (!q || !a) return null;
        return { q, a };
      })
      .filter(Boolean) as MainLandingCopyOverride["faqs"];
  }

  return Object.keys(out).length ? out : undefined;
}

export function applyCopyOverride(
  base: Omit<MainLandingCopy, "accent" | "theme" | "sectionOrder">,
  override?: MainLandingCopyOverride | null
): Omit<MainLandingCopy, "accent" | "theme" | "sectionOrder"> {
  if (!override) return base;
  return {
    ...base,
    ...(override.tagline ? { tagline: override.tagline } : {}),
    ...(override.heroKicker ? { heroKicker: override.heroKicker } : {}),
    ...(override.heroSubtitle ? { heroSubtitle: override.heroSubtitle } : {}),
    ...(override.heroLead ? { heroLead: override.heroLead } : {}),
    ...(override.heroHint ? { heroHint: override.heroHint } : {}),
    ...(override.aboutKicker ? { aboutKicker: override.aboutKicker } : {}),
    ...(override.aboutTitle ? { aboutTitle: override.aboutTitle } : {}),
    ...(override.aboutBody ? { aboutBody: override.aboutBody } : {}),
    ...(override.aboutPromises?.length ? { aboutPromises: override.aboutPromises } : {}),
    ...(override.processKicker ? { processKicker: override.processKicker } : {}),
    ...(override.processTitle ? { processTitle: override.processTitle } : {}),
    ...(override.processLead ? { processLead: override.processLead } : {}),
    ...(override.processSteps?.length ? { processSteps: override.processSteps } : {}),
    ...(override.servicesKicker ? { servicesKicker: override.servicesKicker } : {}),
    ...(override.servicesTitle ? { servicesTitle: override.servicesTitle } : {}),
    ...(override.servicesLead ? { servicesLead: override.servicesLead } : {}),
    ...(override.services?.length ? { services: override.services } : {}),
    ...(override.galleryKicker ? { galleryKicker: override.galleryKicker } : {}),
    ...(override.galleryTitle ? { galleryTitle: override.galleryTitle } : {}),
    ...(override.galleryLead ? { galleryLead: override.galleryLead } : {}),
    ...(override.directorKicker ? { directorKicker: override.directorKicker } : {}),
    ...(override.directorTitle ? { directorTitle: override.directorTitle } : {}),
    ...(override.directorLead ? { directorLead: override.directorLead } : {}),
    ...(override.directorGroups?.length ? { directorGroups: override.directorGroups } : {}),
    ...(override.reviewsKicker ? { reviewsKicker: override.reviewsKicker } : {}),
    ...(override.reviewsTitle ? { reviewsTitle: override.reviewsTitle } : {}),
    ...(override.reviewsLead ? { reviewsLead: override.reviewsLead } : {}),
    ...(override.reviews?.length ? { reviews: override.reviews } : {}),
    ...(override.faqKicker ? { faqKicker: override.faqKicker } : {}),
    ...(override.faqTitle ? { faqTitle: override.faqTitle } : {}),
    ...(override.faqLead ? { faqLead: override.faqLead } : {}),
    ...(override.faqs?.length ? { faqs: override.faqs } : {}),
    ...(override.footerTagline ? { footerTagline: override.footerTagline } : {}),
  };
}
