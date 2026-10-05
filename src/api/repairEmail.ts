import axios from 'axios';
import { authStore, isChargeSessionCurrent } from '../store/auth.store';
import { chargeAccount, chargeGeneration, type ChargeSession } from '../utils/pendingCharge';
import { apiClient } from './axios';

export const repairEmailStates = [
  'NO_EVENTO', 'DESHABILITADO', 'SIN_EMAIL', 'PENDIENTE',
  'EN_CURSO', 'ACEPTADO', 'FALLO_PREVIO', 'INCIERTO',
] as const;
export type RepairEmailState = typeof repairEmailStates[number] | 'UNKNOWN';
export interface RepairEmailStatus {
  estado: RepairEmailState;
  reintentable: boolean;
}
export type RepairEmailSession = ChargeSession;

/** Reuse the existing account/workshop lifecycle without retaining tokens in query keys. */
export const captureRepairEmailSession = (): RepairEmailSession | null => {
  const auth = authStore.getState();
  const account = chargeAccount(auth.token, auth.isAuthenticated);
  return account ? { account, generation: chargeGeneration() } : null;
};
export const isRepairEmailSessionCurrent = isChargeSessionCurrent;

export const canRetryRepairEmail = (status: RepairEmailStatus | undefined): boolean => (
  status?.reintentable === true && (status.estado === 'SIN_EMAIL' || status.estado === 'FALLO_PREVIO')
);

/** Keep only the public metadata contract; never retain a recipient or raw diagnostics. */
export const parseRepairEmailStatus = (value: unknown): RepairEmailStatus => {
  const unavailable: RepairEmailStatus = { estado: 'UNKNOWN', reintentable: false };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return unavailable;
  const { estado, reintentable } = value as Record<string, unknown>;
  if (typeof estado !== 'string' || !repairEmailStates.some((state) => state === estado)
    || typeof reintentable !== 'boolean') return unavailable;
  const status = { estado: estado as RepairEmailState, reintentable };
  return reintentable && !canRetryRepairEmail(status) ? unavailable : status;
};

const endpoint = (repairId: number) => {
  if (!Number.isSafeInteger(repairId) || repairId <= 0) throw new Error('Invalid repair email scope');
  return `/reparaciones/${repairId}/notificacion-email`;
};
const requireCurrentSession = (session: RepairEmailSession, dispatch = false) => {
  if (!isRepairEmailSessionCurrent(session) || (dispatch && !captureRepairEmailSession())) {
    throw new axios.CanceledError('Repair email session changed or expired');
  }
};

export const fetchRepairEmailStatus = async (
  repairId: number,
  session: RepairEmailSession,
  signal?: AbortSignal,
): Promise<RepairEmailStatus> => {
  requireCurrentSession(session, true);
  const { data } = await apiClient.get<unknown>(endpoint(repairId), {
    signal, repairEmailSession: session, errorMode: 'inline', timeout: 20_000,
  });
  requireCurrentSession(session);
  return parseRepairEmailStatus(data);
};

export const retryRepairEmail = async (
  repairId: number,
  session: RepairEmailSession,
): Promise<RepairEmailStatus> => {
  requireCurrentSession(session, true);
  // No body, recipient, or query parameters: the server rechecks current eligibility.
  const { data } = await apiClient.post<unknown>(`${endpoint(repairId)}/reintentos`, undefined, {
    repairEmailSession: session, errorMode: 'inline', timeout: 20_000,
  });
  requireCurrentSession(session);
  return parseRepairEmailStatus(data);
};
