interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm text-stone-600">
      <span>
        Pagina {page} de {totalPages} - {total} registro(s)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="button-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
