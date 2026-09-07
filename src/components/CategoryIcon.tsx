import type { CategorySlug } from "@/lib/types";

const svg = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CategoryIcon({ slug }: { slug?: CategorySlug | "all" }) {
  if (!slug || slug === "all") {
    return (
      <svg {...svg} aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (slug === "pets") {
    return (
      <svg {...svg} aria-hidden>
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
      <svg {...svg} aria-hidden>
        <path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
        <path d="M18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
      </svg>
    );
  }
  if (slug === "interior") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10.5V20h12v-9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }
  if (slug === "realestate") {
    return (
      <svg {...svg} aria-hidden>
        <rect x="4" y="9" width="6" height="11" />
        <rect x="12" y="4" width="8" height="16" />
        <path d="M6 13h2M6 16h2M14 8h4M14 12h4M14 16h4" />
      </svg>
    );
  }
  if (slug === "ads") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M4 10v4h3l5 4V6L7 10H4z" />
        <path d="M16 9a4 4 0 010 6" />
      </svg>
    );
  }
  if (slug === "food") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M4 11h16v2a6 6 0 01-6 6h-4a6 6 0 01-6-6v-2z" />
        <path d="M8 11V5M12 11V4M16 11V6" />
      </svg>
    );
  }
  if (slug === "cooking") {
    return (
      <svg {...svg} aria-hidden>
        <path d="M8 10c0-2 1.5-4 4-5 2.5 1 4 3 4 5" />
        <path d="M5 14h14v2a5 5 0 01-5 5h-4a5 5 0 01-5-5v-2z" />
        <path d="M12 5V3" />
      </svg>
    );
  }
  return (
    <svg {...svg} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  );
}
