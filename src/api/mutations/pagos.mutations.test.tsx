import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server, API } from '../../test/server';
import { SUSCRIPCION_KEY } from '../queries/suscripcion.queries';
import { useCancelarSuscripcionMutation, useIniciarPagoProMutation } from './pagos.mutations';
import { showError } from '../../utils/toast';

vi.mock('../../utils/toast', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../utils/toast')>();
  return { ...original, showError: vi.fn(), showSuccess: vi.fn() };
});

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useIniciarPagoProMutation(), { wrapper }), invalidate };
};

beforeEach(() => {
  vi.mocked(showError).mockClear();
});

describe('useIniciarPagoProMutation', () => {
  it('muestra el conflicto e invalida la suscripción ante un 409', async () => {
    server.use(
      http.post(`${API}/pagos/suscripcion`, () =>
        HttpResponse.json(
          { message: 'Ya existe un checkout pendiente para este taller.' },
          { status: 409 },
        ),
      ),
    );
    const { result, invalidate } = setup();

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showError).toHaveBeenCalledWith('Ya existe un checkout pendiente para este taller.');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SUSCRIPCION_KEY });
  });

  it('deja un 502 disponible para reintento manual sin refrescar el plan', async () => {
    server.use(
      http.post(`${API}/pagos/suscripcion`, () =>
        HttpResponse.json(
          { message: 'Los nuevos checkouts están temporalmente deshabilitados.' },
          { status: 502 },
        ),
      ),
    );
    const { result, invalidate } = setup();

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(showError).toHaveBeenCalledWith(
      'Los nuevos checkouts están temporalmente deshabilitados.',
    );
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: SUSCRIPCION_KEY });
  });
});

describe('useCancelarSuscripcionMutation', () => {
  it('reemplaza el plan y purga caches restringidas que ya no deben reaparecer fresh', async () => {
    const suscripcionFree = {
      plan: 'FREE' as const,
      estado: 'ACTIVA' as const,
      fechaInicio: '2026-08-01',
      fechaFinTrial: null,
      proximoCobro: null,
      reparacionesEsteMes: 3,
      limiteReparacionesMes: 25,
      funciones: {
        inventario: false,
        cobros: false,
        empleadosMultiples: false,
      },
    };
    server.use(
      http.post(`${API}/pagos/suscripcion/cancelar`, () => HttpResponse.json(suscripcionFree)),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const restrictedKeys = [
      ['inventario', { page: 0, size: 20 }],
      ['caja', null, null],
      ['cobros', 7],
      ['recibo', 7],
    ] as const;
    restrictedKeys.forEach((key) => client.setQueryData(key, { persisted: true }));
    client.setQueryData(['clientes'], { persisted: true });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(suscripcionFree);
    restrictedKeys.forEach((key) => expect(client.getQueryData(key)).toBeUndefined());
    expect(client.getQueryData(['clientes'])).toEqual({ persisted: true });
  });
});
