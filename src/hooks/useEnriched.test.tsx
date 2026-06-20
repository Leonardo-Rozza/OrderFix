import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Cliente, Equipo, Reparacion } from '../types';

// Mockeamos las queries para probar solo la lógica de joins (sin red).
vi.mock('../api/queries/reparaciones.queries', () => ({ useReparacionesQuery: vi.fn() }));
vi.mock('../api/queries/equipos.queries', () => ({ useEquiposQuery: vi.fn() }));
vi.mock('../api/queries/clientes.queries', () => ({ useClientesQuery: vi.fn() }));

import { useReparacionesQuery } from '../api/queries/reparaciones.queries';
import { useEquiposQuery } from '../api/queries/equipos.queries';
import { useClientesQuery } from '../api/queries/clientes.queries';
import { useReparacionesEnriquecidas, useEquiposEnriquecidos, useClientesEnriquecidos } from './useEnriched';

const cliente: Cliente = { id: 1, nombre: 'Juan', apellido: 'Pérez', telefono: '111', email: null, direccion: null };
const equipo: Equipo = { id: 10, marca: 'Apple', modelo: 'iPhone', imei: null, color: null, descripcion: null, clienteId: 1 };
const reparacion: Reparacion = {
  id: 100,
  equipoId: 10,
  descripcionProblema: 'No carga',
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: '2026-06-10',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const mockQuery = (hook: unknown, data: unknown) =>
  (hook as ReturnType<typeof vi.fn>).mockReturnValue({ data, isLoading: false, isError: false });

beforeEach(() => {
  mockQuery(useReparacionesQuery, [reparacion]);
  mockQuery(useEquiposQuery, [equipo]);
  mockQuery(useClientesQuery, [cliente]);
});

describe('useReparacionesEnriquecidas', () => {
  it('embebe equipo y cliente en la reparación', () => {
    const { result } = renderHook(() => useReparacionesEnriquecidas());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].equipo?.marca).toBe('Apple');
    expect(result.current.data[0].equipo?.cliente?.nombre).toBe('Juan');
  });

  it('deja equipo undefined si no hay match', () => {
    mockQuery(useEquiposQuery, []);
    const { result } = renderHook(() => useReparacionesEnriquecidas());
    expect(result.current.data[0].equipo).toBeUndefined();
  });
});

describe('useEquiposEnriquecidos', () => {
  it('embebe el cliente y cuenta las reparaciones del equipo', () => {
    const { result } = renderHook(() => useEquiposEnriquecidos());
    expect(result.current.data[0].cliente?.nombre).toBe('Juan');
    expect(result.current.data[0].reparacionesCount).toBe(1);
  });
});

describe('useClientesEnriquecidos', () => {
  it('agrupa equipos, reparaciones y última visita del cliente', () => {
    const { result } = renderHook(() => useClientesEnriquecidos());
    const c = result.current.data[0];
    expect(c.equipos).toHaveLength(1);
    expect(c.reparaciones).toHaveLength(1);
    expect(c.ultimaVisita).toBe('2026-06-10');
  });
});
