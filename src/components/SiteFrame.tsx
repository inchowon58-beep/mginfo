import { CategoriesProvider } from "@/components/CategoriesContext";
import { EngagementProvider } from "@/components/EngagementContext";
import { SiteNameProvider } from "@/components/SiteNameContext";
import { BottomNav, Footer, Header } from "@/components/Header";
import { displaySiteName } from "@/lib/categories";
import { getCategories, getSettings, resolveSiteTheme } from "@/lib/db";
import { engagementFromSettings } from "@/lib/engagement";
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
  return (
    <div className={`${theme.rootClass} ${className}`.trim()}>
      <Header themeId={theme.id} active={active} siteName={siteName} />
      <SiteNameProvider name={siteName}>
        <EngagementProvider value={engagementFromSettings(settings)}>
          <CategoriesProvider categories={categories}>{children}</CategoriesProvider>
        </EngagementProvider>
      </SiteNameProvider>
      <Footer themeId={theme.id} settings={settings} />
      {hideBottomNav ? null : <BottomNav current={current} categories={categories} />}
    </div>
  );
}

export async function getPublicTheme(): Promise<SiteTheme> {
  return resolveSiteTheme();
}
