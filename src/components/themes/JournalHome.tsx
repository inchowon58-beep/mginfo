import { PromoBanner } from "@/components/PromoBanner";
import { BlogEntry } from "@/components/themes/BlogEntry";
import { BlogSidebar } from "@/components/themes/BlogSidebar";
import type { Banner, Partner, Post } from "@/lib/types";

export function JournalHome({
  posts,
  partners,
  banner,
  siteName = "블로그",
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
  siteName?: string;
}) {
  const feed = posts.slice(0, 8);
  const initial = (siteName || "블").slice(0, 1);

  return (
    <>
      <section className="blog-intro">
        <div className="blog-avatar" aria-hidden>
          {initial}
        </div>
        <div>
          <p className="blog-kicker">Hello</p>
          <h1>{siteName}</h1>
          <p className="blog-dek">일상의 생활 정보를 차근차근 기록합니다.</p>
        </div>
      </section>
      <div className="blog-shell">
        <div className="blog-main">
          {banner ? <PromoBanner banner={banner} /> : null}
          {feed.length ? (
            feed.map((post) => <BlogEntry key={post.id} post={post} />)
          ) : (
            <p className="empty-note">아직 발행된 글이 없습니다. 관리자에서 첫 글을 발행해 보세요.</p>
          )}
        </div>
        <BlogSidebar posts={posts} partners={partners} siteName={siteName} />
      </div>
    </>
  );
}
