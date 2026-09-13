import { isAxiosError } from 'axios';
import { z } from 'zod';
import { apiClient } from '../axios';
import { getRetryAfterSeconds } from '../../utils/retryAfter';

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const instant = z.iso.datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)));
const purpose = z.enum(['CERRAR', 'RESTAURAR']);
const state = z.enum(['ABIERTO', 'RESTRINGIDO']);
const receiptSchema = z.object({
  operacionId: uuid, referencia: uuid, proposito: purpose, estadoResultante: state,
  confirmadoEn: instant, reversibleHasta: instant, registradaEn: instant, reutilizada: z.boolean(),
}).refine((value) => value.estadoResultante === (value.proposito === 'CERRAR' ? 'RESTRINGIDO' : 'ABIERTO')
  && Date.parse(value.reversibleHasta) > Date.parse(value.confirmadoEn));
const statusSchema = z.object({
  estado: state, tallerNombre: z.string().trim().min(1).max(255), observadoEn: instant,
  referencia: uuid.nullable(), confirmadoEn: instant.nullable(), reversibleHasta: instant.nullable(),
  puedeSolicitar: z.boolean(), puedeRestaurar: z.boolean(), ultimaOperacion: receiptSchema.nullable(),
}).refine((value) => value.estado === 'ABIERTO'
  ? value.referencia === null && value.confirmadoEn === null && value.reversibleHasta === null && !value.puedeRestaurar
  : value.referencia !== null && value.confirmadoEn !== null && value.reversibleHasta !== null
    && Date.parse(value.reversibleHasta) > Date.parse(value.confirmadoEn) && !value.puedeSolicitar);
const grantSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresAt: instant });
const identitySchema = z.object({ proposito: purpose, operacionId: uuid, cierreReferencia: uuid })
  .refine((value) => value.proposito !== 'CERRAR' || value.operacionId === value.cierreReferencia);

export type WorkshopClosurePurpose = z.infer<typeof purpose>;
export type WorkshopClosureStatus = z.infer<typeof statusSchema>;
export type WorkshopClosureReceipt = z.infer<typeof receiptSchema>;
export interface WorkshopClosureIdentity {
  proposito: WorkshopClosurePurpose;
  operacionId: string;
  cierreReferencia: string;
}
export interface WorkshopClosureCommand extends WorkshopClosureIdentity { confirmacion: string }

/** Contains no Axios config, body, credentials, proof or raw response. */
export class WorkshopClosureError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly response: { status?: number; headers: Record<string, string> };
  constructor(status?: number, code?: string, retryAfter?: number) {
    super('No se pudo acreditar la operación del taller.');
    this.name = 'WorkshopClosureError'; this.status = status; this.code = code;
    this.response = { status, headers: retryAfter == null ? {} : { 'retry-after': String(retryAfter) } };
  }
}
const knownCodes = new Set(['SESION_INVALIDA', 'ACCESO_DENEGADO', 'EMAIL_NO_VERIFICADO',
  'SOLICITUD_INVALIDA', 'PASSWORD_ACTUAL_INVALIDA', 'REAUTENTICACION_INVALIDA', 'CIERRE_CONFLICTO',
  'CUENTA_EN_CIERRE', 'LIMITE_SOLICITUDES', 'CIERRE_NO_DISPONIBLE']);
const safeError = (error: unknown): WorkshopClosureError => {
  if (error instanceof WorkshopClosureError) return error;
  if (!isAxiosError(error)) return new WorkshopClosureError();
  const data: unknown = error.response?.data;
  const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
    && knownCodes.has(data.code) ? data.code : undefined;
  return new WorkshopClosureError(error.response?.status, code, getRetryAfterSeconds(error) ?? undefined);
};
const config = { timeout: 20_000, errorMode: 'inline' as const, sessionValidation: 'closure' as const };
const invalid = () => new WorkshopClosureError(400, 'SOLICITUD_INVALIDA');

export const getWorkshopClosure = async (signal: AbortSignal): Promise<WorkshopClosureStatus> => {
  signal.throwIfAborted();
  try {
    const response = await apiClient.get<unknown>('/cuenta/cierre', { ...config, signal });
    signal.throwIfAborted();
    if (response.status !== 200) throw new WorkshopClosureError();
    return statusSchema.parse(response.data);
  } catch (error) {
    signal.throwIfAborted();
    throw safeError(error);
  }
};

/** Call only from the active form, never a query/mutation cache or persisted state. */
export const reauthenticateWorkshopClosure = async (
  input: WorkshopClosureIdentity & { passwordActual: string },
): Promise<string> => {
  if (!identitySchema.safeParse(input).success || !input.passwordActual.trim() || input.passwordActual.length > 100)
    throw invalid();
  const body = { passwordActual: input.passwordActual, proposito: input.proposito,
    operacionId: input.operacionId, cierreReferencia: input.cierreReferencia };
  try {
    const response = await apiClient.post<unknown>('/cuenta/cierre/reauthenticaciones', body, config);
    if (response.status !== 200) throw new WorkshopClosureError();
    // Server decides validity/expiry. A wrong browser clock must not hide restoration.
    return grantSchema.parse(response.data).token;
  } catch (error) { throw safeError(error); }
  finally { body.passwordActual = ''; }
};

export const submitWorkshopClosure = async (
  input: WorkshopClosureCommand, reauthToken: string,
): Promise<WorkshopClosureReceipt> => {
  if (!identitySchema.safeParse(input).success || !/^[A-Za-z0-9_-]{43}$/.test(reauthToken)
    || input.confirmacion !== (input.proposito === 'CERRAR' ? 'CERRAR MI TALLER' : 'RESTAURAR MI TALLER')) throw invalid();
  const headers = { 'X-Reauth-Token': reauthToken };
  reauthToken = '';
  try {
    const response = await apiClient.post<unknown>('/cuenta/cierre/operaciones', {
      proposito: input.proposito, operacionId: input.operacionId,
      cierreReferencia: input.cierreReferencia, confirmacion: input.confirmacion,
    }, { ...config, headers });
    if (response.status !== 200) throw new WorkshopClosureError();
    const receipt = receiptSchema.parse(response.data);
    if (receipt.operacionId !== input.operacionId || receipt.referencia !== input.cierreReferencia
      || receipt.proposito !== input.proposito) throw new WorkshopClosureError();
    return receipt;
  } catch (error) { throw safeError(error); }
  finally { headers['X-Reauth-Token'] = ''; }
};
