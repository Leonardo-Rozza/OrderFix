import { ESTADOS_LIST, type EstadoMeta } from '../config/estados';
import type { ReparacionEnriquecida } from '../hooks/useEnriched';
import type { EstadoReparacion } from '../types';

export interface EstadoStat {
  meta: EstadoMeta;
  count: number;
  pct: number;
}

export interface DashboardMetrics {
  counts: Record<EstadoReparacion, number>;
  activas: number;
  sinRetirar: number;
  ingresosMes: number;
  recientes: ReparacionEnriquecida[];
  stats: EstadoStat[];
}

/**
 * Calcula los KPIs del dashboard a partir de las reparaciones (todo client-side).
 * - activas: todo lo que no está ENTREGADO.
 * - sinRetirar: COMPLETADO (listo para entregar).
 * - ingresosMes: suma de precioFinal ?? precioEstimado de COMPLETADO/ENTREGADO.
 * - recientes: las 5 de id más alto.
 * - stats: conteo y % por estado.
 */
export const computeDashboardMetrics = (reparaciones: ReparacionEnriquecida[]): DashboardMetrics => {
  const counts = Object.fromEntries(ESTADOS_LIST.map((e) => [e.key, 0])) as Record<EstadoReparacion, number>;
  reparaciones.forEach((r) => {
    counts[r.estado] = (counts[r.estado] ?? 0) + 1;
  });

  const activas = reparaciones.filter((r) => r.estado !== 'ENTREGADO').length;
  const sinRetirar = counts.COMPLETADO ?? 0;
  const ingresosMes = reparaciones
    .filter((r) => r.estado === 'COMPLETADO' || r.estado === 'ENTREGADO')
    .reduce((acc, r) => acc + (r.precioFinal ?? r.precioEstimado ?? 0), 0);
  const recientes = [...reparaciones].sort((a, b) => b.id - a.id).slice(0, 5);

  const total = reparaciones.length || 1;
  const stats: EstadoStat[] = ESTADOS_LIST.map((e) => ({
    meta: e,
    count: counts[e.key] ?? 0,
    pct: Math.round(((counts[e.key] ?? 0) / total) * 100),
  }));

  return { counts, activas, sinRetirar, ingresosMes, recientes, stats };
};
