import { listPageHref } from "@/lib/list-page";

export function ListPagination({
  page,
  totalPages,
  basePath,
  extra,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  extra?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <a key={n} className={`page-btn ${n === page ? "active" : ""}`} href={listPageHref(basePath, n, extra)}>
          {n}
        </a>
      ))}
    </div>
  );
}
