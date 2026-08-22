import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { toLocalDateInputValue } from '../../utils/date';

const decodeFilename = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Resuelve nombres `filename` y RFC 5987 (`filename*`) del backend. */
export const getExportFilename = (
  contentDisposition: string | undefined,
  today = new Date(),
): string => {
  const encoded = contentDisposition?.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1]?.trim();
  if (encoded) return decodeFilename(encoded.replace(/^"|"$/g, ''));

  const regular = contentDisposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const fromHeader = regular?.[1] ?? regular?.[2];
  return fromHeader ?? `ordenfix-export-${toLocalDateInputValue(today)}.xlsx`;
};

// Descarga el .xlsx con todos los datos del taller (solo ADMIN, contrato §4.14).
const exportarExcel = async (): Promise<void> => {
  const res = await apiClient.get('/export/excel', { responseType: 'blob' });

  // Preferimos el filename del backend (Content-Disposition); si no viene, uno con la fecha de hoy.
  const disp = res.headers['content-disposition'] as string | undefined;
  const filename = getExportFilename(disp);

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
