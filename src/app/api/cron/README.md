# Scheduled publish (Production cron)

Vercel Cron in the repo-root `vercel.json` is the worker. Opening admin is optional catch-up, not required for due jobs.

## Cost: fewer schedules

Hobby plans only run about one cron per day. This template assumes **Pro, but cheap**: 6 daily invocations instead of ~27.

| Path | UTC times | Role |
| --- | --- | --- |
| `/api/cron/bulk-publish` | 00:20, 06:20, 12:20, 18:20 | Plan today + publish **all overdue** bulk keywords. On the hub it also flushes overdue board ads. |
| `/api/cron/hub-board` | 03:50, 15:50 | Hub-only backup. Skip work when the project is not the ops hub. |

Tradeoff: a due post can wait until the next tick (about 6 hours) instead of ~2 hours. Each tick still publishes everything that is already overdue, so reliability stays. Use admin **지금 대기분 처리** if a post must go out sooner.

`maxDuration` stays 300s because one tick may generate several Gemini posts.

## Production only

- Deploy on **Production**. Preview deployments do not run these crons, and handlers skip Preview cron invocations (`reason: "preview"`).
- Persist queues and posts with **Blob or KV**. Without them, Production cannot keep schedule/post state.
- Set **`CRON_SECRET`** on the project so Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Do not invent a value in code.
- If `CRON_SECRET` is unset, handlers still accept a genuine Vercel cron (`x-vercel-cron-schedule` / `User-Agent: vercel-cron/1.0`). They do not rely on the undocumented `x-vercel-cron: 1` header.
- Admin session can POST the same routes to flush overdue items. Admin catch-up polls run every **15 minutes** and only while the schedule is on.

## Operator notes

- One Blob store per site is enough. Watch function GB-hours when many clones share a team.
- Bake public facts into the repo (`npm run facts:build`). Do not call data.go.kr from a page request.
- Public pages use ISR (`revalidate` 5–10 minutes) so a visit is not always a heavy function.
- Gemini runs on cron ticks / explicit generate, not on public page load.
