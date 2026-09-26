import { z } from 'zod';
import type { CobroCreate } from '../types';
import { decodeToken } from './jwt';

const PREFIX = 'ordenfix:pending-charge:v1:';
let generation = 0;
let purgeFailed = false;
const requestSchema = z.object({
  operacionId: z.string().uuid(),
  monto: z.number().finite().positive().max(99999999.99).multipleOf(0.01),
  metodo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADOPAGO', 'OTRO']),
  referencia: z.string().max(120).optional(),
  observaciones: z.string().max(255).optional(),
}).strict();
const snapshotSchema = z.object({
  version: z.literal(1),
  account: z.string().min(1),
  reparacionId: z.number().int().positive(),
  phase: z.enum(['pending', 'correctable']),
  payload: requestSchema,
}).strict();
export type PendingCharge = z.infer<typeof snapshotSchema>;
export interface ChargeSession { account: string; generation: number }
export const chargeGeneration = () => generation;

export const chargeAccount = (token: string | null, authenticated: boolean): string | null => {
  const claims = decodeToken(token);
  if (!authenticated || typeof claims?.sub !== 'string' || !claims.sub.trim()
    || typeof claims.tallerId !== 'number' || !Number.isSafeInteger(claims.tallerId) || claims.tallerId <= 0
    || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
  return JSON.stringify([claims.sub.trim().toLowerCase(), claims.tallerId]);
};

const keyFor = (account: string, reparacionId: number) => PREFIX + JSON.stringify([account, reparacionId]);
const storage = () => {
  if (purgeFailed) throw new Error('No se pudo limpiar la recuperación de cobros de la sesión anterior.');
  return window.sessionStorage;
};

export const readPendingCharge = (account: string, reparacionId: number): PendingCharge | null => {
  const raw = storage().getItem(keyFor(account, reparacionId));
  if (raw === null) return null;
  const snapshot = snapshotSchema.parse(JSON.parse(raw));
  if (snapshot.account !== account || snapshot.reparacionId !== reparacionId) {
    throw new Error('El intento de cobro no corresponde a esta cuenta u orden.');
  }
  return snapshot;
};

const write = (snapshot: PendingCharge) => {
  const valid = snapshotSchema.parse(snapshot);
  const key = keyFor(valid.account, valid.reparacionId);
  const serialized = JSON.stringify(valid);
  storage().setItem(key, serialized);
  if (storage().getItem(key) !== serialized) throw new Error('No se pudo conservar el intento de cobro.');
  return valid;
};

export const prepareCharge = (account: string, reparacionId: number, payload: CobroCreate): PendingCharge => {
  const previous = readPendingCharge(account, reparacionId);
  // Re-verify storage even on an exact retry. Never replace an uncertain request.
  if (previous?.phase === 'pending') return write(previous);
  return write({
    version: 1, account, reparacionId, phase: 'pending',
    payload: {
      operacionId: previous?.payload.operacionId ?? crypto.randomUUID(),
      monto: payload.monto,
      metodo: payload.metodo,
      referencia: payload.referencia?.trim() || undefined,
      observaciones: payload.observaciones?.trim() || undefined,
    },
  });
};

const matches = (current: PendingCharge | null, captured: PendingCharge) => current
  && JSON.stringify(current.payload) === JSON.stringify(captured.payload);

export const allowChargeCorrection = (captured: PendingCharge) => {
  const current = readPendingCharge(captured.account, captured.reparacionId);
  if (matches(current, captured)) write({ ...captured, phase: 'correctable' });
};

export const clearPendingCharge = (captured: PendingCharge) => {
  if (!matches(readPendingCharge(captured.account, captured.reparacionId), captured)) return;
  const key = keyFor(captured.account, captured.reparacionId);
  storage().removeItem(key);
  if (storage().getItem(key) !== null) throw new Error('No se pudo cerrar la recuperación del cobro.');
};

export const purgePendingCharges = () => {
  generation += 1;
  try {
    const store = window.sessionStorage;
    const keys = Array.from({ length: store.length }, (_, index) => store.key(index))
      .filter((key): key is string => key !== null && key.startsWith(PREFIX));
    for (const key of keys) {
      store.removeItem(key);
      if (store.getItem(key) !== null) throw new Error('Charge recovery purge failed');
    }
    purgeFailed = false;
  } catch {
    // Logout must complete even if storage is denied; future charges fail closed.
    purgeFailed = true;
  }
};
