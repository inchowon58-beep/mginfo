/**
 * 글 발행·크론·허브→클론 푸시를 전면 중지하는 킬스위치.
 * 기본값 ON(중지). 다시 켤 때만 환경변수 PUBLISHING_PAUSED=0|false|off
 */
export function isPublishingPaused() {
  const raw = String(process.env.PUBLISHING_PAUSED ?? "1").trim().toLowerCase();
  if (!raw) return true;
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

export const PUBLISHING_PAUSED_REASON = "publishing-paused";
