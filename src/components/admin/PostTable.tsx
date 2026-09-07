"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function PostTable({ posts }: { posts: Post[] }) {
  const router = useRouter();

  async function remove(id: string) {
    if (!confirm("이 글을 삭제할까요?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>글 목록</h2>
        <Link className="btn btn-primary" href="/admin/posts/new">
          새 글
        </Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>카테고리</th>
            <th>상태</th>
            <th>날짜</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
              </td>
              <td>{getCategory(post.category)?.name}</td>
              <td>
                <span className={post.status === "published" ? "badge badge-on" : "badge badge-off"}>
                  {post.status === "published" ? "발행" : "초안"}
                </span>
              </td>
              <td>{formatDate(post.publishedAt || post.createdAt)}</td>
              <td>
                {post.status === "published" && (
                  <Link href={`/posts/${post.slug}`} target="_blank">
                    보기
                  </Link>
                )}{" "}
                <button className="btn btn-danger" type="button" onClick={() => remove(post.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
