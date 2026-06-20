interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

interface Props {
  meta: PageMeta | undefined;
  onChange: (page: number) => void;
}

/** Barra de paginación server-side: cuenta de resultados + anterior/siguiente. */
export const Pagination = ({ meta, onChange }: Props) => {
  if (!meta || meta.totalElements === 0) return null;

  const { number: page, totalPages, totalElements } = meta;
  const primera = page <= 0;
  const ultima = page >= totalPages - 1;

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1 text-[13px] text-text-2">
      <span>
        {totalElements} resultado{totalElements === 1 ? '' : 's'}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={primera}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-text-2"
            aria-label="Anterior"
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="font-semibold text-text">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={ultima}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-text-2"
            aria-label="Siguiente"
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
