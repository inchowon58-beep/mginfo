export type HubPortalConfig = {
  enabled: boolean;
};

export type HubPortalPost = {
  id: string;
  url: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  categoryLabel: string;
  region: string;
  siteName: string;
  domain: string;
  publishedAt: string;
};

export type HubPortalFeed = {
  updatedAt: string;
  posts: HubPortalPost[];
  categories: Array<{ slug: string; label: string; count: number }>;
  regions: Array<{ key: string; label: string; count: number }>;
  sites: Array<{ domain: string; siteName: string; ok: boolean; count: number; error?: string }>;
};

export const HUB_PORTAL_STALE_MS = 60 * 60 * 1000;
