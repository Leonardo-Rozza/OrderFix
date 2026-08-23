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

import { useAnularCobroMutation, useCrearCobroMutation } from './cobros.mutations';
import { showError } from '../../utils/toast';

const expectedKeys = [
  ['cobros', 7],
  ['caja'],
  ['recibo', 7],
  ['reparacion', 7],
  ['reparaciones'],
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
  const invalidatedKeys = () => invalidate.mock.calls.map(
    ([filters]) => filters?.queryKey,
  );

  return { ...renderHook(hook, { wrapper }), invalidatedKeys };
};

describe('mutaciones de cobros — invalidación de datos derivados', () => {
  it('actualiza caja, recibo y vistas de la reparación al registrar un cobro', async () => {
    server.use(
      http.post(`${API}/reparaciones/7/cobros`, () =>
        HttpResponse.json({
          id: 3,
          reparacionId: 7,
          monto: 12000,
          metodo: 'EFECTIVO',
          referencia: null,
          observaciones: null,
          fecha: '2026-08-13T12:00:00',
          estado: 'ACTIVO',
          anuladoAt: null,
          anuladoPorNombre: null,
          motivoAnulacion: null,
        }, { status: 201 }),
      ),
    );
    const { result, invalidatedKeys } = setup(() => useCrearCobroMutation(7));

    await act(async () => {
      await result.current.mutateAsync({ monto: 12000, metodo: 'EFECTIVO' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys()).toEqual(expect.arrayContaining(expectedKeys));
  });

  it('deja COBRO_SUPERA_SALDO para el error inline sin duplicarlo en un toast', async () => {
    vi.mocked(showError).mockClear();
    server.use(
      http.post(`${API}/reparaciones/7/cobros`, () => HttpResponse.json({
        status: 409,
        code: 'COBRO_SUPERA_SALDO',
        message: 'El monto supera el pendiente de cobro.',
        details: { pendiente: 3000 },
      }, { status: 409 })),
    );
    const { result, invalidatedKeys } = setup(() => useCrearCobroMutation(7));

    await act(async () => {
      await expect(result.current.mutateAsync({ monto: 4000, metodo: 'EFECTIVO' }))
        .rejects.toBeTruthy();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showError).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual(expect.arrayContaining(expectedKeys));
  });

  it('usa el POST canónico con motivo y actualiza las mismas vistas al anular', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/reparaciones/7/cobros/3/anulacion`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: 3,
          reparacionId: 7,
          monto: 12000,
          metodo: 'EFECTIVO',
          referencia: null,
          observaciones: null,
          fecha: '2026-08-13T12:00:00',
          estado: 'ANULADO',
          anuladoAt: '2026-08-23T12:00:00',
          anuladoPorNombre: 'Juan Pérez',
          motivoAnulacion: 'Carga duplicada',
        });
      }),
    );
    const { result, invalidatedKeys } = setup(() => useAnularCobroMutation(7));

    await act(async () => {
      await result.current.mutateAsync({ cobroId: 3, motivo: 'Carga duplicada' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(body).toEqual({ motivo: 'Carga duplicada' });
    expect(invalidatedKeys()).toEqual(expect.arrayContaining(expectedKeys));
  });

  it('reconcilia COBRO_YA_ANULADO sin duplicar el feedback inline con un toast', async () => {
    vi.mocked(showError).mockClear();
    server.use(
      http.post(`${API}/reparaciones/7/cobros/3/anulacion`, () => HttpResponse.json({
        status: 409,
        code: 'COBRO_YA_ANULADO',
        message: 'El cobro ya fue anulado.',
      }, { status: 409 })),
    );
    const { result, invalidatedKeys } = setup(() => useAnularCobroMutation(7));

    await act(async () => {
      await expect(result.current.mutateAsync({ cobroId: 3, motivo: 'Carga duplicada' }))
        .rejects.toBeTruthy();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showError).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual(expect.arrayContaining(expectedKeys));
  });
});
