import { regionHubPath } from "./region-hub";
import {
  PUBLIC_FACTS_BLOCK_CLASS,
  buildPublicFactSection,
  hasPublicFactBlock,
  type PublicFactSection,
} from "./public-facts";
import { extractPlaceName, getNearbyDistricts, getNearbyStations, getRegionFact } from "./region-geo";

export type ArticleBlockInput = {
  html: string;
  place?: string;
  keyword?: string;
  categoryName?: string;
  postId?: string;
  slug?: string;
  title?: string;
};

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function regionLines(place: string): Array<{ label: string; value: string; href?: string }> {
  const fact = getRegionFact(place);
  const nearby = getNearbyDistricts(place);
  const stations = getNearbyStations(place);
  const rows: Array<{ label: string; value: string; href?: string }> = [];
  if (fact?.official) rows.push({ label: "공식 지명", value: fact.official, href: regionHubPath(place) });
  else rows.push({ label: "지역", value: place, href: regionHubPath(place) });
  if (fact?.landmarks?.length) rows.push({ label: "랜드마크", value: fact.landmarks.slice(0, 4).join(", ") });
  if (nearby.length) rows.push({ label: "근방", value: nearby.slice(0, 5).join(", ") });
  if (stations.length) rows.push({ label: "인근 역", value: stations.slice(0, 5).join(", ") });
  return rows;
}

function renderFactTable(rows: Array<{ label: string; value: string; href?: string }>): string {
  if (!rows.length) return "";
  const body = rows
    .map((row) => {
      const value = row.href
        ? `<a href="${escapeHtml(row.href)}">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);
      return `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${value}</td></tr>`;
    })
    .join("");
  return `<table><tbody>${body}</tbody></table>`;
}

export function renderLocalFactBlockHtml(input: {
  place?: string;
  keyword?: string;
  categoryName?: string;
  postId?: string;
  slug?: string;
  title?: string;
}): string {
  const place =
    extractPlaceName(input.place, input.keyword, input.title) || String(input.place || "").trim();
  const keyword = String(input.keyword || input.title || "").trim();
  if (!place) return "";

  const facts = buildPublicFactSection({
    place,
    keyword,
    categoryName: input.categoryName,
    postId: input.postId,
    slug: input.slug,
  });
  const geoRows = regionLines(place);
  const factRows = (facts?.rows || []).map((row) => ({ label: row.label, value: row.value }));
  if (!geoRows.length && !factRows.length) return "";

  const heading = facts?.heading || `${place} 지역 기록`;
  const lead =
    facts?.lead ||
    `${place} 카탈로그·공공 저장본입니다. 없는 상호나 주소를 지어내지 않고, 이 동네에서 ${keyword || "이 주제"}를 볼 때 배경만 적습니다.`;
  const note = facts?.note || "지역 카탈로그 저장본. 없는 가게·주소는 만들지 않습니다.";
  const official = facts?.official || geoRows.find((row) => row.label === "공식 지명")?.value || place;
  const table = renderFactTable([
    { label: "공식 지명", value: official, href: regionHubPath(place) },
    ...geoRows.filter((row) => row.label !== "공식 지명" && row.label !== "지역"),
    ...factRows,
  ]);

  return `<section class="${PUBLIC_FACTS_BLOCK_CLASS} article-facts" data-facts="1">
<h2>${escapeHtml(heading)}</h2>
<p>${escapeHtml(lead)}</p>
${table}
<p class="article-facts-note">${escapeHtml(note)}</p>
</section>`;
}

export function attachLocalFactBlocks(input: ArticleBlockInput): string {
  const html = String(input.html || "");
  if (hasPublicFactBlock(html)) return html;
  const block = renderLocalFactBlockHtml(input);
  if (!block) return html;
  return `${html.trim()}\n${block}`;
}

export function publicFactSectionOrNull(input: ArticleBlockInput): PublicFactSection | null {
  const place =
    extractPlaceName(input.place, input.keyword, input.title) || String(input.place || "").trim();
  return buildPublicFactSection({
    place,
    keyword: String(input.keyword || input.title || "").trim(),
    categoryName: input.categoryName,
    postId: input.postId,
    slug: input.slug,
  });
}
