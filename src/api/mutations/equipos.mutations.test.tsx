import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Cliente, Equipo, Reparacion } from '../../types';
import { API, server } from '../../test/server';
import { queryKeys } from '../queryKeys';
import {
  useCreateEquipoMutation,
  useDeleteEquipoMutation,
  useUpdateEquipoMutation,
} from './equipos.mutations';

vi.mock('../../utils/toast', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../utils/toast')>();
  return { ...original, showError: vi.fn(), showSuccess: vi.fn() };
});

const cliente: Cliente = {
  id: 7,
  nombre: 'Ada',
  apellido: 'Lovelace',
  telefono: '111',
  email: 'ada@example.com',
  direccion: null,
  equiposCount: 1,
};

const equipo: Equipo = {
  id: 11,
  marca: 'Apple',
  modelo: 'iPhone',
  imei: null,
  color: null,
  descripcion: null,
  clienteId: cliente.id,
};

const reparacion: Reparacion = {
  id: 13,
  equipoId: equipo.id,
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const createSetup = <T,>(hook: () => T) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(hook, { wrapper }) };
};

const isInvalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated;

describe('mutaciones de equipos — consistencia cruzada', () => {
  it('crear refresca equipos, clientes/equiposCount y dashboard', async () => {
    server.use(
      http.post(`${API}/equipos`, () => HttpResponse.json(equipo, { status: 201 })),
    );
    const { client, result } = createSetup(useCreateEquipoMutation);
    const params = { page: 0, size: 20 };
    const affected = [
      queryKeys.equipos.list(params),
      queryKeys.equipos.options,
      queryKeys.clientes.list(params),
      queryKeys.clientes.detail(cliente.id),
      queryKeys.dashboard.all,
    ];
    affected.forEach((key) => client.setQueryData(key, { cached: true }));

    await act(async () => {
      await result.current.mutateAsync({
        marca: equipo.marca,
        modelo: equipo.modelo,
        clienteId: equipo.clienteId,
      });
    });

    affected.forEach((key) => expect(isInvalidated(client, key)).toBe(true));
  });

  it('actualizar reemplaza detalle y refresca reparaciones, repuestos y copias públicas', async () => {
    const actualizado = {
      ...equipo,
      modelo: 'iPhone 16',
      clienteId: 9,
      clienteNombre: 'Grace',
    };
    server.use(
      http.put(`${API}/equipos/${equipo.id}`, () => HttpResponse.json(actualizado)),
    );
    const { client, result } = createSetup(useUpdateEquipoMutation);
    const params = { page: 0, size: 20 };
    const affected = [
      queryKeys.equipos.list(params),
      queryKeys.clientes.list(params),
      queryKeys.clientes.detail(cliente.id),
      queryKeys.reparaciones.list(params),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.repuestos.list(params),
      queryKeys.repuestos.detail(17),
      queryKeys.dashboard.all,
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.seguimiento.byCodigo('ABC'),
    ];
    affected.forEach((key) => client.setQueryData(key, { cached: true }));
    client.setQueryData(queryKeys.equipos.detail(equipo.id), equipo);

    await act(async () => {
      await result.current.mutateAsync({
        id: equipo.id,
        marca: actualizado.marca,
        modelo: actualizado.modelo,
        clienteId: actualizado.clienteId,
      });
    });

    expect(client.getQueryData(queryKeys.equipos.detail(equipo.id))).toEqual(actualizado);
    expect(isInvalidated(client, queryKeys.equipos.detail(equipo.id))).toBe(false);
    affected.forEach((key) => expect(isInvalidated(client, key)).toBe(true));
  });

  it('eliminar purga el detalle y refresca equipos y contadores de cliente', async () => {
    server.use(http.delete(`${API}/equipos/${equipo.id}`, () => new HttpResponse(null, { status: 204 })));
    const { client, result } = createSetup(useDeleteEquipoMutation);
    const params = { page: 0, size: 20 };
    client.setQueryData(queryKeys.equipos.detail(equipo.id), equipo);
    client.setQueryData(queryKeys.equipos.list(params), { content: [equipo] });
    client.setQueryData(queryKeys.clientes.detail(cliente.id), cliente);

    await act(async () => {
      await result.current.mutateAsync(equipo.id);
    });

    expect(client.getQueryState(queryKeys.equipos.detail(equipo.id))).toBeUndefined();
    expect(isInvalidated(client, queryKeys.equipos.list(params))).toBe(true);
    expect(isInvalidated(client, queryKeys.clientes.detail(cliente.id))).toBe(true);
  });

  it.each([400, 409, 500])('un error %s conserva todas las caches válidas', async (status) => {
    server.use(
      http.put(`${API}/equipos/${equipo.id}`, () =>
        HttpResponse.json({ message: 'No se pudo actualizar' }, { status }),
      ),
    );
    const { client, result } = createSetup(useUpdateEquipoMutation);
    const params = { page: 0, size: 20 };
    const listData = { content: [equipo] };
    client.setQueryData(queryKeys.equipos.detail(equipo.id), equipo);
    client.setQueryData(queryKeys.equipos.list(params), listData);
    client.setQueryData(queryKeys.clientes.detail(cliente.id), cliente);
    client.setQueryData(queryKeys.reparaciones.detail(reparacion.id), reparacion);

    await act(async () => {
      await expect(result.current.mutateAsync({
        id: equipo.id,
        marca: equipo.marca,
        modelo: 'Fallará',
        clienteId: equipo.clienteId,
      })).rejects.toBeTruthy();
    });

    expect(client.getQueryData(queryKeys.equipos.detail(equipo.id))).toEqual(equipo);
    expect(client.getQueryData(queryKeys.equipos.list(params))).toEqual(listData);
    expect(client.getQueryData(queryKeys.clientes.detail(cliente.id))).toEqual(cliente);
    expect(client.getQueryData(queryKeys.reparaciones.detail(reparacion.id))).toEqual(reparacion);
    expect(isInvalidated(client, queryKeys.equipos.list(params))).toBe(false);
    expect(isInvalidated(client, queryKeys.clientes.detail(cliente.id))).toBe(false);
    expect(isInvalidated(client, queryKeys.reparaciones.detail(reparacion.id))).toBe(false);
  });
});
