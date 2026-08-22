import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Cliente, Equipo, Reparacion } from '../../types';
import { API, server } from '../../test/server';
import { queryKeys } from '../queryKeys';
import {
  useCreateClienteMutation,
  useDeleteClienteMutation,
  useUpdateClienteMutation,
} from './clientes.mutations';

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

describe('mutaciones de clientes — consistencia cruzada', () => {
  it('crear refresca listas y opciones sin tocar dominios no relacionados', async () => {
    server.use(
      http.post(`${API}/clientes`, () => HttpResponse.json(cliente, { status: 201 })),
    );
    const { client, result } = createSetup(useCreateClienteMutation);
    const params = { page: 0, size: 20 };
    client.setQueryData(queryKeys.clientes.list(params), { content: [] });
    client.setQueryData(queryKeys.clientes.options, []);
    client.setQueryData(queryKeys.inventario.list(params), { content: [] });

    await act(async () => {
      await result.current.mutateAsync({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
      });
    });

    expect(isInvalidated(client, queryKeys.clientes.list(params))).toBe(true);
    expect(isInvalidated(client, queryKeys.clientes.options)).toBe(true);
    expect(isInvalidated(client, queryKeys.inventario.list(params))).toBe(false);
  });

  it('actualizar escribe la respuesta en detalle e invalida todas las copias denormalizadas', async () => {
    const actualizado = { ...cliente, nombre: 'Augusta Ada' };
    server.use(
      http.put(`${API}/clientes/${cliente.id}`, () => HttpResponse.json(actualizado)),
    );
    const { client, result } = createSetup(useUpdateClienteMutation);
    const params = { page: 0, size: 20 };
    const affected = [
      queryKeys.clientes.list(params),
      queryKeys.equipos.list(params),
      queryKeys.equipos.detail(equipo.id),
      queryKeys.reparaciones.list(params),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.dashboard.all,
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.seguimiento.byCodigo('ABC'),
    ];
    affected.forEach((key) => client.setQueryData(key, { cached: true }));
    client.setQueryData(queryKeys.clientes.detail(cliente.id), cliente);

    await act(async () => {
      await result.current.mutateAsync({
        id: cliente.id,
        nombre: actualizado.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
      });
    });

    expect(client.getQueryData(queryKeys.clientes.detail(cliente.id))).toEqual(actualizado);
    expect(isInvalidated(client, queryKeys.clientes.detail(cliente.id))).toBe(false);
    affected.forEach((key) => expect(isInvalidated(client, key)).toBe(true));
  });

  it('eliminar remueve el detalle solamente después del éxito del backend', async () => {
    server.use(http.delete(`${API}/clientes/${cliente.id}`, () => new HttpResponse(null, { status: 204 })));
    const { client, result } = createSetup(useDeleteClienteMutation);
    const params = { page: 0, size: 20 };
    client.setQueryData(queryKeys.clientes.detail(cliente.id), cliente);
    client.setQueryData(queryKeys.clientes.list(params), { content: [cliente] });

    await act(async () => {
      await result.current.mutateAsync(cliente.id);
    });

    expect(client.getQueryState(queryKeys.clientes.detail(cliente.id))).toBeUndefined();
    expect(isInvalidated(client, queryKeys.clientes.list(params))).toBe(true);
  });

  it('un 409 conserva sin cambios todas las caches válidas', async () => {
    server.use(
      http.put(`${API}/clientes/${cliente.id}`, () =>
        HttpResponse.json({ message: 'Conflicto' }, { status: 409 }),
      ),
    );
    const { client, result } = createSetup(useUpdateClienteMutation);
    const params = { page: 0, size: 20 };
    const listData = { content: [cliente] };
    client.setQueryData(queryKeys.clientes.detail(cliente.id), cliente);
    client.setQueryData(queryKeys.clientes.list(params), listData);
    client.setQueryData(queryKeys.equipos.detail(equipo.id), equipo);

    await act(async () => {
      await expect(result.current.mutateAsync({
        id: cliente.id,
        nombre: 'Duplicado',
        apellido: cliente.apellido,
        telefono: cliente.telefono,
      })).rejects.toBeTruthy();
    });

    expect(client.getQueryData(queryKeys.clientes.detail(cliente.id))).toEqual(cliente);
    expect(client.getQueryData(queryKeys.clientes.list(params))).toEqual(listData);
    expect(client.getQueryData(queryKeys.equipos.detail(equipo.id))).toEqual(equipo);
    expect(isInvalidated(client, queryKeys.clientes.list(params))).toBe(false);
    expect(isInvalidated(client, queryKeys.equipos.detail(equipo.id))).toBe(false);
  });

  it('mantiene pending hasta que termina la reconciliación activa', async () => {
    const actualizado = { ...cliente, nombre: 'Augusta Ada' };
    server.use(
      http.put(`${API}/clientes/${cliente.id}`, () => HttpResponse.json(actualizado)),
    );
    const { client, result } = createSetup(useUpdateClienteMutation);
    let release!: () => void;
    const reconciliation = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalInvalidate = client.invalidateQueries.bind(client);
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockImplementation((filters, options) => {
      if (filters?.queryKey?.[0] === queryKeys.clientes.all[0]) return reconciliation;
      return originalInvalidate(filters, options);
    });

    act(() => {
      result.current.mutate({
        id: cliente.id,
        nombre: actualizado.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
      });
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      release();
      await reconciliation;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
