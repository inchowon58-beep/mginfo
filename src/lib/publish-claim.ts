/** Longer than cron `maxDuration` (300s) so a live tick is not stolen; short enough to recover a timeout. */
export const PROCESSING_STALE_MS = 8 * 60 * 1000;

export function isStaleProcessing(processingAt?: string, now = new Date()): boolean {
  if (!processingAt) return true;
  const started = new Date(processingAt).getTime();
  if (!Number.isFinite(started)) return true;
  return now.getTime() - started >= PROCESSING_STALE_MS;
}

export function canClaimDueKeyword(
  status: string,
  processingAt?: string,
  now = new Date()
): boolean {
  if (status === "scheduled") return true;
  return status === "processing" && isStaleProcessing(processingAt, now);
}

export function canClaimManualKeyword(
  status: string,
  processingAt?: string,
  now = new Date()
): boolean {
  if (status === "published") return false;
  if (status === "processing") return isStaleProcessing(processingAt, now);
  return status === "queued" || status === "scheduled" || status === "failed";
}
