import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { CategoryBar } from "@/components/CategoryBar";
import { PageMast } from "@/components/PageMast";
import { PostCard } from "@/components/PostCard";
import { SearchForm } from "@/components/SearchForm";
import { BlogEntry } from "@/components/themes/BlogEntry";
import { BlogSidebar } from "@/components/themes/BlogSidebar";
import { NightList } from "@/components/themes/NightList";
import { QnaList } from "@/components/themes/QnaList";
import { TalkThread } from "@/components/themes/TalkThread";
import { PortalRank } from "@/components/themes/PortalRank";
import { CarrotList } from "@/components/themes/CarrotList";
import { StudioList } from "@/components/themes/StudioList";
import { getPartners, getPublishedPosts, getSettings } from "@/lib/db";
import { displaySiteName } from "@/lib/categories";
import { stripHtml } from "@/lib/format";
import { siteUrl } from "@/lib/seo";
import { buildCollectionPageJsonLd } from "@/lib/site-jsonld";
import { getThemeChrome } from "@/lib/theme-chrome";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const settings = await getSettings();
  const name = displaySiteName(settings.siteName);
  if (q) {
    return {
      title: `"${q}" 검색`,
      robots: { index: false, follow: true },
    };
  }
  const description = `${name}에 발행된 전체 가이드를 한곳에서 봅니다. 분야별 선택 기준과 현장 정보를 이어서 확인하세요.`;
  return {
    title: "전체 글",
    description,
    keywords: [name, "매거진", "전체 글", "가이드"],
    alternates: { canonical: siteUrl("/posts") },
    robots: { index: true, follow: true },
    openGraph: {
      title: "전체 글",
      description,
      url: siteUrl("/posts"),
      siteName: name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const theme = await getPublicTheme();
  const chrome = getThemeChrome(theme.id);
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || 1));
  const perPage = 12;
  const published = await getPublishedPosts();
  const all = published.filter((p) => {
    if (!q) return true;
    const hay = `${p.title} ${p.excerpt} ${stripHtml(p.bodyHtml)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const slice = all.slice((page - 1) * perPage, page * perPage);
  const partners = theme.id === "journal" ? await getPartners() : [];
  const settings = await getSettings();
  const siteName = displaySiteName(settings.siteName);
  const kicker =
    theme.id === "studio"
      ? "Classroom"
      : theme.id === "carrot"
      ? "Town"
      : theme.id === "portal"
      ? "News"
      : theme.id === "talk"
        ? "Chat"
        : theme.id === "qna"
          ? "Search"
          : theme.id === "journal"
            ? "Notes"
            : theme.id === "night"
              ? "Magazine"
              : theme.id === "press"
                ? "매일 새로운 이야기"
                : "Archive";

  return (
    <SiteFrame active="posts">
      {q ? null : (
        <JsonLd
          data={buildCollectionPageJsonLd({
            name: "전체 글",
            description: `${siteName}에 발행된 전체 가이드`,
            path: "/posts",
            keywords: [siteName, "전체 글", "가이드"],
            count: published.length,
            siteName,
          })}
        />
      )}
      <PageMast
        themeId={theme.id}
        kicker={kicker}
        title={q ? `‘${q}’` : chrome.posts}
        dek={
          q
            ? theme.id === "qna"
              ? `검색어와 맞는 지식 ${all.length}건입니다.`
              : `검색어와 맞는 이야기 ${all.length}편입니다.`
            : theme.id === "portal"
              ? "분야와 키워드로 뉴스를 찾아보세요."
              : theme.id === "studio"
              ? "단계별 가이드를 골라 바로 시작해 보세요."
            : theme.id === "carrot"
              ? "근처 동네 소식을 검색해 보세요."
              : theme.id === "talk"
              ? "피드에 올라온 글을 이어서 보세요."
              : theme.id === "qna"
              ? "키워드나 분야를 골라 생활 지식을 찾아보세요."
              : "분야를 고르거나, 필요한 키워드로 지난 이야기를 찾아보세요."
        }
      >
        <SearchForm q={q} placeholder="제목으로 찾기" />
      </PageMast>
      <main className={theme.id === "journal" ? undefined : "container"}>
        {theme.id === "journal" ? null : <CategoryBar />}
        {slice.length ? (
          theme.id === "night" ? (
            <NightList posts={slice} start={(page - 1) * perPage + 1} />
          ) : theme.id === "qna" ? (
            <QnaList posts={slice} />
          ) : theme.id === "talk" ? (
            <TalkThread posts={slice} />
          ) : theme.id === "portal" ? (
            <PortalRank posts={slice} start={(page - 1) * perPage + 1} />
          ) : theme.id === "carrot" ? (
            <CarrotList posts={slice} />
          ) : theme.id === "studio" ? (
            <StudioList posts={slice} />
          ) : theme.id === "journal" ? (
            <div className="blog-shell">
              <div className="blog-main">
                {slice.map((post) => (
                  <BlogEntry key={post.id} post={post} />
                ))}
                {totalPages > 1 ? (
                  <div className="pagination">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <a
                        key={n}
                        className={`page-btn ${n === page ? "active" : ""}`}
                        href={`/posts?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`}
                      >
                        {n}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              <BlogSidebar posts={published} partners={partners} siteName={siteName} />
            </div>
          ) : (
            <div className="post-grid">
              {slice.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )
        ) : (
          <p className="empty-note">검색 결과가 없습니다.</p>
        )}
        {theme.id !== "journal" && totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <a
                key={n}
                className={`page-btn ${n === page ? "active" : ""}`}
                href={`/posts?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`}
              >
                {n}
              </a>
            ))}
          </div>
        )}
      </main>
    </SiteFrame>
  );
}
