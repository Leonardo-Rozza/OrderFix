import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '../axios';
import { showError, showSuccess } from '../../utils/toast';
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

const EXPORT_ERROR = 'No se pudo exportar. Probá de nuevo.';

const getExportErrorMessage = async (error: unknown): Promise<string> => {
  if (!isAxiosError(error) || !error.response || error.response.status >= 500) return EXPORT_ERROR;

  // responseType: blob también convierte los errores JSON en Blob. Sólo usamos
  // un mensaje breve de la API; las respuestas inesperadas conservan el aviso local.
  let data: unknown = error.response.data;
  if (data instanceof Blob) {
    if (!data.type.includes('json') || data.size > 8192) return EXPORT_ERROR;
    try {
      data = JSON.parse(await data.text());
    } catch {
      return EXPORT_ERROR;
    }
  }
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    const message = data.message.trim();
    if (message && message.length <= 250) return message;
  }
  return EXPORT_ERROR;
};

// Descarga los cuatro resúmenes operativos del taller (solo ADMIN, contrato §4.14).
const exportarExcel = async (): Promise<void> => {
  const res = await apiClient.get('/export/excel', { responseType: 'blob', errorMode: 'inline' });

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

/** Exporta los resúmenes del taller; sesión, permisos y límite siguen en el interceptor. */
export const useExportExcelMutation = () => {
  return useMutation({
    mutationFn: exportarExcel,
    onSuccess: () => showSuccess('Exportación lista, revisá tus descargas.'),
    onError: async (error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 402 || status === 403) return;
      showError(await getExportErrorMessage(error));
    },
  });
};
