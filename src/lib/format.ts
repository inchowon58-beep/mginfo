export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function formatAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.max(0, Math.floor(diff / 60000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일전`;
  return formatDate(iso);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
