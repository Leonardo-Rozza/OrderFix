interface Props {
  onRetry?: () => void;
  title?: string;
  message?: string;
}

/** Estado de error consistente para listados y paneles, con reintento. */
export const ErrorState = ({ onRetry, title = 'No se pudo cargar', message }: Props) => (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger-fg">
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
      </svg>
    </div>
    <div className="text-[15px] font-extrabold">{title}</div>
    <div className="mt-1 text-[13px] text-text-3">{message ?? 'Revisá tu conexión e intentá de nuevo.'}</div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-bold text-text transition hover:border-primary hover:text-primary"
      >
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
        </svg>
        Reintentar
      </button>
    )}
  </div>
);
