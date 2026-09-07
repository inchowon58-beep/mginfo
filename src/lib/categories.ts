import type { CategorySlug } from "./types";

export type Category = {
  slug: CategorySlug;
  name: string;
  filterClass: string;
  color: string;
};

export const CATEGORIES: Category[] = [
  { slug: "pets", name: "반려동물", filterClass: "g-pets", color: "#f59e0b" },
  { slug: "beauty", name: "뷰티", filterClass: "g-beauty", color: "#ec4899" },
  { slug: "interior", name: "인테리어/철거", filterClass: "g-interior", color: "#3b82f6" },
  { slug: "realestate", name: "부동산", filterClass: "g-realestate", color: "#8b5cf6" },
  { slug: "ads", name: "온리인광고", filterClass: "g-ads", color: "#2563eb" },
  { slug: "food", name: "맛집", filterClass: "g-food", color: "#ef4444" },
  { slug: "cooking", name: "요리", filterClass: "g-cooking", color: "#ea580c" },
  { slug: "life", name: "라이프", filterClass: "g-life", color: "#10b981" },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByName(name: string): Category | undefined {
  return CATEGORIES.find((c) => c.name === name);
}

export const SITE = {
  name: "infocs 매거진",
  english: "infocs magazine",
  domain: "magazine.infocs.co.kr",
  tagline: "Curated Life & Trend",
  titleLine: "Curated Life & Trend, 매거진",
  description:
    "깊이 있는 이야기와 실생활에 유용한 가이드를 전합니다.",
  company: "주식회사 인포씨에스",
  ceo: "조춘원",
  bizNo: "224-87-00683",
  address: "경기 부천시 길주로 246",
  email: "info@infocs.co.kr",
};
