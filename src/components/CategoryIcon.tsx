import type { CategorySlug } from "@/lib/types";

const line = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const mark = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "currentColor",
};

export function CategoryIcon({
  slug,
  filled = false,
  animated = false,
}: {
  slug?: CategorySlug | "all";
  filled?: boolean;
  animated?: boolean;
}) {
  if (filled) {
    return <FilledIcon slug={slug} animated={animated} />;
  }
  return <LineIcon slug={slug} />;
}

function FilledIcon({
  slug,
  animated = false,
}: {
  slug?: CategorySlug | "all";
  animated?: boolean;
}) {
  const live = animated ? "portal-live" : undefined;
  if (!slug || slug === "all") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </g>
      </svg>
    );
  }
  if (slug === "pets") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <circle cx="7" cy="8" r="2.5" />
          <circle cx="17" cy="8" r="2.5" />
          <circle cx="5" cy="13.2" r="2" />
          <circle cx="19" cy="13.2" r="2" />
          <ellipse cx="12" cy="17" rx="4.6" ry="3.5" />
        </g>
      </svg>
    );
  }
  if (slug === "beauty") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <path d="M12 2.4l1.7 5.1 5.4.2-4.3 3.3 1.5 5.2L12 13.4 7.7 16.2 9.2 11 4.9 7.7l5.4-.2L12 2.4z" />
        </g>
        {animated ? <circle className="live-spark" cx="19.2" cy="5.2" r="1.35" /> : null}
      </svg>
    );
  }
  if (slug === "interior") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <path d="M12 3.2L3.5 10.4h2.2V20h5.1v-6.2h2.4V20h5.1v-9.6h2.2L12 3.2z" />
        </g>
      </svg>
    );
  }
  if (slug === "realestate") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <path d="M3.5 9.2h7.2V21H3.5V9.2zm9.6-5.4H20.5V21h-7.4V3.8z" />
        </g>
      </svg>
    );
  }
  if (slug === "ads") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <path d="M4 9.2v5.6h3.1L13 20.2V3.8L7.1 9.2H4z" />
        </g>
        <path className="live-wave" d="M16.2 8.2a4.4 4.4 0 010 7.6l-1.2-1.6a2.7 2.7 0 000-4.4l1.2-1.6z" />
      </svg>
    );
  }
  if (slug === "food") {
    return (
      <svg {...mark} className={live} aria-hidden>
        {animated ? (
          <g className="live-steam" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8.2 4.2c.2-1.2 1.3-1.4 1.3-2.6" />
            <path d="M12 3.6c.2-1.2 1.3-1.4 1.3-2.6" />
            <path d="M15.6 4.2c.2-1.2 1.3-1.4 1.3-2.6" />
          </g>
        ) : null}
        <g className="live-mark">
          <path d="M7.2 3.4c0 2.6.8 4.4 1.8 5.4H5.2C4 7.4 4 4.8 7.2 3.4zm4.8 0c0 2.6.8 4.4 1.8 5.4h-3.8C8.8 7.4 8.8 4.8 12 3.4zm4.8 0c0 2.6.8 4.4 1.8 5.4h-3.8c-1.2-1.4-1.2-4 2-5.4zM4.4 10.6h15.2v1.5a6.4 6.4 0 01-6.4 6.4h-2.4a6.4 6.4 0 01-6.4-6.4v-1.5z" />
          <path d="M6.8 19.8h10.4v1.4H6.8z" />
        </g>
      </svg>
    );
  }
  if (slug === "cooking") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-lid">
          <path d="M8.2 8.6c0-2.4 1.6-4.4 3.8-5.4 2.2 1 3.8 3 3.8 5.4H8.2z" />
          <path d="M11.2 3.2h1.6V5h-1.6z" />
        </g>
        <g className="live-mark">
          <path d="M4.2 10.4h15.6v2.1a5.6 5.6 0 01-5.6 5.6h-4.4a5.6 5.6 0 01-5.6-5.6v-2.1z" />
        </g>
      </svg>
    );
  }
  if (slug === "free") {
    return (
      <svg {...mark} className={live} aria-hidden>
        <g className="live-mark">
          <path d="M5 4.5h10.5L19 8v11.5H5V4.5z" />
          <path d="M15.2 4.8V8H19" />
        </g>
      </svg>
    );
  }
  return (
    <svg {...mark} className={live} aria-hidden>
      <circle className="live-mark" cx="12" cy="12" r="4.2" />
      <g className="live-rays">
        <circle cx="12" cy="3.6" r="1.3" />
        <circle cx="12" cy="20.4" r="1.3" />
        <circle cx="3.6" cy="12" r="1.3" />
        <circle cx="20.4" cy="12" r="1.3" />
        <circle cx="6.1" cy="6.1" r="1.2" />
        <circle cx="17.9" cy="17.9" r="1.2" />
        <circle cx="17.9" cy="6.1" r="1.2" />
        <circle cx="6.1" cy="17.9" r="1.2" />
      </g>
    </svg>
  );
}

function LineIcon({ slug }: { slug?: CategorySlug | "all" }) {
  if (!slug || slug === "all") {
    return (
      <svg {...line} aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (slug === "pets") {
    return (
      <svg {...line} aria-hidden>
        <circle cx="7" cy="8" r="2.2" />
        <circle cx="17" cy="8" r="2.2" />
        <circle cx="5" cy="13" r="1.8" />
        <circle cx="19" cy="13" r="1.8" />
        <ellipse cx="12" cy="16.5" rx="4.2" ry="3.2" />
      </svg>
    );
  }
  if (slug === "beauty") {
    return (
      <svg {...line} aria-hidden>
        <path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
        <path d="M18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
      </svg>
    );
  }
  if (slug === "interior") {
    return (
      <svg {...line} aria-hidden>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10.5V20h12v-9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }
  if (slug === "realestate") {
    return (
      <svg {...line} aria-hidden>
        <rect x="4" y="9" width="6" height="11" />
        <rect x="12" y="4" width="8" height="16" />
        <path d="M6 13h2M6 16h2M14 8h4M14 12h4M14 16h4" />
      </svg>
    );
  }
  if (slug === "ads") {
    return (
      <svg {...line} aria-hidden>
        <path d="M4 10v4h3l5 4V6L7 10H4z" />
        <path d="M16 9a4 4 0 010 6" />
      </svg>
    );
  }
  if (slug === "food") {
    return (
      <svg {...line} aria-hidden>
        <path d="M4 11h16v2a6 6 0 01-6 6h-4a6 6 0 01-6-6v-2z" />
        <path d="M8 11V5M12 11V4M16 11V6" />
      </svg>
    );
  }
  if (slug === "cooking") {
    return (
      <svg {...line} aria-hidden>
        <path d="M8 10c0-2 1.5-4 4-5 2.5 1 4 3 4 5" />
        <path d="M5 14h14v2a5 5 0 01-5 5h-4a5 5 0 01-5-5v-2z" />
        <path d="M12 5V3" />
      </svg>
    );
  }
  if (slug === "free") {
    return (
      <svg {...line} aria-hidden>
        <path d="M6 5h9l3 3v11H6V5z" />
        <path d="M15 5v3h3" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    );
  }
  return (
    <svg {...line} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  );
}
