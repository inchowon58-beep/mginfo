import { BottomNav, Footer, Header } from "@/components/Header";
import { CategoryBar } from "@/components/CategoryBar";
import { PostCard } from "@/components/PostCard";
import { SearchForm } from "@/components/SearchForm";
import { getPublishedPosts } from "@/lib/db";
import { stripHtml } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || 1));
  const perPage = 12;
  const all = (await getPublishedPosts()).filter((p) => {
    if (!q) return true;
    const hay = `${p.title} ${p.excerpt} ${stripHtml(p.bodyHtml)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const slice = all.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="magazine-root editorial">
      <Header active="posts" />
      <section className="edit-hero is-page">
        <p className="edit-kicker">Archive</p>
        <h1>{q ? `‘${q}’` : "Stories"}</h1>
        <p className="edit-dek">
          {q
            ? `검색어와 맞는 이야기 ${all.length}편입니다.`
            : "분야를 고르거나, 필요한 키워드로 지난 이야기를 찾아보세요."}
        </p>
        <SearchForm q={q} placeholder="제목으로 찾기" />
      </section>
      <main className="container">
        <CategoryBar />
        {slice.length ? (
          <div className="post-grid">
            {slice.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="empty-note">검색 결과가 없습니다.</p>
        )}
        {totalPages > 1 && (
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
      <Footer />
      <BottomNav />
    </div>
  );
}
