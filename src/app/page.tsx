import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { CategoryBar } from "@/components/CategoryBar";
import { IndexList } from "@/components/IndexList";
import { PartnerStrip } from "@/components/PartnerStrip";
import { PostCard } from "@/components/PostCard";
import { PromoBanner } from "@/components/PromoBanner";
import { NightHome } from "@/components/themes/NightHome";
import { JournalHome } from "@/components/themes/JournalHome";
import { QnaHome } from "@/components/themes/QnaHome";
import { TalkHome } from "@/components/themes/TalkHome";
import { PortalHome } from "@/components/themes/PortalHome";
import { CarrotHome } from "@/components/themes/CarrotHome";
import { StudioHome } from "@/components/themes/StudioHome";
import { SITE, displaySiteName, parseCarrotKeywords } from "@/lib/categories";
import { pickRandomBanner } from "@/lib/banners";
import { getEnabledBanners, getPartners, getPublishedPosts, getSettings } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = displaySiteName(settings.siteName);
  const tagline = (settings.siteTagline || "").trim() || SITE.tagline;
  const description = `${tagline}. ${SITE.description}`;
  return {
    title: { absolute: `${name} — ${tagline}` },
    description,
    keywords: [name, tagline, "매거진", "가이드"],
    alternates: { canonical: siteUrl("/") },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${name} — ${tagline}`,
      description,
      url: siteUrl("/"),
      siteName: name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function HomePage() {
  const theme = await getPublicTheme();
  const posts = await getPublishedPosts();
  const cover = posts[0];
  const rest = posts.slice(1, 7);
  const partners = await getPartners();
  const banner = pickRandomBanner(await getEnabledBanners());

  if (theme.id === "studio") {
    const settings = await getSettings();
    return (
      <SiteFrame active="home">
        <StudioHome
          posts={posts}
          partners={partners}
          banner={banner}
          siteName={displaySiteName(settings.siteName)}
          tagline={settings.siteTagline}
        />
      </SiteFrame>
    );
  }

  if (theme.id === "carrot") {
    const settings = await getSettings();
    return (
      <SiteFrame active="home">
        <CarrotHome
          posts={posts}
          partners={partners}
          banner={banner}
          keywords={parseCarrotKeywords(settings.carrotKeywords)}
        />
      </SiteFrame>
    );
  }

  if (theme.id === "portal") {
    return (
      <SiteFrame active="home">
        <PortalHome posts={posts} partners={partners} banner={banner} />
      </SiteFrame>
    );
  }

  if (theme.id === "talk") {
    return (
      <SiteFrame active="home">
        <TalkHome posts={posts} partners={partners} banner={banner} />
      </SiteFrame>
    );
  }

  if (theme.id === "qna") {
    return (
      <SiteFrame active="home">
        <QnaHome posts={posts} partners={partners} banner={banner} />
      </SiteFrame>
    );
  }

  if (theme.id === "journal") {
    const settings = await getSettings();
    return (
      <SiteFrame active="home">
        <JournalHome
          posts={posts}
          partners={partners}
          banner={banner}
          siteName={displaySiteName(settings.siteName)}
        />
      </SiteFrame>
    );
  }

  if (theme.id === "night") {
    return (
      <SiteFrame active="home">
        <NightHome posts={posts} partners={partners} banner={banner} />
      </SiteFrame>
    );
  }

  if (theme.id === "press") {
    const feed = posts.slice(0, 6);
    return (
      <SiteFrame active="home">
        <section className="press-mast">
          <p className="press-kicker">매일 새로운 이야기</p>
          <h1>모든 생활 정보를 한눈에</h1>
          <p className="press-dek">반려동물·뷰티·인테리어·맛집 — 실생활에 바로 쓰는 가이드</p>
        </section>
        <main className="container">
          {banner ? <PromoBanner banner={banner} /> : null}
          {feed.length ? (
            <div className="press-feed">
              {feed.map((post, i) => (
                <PostCard key={post.id} post={post} featured={i === 0} />
              ))}
            </div>
          ) : (
            <p className="empty-note">아직 발행된 글이 없습니다. 관리자에서 첫 글을 발행해 보세요.</p>
          )}
        </main>
        <PartnerStrip partners={partners} title="제휴 업체" />
        <div className="container">
          <IndexList
            posts={posts}
            title="매거진 전체 글"
            description={`최근 발행한 글 ${posts.length}편입니다. 분야를 눌러 골라 보세요.`}
            moreHref="/posts"
            moreLabel="더 예전 글은 전체글에서 볼 수 있습니다."
          />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame active="home">
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
    </SiteFrame>
  );
}
