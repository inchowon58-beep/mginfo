import Link from "next/link";
import { displaySiteName } from "@/lib/categories";
import type { SiteThemeId } from "@/lib/types";

function brandName(name?: string) {
  return displaySiteName(name);
}

function brandInitial(name?: string) {
  return brandName(name).slice(0, 1).toUpperCase() || "I";
}

export function BrandMark({
  href = "/",
  themeId = "folio",
  name,
}: {
  href?: string;
  themeId?: SiteThemeId;
  name?: string;
}) {
  const label = brandName(name);
  if (themeId === "press") {
    return (
      <Link className="site-logo press-logo" href={href}>
        <span className="press-logo-word">{label}</span>
      </Link>
    );
  }
  if (themeId === "night") {
    return (
      <Link className="site-logo night-logo" href={href}>
        <span className="night-logo-mark">{brandInitial(label)}</span>
        <span className="night-logo-word">{label}</span>
      </Link>
    );
  }
  if (themeId === "journal") {
    return (
      <Link className="site-logo blog-logo" href={href}>
        {label}
      </Link>
    );
  }
  if (themeId === "qna") {
    return (
      <Link className="site-logo qna-logo" href={href}>
        <span className="qna-logo-q">{brandInitial(label)}</span>
        {label}
      </Link>
    );
  }
  if (themeId === "talk") {
    return (
      <Link className="site-logo talk-logo" href={href}>
        {label}
      </Link>
    );
  }
  if (themeId === "portal") {
    return (
      <Link className="site-logo portal-logo" href={href}>
        {label}
      </Link>
    );
  }
  if (themeId === "carrot") {
    return (
      <Link className="site-logo carrot-logo" href={href}>
        <span className="carrot-mark" aria-hidden />
        {label}
      </Link>
    );
  }
  if (themeId === "studio") {
    return (
      <Link className="site-logo studio-logo" href={href}>
        <span className="studio-mark" aria-hidden />
        {label}
      </Link>
    );
  }
  return (
    <Link className="site-logo" href={href}>
      {label}
    </Link>
  );
}

export function BrandText({ themeId = "folio", name }: { themeId?: SiteThemeId; name?: string }) {
  const label = brandName(name);
  if (themeId === "press") {
    return <span className="press-logo-word">{label}</span>;
  }
  if (themeId === "night") {
    return <span className="night-logo-word">{label}</span>;
  }
  if (themeId === "journal") {
    return <span className="blog-logo">{label}</span>;
  }
  if (themeId === "qna") {
    return <span className="qna-logo-word">{label}</span>;
  }
  if (themeId === "talk") {
    return <span className="talk-logo">{label}</span>;
  }
  if (themeId === "portal") {
    return <span className="portal-logo">{label}</span>;
  }
  if (themeId === "carrot") {
    return (
      <span className="carrot-logo">
        <span className="carrot-mark" aria-hidden />
        {label}
      </span>
    );
  }
  if (themeId === "studio") {
    return (
      <span className="studio-logo">
        <span className="studio-mark" aria-hidden />
        {label}
      </span>
    );
  }
  return <>{label}</>;
}
