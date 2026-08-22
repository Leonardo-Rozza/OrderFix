import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server, API } from '../../test/server';

vi.mock('../../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import {
  useCreateRepuestoMutation,
  useDeleteRepuestoMutation,
  useUpdateRepuestoMutation,
} from './repuestos.mutations';

const expectedKeys = [
  ['repuestos'],
  ['repuesto'],
  ['reparaciones'],
  ['reparacion'],
  ['cobros'],
  ['recibo'],
  ['inventario'],
  ['dashboard'],
];

const setup = <T,>(hook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const expectDependenciesInvalidated = () => {
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(expect.arrayContaining(expectedKeys));
  };

  return { ...renderHook(hook, { wrapper }), expectDependenciesInvalidated };
};

describe('mutaciones de repuestos — invalidación de datos derivados', () => {
  it('actualiza totales, recibo e inventario al crear', async () => {
    server.use(
      http.post(`${API}/repuestos`, async ({ request }) =>
        HttpResponse.json({ id: 3, ...(await request.json() as object) }, { status: 201 }),
      ),
    );
    const { result, expectDependenciesInvalidated } = setup(useCreateRepuestoMutation);

    await act(async () => {
      await result.current.mutateAsync({ nombre: 'Pantalla', precio: 8000, reparacionId: 7 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectDependenciesInvalidated();
  });

  it('cubre la asociación anterior y la nueva al actualizar', async () => {
    server.use(
      http.put(`${API}/repuestos/3`, async ({ request }) =>
        HttpResponse.json({ ...(await request.json() as object), id: 3, reparacionId: 8 }),
      ),
    );
    const { result, expectDependenciesInvalidated } = setup(useUpdateRepuestoMutation);

    await act(async () => {
      await result.current.mutateAsync({ id: 3, nombre: 'Pantalla', precio: 8000, reparacionId: 8 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectDependenciesInvalidated();
  });

  it('actualiza también el stock restaurado al eliminar', async () => {
    server.use(http.delete(`${API}/repuestos/3`, () => new HttpResponse(null, { status: 204 })));
    const { result, expectDependenciesInvalidated } = setup(useDeleteRepuestoMutation);

    await act(async () => {
      await result.current.mutateAsync(3);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectDependenciesInvalidated();
  });
});
