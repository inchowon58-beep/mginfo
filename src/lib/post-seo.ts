import type { Category, Post, Settings } from "./types";
import type { FaqItem } from "./faq";
import { resolveRegionContext } from "./region-intro";
import { postUrl, siteUrl } from "./seo";
import { stripHtml } from "./format";

export function pageKeyword(post: Post): string {
  return (post.focusKeyword || "").trim() || post.title.trim();
}

export function postLinkLabel(post: Post): string {
  return (post.focusKeyword || "").trim() || post.title;
}

export function buildPostSeoTitle(post: Post): string {
  const keyword = (post.focusKeyword || "").trim();
  const region = (post.region || "").trim();
  const vendor = (post.vendorName || "").trim();
  if (keyword && vendor) return `${keyword} · ${vendor}`;
  if (keyword && region) return `${keyword} 추천 · ${region} 지역 가이드`;
  if (keyword) return `${keyword} 추천 · 매거진 가이드`;
  return post.title;
}

export function buildPostSeoDescription(post: Post): string {
  const keyword = (post.focusKeyword || "").trim();
  const region = (post.region || "").trim();
  const geo = resolveRegionContext(post);
  const raw = (post.excerpt || geo?.regionInfo || stripHtml(post.bodyHtml)).replace(/\s+/g, " ").trim();
  let lead = raw.slice(0, 160);
  if (keyword && !lead.startsWith(keyword)) {
    lead = `${keyword}. ${lead}`.slice(0, 180);
  }
  const extras = [
    geo?.nearbyAreas.length ? `근방 ${geo.nearbyAreas.join(", ")} 검색·비교도 함께 안내합니다.` : region ? `${region} 지역 기준으로 정리했습니다.` : null,
    geo?.nearbyStations.length ? `인근 ${geo.nearbyStations.join(", ")} 동선도 함께 봅니다.` : null,
    post.vendorName ? `${post.vendorName} 안내도 함께 확인할 수 있습니다.` : null,
  ].filter(Boolean);
  return [lead, ...extras].join(" ").replace(/\s+/g, " ").trim().slice(0, 280);
}

export function buildPostKeywords(post: Post, categoryName?: string): string[] {
  const keyword = (post.focusKeyword || "").trim();
  const region = (post.region || "").trim();
  const vendor = (post.vendorName || "").trim();
  const geo = resolveRegionContext(post);
  const values = [
    keyword,
    post.title,
    region,
    region && keyword ? `${region} ${keyword}` : "",
    categoryName,
    vendor,
    vendor && keyword ? `${vendor} ${keyword}` : "",
    ...(geo?.nearbyAreas.flatMap((area) => [area, keyword ? `${area} ${keyword}` : area]) || []),
    ...(geo?.nearbyStations || []),
    ...post.tags,
  ]
    .map((item) => (item || "").trim())
    .filter(Boolean);
  return [...new Set(values)].slice(0, 24);
}

export function fallbackFaqItems(post: Post, categoryName?: string): FaqItem[] {
  const keyword = pageKeyword(post);
  if (!keyword) return [];
  const region = (post.region || "").trim();
  const topic = categoryName || "이 분야";
  const items: FaqItem[] = [
    {
      question: `${keyword} 알아볼 때 먼저 확인할 점은 무엇인가요?`,
      answer: `${keyword}을(를) 찾기 전에는 목적, 예산, 방문 동선이 맞는지부터 정리하는 것이 좋습니다. 이 글은 그 선택 기준을 중심으로 안내합니다.`,
    },
    {
      question: `${region ? `${region}에서 ` : ""}${keyword} 비용은 어떻게 보나요?`,
      answer: `비용은 조건과 시기에 따라 달라집니다. ${keyword}은(는) 광고 문구나 최저가보다 포함 항목과 실제 조건을 함께 보는 편이 안전합니다.`,
    },
    {
      question: `${keyword}, ${topic}에서 어떤 글을 더 보면 좋나요?`,
      answer: `${topic}의 다른 가이드와 함께 보시면 비교가 쉬워집니다. 같은 지역·같은 주제 글은 이 페이지 하단에서 이어서 확인할 수 있습니다.`,
    },
  ];
  if (region) {
    items.push({
      question: `${region} ${keyword}은 근처에서도 알아볼 수 있나요?`,
      answer: `${region}뿐 아니라 생활권이 겹치는 인근에서도 같은 기준으로 비교해 보세요. 이 글 하단의 관련 가이드가 그 동선을 이어 줍니다.`,
    });
  }
  return items.slice(0, 4);
}

