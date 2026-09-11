import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { JsonLd } from "@/components/seo/JsonLd";
import { CategoryBar } from "@/components/CategoryBar";
import { PageMast } from "@/components/PageMast";
import { PostCard } from "@/components/PostCard";
import { displaySiteName } from "@/lib/categories";
import { getPublishedPosts, getSettings } from "@/lib/db";
import { PUBLIC_FACTS_UPDATED, allPublicFactRows, lookupPublicFacts } from "@/lib/public-facts";
import {
  nearbyRegionLinks,
  postsForRegion,
  regionHubPath,
  regionHubSlug,
  resolveRegionHubPlace,
} from "@/lib/region-hub";
import { getNearbyStations, getRegionFact } from "@/lib/region-geo";
import { siteUrl } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/site-jsonld";

export const revalidate = 300;

function regionCanonical(place: string) {
  return siteUrl(regionHubPath(place));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = resolveRegionHubPlace(slug);
  if (!place) return { title: "지역" };
  const posts = postsForRegion(await getPublishedPosts(), place);
  const settings = await getSettings();
  const name = displaySiteName(settings.siteName);
  const official = getRegionFact(place)?.official || lookupPublicFacts(place)?.official || place;
  const description = `${official} 지역 글 ${posts.length}편. 공공 저장본과 내부 링크로 ${place} 글을 모았습니다.`;
  return {
    title: `${place} 지역 가이드`,
    description,
    keywords: [place, official, `${place} 가이드`, name],
    alternates: { canonical: regionCanonical(place) },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${place} 지역 가이드`,
      description,
      url: regionCanonical(place),
      siteName: name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = resolveRegionHubPlace(slug);
  if (!place) notFound();
  const theme = await getPublicTheme();
  const [all, settings] = await Promise.all([getPublishedPosts(), getSettings()]);
  const posts = postsForRegion(all, place);
  const fact = getRegionFact(place);
  const official = fact?.official || lookupPublicFacts(place)?.official || place;
  const factRows = allPublicFactRows(place);
  const stations = getNearbyStations(place);
  const nearby = nearbyRegionLinks(place);
  const siteName = displaySiteName(settings.siteName);
  const crumbs = [
    { name: "홈", path: "/" },
    { name: "글", path: "/posts" },
    { name: `${place} 지역`, path: `/region/${regionHubSlug(place)}` },
  ];

  return (
    <SiteFrame active="posts">
      <JsonLd
        data={[
          buildCollectionPageJsonLd({
            name: `${place} 지역 가이드`,
            description: `${official} 지역 글 ${posts.length}편`,
            path: `/region/${regionHubSlug(place)}`,
            keywords: [place, official, `${place} 가이드`],
            count: posts.length,
            siteName,
          }),
          buildBreadcrumbJsonLd(crumbs),
        ]}
      />
      <PageMast
        themeId={theme.id}
        kicker="지역"
        title={`${place} 가이드`}
        dek={`${official}에서 발행된 글과 공공 저장본입니다. 없는 상호·주소는 만들지 않습니다.`}
      />
      <main className="container">
        <CategoryBar />
        <section className="region-hub-facts article-facts">
          <h2>{place} 공공·지역 기록</h2>
          <p>{official} 카탈로그·공공 저장본입니다. 추천 가게 목록이 아니며, 없는 상호나 주소는 만들지 않습니다.</p>
          <table>
            <tbody>
              <tr>
                <th scope="row">공식 지명</th>
                <td>{official}</td>
              </tr>
              {fact?.landmarks?.length ? (
                <tr>
                  <th scope="row">랜드마크</th>
                  <td>{fact.landmarks.slice(0, 4).join(", ")}</td>
                </tr>
              ) : null}
              {stations.length ? (
                <tr>
                  <th scope="row">인근 역</th>
                  <td>{stations.join(", ")}</td>
                </tr>
              ) : null}
              {factRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="article-facts-note">
            {PUBLIC_FACTS_UPDATED
              ? `저장본 ${PUBLIC_FACTS_UPDATED} · 국가동물보호정보시스템·지방인허가·한국관광공사 TourAPI.`
              : "공공 저장본."}{" "}
            폐업·이전은 반영이 늦을 수 있습니다.
          </p>
        </section>
        {nearby.length ? (
          <nav className="region-hub-links" aria-label="가까운 지역">
            <h2>{place} 근처</h2>
            <ul>
              {nearby.map((item) => (
                <li key={item.place}>
                  <Link href={item.href}>{item.place}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {posts.length ? (
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="empty-note">이 지역으로 발행된 글이 아직 없습니다.</p>
        )}
      </main>
    </SiteFrame>
  );
}
