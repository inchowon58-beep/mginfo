export const PUBLIC_LIST_PAGE_SIZE = 12;

export function parseListPage(raw?: string) {
  const n = Number(raw || 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function paginateList<T>(items: T[], page: number, perPage = PUBLIC_LIST_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    page: safePage,
    perPage,
    total,
    totalPages,
    items: items.slice(start, start + perPage),
    start: start + 1,
  };
}

export function listPageHref(basePath: string, page: number, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
