export function AdminIcon({
  name,
  className = "admin-ico",
}: {
  name:
    | "posts"
    | "published"
    | "draft"
    | "banner"
    | "key"
    | "calendar"
    | "quota"
    | "naver"
    | "write"
    | "settings"
    | "spark";
  className?: string;
}) {
  const path = {
    posts: "M7 4h8l4 4v12H7zM11 4v4h4M10 12h6M10 16h6",
    published: "M12 4a8 8 0 100 16 8 8 0 000-16zM8.8 12.2l2.1 2.1 4.3-4.4",
    draft: "M5 20h14M7 16l8.5-8.5a1.5 1.5 0 012 2L9 18H7z",
    banner: "M4 6h16v12H4zM8 10h8M8 14h5",
    key: "M8 14a4 4 0 116.3 3.3L16 19l-1 1-2-1-1 1-2.2-2.2A4 4 0 018 14zM14 10l3-3",
    calendar: "M7 4v3M17 4v3M5 8h14v12H5zM5 12h14",
    quota: "M4 19V5M4 19h16M8 15l3-4 3 2 4-6",
    naver: "M6 6h4l4 7V6h4v12h-4l-4-7v7H6z",
    write: "M5 19h14M6 13l9-9 3 3-9 9H6z",
    settings: "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 3v2M12 19v2M4.9 7l1.7 1M17.4 16l1.7 1M4.9 17l1.7-1M17.4 8l1.7-1",
    spark: "M12 3l1.2 6.2L19 12l-5.8 2.8L12 21l-1.2-6.2L5 12l5.8-2.8z",
  }[name];

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
