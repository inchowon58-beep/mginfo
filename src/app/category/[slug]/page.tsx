import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { CategoryBar } from "@/components/CategoryBar";
import { PageMast } from "@/components/PageMast";
import { PostCard } from "@/components/PostCard";
import { BlogEntry } from "@/components/themes/BlogEntry";
import { BlogSidebar } from "@/components/themes/BlogSidebar";
import { NightList } from "@/components/themes/NightList";
import { QnaList } from "@/components/themes/QnaList";
import { TalkThread } from "@/components/themes/TalkThread";
import { PortalRank } from "@/components/themes/PortalRank";
import { CarrotList } from "@/components/themes/CarrotList";
import { displaySiteName, getCategory } from "@/lib/categories";
import { getCategories, getPartners, getPublishedPosts, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug, await getCategories());
  if (!cat) return { title: "카테고리" };
  return { title: cat.name, description: `${cat.name} 분야의 매거진 글` };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCategory(slug, await getCategories());
  if (!cat) notFound();
  const theme = await getPublicTheme();
  const all = await getPublishedPosts();
  const posts = all.filter((p) => p.category === cat.slug);
  const partners = theme.id === "journal" ? await getPartners() : [];
  const siteName = theme.id === "journal" ? displaySiteName((await getSettings()).siteName) : undefined;
  const kicker =
    theme.id === "carrot"
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
      <PageMast
        themeId={theme.id}
        kicker={kicker}
        title={cat.name}
        dek={
          theme.id === "qna"
            ? `${cat.name} 분야의 지식 ${posts.length}건입니다.`
            : theme.id === "talk"
              ? `${cat.name} 스토리의 글입니다.`
              : theme.id === "portal"
                ? `${cat.name} 섹션 뉴스입니다.`
                : theme.id === "carrot"
                  ? `${cat.name} 동네 소식입니다.`
                  : `${cat.name}에서 길어 올린 이야기와 실전 가이드입니다.`
        }
      />
      <main className={theme.id === "journal" ? undefined : "container"}>
        {theme.id === "journal" ? null : <CategoryBar current={cat.slug} />}
        {posts.length ? (
          theme.id === "night" ? (
            <NightList posts={posts} />
          ) : theme.id === "qna" ? (
            <QnaList posts={posts} />
          ) : theme.id === "talk" ? (
            <TalkThread posts={posts} />
          ) : theme.id === "portal" ? (
            <PortalRank posts={posts} />
          ) : theme.id === "carrot" ? (
            <CarrotList posts={posts} />
          ) : theme.id === "journal" ? (
            <div className="blog-shell">
              <div className="blog-main">
                {posts.map((post) => (
                  <BlogEntry key={post.id} post={post} />
                ))}
              </div>
              <BlogSidebar posts={all} partners={partners} siteName={siteName} />
            </div>
          ) : (
            <div className="post-grid">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )
        ) : (
          <p className="empty-note">이 카테고리에 발행된 글이 아직 없습니다.</p>
        )}
      </main>
    </SiteFrame>
  );
}

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: c.slug }));
}
