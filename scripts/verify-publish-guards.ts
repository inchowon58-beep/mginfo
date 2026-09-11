import { isCronRequest } from "../src/lib/cron-auth";
import { canClaimDueKeyword, canClaimManualKeyword, isStaleProcessing, PROCESSING_STALE_MS } from "../src/lib/publish-claim";
import {
  collectRecentTitles,
  collectTodayKeywords,
  differentiateTitle,
  findSimilarTitle,
  normalizeTitle,
  titlesTooSimilar,
} from "../src/lib/title-uniqueness";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

assert(normalizeTitle("  부천  애견미용 ") === "부천 애견미용", "normalize whitespace");
assert(titlesTooSimilar("부천 애견미용 가격 비교", "부천 애견미용 가격 비교"), "exact duplicate");
assert(titlesTooSimilar("부천 애견미용 가격 비교 가이드", "부천 애견미용 가격 비교"), "contains near-duplicate");
assert(!titlesTooSimilar("부천 애견미용 대기 줄이는 법", "인천 펫호텔 예약 전 확인할 것"), "different topics");
assert(findSimilarTitle("강남 맛집 점심 추천", ["강남 맛집 점심 추천 리스트"]), "finds similar");

const rewritten = differentiateTitle("부천 애견미용 가격 비교", ["부천 애견미용 가격 비교"], "현장 기준");
assert(rewritten !== "부천 애견미용 가격 비교", "suffix changes title");
assert(!titlesTooSimilar(rewritten, "부천 애견미용 가격 비교"), "suffix is not a near-duplicate");

const today = new Date();
const titles = collectRecentTitles(
  [
    { title: "오늘 글", publishedAt: today.toISOString(), createdAt: today.toISOString() },
    { title: "예전 글", publishedAt: "2020-01-01T00:00:00.000Z", createdAt: "2020-01-01T00:00:00.000Z" },
  ],
  ["추가 제목"]
);
assert(titles.includes("오늘 글"), "keeps today's title");
assert(titles.includes("추가 제목"), "keeps extra title");

const keywords = collectTodayKeywords([
  { keyword: "부천 애견미용", status: "published", publishedAt: today.toISOString() },
  { keyword: "어제 키워드", status: "published", publishedAt: "2020-01-01T00:00:00.000Z" },
  { keyword: "작성중", status: "processing", publishedAt: today.toISOString() },
]);
assert(keywords.includes("부천 애견미용"), "today published keyword");
assert(!keywords.includes("어제 키워드"), "skips old keyword");
assert(!keywords.includes("작성중"), "skips processing keyword");

const fresh = new Date().toISOString();
assert(!isStaleProcessing(fresh), "fresh processing is not stale");
assert(isStaleProcessing(new Date(Date.now() - PROCESSING_STALE_MS - 1000).toISOString()), "old processing is stale");
assert(isStaleProcessing(undefined), "missing timestamp is stale");
assert(canClaimDueKeyword("scheduled"), "scheduled is claimable");
assert(!canClaimDueKeyword("processing", fresh), "fresh processing is not due-claimable");
assert(canClaimDueKeyword("processing", new Date(Date.now() - PROCESSING_STALE_MS - 1).toISOString()), "stale processing is due-claimable");
assert(!canClaimManualKeyword("published"), "published is not manual-claimable");
assert(!canClaimManualKeyword("processing", fresh), "fresh processing is not manual-claimable");
assert(canClaimManualKeyword("failed"), "failed is manual-claimable");

const prevSecret = process.env.CRON_SECRET;
delete process.env.CRON_SECRET;
assert(!isCronRequest(new Request("http://local/api/cron/bulk-publish")), "anonymous is denied when secret unset");
assert(
  !isCronRequest(
    new Request("http://local/api/cron/bulk-publish", { headers: { "x-vercel-cron": "1" } })
  ),
  "undocumented x-vercel-cron: 1 is not enough"
);
assert(
  isCronRequest(
    new Request("http://local/api/cron/bulk-publish", { headers: { "x-vercel-cron-schedule": "20 15 * * *" } })
  ),
  "documented schedule header is enough when secret unset"
);
assert(
  isCronRequest(
    new Request("http://local/api/cron/bulk-publish", { headers: { "user-agent": "vercel-cron/1.0" } })
  ),
  "vercel-cron user-agent is enough when secret unset"
);
process.env.CRON_SECRET = "test-secret-value";
assert(
  !isCronRequest(
    new Request("http://local/api/cron/bulk-publish", { headers: { "x-vercel-cron-schedule": "20 15 * * *" } })
  ),
  "schedule header is not enough when secret is set"
);
assert(
  isCronRequest(
    new Request("http://local/api/cron/bulk-publish", { headers: { authorization: "Bearer test-secret-value" } })
  ),
  "bearer secret is accepted"
);
if (prevSecret === undefined) delete process.env.CRON_SECRET;
else process.env.CRON_SECRET = prevSecret;

console.log("publish guards ok");
