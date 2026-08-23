import { describe, expect, it } from 'vitest';
import type { PageMeta } from '../api/pagination';
import type { Reparacion } from '../types';
import { projectReparacionesBoardPages } from './reparacionesBoard';

const makeReparacion = (id: number, modelo = `Equipo ${id}`): Reparacion => ({
  id,
  equipoId: id,
  equipoMarca: 'Marca',
  equipoModelo: modelo,
  clienteNombre: 'Ada',
  clienteApellido: 'Lovelace',
  descripcionProblema: `Problema ${id}`,
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
});

const page = (
  number: number,
  content: Reparacion[],
  totalElements: number,
  totalPages: number,
) => ({
  content,
  page: {
    number,
    size: 20,
    totalElements,
    totalPages,
  } satisfies PageMeta,
});

describe('projectReparacionesBoardPages', () => {
  it('devuelve una proyección vacía sin páginas', () => {
    expect(projectReparacionesBoardPages(undefined, 20)).toEqual({
      items: [],
      total: 0,
      visible: 0,
      remaining: 0,
      nextBatchSize: 0,
    });
  });

  it('acumula páginas, deduplica por id y conserva la posición original', () => {
    const result = projectReparacionesBoardPages([
      page(0, [makeReparacion(3), makeReparacion(2, 'Versión anterior')], 3, 2),
      page(1, [makeReparacion(2, 'Versión nueva'), makeReparacion(1)], 3, 2),
    ], 20);

    expect(result.items.map(({ id }) => id)).toEqual([3, 2, 1]);
    expect(result.items[1]?.equipoModelo).toBe('Versión nueva');
    expect(result.visible).toBe(3);
    expect(result.total).toBe(3);
    expect(result.remaining).toBe(0);
    expect(result.nextBatchSize).toBe(0);
  });

  it('calcula el próximo lote con el remanente contractual', () => {
    const firstTwenty = Array.from({ length: 20 }, (_, index) => makeReparacion(42 - index));
    const first = projectReparacionesBoardPages([
      page(0, firstTwenty, 42, 3),
    ], 20);
    expect(first.visible).toBe(20);
    expect(first.remaining).toBe(22);
    expect(first.nextBatchSize).toBe(20);

    const second = projectReparacionesBoardPages([
      page(0, firstTwenty, 42, 3),
      page(1, Array.from({ length: 15 }, (_, index) => makeReparacion(22 - index)), 42, 3),
    ], 20);
    expect(second.visible).toBe(35);
    expect(second.remaining).toBe(7);
    expect(second.nextBatchSize).toBe(7);
  });

  it('nunca informa un remanente negativo si el total remoto se reduce', () => {
    const result = projectReparacionesBoardPages([
      page(0, [makeReparacion(2), makeReparacion(1)], 1, 1),
    ], 20);

    expect(result.visible).toBe(2);
    expect(result.total).toBe(1);
    expect(result.remaining).toBe(0);
    expect(result.nextBatchSize).toBe(0);
  });
});
