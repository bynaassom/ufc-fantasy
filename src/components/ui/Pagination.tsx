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
      {currentPage === 1 ? (
        <span
          className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            opacity: 0.4,
          }}
          aria-disabled={true}
        >
          Anterior
        </span>
      ) : (
        <Link
          href={buildHref(currentPage - 1)}
          className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
          style={{
            color: "var(--text)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            opacity: 1,
          }}
        >
          Anterior
        </Link>
      )}

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

      {currentPage === totalPages ? (
        <span
          className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            opacity: 0.4,
          }}
          aria-disabled={true}
        >
          Próximo
        </span>
      ) : (
        <Link
          href={buildHref(currentPage + 1)}
          className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2"
          style={{
            color: "var(--text)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            opacity: 1,
          }}
        >
          Próximo
        </Link>
      )}
    </nav>
  );
}
