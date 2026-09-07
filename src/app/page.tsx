import { BottomNav, Footer, Header } from "@/components/Header";
import { CategoryBar } from "@/components/CategoryBar";
import { IndexList } from "@/components/IndexList";
import { PartnerStrip } from "@/components/PartnerStrip";
import { PostCard } from "@/components/PostCard";
import { PromoBanner } from "@/components/PromoBanner";
import { SITE } from "@/lib/categories";
import { pickRandomBanner } from "@/lib/banners";
import { getEnabledBanners, getPartners, getPublishedPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const posts = getPublishedPosts();
  const cover = posts[0];
  const rest = posts.slice(1, 7);
  const partners = getPartners();
  const banner = pickRandomBanner(getEnabledBanners());

  return (
    <div className="magazine-root editorial">
      <Header active="home" />
      <section className="edit-hero">
        <p className="edit-kicker">Lifestyle Magazine</p>
        <h1>
          Curated Life &amp; Trend
          <span>매거진</span>
        </h1>
        <p className="edit-dek">{SITE.description}</p>
      </section>
      <main className="container">
        <CategoryBar />
        {banner ? <PromoBanner banner={banner} /> : null}
        {cover ? (
          <section className="edit-cover">
            <PostCard post={cover} featured />
          </section>
        ) : (
          <p className="empty-note">아직 발행된 글이 없습니다. 관리자에서 첫 글을 발행해 보세요.</p>
        )}
        {rest.length > 0 && (
          <section className="edit-latest">
            <div className="edit-section-head">
              <h2>이번 호의 이야기</h2>
              <p>일상 속에서 오래 남는 가이드와 시선</p>
            </div>
            <div className="post-grid">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}
      </main>
      <PartnerStrip partners={partners} />
      <div className="container">
        <IndexList posts={posts} />
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
}
