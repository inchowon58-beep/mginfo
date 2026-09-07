import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomNav, Footer, Header } from "@/components/Header";
import { CategoryBar } from "@/components/CategoryBar";
import { PostCard } from "@/components/PostCard";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getPublishedPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return { title: "카테고리" };
  return { title: cat.name, description: `${cat.name} 분야의 매거진 글` };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();
  const posts = getPublishedPosts().filter((p) => p.category === cat.slug);

  return (
    <div className="magazine-root editorial">
      <Header active="posts" />
      <section className="edit-hero is-page">
        <p className="edit-kicker">Section</p>
        <h1>{cat.name}</h1>
        <p className="edit-dek">{cat.name}에서 길어 올린 이야기와 실전 가이드입니다.</p>
      </section>
      <main className="container">
        <CategoryBar current={cat.slug} />
        {posts.length ? (
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="empty-note">이 카테고리에 발행된 글이 아직 없습니다.</p>
        )}
      </main>
      <Footer />
      <BottomNav current={cat.slug} />
    </div>
  );
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}
