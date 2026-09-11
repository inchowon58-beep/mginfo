# Vercel cron cost vs bulk throughput

Hobby/Pro cron invocations and function duration are the main cost of 대량발행예약. Do **not** restore the old ~27-cron list (hourly bulk + hourly hub-board). Opening admin is not part of the 50편/일 path.

## Current Production schedule

`vercel.json` has **10** cron expressions:

| Route | Times/day | Role |
| ----- | --------- | ---- |
| `/api/cron/bulk-publish` | **8** (every 3h UTC, `:20`) | Plan today’s slots and publish due keywords. Also flushes overdue hub-board ads on the ops hub. |
| `/api/cron/hub-board` | **2** (`00:05` / `12:05` UTC) | Modest dedicated hub-board catch-up. |

Each bulk tick has `maxDuration` 300s and `MAX_PER_TICK=8`. After ~240s elapsed it stops starting new Gemini jobs so a full tick of 8 is less likely to hard-timeout.

## Capacity

| | |
| --- | --- |
| Theoretical | 8 ticks × 8/tick ≈ **64편/일** |
| Practical target | ~**50편/일** (slow Gemini calls, budget stop, overnight windows with nothing due) |

Cron alone is enough for that target. Do not add more cron expressions to chase 50편.

## Admin limits that must match

Throughput is the **minimum** of cron capacity and the quotas in admin:

- Site **하루 작성 한도** (`dailyPostLimit`) ≥ 50 (0 = unlimited).
- Each 대량발행 그룹 **하루발행수량** ≥ 50 when that group should carry the day’s volume (saved cap is 1–80).

If those limits stay at 16–40, extra cron ticks will idle.
