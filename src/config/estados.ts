import type { EstadoReparacion } from '../types';

export interface EstadoMeta {
  key: EstadoReparacion;
  label: string;
  /** Clase Tailwind de texto (color del estado) — literal para que Tailwind la incluya */
  textClass: string;
  /** Clase Tailwind de fondo suave del estado */
  bgClass: string;
  /** Variable CSS del color (para bordes/acentos vía style inline) */
  cssVar: string;
  /** Path del ícono (stroke) */
  iconD: string;
  /** Siguiente estado del camino feliz al "Avanzar" (null si es terminal) */
  next: EstadoReparacion | null;
}

export const ESTADOS: Record<EstadoReparacion, EstadoMeta> = {
  INGRESADO: {
    key: 'INGRESADO',
    label: 'Ingresado',
    textClass: 'text-st-ingresado',
    bgClass: 'bg-st-ingresado-bg',
    cssVar: 'var(--st-ingresado)',
    iconD: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
    next: 'EN_DIAGNOSTICO',
  },
  EN_DIAGNOSTICO: {
    key: 'EN_DIAGNOSTICO',
    label: 'En diagnóstico',
    textClass: 'text-st-diagnostico',
    bgClass: 'bg-st-diagnostico-bg',
    cssVar: 'var(--st-diagnostico)',
    iconD: 'm21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
    next: 'PRESUPUESTADO',
  },
  PRESUPUESTADO: {
    key: 'PRESUPUESTADO',
    label: 'Presupuestado',
    textClass: 'text-st-presupuestado',
    bgClass: 'bg-st-presupuestado-bg',
    cssVar: 'var(--st-presupuestado)',
    iconD: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
    next: 'EN_PROCESO',
  },
  EN_PROCESO: {
    key: 'EN_PROCESO',
    label: 'En proceso',
    textClass: 'text-st-proceso',
    bgClass: 'bg-st-proceso-bg',
    cssVar: 'var(--st-proceso)',
    iconD: 'M14.7 6.3a4 4 0 0 0-5.66 5.66L3 18l3 3 6.04-6.04a4 4 0 0 0 5.66-5.66l-2.83 2.83-2.83-2.83 2.83-2.83z',
    next: 'COMPLETADO',
  },
  ESPERANDO_REPUESTO: {
    key: 'ESPERANDO_REPUESTO',
    label: 'Esperando repuesto',
    textClass: 'text-st-esperando',
    bgClass: 'bg-st-esperando-bg',
    cssVar: 'var(--st-esperando)',
    iconD: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: 'EN_PROCESO',
  },
  ESPERANDO_ADICIONAL: {
    key: 'ESPERANDO_ADICIONAL',
    label: 'Esperando adicional',
    textClass: 'text-st-presupuestado',
    bgClass: 'bg-st-presupuestado-bg',
    cssVar: 'var(--st-presupuestado)',
    iconD: 'M12 8v8M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: 'EN_PROCESO',
  },
  NO_REPARABLE: {
    key: 'NO_REPARABLE',
    label: 'No reparable',
    textClass: 'text-st-noreparable',
    bgClass: 'bg-st-noreparable-bg',
    cssVar: 'var(--st-noreparable)',
    iconD: 'm15 9-6 6M9 9l6 6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: 'LISTO_SIN_REPARAR',
  },
  COMPLETADO: {
    key: 'COMPLETADO',
    label: 'Completado',
    textClass: 'text-st-completado',
    bgClass: 'bg-st-completado-bg',
    cssVar: 'var(--st-completado)',
    iconD: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.4 2.4 4.6-5',
    next: 'ENTREGADO',
  },
  LISTO_SIN_REPARAR: {
    key: 'LISTO_SIN_REPARAR',
    label: 'Listo sin reparar',
    textClass: 'text-st-listosin',
    bgClass: 'bg-st-listosin-bg',
    cssVar: 'var(--st-listosin)',
    iconD: 'M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: 'ENTREGADO',
  },
  ENTREGADO: {
    key: 'ENTREGADO',
    label: 'Entregado',
    textClass: 'text-st-entregado',
    bgClass: 'bg-st-entregado-bg',
    cssVar: 'var(--st-entregado)',
    iconD: 'm7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8M12 13v8',
    next: null,
  },
  ABANDONADO: {
    key: 'ABANDONADO',
    label: 'Abandonado',
    textClass: 'text-st-entregado',
    bgClass: 'bg-st-entregado-bg',
    cssVar: 'var(--st-entregado)',
    iconD: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
    next: null,
  },
  CANCELADO: {
    key: 'CANCELADO',
    label: 'Cancelado',
    textClass: 'text-st-noreparable',
    bgClass: 'bg-st-noreparable-bg',
    cssVar: 'var(--st-noreparable)',
    iconD: 'M4.9 4.9l14.2 14.2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: null,
  },
};

/**
 * Meta de un estado con fallback: si el backend devuelve un estado que este
 * front todavía no conoce, mostramos un badge neutro con el nombre humanizado
 * en vez de crashear.
 */
