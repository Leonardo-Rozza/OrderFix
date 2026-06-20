import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server, API } from '../../test/server';
import { useCambiarEstadoMutation } from './reparaciones.mutations';
import type { Reparacion } from '../../types';

const baseRep: Reparacion = {
  id: 1,
  equipoId: 10,
  descripcionProblema: 'x',
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData<Reparacion[]>(['reparaciones'], [baseRep]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCambiarEstadoMutation(), { wrapper });
  const estadoEnCache = () => client.getQueryData<Reparacion[]>(['reparaciones'])?.[0].estado;
  return { result, estadoEnCache };
};

describe('useCambiarEstadoMutation (optimista)', () => {
  it('actualiza la cache al instante y confirma con el backend', async () => {
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, () =>
        HttpResponse.json({ ...baseRep, estado: 'EN_PROCESO' })
      )
    );
    const { result, estadoEnCache } = setup();

    act(() => result.current.mutate({ id: 1, estado: 'EN_PROCESO' }));

    // Update optimista (la tarjeta "se mueve" antes de la respuesta)
    await waitFor(() => expect(estadoEnCache()).toBe('EN_PROCESO'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(estadoEnCache()).toBe('EN_PROCESO');
  });

  it('revierte la cache si el backend falla', async () => {
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, () => new HttpResponse(null, { status: 500 }))
    );
    const { result, estadoEnCache } = setup();

    act(() => result.current.mutate({ id: 1, estado: 'EN_PROCESO' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Rollback al estado original
    expect(estadoEnCache()).toBe('INGRESADO');
  });
});
