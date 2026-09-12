import { Link } from 'react-router';
import { useAuth } from '../store/auth.store';
import { btnGhost } from './ui';

const DownloadIcon = ({ size = 17 }: { size?: number }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

/**
 * Acceso al reporte operativo. La descarga exige reautenticación en Cuenta.
 */
export const ExportExcelButton = () => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Link
      to="/cuenta/exportacion#excel"
      title="Ir a la descarga protegida de clientes, órdenes, cobros y presupuestos"
      className={btnGhost}
    >
      <DownloadIcon />
      Exportar a Excel
    </Link>
  );
};