export const getEstadoMeta = (estado: EstadoReparacion): EstadoMeta =>
  ESTADOS[estado] ?? {
    key: estado,
    label: estado.charAt(0) + estado.slice(1).toLowerCase().replace(/_/g, ' '),
    textClass: 'text-text-2',
    bgClass: 'bg-surface-3',
    cssVar: 'var(--text-3)',
    iconD: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    next: null,
  };

/**
 * Máquina de estados del backend (contrato §4.5): transiciones legales desde
 * cada estado. Un salto fuera de esta tabla devuelve 409; X → X es no-op 200.
 */
export const TRANSICIONES: Record<EstadoReparacion, EstadoReparacion[]> = {
  INGRESADO: ['EN_DIAGNOSTICO', 'PRESUPUESTADO', 'EN_PROCESO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['PRESUPUESTADO', 'NO_REPARABLE', 'CANCELADO'],
  PRESUPUESTADO: ['EN_PROCESO', 'LISTO_SIN_REPARAR', 'CANCELADO'],
  EN_PROCESO: ['ESPERANDO_REPUESTO', 'ESPERANDO_ADICIONAL', 'COMPLETADO', 'NO_REPARABLE'],
  ESPERANDO_REPUESTO: ['EN_PROCESO', 'NO_REPARABLE', 'CANCELADO'],
  ESPERANDO_ADICIONAL: ['EN_PROCESO', 'COMPLETADO', 'LISTO_SIN_REPARAR'],
  NO_REPARABLE: ['LISTO_SIN_REPARAR'],
  COMPLETADO: ['ENTREGADO', 'ABANDONADO'],
  LISTO_SIN_REPARAR: ['ENTREGADO', 'ABANDONADO'],
  ENTREGADO: [],
  ABANDONADO: [],
  CANCELADO: [],
};

/** Destinos legales desde un estado (sin incluirlo a él mismo). */
export const transicionesDesde = (estado: EstadoReparacion): EstadoReparacion[] =>
  TRANSICIONES[estado] ?? [];

export const esTransicionValida = (desde: EstadoReparacion, hacia: EstadoReparacion): boolean =>
  desde === hacia || transicionesDesde(desde).includes(hacia);

/** Orden lógico del flujo (chips de filtro, barras del dashboard, selects). */
export const ESTADOS_ORDEN: EstadoReparacion[] = [
  'INGRESADO',
  'EN_DIAGNOSTICO',
  'PRESUPUESTADO',
  'ESPERANDO_ADICIONAL',
  'EN_PROCESO',
  'ESPERANDO_REPUESTO',
  'NO_REPARABLE',
  'COMPLETADO',
  'LISTO_SIN_REPARAR',
  'ENTREGADO',
  'ABANDONADO',
  'CANCELADO',
];

export const ESTADOS_LIST: EstadoMeta[] = ESTADOS_ORDEN.map((k) => ESTADOS[k]);

/** Estados cerrados: el equipo ya no está (o no va a estar) en el taller. */
export const ESTADOS_CERRADOS: EstadoReparacion[] = ['ENTREGADO', 'ABANDONADO', 'CANCELADO'];

/** Fase (columna) del tablero kanban: agrupa estados afines para que entre en pantalla. */
export interface FaseMeta {
  key: string;
  label: string;
  estados: EstadoReparacion[];
}

export const FASES: FaseMeta[] = [
  { key: 'INGRESO', label: 'Ingreso', estados: ['INGRESADO'] },
  { key: 'DIAGNOSTICO', label: 'Diagnóstico', estados: ['EN_DIAGNOSTICO'] },
  { key: 'APROBACION', label: 'Aprobación', estados: ['PRESUPUESTADO', 'ESPERANDO_ADICIONAL'] },
  { key: 'EN_TRABAJO', label: 'En trabajo', estados: ['EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE'] },
  { key: 'LISTO', label: 'Listo', estados: ['COMPLETADO', 'LISTO_SIN_REPARAR'] },
  { key: 'CERRADAS', label: 'Cerradas', estados: ['ENTREGADO', 'ABANDONADO', 'CANCELADO'] },
];

/**
 * Línea de progreso del seguimiento público: los 12 estados colapsan en 5
 * hitos que el cliente entiende (el badge arriba muestra el estado exacto).
 */
export const PASOS_SEGUIMIENTO = [
  'Ingresado',
  'En revisión',
  'En reparación',
  'Listo para retirar',
  'Entregado',
] as const;

export const PASO_SEGUIMIENTO: Record<EstadoReparacion, number> = {
  INGRESADO: 0,
  EN_DIAGNOSTICO: 1,
  PRESUPUESTADO: 1,
  ESPERANDO_ADICIONAL: 2,
  EN_PROCESO: 2,
  ESPERANDO_REPUESTO: 2,
  NO_REPARABLE: 3,
  COMPLETADO: 3,
  LISTO_SIN_REPARAR: 3,
  ENTREGADO: 4,
  ABANDONADO: 4,
  CANCELADO: 4,
};
