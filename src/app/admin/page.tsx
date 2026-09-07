import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const store = readStore();
  const published = store.posts.filter((p) => p.status === "published").length;
  const drafts = store.posts.filter((p) => p.status === "draft").length;
  const hasKey = Boolean(store.settings.geminiApiKey);

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat">
          전체 글<b>{store.posts.length}</b>
        </div>
        <div className="admin-stat">
          발행됨<b>{published}</b>
        </div>
        <div className="admin-stat">
          초안<b>{drafts}</b>
        </div>
        <div className="admin-stat">
          메인 배너<b>{store.banners?.filter((b) => b.enabled).length || 0}</b>
        </div>
        <div className="admin-stat">
          제미나이 키<b>{hasKey ? "설정됨" : "없음"}</b>
        </div>
      </div>
      <div className="admin-card">
        <h2>빠른 시작</h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          제미나이 API 키를 저장한 뒤, 주제를 넣으면 뉴스·매거진 형식 초안이 채워집니다. 검토 후 발행하세요.
        </p>
        <div className="admin-actions">
          <Link className="btn btn-primary" href="/admin/posts/new">
            새 글 작성
          </Link>
          <Link className="btn btn-ghost" href="/admin/banners">
            메인 배너
          </Link>
          <Link className="btn btn-ghost" href="/admin/settings">
            API 키 설정
          </Link>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 20 }}>
          카테고리: {CATEGORIES.map((c) => c.name).join(" · ")}
        </p>
      </div>
    </>
  );
}
