import { CategoriesProvider } from "@/components/CategoriesContext";
import { EngagementProvider } from "@/components/EngagementContext";
import { SiteNameProvider } from "@/components/SiteNameContext";
import { SitePopup } from "@/components/SitePopup";
import { BottomNav, Footer, Header } from "@/components/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE, displaySiteName } from "@/lib/categories";
import { getCategories, getSettings, resolveSiteTheme } from "@/lib/db";
import { engagementFromSettings } from "@/lib/engagement";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/site-jsonld";
import type { SiteTheme } from "@/lib/site-theme";

export async function SiteFrame({
  children,
  active,
  current,
  hideBottomNav = false,
  className = "",
}: {
  children: React.ReactNode;
  active?: "home" | "posts" | "partners";
  current?: string;
  hideBottomNav?: boolean;
  className?: string;
}) {
  const [theme, settings, categories] = await Promise.all([
    resolveSiteTheme(),
    getSettings(),
    getCategories(),
  ]);
  const siteName = displaySiteName(settings.siteName);
  const description = (settings.siteTagline || "").trim() || SITE.description;
  return (
    <div className={`${theme.rootClass} ${className}`.trim()}>
      <JsonLd data={[buildWebSiteJsonLd(siteName, description), buildOrganizationJsonLd(siteName, settings, description)]} />
      <Header themeId={theme.id} active={active} siteName={siteName} />
      <SiteNameProvider name={siteName}>
        <EngagementProvider value={engagementFromSettings(settings)}>
          <CategoriesProvider categories={categories}>{children}</CategoriesProvider>
        </EngagementProvider>
      </SiteNameProvider>
      <Footer themeId={theme.id} settings={settings} />
      {hideBottomNav ? null : <BottomNav current={current} categories={categories} />}
      <SitePopup
        enabled={Boolean(settings.popupEnabled)}
        title={settings.popupTitle || ""}
        body={settings.popupBody || ""}
        cta={settings.popupCta || "확인"}
        href={settings.popupHref || "/posts"}
        image={settings.popupImage || ""}
        themeId={theme.id}
      />
    </div>
  );
}

export async function getPublicTheme(): Promise<SiteTheme> {
  return resolveSiteTheme();
}
