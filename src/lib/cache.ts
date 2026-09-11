/** Public HTML/JSON can stay stale a few minutes. Avoids a full serverless render on every visit. */
export const PUBLIC_REVALIDATE_SECONDS = 300;

/** Sitemap/RSS change less often than article HTML. */
export const FEED_REVALIDATE_SECONDS = 600;
