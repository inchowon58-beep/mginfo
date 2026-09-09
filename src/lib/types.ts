export type CategorySlug = string;

export type Category = {
  slug: string;
  name: string;
  color: string;
  filterClass: string;
  geminiNotes?: string;
};

export type PostStatus = "draft" | "published";

export type FaqItem = {
  question: string;
  answer: string;
};

export type PostImage = {
  url: string;
  caption?: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: CategorySlug;
  tags: string[];
  coverImage?: string;
  coverCaption?: string;
  extraImages?: PostImage[];
  focusKeyword?: string;
  faqItems?: FaqItem[];
  regionInfo?: string;
  nearbyAreas?: string[];
  nearbyStations?: string[];
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
  hubCampaignId?: string;
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
  imageUrl?: string;
};

export type AdVendor = {
  id: string;
  name: string;
  category?: string;
  intro?: string;
  phone?: string;
  website?: string;
  kakao?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
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

export type SiteThemeId =
  | "folio"
  | "press"
  | "night"
  | "journal"
  | "qna"
  | "talk"
  | "portal"
  | "carrot"
  | "studio";

export type Settings = {
  geminiApiKey: string;
  geminiModel: string;
  siteName: string;
  siteTagline: string;
  siteTheme: SiteThemeId;
  carrotKeywords: string;
  popupEnabled: boolean;
  popupTitle: string;
  popupBody: string;
  popupCta: string;
  popupHref: string;
  popupImage: string;
  likeCountMin: number;
  likeCountMax: number;
  commentCountMin: number;
  commentCountMax: number;
  usableUntil: string;
  dailyPostLimit: number;
  naverRankWork: boolean;
  naverSiteVerification: string;
  extraImagesEnabled: boolean;
  writingTone: string;
  writingPersona: string;
  siteUsername: string;
  sitePassword: string;
  company: string;
  ceo: string;
  bizNo: string;
  address: string;
  phone: string;
  email: string;
};

export type BulkKeywordStatus = "queued" | "scheduled" | "processing" | "published" | "failed";

export type BulkKeyword = {
  id: string;
  keyword: string;
  status: BulkKeywordStatus;
  postId?: string;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
};

export type BulkGroup = {
  id: string;
  category: CategorySlug;
  dailyLimit: number;
  vendorName?: string;
  vendorPhone?: string;
  vendorWebsite?: string;
  vendorKakao?: string;
  writingStyle?: string;
  imagePool?: string[];
  imageCountMin?: number;
  imageCountMax?: number;
  imageCount?: number;
  keywords: BulkKeyword[];
};

export type BulkSchedule = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  planDate: string;
};

export type BulkPublishState = {
  schedule: BulkSchedule;
  groups: BulkGroup[];
};

export type Store = {
  posts: Post[];
  partners: Partner[];
  adVendors: AdVendor[];
  banners: Banner[];
  categories: Category[];
  settings: Settings;
  bulkPublish: BulkPublishState;
};
