import fs from "node:fs";
import { attachLocalFactBlocks, renderLocalFactBlockHtml } from "../src/lib/article-blocks";
import { missingSiteIdentityFields, siteIdentityReady } from "../src/lib/site-identity";
import { hasPublicFactBlock } from "../src/lib/public-facts";
import { postsForRegion, regionHubPath, regionHubSlug, resolveRegionHubPlace } from "../src/lib/region-hub";
import { cleanHtml } from "../src/lib/sanitize";
import type { Post } from "../src/lib/types";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const block = renderLocalFactBlockHtml({
  place: "부천",
  keyword: "부천 애견미용",
  categoryName: "반려동물",
  slug: "bucheon-grooming",
});
assert(block.includes("public-facts-block"), "renders fact block class");
assert(block.includes("<table>"), "uses a visible table");
assert(block.includes("공식 지명"), "includes official place");
assert(block.includes("/region/"), "links to region hub");
assert(!block.includes("<script"), "no script tags");

const injected = attachLocalFactBlocks({
  html: "<h2>본문</h2><p>부천에서 미용을 고릅니다.</p>",
  place: "부천",
  keyword: "부천 애견미용",
  categoryName: "반려동물",
});
assert(hasPublicFactBlock(injected), "injects when missing");
const twice = attachLocalFactBlocks({
  html: injected,
  place: "부천",
  keyword: "부천 애견미용",
  categoryName: "반려동물",
});
assert(twice === injected, "does not duplicate the block");
assert(cleanHtml(injected).includes("public-facts-block"), "sanitize keeps the block");
assert(cleanHtml(injected).includes("<table>"), "sanitize keeps the table");

assert(resolveRegionHubPlace("부천") === "부천" || Boolean(resolveRegionHubPlace("부천")), "resolves 부천");
assert(regionHubSlug("부천") === "부천", "korean slug stays readable");
assert(regionHubPath("부천").startsWith("/region/"), "region path");

const posts = [
  {
    id: "1",
    slug: "a",
    title: "부천 애견미용 대기",
    excerpt: "",
    bodyHtml: "<p>x</p>",
    category: "pets",
    tags: [],
    status: "published",
    publishedAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    region: "부천",
    focusKeyword: "부천 애견미용",
  },
  {
    id: "2",
    slug: "b",
    title: "인천 펫호텔",
    excerpt: "",
    bodyHtml: "<p>y</p>",
    category: "pets",
    tags: [],
    status: "published",
    publishedAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    region: "인천",
    focusKeyword: "인천 펫호텔",
  },
] as Post[];
assert(postsForRegion(posts, "부천").length === 1, "filters posts by place");
assert(postsForRegion(posts, "중동").length === 1, "same-city nearby still matches 부천 root");

assert(missingSiteIdentityFields({ company: "", phone: "", address: "" }).join(" · ") === "상호 · 연락처 · 주소", "all missing");
assert(!siteIdentityReady({ company: "상호만", phone: "", address: "" }), "partial identity is not ready");
assert(siteIdentityReady({ company: "상호", phone: "010", address: "부천" }), "complete identity");
assert(missingSiteIdentityFields({ company: "상호", phone: "010", address: "부천" }).length === 0, "no missing when filled");

const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
assert(Array.isArray(vercel.crons) && vercel.crons.length <= 8, "cron count is reduced");
assert(
  vercel.crons.every((row: { path: string }) => row.path === "/api/cron/bulk-publish" || row.path === "/api/cron/hub-board"),
  "only known cron paths"
);

console.log("region uniqueness ok");
