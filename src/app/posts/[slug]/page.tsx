import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/SiteFrame";
import { VendorCta } from "@/components/VendorCta";
import { PlaceCard } from "@/components/PlaceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { displaySiteName, getCategory } from "@/lib/categories";
import { getCategories, getPostBySlug, getPublishedPosts, getSettings } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  buildArticleJsonLd,
  buildPostKeywords,
  buildPostSeoDescription,
  buildPostSeoTitle,
  pageKeyword,
  postCanonical,
  postLinkLabel,
  relatedClusters,
  resolveFaqItems,
} from "@/lib/post-seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "@/lib/site-jsonld";
import { ArticlePhoto } from "@/components/ArticlePhoto";
import { resolveRegionContext } from "@/lib/region-intro";
import { buildPublicFactSection } from "@/lib/public-facts";
import { PUBLISH_DISCLAIMER } from "@/lib/publish-disclaimer";
import { placeInlineImages } from "@/lib/post-images";
import { hasVendorCta } from "@/lib/vendor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") return { title: "글을 찾을 수 없습니다" };
  const settings = await getSettings();
  const siteName = displaySiteName(settings.siteName);
  const categories = await getCategories();
  const cat = getCategory(post.category, categories);
  const title = buildPostSeoTitle(post);
  const description = buildPostSeoDescription(post);
  const url = postCanonical(post);
  const keywords = buildPostKeywords(post, cat?.name);
  const ogImages = post.coverImage
    ? [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: pageKeyword(post),
        },
      ]
    : undefined;

  return {
    title,
    description,
    keywords,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName,
      locale: "ko_KR",
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      images: ogImages,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();
  const [categories, settings, published] = await Promise.all([
    getCategories(),
    getSettings(),
    getPublishedPosts(),
  ]);
  const cat = getCategory(post.category, categories);
  const siteName = displaySiteName(settings.siteName);
  const related = relatedClusters(post, published);
  const pageUrl = postCanonical(post);
  const keyword = pageKeyword(post);
  const description = buildPostSeoDescription(post);
  const keywords = buildPostKeywords(post, cat?.name);
  const faqs = resolveFaqItems(post, cat?.name);
  const geo = resolveRegionContext(post, { categoryName: cat?.name });
  const publicFacts = buildPublicFactSection({
    place: geo?.place || post.region,
    keyword,
    categoryName: cat?.name,
    postId: post.id,
    slug: post.slug,
  });
  const extras = post.extraImages || [];
  const placed = placeInlineImages(post.bodyHtml, extras, keyword, { hasCover: Boolean(post.coverImage) });
  const showVendor = hasVendorCta(post);
  const crumbs = [
    { name: "홈", path: "/" },
    { name: cat?.name || "글", path: `/category/${post.category}` },
    { name: keyword, path: `/posts/${post.slug}` },
  ];

  return (
    <SiteFrame hideBottomNav={showVendor} current={post.category} className={showVendor ? "has-vendor-cta" : ""}>
      <JsonLd
        data={[
          buildArticleJsonLd({
            post,
            pageUrl,
            description,
            keywords,
            siteName,
            settings,
            categoryName: cat?.name,
          }),
          buildBreadcrumbJsonLd(crumbs),
          ...(faqs.length ? [buildFaqPageJsonLd(faqs)] : []),
        ]}
      />
      <article className={`article container-narrow ${post.theme || "art-v1"}`}>
        <nav className="article-crumb" aria-label="경로">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/category/${post.category}`}>{cat?.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{keyword}</span>
        </nav>
        <div className="article-meta">
          <Link className="article-cat" href={`/category/${post.category}`}>
            {cat?.name}
          </Link>
          <span>·</span>
          <span>{siteName}</span>
        </div>
        {post.focusKeyword ? <p className="article-kicker">{post.focusKeyword}</p> : null}
        <h1>{post.title}</h1>
        <div className="article-info">
          <span>{formatDate(post.publishedAt)}</span>
          {post.region ? <span>· {post.region}</span> : null}
          {post.tags.length > 0 && <span>· {post.tags.join(" · ")}</span>}
        </div>
        {post.coverImage ? (
          <ArticlePhoto
            image={{ url: post.coverImage, caption: post.coverCaption }}
            alt={post.focusKeyword || post.title}
          />
        ) : null}
        <div className="article-body" dangerouslySetInnerHTML={{ __html: placed.html }} />
        <PlaceCard post={post} />
        <VendorCta post={post} />
        {faqs.length > 0 && (
          <section className="article-faq">
            <h2>{keyword} 자주 묻는 질문</h2>
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        )}
        {post.tags.length > 0 && (
          <div className="article-tags">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
        {publicFacts ? (
          <section className="article-facts">
            <h2>{publicFacts.heading}</h2>
            <p>{publicFacts.lead}</p>
            <ul>
              {publicFacts.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="article-facts-note">{publicFacts.note}</p>
          </section>
        ) : null}
        <p className="article-disclaimer">{PUBLISH_DISCLAIMER}</p>
        {related.length > 0 && (
          <div className="related-posts">
            {related.map((cluster) => (
              <div className="related-cluster" key={cluster.heading}>
                <h2>{cluster.heading}</h2>
                <ul>
                  {cluster.posts.map((item) => (
                    <li key={item.id}>
                      <Link href={`/posts/${item.slug}`}>{postLinkLabel(item)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {cat ? (
              <p className="related-hub">
                <Link href={`/category/${cat.slug}`}>
                  {post.focusKeyword ? `${post.focusKeyword} · ${cat.name} 더 보기` : `${cat.name} 전체 글`}
                </Link>
              </p>
            ) : null}
          </div>
        )}
        {geo && (geo.regionInfo || geo.nearbyAreas.length > 0 || geo.nearbyStations.length > 0) ? (
          <section className="article-geo">
            {geo.regionInfo ? <p className="article-region">{geo.regionInfo}</p> : null}
            {geo.nearbyAreas.length > 0 ? (
              <div>
                <h2>{geo.nearbyHeading}</h2>
                <p>{geo.nearbyLead}</p>
                <ul>
                  {geo.nearbyAreas.map((area, index) => (
                    <li key={area}>{geo.nearbyLabels[index] || `${area} ${keyword}`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {geo.nearbyStations.length > 0 ? (
              <div>
                <h2>{geo.stationHeading}</h2>
                <p>{geo.stationLead}</p>
                <ul>
                  {geo.nearbyStations.map((station, index) => (
                    <li key={station}>{geo.stationLabels[index] || `${station} ${keyword}`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </article>
    </SiteFrame>
  );
}
