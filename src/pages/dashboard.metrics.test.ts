import { describe, it, expect } from 'vitest';
import { computeDashboardMetrics } from './dashboard.metrics';
import type { ReparacionEnriquecida } from '../hooks/useEnriched';
import type { EstadoReparacion } from '../types';

let seq = 0;
const rep = (estado: EstadoReparacion, precioFinal: number | null, precioEstimado: number | null = null): ReparacionEnriquecida => ({
  id: ++seq,
  equipoId: 1,
  descripcionProblema: 'x',
  estado,
  precioEstimado,
  precioFinal,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
});

describe('computeDashboardMetrics', () => {
  it('cuenta activas (todo lo que no está ENTREGADO)', () => {
    const m = computeDashboardMetrics([
      rep('INGRESADO', null),
      rep('EN_PROCESO', null),
      rep('ENTREGADO', 1000),
    ]);
    expect(m.activas).toBe(2);
  });

  it('sinRetirar = COMPLETADO', () => {
    const m = computeDashboardMetrics([rep('COMPLETADO', null), rep('COMPLETADO', null), rep('INGRESADO', null)]);
    expect(m.sinRetirar).toBe(2);
  });

  it('ingresosMes suma COMPLETADO + ENTREGADO usando precioFinal ?? precioEstimado', () => {
    const m = computeDashboardMetrics([
      rep('COMPLETADO', 5000),
      rep('ENTREGADO', null, 3000), // sin final → usa estimado
      rep('INGRESADO', 9999), // no cuenta (no está cerrada)
      rep('EN_PROCESO', null, 1000), // no cuenta
    ]);
    expect(m.ingresosMes).toBe(8000);
  });

  it('recientes devuelve las 5 de id más alto, ordenadas desc', () => {
    const reps = Array.from({ length: 7 }, () => rep('INGRESADO', null));
    const m = computeDashboardMetrics(reps);
    expect(m.recientes).toHaveLength(5);
    const ids = m.recientes.map((r) => r.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it('stats calcula conteo y % por estado', () => {
    const m = computeDashboardMetrics([rep('INGRESADO', null), rep('INGRESADO', null), rep('ENTREGADO', null), rep('EN_PROCESO', null)]);
    const ingresado = m.stats.find((s) => s.meta.key === 'INGRESADO')!;
    expect(ingresado.count).toBe(2);
    expect(ingresado.pct).toBe(50); // 2 de 4
  });

  it('no rompe con lista vacía', () => {
    const m = computeDashboardMetrics([]);
    expect(m.activas).toBe(0);
    expect(m.ingresosMes).toBe(0);
    expect(m.recientes).toEqual([]);
    expect(m.stats.every((s) => s.pct === 0)).toBe(true);
  });
});
