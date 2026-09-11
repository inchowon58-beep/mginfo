import { PostCard } from "@/components/PostCard";
import { ListPagination } from "@/components/ListPagination";
import { BlogEntry } from "@/components/themes/BlogEntry";
import { BlogSidebar } from "@/components/themes/BlogSidebar";
import { NightList } from "@/components/themes/NightList";
import { QnaList } from "@/components/themes/QnaList";
import { TalkThread } from "@/components/themes/TalkThread";
import { PortalRank } from "@/components/themes/PortalRank";
import { CarrotList } from "@/components/themes/CarrotList";
import { StudioList } from "@/components/themes/StudioList";
import type { Partner, Post, SiteThemeId } from "@/lib/types";

export function ThemePostList({
  themeId,
  posts,
  start,
  page,
  totalPages,
  basePath,
  extra,
  journalAllPosts,
  partners = [],
  siteName = "",
}: {
  themeId: SiteThemeId;
  posts: Post[];
  start: number;
  page: number;
  totalPages: number;
  basePath: string;
  extra?: Record<string, string>;
  journalAllPosts?: Post[];
  partners?: Partner[];
  siteName?: string;
}) {
  const pager = <ListPagination page={page} totalPages={totalPages} basePath={basePath} extra={extra} />;

  if (themeId === "night") {
    return (
      <>
        <NightList posts={posts} start={start} />
        {pager}
      </>
    );
  }
  if (themeId === "qna") {
    return (
      <>
        <QnaList posts={posts} />
        {pager}
      </>
    );
  }
  if (themeId === "talk") {
    return (
      <>
        <TalkThread posts={posts} />
        {pager}
      </>
    );
  }
  if (themeId === "portal") {
    return (
      <>
        <PortalRank posts={posts} start={start} />
        {pager}
      </>
    );
  }
  if (themeId === "carrot") {
    return (
      <>
        <CarrotList posts={posts} />
        {pager}
      </>
    );
  }
  if (themeId === "studio") {
    return (
      <>
        <StudioList posts={posts} />
        {pager}
      </>
    );
  }
  if (themeId === "journal") {
    return (
      <div className="blog-shell">
        <div className="blog-main">
          {posts.map((post) => (
            <BlogEntry key={post.id} post={post} />
          ))}
          {pager}
        </div>
        <BlogSidebar posts={journalAllPosts || posts} partners={partners} siteName={siteName} />
      </div>
    );
  }
  return (
    <>
      <div className="post-grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {pager}
    </>
  );
}
