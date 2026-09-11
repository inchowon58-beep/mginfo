import { isAdminSession } from "./auth";

/**
 * Production scheduled publish is driven by Vercel Cron (`vercel.json`), not by opening admin.
 *
 * Operators: Production deployment + Blob/KV storage. Set `CRON_SECRET` so Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` (do not invent a value here).
 *
 * Vercel docs (not the undocumented `x-vercel-cron: 1` header):
 * - When `CRON_SECRET` is set, cron invocations include `Authorization: Bearer ${CRON_SECRET}`.
 * - Every cron request also includes `x-vercel-cron-schedule` (the triggering expression)
 *   and `User-Agent: vercel-cron/1.0`.
 * - If `CRON_SECRET` is unset, still allow a genuine Vercel cron via those documented
 *   headers so Production does not 401. Admin session remains optional catch-up.
 */
export function isVercelCronInvocation(request: Request): boolean {
  const schedule = request.headers.get("x-vercel-cron-schedule")?.trim();
  if (schedule) return true;
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  return ua.includes("vercel-cron");
}

export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (!secret && isVercelCronInvocation(request)) return true;
  return false;
}

/** Preview/dev deployments must not spend cron or Gemini budget. Production only. */
export function isPreviewDeployment(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production";
}

export function isPreviewCron(request: Request): boolean {
  return isPreviewDeployment() && isCronRequest(request);
}

export async function allowCronOrAdmin(request: Request): Promise<boolean> {
  if (isCronRequest(request)) return true;
  return isAdminSession();
}
