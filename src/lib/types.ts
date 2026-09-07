export type CategorySlug =
  | "pets"
  | "beauty"
  | "interior"
  | "realestate"
  | "ads"
  | "food"
  | "cooking"
  | "life";

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: CategorySlug;
  tags: string[];
  coverImage?: string;
  focusKeyword?: string;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  theme?: string;
  region?: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
};

export type Partner = {
  id: string;
  name: string;
  category: string;
  intro: string;
  url?: string;
  phone?: string;
};

export type BannerKind = "text" | "image";

export type BannerTheme = "bronze" | "ink" | "ivory" | "forest" | "wine";

export type Banner = {
  id: string;
  kind: BannerKind;
  enabled: boolean;
  href: string;
  theme: BannerTheme;
  kicker?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  geminiApiKey: string;
  geminiModel: string;
  siteName: string;
  siteTagline: string;
};

export type Store = {
  posts: Post[];
  partners: Partner[];
  banners: Banner[];
  settings: Settings;
};
