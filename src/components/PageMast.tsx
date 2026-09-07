import type { ReactNode } from "react";
import { getPageMastClass } from "@/lib/theme-chrome";
import type { SiteThemeId } from "@/lib/types";

export function PageMast({
  themeId,
  kicker,
  title,
  dek,
  children,
}: {
  themeId: SiteThemeId;
  kicker: string;
  title: ReactNode;
  dek?: ReactNode;
  children?: ReactNode;
}) {
  const cls = getPageMastClass(themeId);
  return (
    <section className={cls.wrap}>
      <p className={cls.kicker}>{kicker}</p>
      <h1>{title}</h1>
      {dek ? <p className={cls.dek}>{dek}</p> : null}
      {children}
    </section>
  );
}
