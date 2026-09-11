import { bodiesTooSimilar, findSimilarBody, htmlToCompareText } from "../src/lib/body-uniqueness";
import { isCronRequest, isPreviewCron, isPreviewDeployment } from "../src/lib/cron-auth";
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

assert(
  bodiesTooSimilar(
    "<p>부천에서 애견미용을 고를 때는 대기와 컷 동선을 먼저 봅니다. 중동과 상동을 이어서 비교하면 선택이 분명해집니다.</p>",
    "<p>부천에서 애견미용을 고를 때는 대기와 컷 동선을 먼저 봅니다. 중동과 상동을 이어서 비교하면 선택이 분명해집니다.</p>"
  ),
  "identical bodies are similar"
);
assert(
  bodiesTooSimilar(
    "<p>부천 중동에서 말티즈 미용 대기 줄이는 법을 적습니다. 컷 전 빗질과 귀가 먼저입니다.</p><p>상동까지 이어서 보면 가격대보다 동선이 갈립니다.</p>",
    "<p>부천 중동에서 말티즈 미용 대기 줄이는 법을 적습니다. 컷 전 빗질과 귀가 먼저입니다.</p><p>상동까지 이어서 보면 가격대보다 동선이 갈립니다. 같은 내용입니다.</p>"
  ),
  "near-duplicate bodies are similar"
);
assert(
  !bodiesTooSimilar(
    "<p>부천 중동 말티즈 미용은 귀가와 발 커트가 먼저입니다.</p>",
    "<p>인천 송도 펫호텔은 산책 동선과 소음이 갈립니다.</p>"
  ),
  "different bodies pass"
);
assert(
  !htmlToCompareText('<section class="public-facts-block article-facts"><p>영업 중 동물병원 100곳</p></section><p>본문만</p>').includes(
    "동물병원"
  ),
  "fact block is stripped before compare"
);
assert(findSimilarBody("<p>같은 본문</p>", ["<p>같은 본문</p>"]), "finds similar body");

const prevVercel = process.env.VERCEL;
const prevEnv = process.env.VERCEL_ENV;
process.env.VERCEL = "1";
process.env.VERCEL_ENV = "preview";
assert(isPreviewDeployment(), "preview env is detected");
assert(
  isPreviewCron(
    new Request("http://local/api/cron/bulk-publish", { headers: { "user-agent": "vercel-cron/1.0" } })
  ),
  "preview vercel cron is marked skip"
);
process.env.VERCEL_ENV = "production";
assert(!isPreviewDeployment(), "production is not preview");
if (prevVercel === undefined) delete process.env.VERCEL;
else process.env.VERCEL = prevVercel;
if (prevEnv === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevEnv;

console.log("publish guards ok");
