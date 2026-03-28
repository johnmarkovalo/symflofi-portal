"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
} & (
  | { mode: "server" }
  | { mode: "client"; onPageChange: (page: number) => void; onPerPageChange: (perPage: number) => void }
);

export default function Pagination(props: PaginationProps) {
  const { currentPage, totalPages, totalCount, perPage, mode } = props;
  const router = useRouter();
  const searchParams = useSearchParams();

  const start = Math.min((currentPage - 1) * perPage + 1, totalCount);
  const end = Math.min(currentPage * perPage, totalCount);

  function goToPage(page: number) {
    if (mode === "client") {
      props.onPageChange(page);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) {
        params.set("page", page.toString());
      } else {
        params.delete("page");
      }
      router.push(`?${params.toString()}`);
    }
  }

  function changePerPage(newPerPage: number) {
    if (mode === "client") {
      props.onPerPageChange(newPerPage);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("perPage", newPerPage.toString());
      params.delete("page");
      router.push(`?${params.toString()}`);
    }
  }

  // Generate page numbers to show
  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing {start}-{end} of {totalCount}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={perPage}
            onChange={(e) => changePerPage(Number(e.target.value))}
            className="rounded-lg bg-muted border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-1.5 text-xs text-muted-foreground">...</span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  p === currentPage
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
