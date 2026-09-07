import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, Footer, Header } from "@/components/Header";
import { getCategory, SITE } from "@/lib/categories";
import { getPostBySlug, getPublishedPosts } from "@/lib/db";
import { formatDate, stripHtml } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") return { title: "글을 찾을 수 없습니다" };
  const description = post.excerpt || stripHtml(post.bodyHtml).slice(0, 140);
  const url = `https://magazine.infocs.co.kr/posts/${post.slug}`;
  const keywords = [post.focusKeyword, ...post.tags].filter(Boolean) as string[];
  const ogImages = post.coverImage
    ? [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ]
    : undefined;

  return {
    title: post.title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      siteName: SITE.name,
      locale: "ko_KR",
      publishedTime: post.publishedAt || undefined,
      images: ogImages,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();
  const cat = getCategory(post.category);
  const related = (await getPublishedPosts())
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 6);
  const pageUrl = `https://magazine.infocs.co.kr/posts/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || stripHtml(post.bodyHtml).slice(0, 140),
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: pageUrl,
    image: post.coverImage ? [post.coverImage] : undefined,
    keywords: [post.focusKeyword, ...post.tags].filter(Boolean).join(", "),
    author: { "@type": "Organization", name: SITE.company },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
    },
  };

  return (
    <div className="magazine-root editorial">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <article className={`article container-narrow ${post.theme || "art-v1"}`}>
        <div className="article-meta">
          <Link className="article-cat" href={`/category/${post.category}`}>
            {cat?.name}
          </Link>
          <span>·</span>
          <span>{SITE.name}</span>
        </div>
        <h1>{post.title}</h1>
        <div className="article-info">
          <span>{formatDate(post.publishedAt)}</span>
          {post.tags.length > 0 && <span>· {post.tags.join(" · ")}</span>}
        </div>
        {post.coverImage && (
          <figure>
            <img src={post.coverImage} alt={post.focusKeyword || post.title} />
          </figure>
        )}
        <div className="article-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        {post.tags.length > 0 && (
          <div className="article-tags">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="related-posts">
            <h2>같은 분야의 글</h2>
            <ul>
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/posts/${r.slug}`}>{r.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
      <Footer />
      <BottomNav current={post.category} />
    </div>
  );
}
