import { isAxiosError } from 'axios';
import { z } from 'zod';
import { apiClient } from './axios';
import { getExportFilename } from './mutations/export.mutations';
import { getRetryAfterSeconds } from '../utils/retryAfter';

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const instant = z.iso.datetime().refine((value) => Number.isFinite(Date.parse(value)));
const purposeSchema = z.enum(['EXPORTAR', 'DESCARGAR_EXPORTACION']);
const statusSchema = z.object({
  id: uuid,
  estado: z.enum(['QUEUED', 'RUNNING', 'READY', 'FAILED', 'EXPIRED', 'REVOKED']),
  expiresAt: instant,
  reused: z.boolean(),
});
const currentSchema = z.object({ habilitada: z.boolean(), exportacion: statusSchema.nullable() });
const grantSchema = z.object({
  reauthToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/), proposito: purposeSchema, expiresAt: instant,
});
export type ExportPurpose = z.infer<typeof purposeSchema>;
export type AccountExportStatus = z.infer<typeof statusSchema>;
export type CurrentAccountExport = z.infer<typeof currentSchema>;

/** Error acotado: no conserva AxiosError, request, contraseña, proof ni respuesta binaria. */
export class AccountExportError extends Error {
  readonly response: { status?: number; headers: Record<string, string> };
  readonly status?: number;
  readonly code?: string;
  constructor(status?: number, code?: string, retryAfter?: number) {
    super('No se pudo completar la operación de exportación.');
    this.name = 'AccountExportError';
    this.status = status;
    this.code = code;
    this.response = { status, headers: retryAfter == null ? {} : { 'retry-after': String(retryAfter) } };
  }
}
const knownCodes = new Set(['PASSWORD_ACTUAL_INVALIDA', 'REAUTENTICACION_INVALIDA', 'SOLICITUD_INVALIDA',
  'EXPORTACION_NO_PERMITIDA', 'EXPORTACION_NO_ENCONTRADA', 'EXPORTACION_NO_DISPONIBLE', 'EXPORTACION_LIMITE']);

const safeError = async (error: unknown): Promise<AccountExportError> => {
  if (error instanceof AccountExportError) return error;
  if (!isAxiosError(error)) return new AccountExportError();
  const status = error.response?.status;
  let data: unknown = error.response?.data;
  if (data instanceof Blob) {
    if (data.size <= 8192 && data.type.includes('json')) {
      try { data = JSON.parse(await data.text()); } catch { data = null; }
    } else data = null;
  }
  const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
    && knownCodes.has(data.code) ? data.code : undefined;
  return new AccountExportError(status, code, getRetryAfterSeconds(error) ?? undefined);
};

const perform = async <T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> => {
  signal.throwIfAborted();
  try {
    const result = await operation();
    signal.throwIfAborted();
    return result;
  } catch (error) {
    signal.throwIfAborted();
    throw await safeError(error);
  }
};
const config = (signal: AbortSignal) => ({
  signal, timeout: 20_000, errorMode: 'inline' as const, sessionValidation: 'profile' as const,
});

export const getCurrentAccountExport = (signal: AbortSignal): Promise<CurrentAccountExport> => perform(signal, async () => {
  const response = await apiClient.get<unknown>('/exportaciones/actual', config(signal));
  if (response.status !== 200) throw new AccountExportError();
  return currentSchema.parse(response.data);
});

export const getAccountExportStatus = (id: string, signal: AbortSignal): Promise<AccountExportStatus> => perform(signal, async () => {
  if (!uuid.safeParse(id).success) throw new AccountExportError(400, 'SOLICITUD_INVALIDA');
  const response = await apiClient.get<unknown>(`/exportaciones/${id}`, config(signal));
  const parsed = statusSchema.parse(response.data);
  if (response.status !== 200 || parsed.id !== id) throw new AccountExportError();
  return parsed;
});

/** La prueba sólo se entrega al request activo; no usar esta función en una mutation/query. */
export const reauthenticateExport = (
  passwordActual: string, proposito: ExportPurpose, signal: AbortSignal,
): Promise<string> => perform(signal, async () => {
  if (!passwordActual.trim() || passwordActual.length > 100 || !purposeSchema.safeParse(proposito).success) {
    throw new AccountExportError(400, 'SOLICITUD_INVALIDA');
  }
  const pending = apiClient.post<unknown>('/cuenta/reauthenticaciones', { passwordActual, proposito }, config(signal));
  passwordActual = '';
  const response = await pending;
  const parsed = grantSchema.parse(response.data);
  if (response.status !== 200 || parsed.proposito !== proposito || Date.parse(parsed.expiresAt) <= Date.now()) {
    throw new AccountExportError(400, 'REAUTENTICACION_INVALIDA');
  }
  return parsed.reauthToken;
});

export const requestAccountExport = (
  key: string, reauthToken: string, signal: AbortSignal,
): Promise<AccountExportStatus> => perform(signal, async () => {
  if (!uuid.safeParse(key).success) throw new AccountExportError(400, 'SOLICITUD_INVALIDA');
  const response = await apiClient.post<unknown>('/exportaciones', undefined, {
    ...config(signal), headers: { 'Idempotency-Key': key, 'X-Reauth-Token': reauthToken },
  });
  if (response.status !== 202) throw new AccountExportError();
  return statusSchema.parse(response.data);
});

export interface ExportDownload { blob: Blob; filename: string }
export const downloadAccountExport = (
  id: string | null, reauthToken: string, signal: AbortSignal,
): Promise<ExportDownload> => perform(signal, async () => {
  if (id !== null && !uuid.safeParse(id).success) throw new AccountExportError(400, 'SOLICITUD_INVALIDA');
  const format = id === null ? 'xlsx' : 'zip';
  const response = await apiClient.post<Blob>(id === null ? '/export/excel' : `/exportaciones/${id}/archivo`, undefined, {
    ...config(signal), timeout: 60_000, responseType: 'blob', headers: { 'X-Reauth-Token': reauthToken },
  });
  const expected = format === 'zip' ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (response.status !== 200 || !(response.data instanceof Blob) || response.data.size === 0
    || response.data.type.split(';')[0] !== expected) throw new AccountExportError();
  return { blob: response.data, filename: getExportFilename(response.headers['content-disposition'], new Date(), format) };
});

/** Object URL efímera, sólo después de comprobar que la sesión del request sigue vigente. */
export const saveExportDownload = ({ blob, filename }: ExportDownload): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
};
