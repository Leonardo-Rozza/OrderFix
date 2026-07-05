import { useExportExcelMutation } from '../api/mutations/export.mutations';
import { useAuth } from '../store/auth.store';

const DownloadIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

/**
 * Botón para exportar los datos del taller a Excel (§4.14). Solo se muestra al
 * ADMIN; en cualquier plan. Dos variantes: compacta (toolbars) y tarjeta (Planes).
 */
export const ExportExcelButton = ({ variant = 'button' }: { variant?: 'button' | 'card' }) => {
  const { isAdmin } = useAuth();
  const exportar = useExportExcelMutation();
  if (!isAdmin) return null;

  if (variant === 'card') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
          <DownloadIcon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold">Exportar mis datos</div>
          <div className="mt-0.5 text-[13px] text-text-2">
            Descargá un Excel con tus clientes, órdenes, cobros y presupuestos. Son tus datos: te los llevás cuando quieras.
          </div>
        </div>
        <button
          type="button"
          onClick={() => exportar.mutate()}
          disabled={exportar.isPending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-[14px] font-bold text-text transition hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {exportar.isPending ? 'Generando…' : 'Exportar a Excel'}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => exportar.mutate()}
      disabled={exportar.isPending}
      title="Exportar todos los datos del taller a Excel"
      className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-2.5 text-[14px] font-bold text-text transition hover:border-primary hover:text-primary disabled:opacity-60"
    >
      <DownloadIcon />
      {exportar.isPending ? 'Generando…' : 'Exportar a Excel'}
    </button>
  );
};
