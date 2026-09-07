import type { Banner, BannerTheme } from "./types";

export const BANNER_THEMES: {
  slug: BannerTheme;
  name: string;
  note: string;
}[] = [
  { slug: "bronze", name: "브론즈", note: "따뜻한 골드 톤" },
  { slug: "ink", name: "잉크", note: "딥 차콜과 금박" },
  { slug: "ivory", name: "아이보리", note: "페이퍼 지면 느낌" },
  { slug: "forest", name: "포레스트", note: "라이프 그린" },
  { slug: "wine", name: "와인", note: "에디토리얼 버건디" },
];

export function isBannerTheme(value: string): value is BannerTheme {
  return BANNER_THEMES.some((t) => t.slug === value);
}

export function safeBannerHref(href: string): string {
  const t = (href || "").trim() || "/";
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* fall through */
  }
  return "/";
}

export function pickRandomBanner(banners: Banner[]): Banner | null {
  const live = banners.filter((b) => b.enabled);
  if (live.length === 0) return null;
  return live[Math.floor(Math.random() * live.length)];
}

const now = "2026-09-07T00:00:00.000Z";

export const seedBanners: Banner[] = [
  {
    id: "banner-default-1",
    kind: "text",
    enabled: true,
    href: "/",
    theme: "bronze",
    kicker: "infocs magazine",
    title: "매거진 원고를 무료로 배포합니다",
    subtitle: "네이버 검색 상단 노출까지, 브랜드의 이야기를 더 멀리 전합니다.",
    ctaLabel: "바로가기",
    createdAt: now,
    updatedAt: now,
  },
];
