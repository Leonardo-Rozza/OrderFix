import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { API, server } from '../../test/server';
import type { Reparacion, ReparacionDetalle } from '../../types';
import { separarReparacionDetalle, useReparacionQuery } from './reparaciones.queries';

const detalle: ReparacionDetalle = {
  id: 7,
  equipoId: 3,
  descripcionProblema: 'No enciende',
  estado: 'EN_PROCESO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  patronDesbloqueo: 'L invertida',
  pinDesbloqueo: '1234',
};

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useReparacionQuery(7), { wrapper });
  return { client, ...hook };
};

describe('detalle seguro de reparación', () => {
  it('cachea solamente Reparacion y conserva PIN/patrón en estado local efímero', async () => {
    server.use(
      http.get(`${API}/reparaciones/7`, () => HttpResponse.json(detalle)),
    );
    const { client, result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.credenciales).toEqual({
      patronDesbloqueo: 'L invertida',
      pinDesbloqueo: '1234',
    });

    const cached = client.getQueryData<Reparacion>(['reparacion', 7]);
    expect(cached).not.toHaveProperty('patronDesbloqueo');
    expect(cached).not.toHaveProperty('pinDesbloqueo');

    act(() => result.current.limpiarCredenciales());
    expect(result.current.credenciales).toEqual({
      patronDesbloqueo: null,
      pinDesbloqueo: null,
    });

    await act(async () => {
      await result.current.refetchCredenciales();
    });
    expect(result.current.credenciales.pinDesbloqueo).toBe('1234');
  });

  it('descarta credenciales si una respuesta vieja intenta devolverlas después de ENTREGADO', () => {
    const result = separarReparacionDetalle({ ...detalle, estado: 'ENTREGADO' });

    expect(result.credenciales).toEqual({
      patronDesbloqueo: null,
      pinDesbloqueo: null,
    });
    expect(result.reparacion).not.toHaveProperty('patronDesbloqueo');
    expect(result.reparacion).not.toHaveProperty('pinDesbloqueo');
  });

  it('repite el GET al remontar aunque la Reparacion segura siga fresh en cache', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/reparaciones/7`, () => {
        requests += 1;
        return HttpResponse.json(detalle);
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useReparacionQuery(7), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(requests).toBe(1);
    first.unmount();

    const second = renderHook(() => useReparacionQuery(7), { wrapper });
    expect(second.result.current.credenciales.pinDesbloqueo).toBeNull();
    await waitFor(() => expect(requests).toBe(2));
    await waitFor(() => expect(second.result.current.credenciales.pinDesbloqueo).toBe('1234'));
  });
});
