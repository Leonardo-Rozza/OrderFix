import { useExportExcelMutation } from '../api/mutations/export.mutations';
import { useAuth } from '../store/auth.store';
import { btnGhost } from './ui';

const DownloadIcon = ({ size = 17 }: { size?: number }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
      aria-busy={exportar.isPending}
      title="Descargar clientes, órdenes, cobros y presupuestos del taller"
      className={btnGhost}
    >
      <DownloadIcon />
      {exportar.isPending ? 'Generando…' : 'Exportar a Excel'}
    </button>
  );
};
