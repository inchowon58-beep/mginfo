import {
  HUB_TICK_SOLO,
  HUB_TICK_WITH_BULK,
  appendCampaignKeywords,
  hubBoardTodaySummary,
  hubTodayProgress,
  parseHubCampaign,
  parseHubCampaigns,
  pickHubTickKeywords,
  type HubBoardCampaign,
} from "../src/lib/hub-board";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function sample(partial: Record<string, unknown> = {}): HubBoardCampaign {
  const parsed = parseHubCampaign({
    id: "c1",
    title: "자유게시판 광고",
    vendorName: "아가펫",
    vendorId: "v1",
    dailyLimit: 100,
    siteIds: ["s1"],
    schedule: { enabled: true, startHour: 9, endHour: 23 },
    createdAt: "2026-09-10T00:00:00.000Z",
    keywords: [],
    ...partial,
  });
  if (!parsed) throw new Error("failed to parse sample campaign");
  return parsed;
}

assert(HUB_TICK_SOLO === 12, "solo tick publishes 12");
assert(HUB_TICK_WITH_BULK === 6, "bulk tick publishes 6 hub ads");
assert(HUB_TICK_SOLO + HUB_TICK_WITH_BULK * 8 >= 60, "cron capacity covers a real daily cap");

const replaced = parseHubCampaign({ vendorName: "새업체", vendorId: "v2", vendorPhone: "010-1111-2222" }, sample());
assert(replaced?.vendorName === "새업체", "vendor name can be replaced");
assert(replaced?.vendorId === "v2", "vendor id can be replaced");
assert(replaced?.vendorPhone === "010-1111-2222", "vendor phone can be replaced");

const kept = parseHubCampaign({ title: "이름만 바꿈" }, sample({ vendorName: "아가펫", vendorId: "v1" }));
assert(kept?.vendorName === "아가펫", "omitted vendor keeps current");

const appended = appendCampaignKeywords(sample({ keywords: [{ id: "k1", keyword: "부천 미용", status: "queued" }] }), [
  "부천 미용",
  "인천 펫샵",
]);
assert(appended.added === 1, "skips duplicate keyword");
assert(appended.campaign.keywords.length === 2, "adds the new keyword");
assert(appended.campaign.topKeyword === "부천 미용", "keeps first keyword as top");
assert(appended.campaign.keywordCount === 2, "keyword count follows the list");

const now = new Date("2026-09-14T03:00:00.000Z"); // 12:00 Seoul
const dueAt = new Date("2026-09-14T01:00:00.000Z").toISOString();
const laterToday = new Date("2026-09-14T10:00:00.000Z").toISOString();
const campaign = sample({
  keywords: [
    { id: "due", keyword: "지금", status: "scheduled", scheduledAt: dueAt },
    { id: "later", keyword: "저녁", status: "scheduled", scheduledAt: laterToday },
    { id: "wait", keyword: "대기", status: "queued" },
    {
      id: "done",
      keyword: "완료",
      status: "published",
      publishedAt: "2026-09-14T00:30:00.000Z",
    },
  ],
});

const picked = pickHubTickKeywords([campaign], 4, now);
assert(picked[0]?.keyword.id === "due", "due keyword comes first");
assert(picked.some((row) => row.keyword.id === "later"), "today's remaining scheduled ads are not left until night");
assert(!picked.some((row) => row.keyword.id === "wait"), "queued ads wait for planning");
assert(picked.length === 2, "only due + remaining scheduled today");

const progress = hubTodayProgress(campaign, now);
assert(progress.publishedToday === 1, "counts published today");
assert(progress.scheduledToday === 2, "counts remaining scheduled today");
assert(progress.waiting === 1, "counts queued");
assert(progress.dailyLimit === 100, "exposes daily cap");
assert(progress.remainingToday === 97, "remaining is cap minus published and scheduled");
assert(progress.topKeyword === "지금", "uses the first remaining keyword as top");

const summary = hubBoardTodaySummary(
  [
    campaign,
    sample({
      id: "c2",
      dailyLimit: 20,
      keywords: [{ id: "x", keyword: "다른업체", status: "queued" }],
    }),
  ],
  now
);
assert(summary.dailyLimit === 120, "sums daily caps");
assert(summary.publishedToday === 1, "sums published");
assert(summary.waiting === 2, "sums waiting");

const listed = parseHubCampaigns([campaign, { vendorName: "" }]);
assert(listed.length >= 1, "parseHubCampaigns keeps campaigns");
assert(listed[0].keywordCount >= listed[0].keywords.length, "listed count does not shrink below remaining keywords");

console.log("verify-hub-board ok");
