import { SiteFrame } from "@/components/SiteFrame";
import { MemberHomesPage } from "@/components/hub-portal/MemberHomesPage";
import { displaySiteName } from "@/lib/categories";
import { getSettings } from "@/lib/db";
import { getHubPortalFeed, hubPortalEnabled } from "@/lib/hub-portal";
import { buildMemberHomes } from "@/lib/hub-portal/members";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { siteUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: `인포씨에스와 함께하는 곳 — INFOCS` },
    description:
      "INFOCS (Information Consulting Service)와 함께하는 파트너 홈페이지. 지역 정보와 비즈니스를 잇는 네트워크.",
    alternates: { canonical: siteUrl("/members") },
    robots: { index: true, follow: true },
  };
}

export default async function MembersPage() {
  const settings = await getSettings();
  if (!hubPortalEnabled(settings) || !(await isOpsHub())) {
    notFound();
  }
  const [feed, sites] = await Promise.all([getHubPortalFeed(), getOpsSites()]);
  const homes = buildMemberHomes(sites, feed);
  const siteName = displaySiteName(settings.siteName);

  return (
    <SiteFrame bare hideBottomNav>
      <Suspense fallback={<div style={{ padding: 40, color: "#eee" }}>불러오는 중…</div>}>
        <MemberHomesPage feed={feed} siteName={siteName} settings={settings} homes={homes} />
      </Suspense>
    </SiteFrame>
  );
}
