"use client";

import Link from "next/link";
import { useCategories } from "@/components/CategoriesContext";
import { PromoBanner } from "@/components/PromoBanner";
import { SearchForm } from "@/components/SearchForm";
import { QnaList } from "@/components/themes/QnaList";
import type { Banner, Partner, Post } from "@/lib/types";

export function QnaHome({
  posts,
  partners,
  banner,
}: {
  posts: Post[];
  partners: Partner[];
  banner?: Banner | null;
}) {
  const categories = useCategories();
  const latest = posts.slice(0, 10);
  const topics = categories.map((c) => ({
    ...c,
    count: posts.filter((p) => p.category === c.slug).length,
  })).filter((c) => c.count > 0);

  return (
    <>
      <section className="qna-hero">
        <p className="qna-kicker">Knowledge Desk</p>
        <h1>무엇이든 찾아보는 생활 지식</h1>
        <p className="qna-dek">궁금한 키워드를 넣고, 정리된 답을 확인하세요.</p>
        <SearchForm placeholder="예: 반려동물 입양, 인테리어, 맛집" />
        <p className="qna-stats">
          등록된 지식 <b>{posts.length}</b>건 · 분야 <b>{topics.length}</b>
        </p>
      </section>
      {banner ? (
        <div className="qna-ad">
          <PromoBanner banner={banner} />
        </div>
      ) : null}
      <div className="qna-board">
        <section className="qna-col">
          <div className="qna-col-head">
            <h2>최신 지식</h2>
            <Link href="/posts">전체 보기</Link>
          </div>
          {latest.length ? (
            <QnaList posts={latest} />
          ) : (
            <p className="empty-note">아직 등록된 지식이 없습니다.</p>
          )}
        </section>
        <aside className="qna-panel">
          <section>
            <h2>분야별 지식</h2>
            <ul className="qna-topics">
              {topics.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`}>
                    {c.name}
                    <span>{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {partners.length > 0 ? (
            <section>
              <h2>도움되는 곳</h2>
              <ul className="qna-helps">
                {partners.map((p) => (
                  <li key={p.id}>
                    <Link href={p.url || "/partners"} target={p.url ? "_blank" : undefined}>
                      {p.name}
                      <small>{p.category}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
