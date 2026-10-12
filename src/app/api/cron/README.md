# Scheduled publish (Production cron)

**현재 상태: 발행 일시중지 (`PUBLISHING_PAUSED` 기본 ON)**  
`vercel.json`의 `crons`는 비어 있고, 크론/대량발행/허브게시판 푸시는 코드에서 즉시 skip 합니다.  
다시 켜려면:

1. `vercel.json`에 원하는 cron 스케줄을 복구
2. 환경변수 `PUBLISHING_PAUSED=0` 설정 후 재배포

---

Vercel Cron in the repo-root `vercel.json` is the worker. Opening admin is optional catch-up, not required for due jobs.

## Cost: fewer schedules

Hobby plans only run about one cron per day. This template assumes **Pro, but cheap** when crons are enabled.

| Path | Role |
| --- | --- |
| `/api/cron/bulk-publish` | Plan today + publish due bulk keywords. On the hub it also flushes overdue board ads. |
| `/api/cron/hub-board` | Hub-only backup. Skip work when the project is not the ops hub. |
| `/api/cron/hub-portal` | Hub portal feed collect (disabled while paused). |

## Kill switch

- `src/lib/publishing-paused.ts` — default paused (`PUBLISHING_PAUSED` unset or `1`)
- Set `PUBLISHING_PAUSED=0` to re-enable publishing paths after crons are restored
