import { SITE } from "./categories";
import { siteUrl } from "./seo";
import type { FaqItem } from "./faq";
import type { Settings } from "./types";

export function buildWebSiteJsonLd(siteName: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description,
    url: siteUrl("/"),
    inLanguage: "ko-KR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl("/posts")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationJsonLd(siteName: string, settings: Settings, description: string) {
  const orgName = settings.company || siteName;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: orgName,
    alternateName: siteName,
    url: siteUrl("/"),
    description,
    areaServed: {
      "@type": "Country",
      name: "대한민국",
    },
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.address
      ? {
          address: {
            "@type": "PostalAddress",
            addressCountry: "KR",
            streetAddress: settings.address || SITE.address,
          },
        }
      : {}),
  };
}

export function buildFaqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  };
}

export function buildCollectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  keywords: string[];
  count: number;
  siteName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: siteUrl(input.path),
    inLanguage: "ko-KR",
    keywords: input.keywords.join(", "),
    numberOfItems: input.count,
    isPartOf: {
      "@type": "WebSite",
      name: input.siteName,
      url: siteUrl("/"),
    },
  };
}
