# Scheduled publish (Production cron)

Vercel Cron in the repo-root `vercel.json` is the worker. Opening admin is optional catch-up, not required for due jobs.

- Deploy on **Production**. Preview deployments do not run these crons.
- Persist queues and posts with **Blob or KV**. Without them, Production cannot keep schedule/post state.
- Set **`CRON_SECRET`** on the project so Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Do not invent a value in code.
- If `CRON_SECRET` is unset, handlers still accept a genuine Vercel cron (`x-vercel-cron-schedule` / `User-Agent: vercel-cron/1.0`). They do not rely on the undocumented `x-vercel-cron: 1` header.
- Admin session can POST the same routes to flush overdue items.
