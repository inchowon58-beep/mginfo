import type { Banner, BannerTheme } from "@/lib/types";

const svg = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BannerMark({ theme }: { theme: BannerTheme }) {
  if (theme === "ink") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M5 19l9.5-9.5 2 2L7 21H5v-2z" />
        <path d="M14 6.5l2.5-2.5 3 3-2.5 2.5" />
      </svg>
    );
  }
  if (theme === "ivory") {
    return (
      <svg {...svg} aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="1.5" />
        <path d="M8 9h8M8 12h8M8 15h5" />
      </svg>
    );
  }
  if (theme === "forest") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M12 21V11" />
        <path d="M12 11c-3 0-5.5 2-6.5 5 2-1 4.2-.6 6.5.8 2.3-1.4 4.5-1.8 6.5-.8-1-3-3.5-5-6.5-5z" />
        <path d="M12 11c-2.2-2.8-2-6-0.2-7.5C13.8 5 15 7.8 12 11z" />
      </svg>
    );
  }
  if (theme === "wine") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M8 4h8l-1 7a5 5 0 01-10 0L8 4z" />
        <path d="M12 16v4M9 20h6" />
      </svg>
    );
  }
  return (
    <svg {...svg} aria-hidden>
      <path d="M4 8.5C7 6 10 6 12 8.5 14 6 17 6 20 8.5" />
      <path d="M4 13c3-2.5 6-2.5 8 0 2-2.5 5-2.5 8 0" />
      <path d="M4 17.5c3-2.5 6-2.5 8 0 2-2.5 5-2.5 8 0" />
    </svg>
  );
}

export function PromoBanner({ banner }: { banner: Banner }) {
  const href = banner.href || "/";
  if (banner.kind === "image" && banner.imageUrl) {
    return (
      <a
        className="promo-banner is-image"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={banner.imageUrl} alt={banner.title || "배너"} />
      </a>
    );
  }

  return (
    <a
      className={`promo-banner is-text theme-${banner.theme}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="promo-banner-mark">
        <BannerMark theme={banner.theme} />
      </span>
      <span className="promo-banner-copy">
        {banner.kicker ? <span className="promo-banner-kicker">{banner.kicker}</span> : null}
        <strong className="promo-banner-title">{banner.title}</strong>
        {banner.subtitle ? <span className="promo-banner-sub">{banner.subtitle}</span> : null}
      </span>
      <span className="promo-banner-cta">{banner.ctaLabel || "바로가기"}</span>
    </a>
  );
}
