"use client";

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
  "inline-flex h-10 items-center justify-center rounded-md border px-3.5 text-sm transition-colors";
const pageClassName =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm transition-colors";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label = "Paginación",
  className = "",
}) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav
      aria-label={label}
      className={`flex w-full flex-wrap items-center justify-center gap-2.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label="Página anterior"
        className={`${controlClassName} ${
          isFirstPage
            ? "cursor-not-allowed border-[#e4d8c8] bg-transparent text-[#c4b5a5]"
            : "cursor-pointer border-[#d7c8b6] bg-[#faf6f0] text-[#3d2f24] hover:bg-[#f3ebe1]"
        }`}
      >
        ← Anterior
      </button>

      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="min-w-6 text-center text-[#8a6f5c]"
          >
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
                ? "border-[#5c4033] bg-[#5c4033] font-medium text-white"
                : "cursor-pointer border-[#d7c8b6] bg-[#faf6f0] text-[#3d2f24] hover:bg-[#f3ebe1]"
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
            ? "cursor-not-allowed border-[#e4d8c8] bg-transparent text-[#c4b5a5]"
            : "cursor-pointer border-[#d7c8b6] bg-[#faf6f0] text-[#3d2f24] hover:bg-[#f3ebe1]"
        }`}
      >
        Siguiente →
      </button>

      <span className="ml-1 text-sm text-[#6b5344]">
        Página {currentPage} de {totalPages}
      </span>
    </nav>
  );
}
