# Scheduled publish (Production cron)

Vercel Cron in the repo-root `vercel.json` is the worker. Opening admin is optional catch-up, not required for due jobs. The 50편/일 path is cron-only.

- Deploy on **Production**. Preview deployments do not run these crons.
- Persist queues and posts with **Blob or KV**. Without them, Production cannot keep schedule/post state.
- Set **`CRON_SECRET`** on the project so Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Do not invent a value in code.
- If `CRON_SECRET` is unset, handlers still accept a genuine Vercel cron (`x-vercel-cron-schedule` / `User-Agent: vercel-cron/1.0`). They do not rely on the undocumented `x-vercel-cron: 1` header.
- Admin session can POST the same routes to flush overdue items.

## Cron jobs (do not restore the old 27-cron list)

**대량발행예약** `/api/cron/bulk-publish` — 8 times/day, every 3 hours UTC (minute 20). Each tick publishes up to `MAX_PER_TICK=8` due keywords. On the ops hub it also flushes overdue hub-board ads.

| UTC | KST (UTC+9) |
| --- | ----------- |
| 00:20 | 09:20 |
| 03:20 | 12:20 |
| 06:20 | 15:20 |
| 09:20 | 18:20 |
| 12:20 | 21:20 |
| 15:20 | 00:20 next day |
| 18:20 | 03:20 |
| 21:20 | 06:20 |

**허브 게시판** `/api/cron/hub-board` — 2 times/day (modest). Bulk ticks already flush overdue hub ads on the ops hub.

| UTC | KST (UTC+9) |
| --- | ----------- |
| 00:05 | 09:05 |
| 12:05 | 21:05 |

## Daily capacity

- Theoretical ceiling: 8 ticks × 8 posts/tick ≈ **64편/일**.
- Practical target: about **50편/일** (Gemini latency, 240s tick budget before `maxDuration` 300s, and some empty windows).
- Site `dailyPostLimit` and each bulk group’s **하루발행수량** in admin must be **≥50** (group cap is 80) or cron will stop at the smaller quota even if ticks remain.
