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

const KEY = ['reparaciones', { q: undefined, page: 0, size: 20 }];
type Page = { content: Reparacion[]; page: { size: number; number: number; totalElements: number; totalPages: number } };

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData<Page>(KEY, { content: [baseRep], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCambiarEstadoMutation(), { wrapper });
  const estadoEnCache = () => client.getQueryData<Page>(KEY)?.content[0].estado;
  return { result, estadoEnCache };
};

describe('useCambiarEstadoMutation (optimista)', () => {
  it('actualiza la cache al instante, manda { estado } y confirma con el backend', async () => {
    let body: unknown;
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...baseRep, estado: 'EN_PROCESO' });
      })
    );
    const { result, estadoEnCache } = setup();

    act(() => result.current.mutate({ id: 1, estado: 'EN_PROCESO' }));

    // Update optimista (la tarjeta "se mueve" antes de la respuesta)
    await waitFor(() => expect(estadoEnCache()).toBe('EN_PROCESO'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(estadoEnCache()).toBe('EN_PROCESO');
    // El backend nuevo espera { estado: "..." }, no el string crudo
    expect(body).toEqual({ estado: 'EN_PROCESO' });
  });

  it('no crashea con la cache de reparaciones-por-equipo (array plano) y también la actualiza', async () => {
    // Regresión: ['reparaciones','equipo',id] cachea Reparacion[] (sin .content);
    // el update optimista hacía old.content.map y explotaba con "reading 'map'".
    server.use(
      http.patch(`${API}/reparaciones/1/estado`, () =>
        HttpResponse.json({ ...baseRep, estado: 'EN_DIAGNOSTICO' })
      )
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData<Page>(KEY, { content: [baseRep], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
    client.setQueryData<Reparacion[]>(['reparaciones', 'equipo', 10], [baseRep]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCambiarEstadoMutation(), { wrapper });

    act(() => result.current.mutate({ id: 1, estado: 'EN_DIAGNOSTICO' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<Page>(KEY)?.content[0].estado).toBe('EN_DIAGNOSTICO');
    expect(client.getQueryData<Reparacion[]>(['reparaciones', 'equipo', 10])?.[0].estado).toBe('EN_DIAGNOSTICO');
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
