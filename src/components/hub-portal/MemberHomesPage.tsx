"use client";

import { useMemo, useState } from "react";
import type { HubMemberHome } from "@/lib/hub-portal/members";
import { filterMemberHomes } from "@/lib/hub-portal/members";
import type { HubPortalFeed } from "@/lib/hub-portal/types";
import type { Settings } from "@/lib/types";
import { HubPortalChrome } from "./HubPortalChrome";
import styles from "./hub-portal.module.css";

function formatWhen(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const hour = 3600_000;
  if (diff < hour) return "방금";
  if (diff < 24 * hour) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * 24 * hour) return `${Math.floor(diff / (24 * hour))}일 전`;
  return new Date(ts).toLocaleDateString("ko-KR");
}

function MemberCard({ home }: { home: HubMemberHome }) {
  return (
    <article className={styles.memberCard}>
      <div className={styles.memberHead}>
        <div className={styles.memberTitles}>
          <h2>{home.siteName}</h2>
          <p className={styles.memberConcept}>{home.concept || `${home.domain} 홈페이지`}</p>
        </div>
        <a className={styles.memberGo} href={home.siteUrl} target="_blank" rel="noopener noreferrer">
          홈페이지 바로가기
        </a>
      </div>
      <div className={styles.memberRecent}>
        <strong>최근 소식</strong>
        {home.recentPosts.length === 0 ? (
          <p className={styles.memberEmptyPosts}>아직 공개된 소식이 없습니다.</p>
        ) : (
          <ul>
            {home.recentPosts.map((post) => (
              <li key={post.url}>
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  {post.title}
                </a>
                <span>{formatWhen(post.publishedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function MemberHomesPage({
  feed,
  siteName,
  settings,
  homes,
}: {
  feed: HubPortalFeed;
  siteName: string;
  settings: Settings;
  homes: HubMemberHome[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterMemberHomes(homes, query), [homes, query]);

  return (
    <HubPortalChrome feed={feed} siteName={siteName} settings={settings} active="members" showRegions={false}>
      <section className={styles.memberHero} aria-labelledby="member-hero-title">
        <p className={styles.memberEyebrow}>
          <span>INFOCS</span>
          <span className={styles.memberEyebrowDot} aria-hidden>
            ·
          </span>
          <span>Information Consulting Service</span>
        </p>
        <h1 id="member-hero-title">인포씨에스와 함께하는 곳</h1>
        <p className={styles.memberLead}>
          지역 정보와 비즈니스를 잇는 파트너 네트워크입니다. 인포씨에스(INFOCS)와 함께하는 홈페이지를
          만나보세요.
        </p>
        <div className={styles.memberStats}>
          <div>
            <strong>{filtered.length}</strong>
            <span>Partners</span>
          </div>
          <div>
            <strong>INFOCS</strong>
            <span>Information Consulting Service</span>
          </div>
        </div>
      </section>

      <form className={styles.memberSearch} onSubmit={(e) => e.preventDefault()} role="search">
        <label className={styles.srOnly} htmlFor="member-home-q">
          파트너·키워드 검색
        </label>
        <input
          id="member-home-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="파트너명, 업종, 키워드로 검색"
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")}>
            지우기
          </button>
        ) : null}
      </form>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {homes.length === 0
            ? "아직 공개된 파트너 홈페이지가 없습니다."
            : "검색 결과가 없습니다. 다른 키워드로 찾아보세요."}
        </div>
      ) : (
        <div className={styles.memberList}>
          {filtered.map((home) => (
            <MemberCard key={home.id} home={home} />
          ))}
        </div>
      )}
    </HubPortalChrome>
  );
}
