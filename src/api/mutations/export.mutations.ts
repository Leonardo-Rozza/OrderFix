import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

// Descarga el .xlsx con todos los datos del taller (solo ADMIN, contrato §4.14).
const exportarExcel = async (): Promise<void> => {
  const res = await apiClient.get('/export/excel', { responseType: 'blob' });

  // Preferimos el filename del backend (Content-Disposition); si no viene, uno con la fecha de hoy.
  const disp = res.headers['content-disposition'] as string | undefined;
  const match = disp?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `ordenfix-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Exporta los datos del taller a Excel. El 403 (USER) lo maneja el interceptor. */
export const useExportExcelMutation = () => {
  return useMutation({
    mutationFn: exportarExcel,
    onSuccess: () => showSuccess('Exportación lista, revisá tus descargas.'),
    onError: (error) => showError(getErrorMessage(error, 'No se pudo exportar. Probá de nuevo.')),
  });
};
