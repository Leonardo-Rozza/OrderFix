import type { CuentaVinculada } from '../types';

export const CUENTA_LABEL: Record<CuentaVinculada, string> = {
  NINGUNA: 'Ninguna',
  ICLOUD: 'iCloud',
  GOOGLE: 'Google (FRP)',
  OTRA: 'Otra',
};

export const cuentaLabel = (c: CuentaVinculada | null | undefined): string =>
  c ? (CUENTA_LABEL[c] ?? c) : CUENTA_LABEL.NINGUNA;

/** Texto de la bandera roja del contrato (§4.5). */
export const RIESGO_CUENTA_MSG =
  'Riesgo: equipo con cuenta activa sin credenciales. Puede no poder entregarse activado.';
