import type { Metadata } from "next";
import { SiteFrame, getPublicTheme } from "@/components/SiteFrame";
import { PageMast } from "@/components/PageMast";
import { PartnerMedia } from "@/components/PartnerMedia";
import { displaySiteName } from "@/lib/categories";
import { getPartners, getSettings } from "@/lib/db";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = displaySiteName(settings.siteName);
  const description = `${name}과 함께하는 제휴 업체 안내입니다.`;
  return {
    title: "제휴 업체",
    description,
    alternates: { canonical: siteUrl("/partners") },
    robots: { index: true, follow: true },
    openGraph: {
      title: "제휴 업체",
      description,
      url: siteUrl("/partners"),
      siteName: name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function PartnersPage() {
  const theme = await getPublicTheme();
  const partners = await getPartners();
  const siteName = displaySiteName((await getSettings()).siteName);
  const kicker =
    theme.id === "studio"
      ? "Community"
      : theme.id === "carrot"
      ? "Nearby"
      : theme.id === "portal"
      ? "Partners"
      : theme.id === "talk"
        ? "Suggested"
        : theme.id === "qna"
          ? "Directory"
          : theme.id === "journal"
            ? "About"
            : theme.id === "night"
              ? "Market"
              : theme.id === "press"
                ? "함께하는 업체"
                : "Partners";
  const title =
    theme.id === "carrot"
      ? "동네파트너"
      : theme.id === "portal"
      ? "파트너"
      : theme.id === "talk"
        ? "추천계정"
        : theme.id === "qna"
          ? "파트너"
          : theme.id === "journal"
            ? "소개"
            : theme.id === "night"
              ? "파트너"
              : theme.id === "press"
                ? "제휴 업체"
                : "함께하는 브랜드";

  return (
    <SiteFrame active="partners">
      <PageMast
        themeId={theme.id}
        kicker={kicker}
        title={title}
        dek={`${siteName}이 신뢰하고 소개하는 현장의 파트너입니다.`}
      />
      <main className="container">
        <div className="partner-grid">
          {partners.map((p) => (
            <article className="partner-card" key={p.id}>
              <PartnerMedia partner={p} variant="card" />
              <div className="partner-card-body">
                <div className="partner-card-meta" data-cat={p.category}>
                  <span className="partner-cat-dot" />
                  {p.category}
                </div>
                <h3>{p.name}</h3>
                <p className="partner-card-intro">{p.intro}</p>
                <div className="partner-card-actions">
                  {p.url && (
                    <a className="is-primary" href={p.url} target="_blank" rel="noreferrer">
                      사이트
                    </a>
                  )}
                  {p.phone && <span>{p.phone}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </SiteFrame>
  );
}
