import Link from "next/link";

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-8"
      aria-label="Paginação"
    >
      <Link
        href={currentPage === 1 ? "#" : buildHref(currentPage - 1)}
        className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
        style={{
          color: currentPage === 1 ? "var(--text-muted)" : "var(--text)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          pointerEvents: currentPage === 1 ? "none" : undefined,
          opacity: currentPage === 1 ? 0.4 : 1,
        }}
        aria-disabled={currentPage === 1}
      >
        Anterior
      </Link>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="font-condensed font-700 text-xs px-2"
            style={{ color: "var(--text-muted)" }}
          >
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className="font-condensed font-700 text-xs px-3 py-2"
            style={{
              color: p === currentPage ? "white" : "var(--text)",
              backgroundColor:
                p === currentPage ? "var(--red)" : "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={
          currentPage === totalPages ? "#" : buildHref(currentPage + 1)
        }
        className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
        style={{
          color:
            currentPage === totalPages ? "var(--text-muted)" : "var(--text)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          pointerEvents: currentPage === totalPages ? "none" : undefined,
          opacity: currentPage === totalPages ? 0.4 : 1,
        }}
        aria-disabled={currentPage === totalPages}
      >
        Próximo
      </Link>
    </nav>
  );
}
