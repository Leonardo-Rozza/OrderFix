import type { CalidadRepuesto, TipoItemPresupuesto, TipoPresupuesto } from '../types';

export const TIPO_ITEM_LABEL: Record<TipoItemPresupuesto, string> = {
  MANO_DE_OBRA: 'Mano de obra',
  REPUESTO: 'Repuesto',
};

export const CALIDAD_LABEL: Record<CalidadRepuesto, string> = {
  ORIGINAL: 'Original',
  ALTERNATIVO: 'Alternativo',
  USADO_REACONDICIONADO: 'Usado reacond.',
};

export const TIPO_PRESUPUESTO_LABEL: Record<TipoPresupuesto, string> = {
  ORIGINAL: 'Original',
  ADICIONAL: 'Adicional',
};

/** Label con fallback para enums que el front todavía no conozca. */
export const calidadLabel = (c: CalidadRepuesto | null | undefined): string | null =>
  c ? (CALIDAD_LABEL[c] ?? c) : null;
