import { useExportExcelMutation } from '../api/mutations/export.mutations';
import { useAuth } from '../store/auth.store';

const DownloadIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

/**
 * Botón para exportar los datos del taller a Excel (§4.14). Solo se muestra al
 * ADMIN; en cualquier plan. Su ubicación operativa es el Dashboard.
 */
export const ExportExcelButton = () => {
  const { isAdmin } = useAuth();
  const exportar = useExportExcelMutation();
  if (!isAdmin) return null;

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
