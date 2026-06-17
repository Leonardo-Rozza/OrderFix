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
  /** Siguiente estado lógico al "Avanzar" (null si es terminal) */
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
    next: 'COMPLETADO',
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
  ENTREGADO: {
    key: 'ENTREGADO',
    label: 'Entregado',
    textClass: 'text-st-entregado',
    bgClass: 'bg-st-entregado-bg',
    cssVar: 'var(--st-entregado)',
    iconD: 'm7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8M12 13v8',
    next: null,
  },
};

/** Orden de columnas del tablero / flujo. */
export const ESTADOS_ORDEN: EstadoReparacion[] = [
  'INGRESADO',
  'EN_PROCESO',
  'ESPERANDO_REPUESTO',
  'COMPLETADO',
  'ENTREGADO',
];

export const ESTADOS_LIST: EstadoMeta[] = ESTADOS_ORDEN.map((k) => ESTADOS[k]);

/** Estados que cuentan como "activos" (en taller, sin entregar). */
export const ESTADOS_ACTIVOS: EstadoReparacion[] = ['INGRESADO', 'EN_PROCESO', 'ESPERANDO_REPUESTO'];
