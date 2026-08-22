import { describe, it, expect, vi } from 'vitest';
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

const KEY = ['reparaciones', { q: undefined, page: 0, size: 20 }];
type Page = { content: Reparacion[]; page: { size: number; number: number; totalElements: number; totalPages: number } };

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  client.setQueryData<Page>(KEY, { content: [baseRep], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
  client.setQueryData<Reparacion>(['reparacion', 1], baseRep);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCambiarEstadoMutation(), { wrapper });
  const estadoEnCache = () => client.getQueryData<Page>(KEY)?.content[0].estado;
  const estadoDetalle = () => client.getQueryData<Reparacion>(['reparacion', 1])?.estado;
  return { result, client, estadoEnCache, estadoDetalle, invalidate };
};

describe('useCambiarEstadoMutation (confirmada por servidor)', () => {
  it('mantiene la cache confirmada mientras espera, manda { estado } y reconcilia al responder', async () => {
    let body: unknown;
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, async ({ request }) => {
        body = await request.json();
        await responseGate;
        return HttpResponse.json({ ...baseRep, estado: 'EN_PROCESO' });
      })
    );
    const { result, client, estadoEnCache, estadoDetalle, invalidate } = setup();

    act(() => result.current.mutate({ id: 1, estado: 'EN_PROCESO' }));

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(estadoEnCache()).toBe('INGRESADO');
    expect(estadoDetalle()).toBe('INGRESADO');

    act(() => releaseResponse());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Las páginas inactivas no se parchean dentro del filtro equivocado: quedan
    // stale para que la próxima lectura traiga membresía y totales del servidor.
    expect(estadoEnCache()).toBe('INGRESADO');
    expect(client.getQueryState(KEY)?.isInvalidated).toBe(true);
    expect(estadoDetalle()).toBe('EN_PROCESO');
    // El backend nuevo espera { estado: "..." }, no el string crudo
    expect(body).toEqual({ estado: 'EN_PROCESO' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cobros', 1] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recibo', 1] });
  });

  it('marca stale tanto páginas filtradas como sub-listados planos sin reescribir su membresía', async () => {
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, () =>
        HttpResponse.json({ ...baseRep, estado: 'EN_DIAGNOSTICO' })
      )
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData<Page>(KEY, { content: [baseRep], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
    client.setQueryData<Reparacion[]>(['reparaciones', 'equipo', 10], [baseRep]);
    client.setQueryData<Reparacion>(['reparacion', 1], baseRep);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCambiarEstadoMutation(), { wrapper });

    act(() => result.current.mutate({ id: 1, estado: 'EN_DIAGNOSTICO' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<Page>(KEY)?.content[0].estado).toBe('INGRESADO');
    expect(client.getQueryData<Reparacion[]>(['reparaciones', 'equipo', 10])?.[0].estado).toBe('INGRESADO');
    expect(client.getQueryState(KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(['reparaciones', 'equipo', 10])?.isInvalidated).toBe(true);
    expect(client.getQueryData<Reparacion>(['reparacion', 1])?.estado).toBe('EN_DIAGNOSTICO');
  });

  it('no inventa ningún estado si el backend falla', async () => {
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, () => new HttpResponse(null, { status: 500 }))
    );
    const { result, estadoEnCache, estadoDetalle } = setup();

    act(() => result.current.mutate({ id: 1, estado: 'EN_PROCESO' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(estadoEnCache()).toBe('INGRESADO');
    expect(estadoDetalle()).toBe('INGRESADO');
  });
});
