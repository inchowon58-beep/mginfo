import Link from "next/link";
import { AdminIcon } from "@/components/admin/AdminIcons";
import { PersistNotice } from "@/components/admin/PersistNotice";
import { SiteIdentityNotice } from "@/components/admin/SiteIdentityNotice";
import { bulkStats, defaultBulkPublish } from "@/lib/bulk-publish";
import { getCategory } from "@/lib/categories";
import { readStore } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { masterDashboard } from "@/lib/publish-limits";

export const dynamic = "force-dynamic";

function todayLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function quotaPercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function AdminHome() {
  const store = await readStore();
  const published = store.posts.filter((p) => p.status === "published").length;
  const drafts = store.posts.filter((p) => p.status === "draft").length;
  const banners = store.banners?.filter((b) => b.enabled).length || 0;
  const hasKey = Boolean(store.settings.geminiApiKey);
  const master = masterDashboard(store.settings, store.posts);
  const recent = [...store.posts]
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 6);
  const usedPct = quotaPercent(master.dailyUsed, master.dailyLimit);
  const publishRate = store.posts.length ? Math.round((published / store.posts.length) * 100) : 0;
  const usableTone = master.expired ? "위험" : master.usableUntil ? "정상" : "제한 없음";

  return (
    <>
      <PersistNotice />
      <SiteIdentityNotice settings={store.settings} />
      <header className="admin-dash-head">
        <div>
          <p className="admin-dash-kicker">운영 현황</p>
          <h2>대시보드</h2>
          <p>발행 한도, 콘텐츠, 작업 상태를 한곳에서 확인합니다.</p>
        </div>
        <div className="admin-dash-today">
          <span>오늘</span>
          <b>{todayLabel()}</b>
        </div>
      </header>

      {master.naverRankWork ? (
        <div className="admin-naver-banner" role="status">
          <span className="admin-naver-ico">
            <AdminIcon name="naver" />
          </span>
          <div>
            <strong>네이버상위노출작업진행중</strong>
            <p>검색 노출 작업을 진행하고 있습니다. 대시보드에서 상태를 유지합니다.</p>
          </div>
          <em>ON</em>
        </div>
      ) : null}

      <div className="admin-kpis">
        <article className="admin-kpi">
          <span className="admin-kpi-ico is-blue">
            <AdminIcon name="posts" />
          </span>
          <span>전체 글</span>
          <b>{store.posts.length}</b>
          <small>발행률 {publishRate}%</small>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-ico is-green">
            <AdminIcon name="published" />
          </span>
          <span>발행됨</span>
          <b>{published}</b>
          <small>라이브 콘텐츠</small>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-ico is-amber">
            <AdminIcon name="draft" />
          </span>
          <span>초안</span>
          <b>{drafts}</b>
          <small>검토 대기</small>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-ico is-violet">
            <AdminIcon name="banner" />
          </span>
          <span>메인 배너</span>
          <b>{banners}</b>
          <small>현재 노출 중</small>
        </article>
      </div>

      <div className="admin-dash-grid">
        <section className="admin-card admin-ops">
          <div className="admin-card-head">
            <h2>운영 한도</h2>
            <span className={`admin-pill${master.expired ? " is-danger" : ""}`}>{usableTone}</span>
          </div>
          <div className={`admin-ops-row${master.expired ? " is-alert" : ""}`}>
            <span className="admin-kpi-ico is-cyan">
              <AdminIcon name="calendar" />
            </span>
            <div>
              <span>사용가능일</span>
              <b>{master.usableLabel}</b>
            </div>
          </div>
          <div className="admin-ops-row">
            <span className="admin-kpi-ico is-blue">
              <AdminIcon name="quota" />
            </span>
            <div className="admin-ops-meter">
              <span>하루 글작성수량</span>
              <b>{master.dailyLabel}</b>
              {master.dailyLimit > 0 ? (
                <i className="admin-meter" aria-hidden="true">
                  <i style={{ width: `${usedPct}%` }} />
                </i>
              ) : (
                <small>수량 제한 없이 작성할 수 있습니다.</small>
              )}
            </div>
          </div>
          <div className="admin-ops-row">
            <span className={`admin-kpi-ico${hasKey ? " is-green" : " is-amber"}`}>
              <AdminIcon name="key" />
            </span>
            <div>
              <span>제미나이 키</span>
              <b>{hasKey ? "연결됨" : "미설정"}</b>
            </div>
          </div>
          <div className="admin-ops-row">
            <span className={`admin-kpi-ico${store.settings.extraImagesEnabled ? " is-violet" : " is-amber"}`}>
              <AdminIcon name="banner" />
            </span>
            <div>
              <span>추가사진사용</span>
              <b>{store.settings.extraImagesEnabled ? "최대 7장" : "대표 1장"}</b>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>바로가기</h2>
          </div>
          <div className="admin-quick">
            <Link href="/admin/posts/new" className="admin-quick-link">
              <span className="admin-kpi-ico is-blue">
                <AdminIcon name="write" />
              </span>
              <span>
                <b>새 글 작성</b>
                <small>초안을 만들고 발행합니다</small>
              </span>
            </Link>
            <Link href="/admin/bulk" className="admin-quick-link">
              <span className="admin-kpi-ico is-amber">
                <AdminIcon name="queue" />
              </span>
              <span>
                <b>대량발행예약</b>
                <small>키워드를 쌓아 두고 나눠 발행합니다</small>
              </span>
            </Link>
            <Link href="/admin/banners" className="admin-quick-link">
              <span className="admin-kpi-ico is-violet">
                <AdminIcon name="banner" />
              </span>
              <span>
                <b>메인 배너</b>
                <small>홈 상단 노출을 관리합니다</small>
              </span>
            </Link>
            <Link href="/admin/settings" className="admin-quick-link">
              <span className="admin-kpi-ico is-cyan">
                <AdminIcon name="settings" />
              </span>
              <span>
                <b>사이트 설정</b>
                <small>디자인과 팝업을 바꿉니다</small>
              </span>
            </Link>
            <Link href="/admin/posts" className="admin-quick-link">
              <span className="admin-kpi-ico is-green">
                <AdminIcon name="posts" />
              </span>
              <span>
                <b>글 목록</b>
                <small>발행·초안을 검토합니다</small>
              </span>
            </Link>
          </div>
          <p className="admin-cats">
            {(store.categories || []).map((c) => c.name).join(" · ") || "카테고리 없음"}
          </p>
        </section>
      </div>

      <BulkDashPanel stats={bulkStats(store.bulkPublish || defaultBulkPublish(), store.categories || [])} />

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>최근 업데이트</h2>
          <Link className="admin-more" href="/admin/posts">
            전체 보기
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="admin-empty">아직 등록된 글이 없습니다.</p>
        ) : (
          <div className="admin-recent">
            {recent.map((post) => {
              const cat = getCategory(post.category, store.categories || []);
              return (
                <Link key={post.id} href={`/admin/posts/${post.id}`} className="admin-recent-row">
                  <span className={`admin-status is-${post.status}`}>
                    {post.status === "published" ? "발행" : "초안"}
                  </span>
                  <span className="admin-recent-title">{post.title}</span>
                  <span className="admin-recent-meta">
                    {cat?.name || "분류 없음"} · {formatDate(post.updatedAt || post.publishedAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function BulkDashPanel({
  stats,
}: {
  stats: ReturnType<typeof bulkStats>;
}) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <h2>예약발행 현황</h2>
        <Link className="admin-more" href="/admin/bulk">
          예약 관리
        </Link>
      </div>
      <div className="bulk-progress">
        <div className="bulk-progress-head">
          <div>
            <span>완료 현황</span>
            <b>
              {stats.published} / {stats.total || 0}
            </b>
          </div>
          <em>{stats.enabled ? `${stats.percent}%` : "자동발행 꺼짐"}</em>
        </div>
        <i className="admin-meter" aria-hidden="true">
          <i style={{ width: `${stats.percent}%` }} />
        </i>
        <div className="bulk-progress-meta">
          <span>남은 키워드 {stats.remaining}개</span>
          <span>
            {stats.remaining
              ? stats.dailyCapacity > 0
                ? `전부 발행까지 약 ${stats.daysLeft}일`
                : "하루발행수량을 지정하세요"
              : "대기 중인 예약 없음"}
          </span>
          <span>
            오늘 발행 {stats.todayPublished}편
            {stats.todayScheduled ? ` · 오늘 예약 ${stats.todayScheduled}편` : ""}
          </span>
        </div>
        {stats.groups.length ? (
          <div className="bulk-cat-bars">
            {stats.groups.map((group) => (
              <div key={group.id}>
                <div className="bulk-cat-label">
                  <b>
                    {group.name}
                    {group.vendorName ? ` · ${group.vendorName}` : ""}
                  </b>
                  <span>
                    {group.done}/{group.total} · 하루 {group.dailyLimit}편 · 남음 {group.remaining}
                  </span>
                </div>
                <i className="admin-meter" aria-hidden="true">
                  <i style={{ width: `${group.percent}%` }} />
                </i>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty">대량발행예약에서 키워드를 넣으면 진행률이 표시됩니다.</p>
        )}
      </div>
    </section>
  );
}