export function resolveFaqItems(post: Post, categoryName?: string): FaqItem[] {
  if (post.faqItems?.length) return post.faqItems.slice(0, 5);
  return fallbackFaqItems(post, categoryName);
}

function norm(value?: string) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

export type RelatedCluster = {
  heading: string;
  posts: Post[];
};

export function relatedClusters(post: Post, all: Post[]): RelatedCluster[] {
  const others = all.filter((item) => item.id !== post.id);
  const regionKey = norm(post.region);
  const keywordKey = norm(post.focusKeyword);
  const tags = new Set(post.tags.map((tag) => norm(tag)).filter(Boolean));

  const regionPosts = regionKey
    ? others.filter((item) => norm(item.region) && (norm(item.region).includes(regionKey) || regionKey.includes(norm(item.region)))).slice(0, 6)
    : [];
  const used = new Set(regionPosts.map((item) => item.id));

  const keywordPosts = others
    .filter((item) => {
      if (used.has(item.id)) return false;
      const itemKw = norm(item.focusKeyword);
      if (keywordKey && itemKw && (itemKw === keywordKey || itemKw.includes(keywordKey) || keywordKey.includes(itemKw))) {
        return true;
      }
      return item.tags.some((tag) => tags.has(norm(tag)));
    })
    .slice(0, 6);
  keywordPosts.forEach((item) => used.add(item.id));

  const categoryPosts = others
    .filter((item) => item.category === post.category && !used.has(item.id))
    .slice(0, 6);

  const clusters: RelatedCluster[] = [];
  if (regionPosts.length) {
    clusters.push({
      heading: `${post.region}에서 함께 보는 글`,
      posts: regionPosts,
    });
  }
  if (keywordPosts.length) {
    clusters.push({
      heading: post.focusKeyword ? `${post.focusKeyword}와 이어 읽기` : "같은 주제로 이어 읽기",
      posts: keywordPosts,
    });
  }
  if (categoryPosts.length) {
    clusters.push({
      heading: "같은 분야의 글",
      posts: categoryPosts,
    });
  }
  return clusters;
}

export function buildArticleJsonLd(input: {
  post: Post;
  pageUrl: string;
  description: string;
  keywords: string[];
  siteName: string;
  settings: Settings;
  categoryName?: string;
}) {
  const { post, pageUrl, description, keywords, siteName, settings, categoryName } = input;
  const region = (post.region || "").trim();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: buildPostSeoTitle(post),
    alternativeHeadline: post.title,
    description,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    inLanguage: "ko-KR",
    image: post.coverImage ? [post.coverImage] : undefined,
    keywords: keywords.join(", "),
    articleSection: categoryName,
    author: { "@type": "Organization", name: settings.company || siteName },
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
    about: (() => {
      const geo = resolveRegionContext(post);
      const placeName = geo?.official || region;
      if (!placeName) return { "@type": "Thing", name: pageKeyword(post) };
      return {
        "@type": "Thing",
        name: pageKeyword(post),
        areaServed: [
          {
            "@type": "Place",
            name: placeName,
            address: {
              "@type": "PostalAddress",
              addressCountry: "KR",
              addressLocality: geo?.place || region,
            },
          },
          ...(geo?.nearbyAreas || []).map((area) => ({
            "@type": "Place",
            name: area,
            address: {
              "@type": "PostalAddress",
              addressCountry: "KR",
              addressLocality: area,
            },
          })),
        ],
      };
    })(),
    ...(post.vendorName
      ? {
          mentions: {
            "@type": "LocalBusiness",
            name: post.vendorName,
            telephone: post.vendorPhone,
            url: post.vendorWebsite || post.vendorPlaceUrl,
            areaServed: region || undefined,
          },
        }
      : {}),
  };
}

export function postCanonical(post: Post) {
  return postUrl(post.slug);
}

export function categoryCanonical(slug: string) {
  return siteUrl(`/category/${slug}`);
}
