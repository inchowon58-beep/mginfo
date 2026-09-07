export type CategorySlug = string;

export type Category = {
  slug: string;
  name: string;
  color: string;
  filterClass: string;
  geminiNotes?: string;
};

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

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
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

export type SiteThemeId = "folio" | "press" | "night" | "journal" | "qna" | "talk" | "portal" | "carrot";

export type Settings = {
  geminiApiKey: string;
  geminiModel: string;
  siteName: string;
  siteTagline: string;
  siteTheme: SiteThemeId;
  carrotKeywords: string;
  likeCountMin: number;
  likeCountMax: number;
  commentCountMin: number;
  commentCountMax: number;
  company: string;
  ceo: string;
  bizNo: string;
  address: string;
  phone: string;
  email: string;
};

export type Store = {
  posts: Post[];
  partners: Partner[];
  banners: Banner[];
  categories: Category[];
  settings: Settings;
};
