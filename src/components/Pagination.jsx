"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const visible = [];

  for (const page of sorted) {
    const previous = visible[visible.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      visible.push("ellipsis");
    }
    visible.push(page);
  }

  return visible;
}

const controlClassName =
  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-colors";
const pageClassName =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label = "Paginación",
  className = "",
}) {
  if (!totalPages) return null;

  const pages = getVisiblePages(currentPage, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav aria-label={label} className={`flex w-full flex-col items-center gap-3 ${className}`}>
      <div className="flex w-full flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Página anterior"
          className={`${controlClassName} ${
            isFirstPage
              ? "cursor-not-allowed border-[#bb9c82]/45 bg-transparent text-[#bb9c82]"
              : "cursor-pointer border-[#bb9c82] bg-[#e7dcd2] text-[#946541] hover:bg-[#ffdf90]/35"
          }`}
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" className="mr-1" />
          Anterior
        </button>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} aria-hidden="true" className="min-w-6 text-center text-[#946541]">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={`${pageClassName} ${
                page === currentPage
                  ? "border-[#704a31] bg-[#704a31] font-medium text-[#e7dcd2]"
                  : "cursor-pointer border-[#bb9c82] bg-[#e7dcd2] text-[#946541] hover:bg-[#ffdf90]/35"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Página siguiente"
          className={`${controlClassName} ${
            isLastPage
              ? "cursor-not-allowed border-[#bb9c82]/45 bg-transparent text-[#bb9c82]"
              : "cursor-pointer border-[#bb9c82] bg-[#e7dcd2] text-[#946541] hover:bg-[#ffdf90]/35"
          }`}
        >
          Siguiente
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="ml-1" />
        </button>
      </div>

      <span className="text-sm text-[#946541]">
        Página {currentPage} de {totalPages}
      </span>
    </nav>
  );
}
