import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { JsonLd } from "@/components/seo/JsonLd";
import { CategoryBar } from "@/components/CategoryBar";
import { PageMast } from "@/components/PageMast";
import { ThemePostList } from "@/components/ThemePostList";
import { displaySiteName, getCategory } from "@/lib/categories";
import { getCategories, getPartners, getPublishedPosts, getSettings } from "@/lib/db";
import { paginateList, parseListPage } from "@/lib/list-page";
import { categoryCanonical } from "@/lib/post-seo";
import { buildCollectionPageJsonLd } from "@/lib/site-jsonld";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [categories, posts, settings] = await Promise.all([getCategories(), getPublishedPosts(), getSettings()]);
  const cat = getCategory(slug, categories);
  if (!cat) return { title: "카테고리" };
  const count = posts.filter((p) => p.category === cat.slug).length;
  const name = displaySiteName(settings.siteName);
  const description = `${cat.name} 분야의 매거진 글 ${count}편입니다. 선택 기준과 현장 정보를 ${cat.name} 가이드에서 확인하세요.`;
  return {
    title: `${cat.name} 가이드`,
    description,
    keywords: [cat.name, `${cat.name} 가이드`, name],
    alternates: { canonical: categoryCanonical(cat.slug) },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${cat.name} 가이드`,
      description,
      url: categoryCanonical(cat.slug),
      siteName: name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const cat = getCategory(slug, await getCategories());
  if (!cat) notFound();
  const theme = await getPublicTheme();
  const [all, settings, sp] = await Promise.all([getPublishedPosts(), getSettings(), searchParams]);
  const inCategory = all.filter((p) => p.category === cat.slug);
  const { items: posts, page, totalPages, total, start } = paginateList(inCategory, parseListPage(sp.page));
  const partners = theme.id === "journal" ? await getPartners() : [];
  const siteName = displaySiteName(settings.siteName);
  const kicker =
    theme.id === "studio"
      ? "강의"
      : theme.id === "carrot"
      ? "동네"
      : theme.id === "portal"
      ? "섹션"
      : theme.id === "talk"
        ? "스토리"
        : theme.id === "qna"
          ? "주제"
          : theme.id === "journal"
            ? "분류"
            : theme.id === "night"
              ? "Genre"
              : theme.id === "press"
                ? "분야별 이야기"
                : "Section";

  return (
    <SiteFrame active="posts" current={cat.slug}>
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: `${cat.name} 가이드`,
          description: `${cat.name} 분야의 매거진 글 ${total}편`,
          path: `/category/${cat.slug}`,
          keywords: [cat.name, `${cat.name} 가이드`],
          count: total,
          siteName,
        })}
      />
      <PageMast
        themeId={theme.id}
        kicker={kicker}
        title={cat.name}
        dek={
          theme.id === "qna"
            ? `${cat.name} 분야의 지식 ${total}건입니다.`
            : theme.id === "talk"
              ? `${cat.name} 스토리의 글입니다.`
              : theme.id === "portal"
                ? `${cat.name} 섹션 뉴스입니다.`
                : theme.id === "studio"
                  ? `${cat.name} 분야의 가이드입니다.`
                : theme.id === "carrot"
                  ? `${cat.name} 동네 소식입니다.`
                  : `${cat.name}에서 길어 올린 이야기와 실전 가이드입니다.`
        }
      />
      <main className={theme.id === "journal" ? undefined : "container"}>
        {theme.id === "journal" ? null : <CategoryBar current={cat.slug} />}
        {posts.length ? (
          <ThemePostList
            themeId={theme.id}
            posts={posts}
            start={start}
            page={page}
            totalPages={totalPages}
            basePath={`/category/${cat.slug}`}
            journalAllPosts={all}
            partners={partners}
            siteName={siteName}
          />
        ) : (
          <p className="empty-note">이 카테고리에 발행된 글이 아직 없습니다.</p>
        )}
      </main>
    </SiteFrame>
  );
}
