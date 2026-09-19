import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ESTADOS_ORDEN } from '../../config/estados';
import type { EstadoReparacion } from '../../types';
import { apiClient } from '../axios';
import { reconcileReparacionChanged } from '../cacheConsistency';
import { queryKeys } from '../queryKeys';
import { useReparacionesStateCountsQuery } from './reparacionesCounts.queries';

const response = (totalElements: number) => ({
  content: totalElements > 0 ? [{ id: 42 }] : [],
  page: { size: 1, number: 0, totalElements, totalPages: totalElements },
});

const countsWith = (value: number) => Object.fromEntries(
  ESTADOS_ORDEN.map((estado) => [estado, value]),
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

const setup = ({ q = 'pantalla', enabled = true } = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    ...renderHook(
      (params: { q: string; enabled: boolean }) => useReparacionesStateCountsQuery(params),
      { wrapper, initialProps: { q, enabled } },
    ),
  };
};

describe('useReparacionesStateCountsQuery', () => {
  it.each([
    { q: '   ', enabled: true },
    { q: 'pantalla', enabled: false },
  ])('no consulta ni reintenta manualmente si está inactivo: %j', async (params) => {
    const get = vi.spyOn(apiClient, 'get');
    const { result, client } = setup(params);

    expect(result.current).toMatchObject({
      counts: undefined, isLoading: false, isFetching: false, isError: false,
    });
    await act(async () => { await result.current.refetch(); });
    expect(get).not.toHaveBeenCalled();
    expect(client.getQueriesData({ queryKey: queryKeys.reparaciones.counts })).toEqual([]);
  });

  it('espera los 12 totales, conserva ceros y cachea metadata del servidor sin órdenes', async () => {
    const lastResponse = deferred<{ data: ReturnType<typeof response> }>();
    const expected = Object.fromEntries(ESTADOS_ORDEN.map((estado, index) => [estado, index === 0 ? 0 : 100 + index]));
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => {
      const estado = config?.params.estado as EstadoReparacion;
      return (estado === 'CANCELADO'
        ? lastResponse.promise
        : Promise.resolve({ data: response(expected[estado]) })) as never;
    });
    const { result, client } = setup({ q: '  pantalla  ' });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(12));
    await waitFor(() => expect(client.getQueryData(queryKeys.reparaciones.stateCount('INGRESADO', 'pantalla'))).toBe(0));
    expect(result.current.counts).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    for (const estado of ESTADOS_ORDEN) {
      expect(get).toHaveBeenCalledWith('/reparaciones', {
        params: { q: 'pantalla', page: 0, size: 1, sort: 'id,desc', estado },
        signal: expect.any(AbortSignal),
        errorMode: 'inline',
      });
    }

    await act(async () => { lastResponse.resolve({ data: response(expected.CANCELADO) }); });
    await waitFor(() => expect(result.current.counts).toEqual(expected));
    expect(result.current).toMatchObject({ isLoading: false, isFetching: false, isError: false });
    expect(client.getQueriesData({ queryKey: queryKeys.reparaciones.boards })).toEqual([]);
    for (const [key, data] of client.getQueriesData({ queryKey: queryKeys.reparaciones.counts })) {
      expect(key[0]).toBe('reparaciones');
      expect(typeof data).toBe('number');
    }
  });

  it('cancela la búsqueda anterior y no permite que su respuesta tardía sustituya los nuevos totales', async () => {
    const oldResponse = deferred<{ data: ReturnType<typeof response> }>();
    const newResponse = deferred<{ data: ReturnType<typeof response> }>();
    const oldSignals: AbortSignal[] = [];
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => {
      if (config?.params.q === 'anterior') {
        oldSignals.push(config.signal as AbortSignal);
        return oldResponse.promise as never;
      }
      return newResponse.promise as never;
    });
    const { result, rerender, client } = setup({ q: 'anterior' });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(12));

    rerender({ q: 'nueva', enabled: true });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(24));
    expect(oldSignals).toHaveLength(12);
    expect(oldSignals.every((signal) => signal.aborted)).toBe(true);
    expect(result.current.counts).toBeUndefined();
    await act(async () => { newResponse.resolve({ data: response(7) }); });
    await waitFor(() => expect(result.current.counts).toEqual(countsWith(7)));

    await act(async () => { oldResponse.resolve({ data: response(99) }); });
    expect(result.current.counts).toEqual(countsWith(7));
    expect(client.getQueryData(queryKeys.reparaciones.stateCount('INGRESADO', 'anterior'))).toBeUndefined();
  });

  it.each([
    { name: 'sin metadata', payload: { content: [] } },
    { name: 'total negativo', payload: { content: [], page: { size: 1, number: 0, totalPages: 0, totalElements: -1 } } },
    { name: 'total de otro tipo', payload: { content: [], page: { size: 1, number: 0, totalPages: 12, totalElements: '12' } } },
  ])('rechaza $name sin publicar una suma parcial', async ({ payload }) => {
    vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => Promise.resolve({
      data: config?.params.estado === 'EN_PROCESO' ? payload : response(3),
    }) as never);
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.counts).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('oculta todos los conteos si falla un refetch y permite recuperarlos al reintentar', async () => {
    let fail = false;
    let total = 6;
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, config) => (
      fail && config?.params.estado === 'EN_PROCESO'
        ? Promise.reject(new Error('No se pudo consultar el total'))
        : Promise.resolve({ data: response(total) })
    ) as never);
    const { result } = setup();
    await waitFor(() => expect(result.current.counts).toEqual(countsWith(6)));

    fail = true;
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.counts).toBeUndefined();
    expect(result.current.isFetching).toBe(false);

    fail = false;
    total = 8;
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.counts).toEqual(countsWith(8)));
    expect(result.current.isError).toBe(false);
    expect(get).toHaveBeenCalledTimes(36);
  });

  it('reconcilia los totales tras una transición sin mezclar la caché infinita de una fase inactiva', async () => {
    let total = 21;
    const get = vi.spyOn(apiClient, 'get').mockImplementation(() => Promise.resolve({ data: response(total) }) as never);
    const { result, client } = setup();
    const boardKey = queryKeys.reparaciones.board('INGRESADO', { q: 'pantalla', size: 20, sort: 'id,desc' });
    const boardData = { pages: [response(21)], pageParams: [0] };
    client.setQueryData(boardKey, boardData);
    client.setQueryData(queryKeys.dashboard.all, { totalReparaciones: 21 });
    await waitFor(() => expect(result.current.counts).toEqual(countsWith(21)));

    total = 20;
    await act(async () => {
      await reconcileReparacionChanged(client, { reparacionId: 42 });
    });
    await waitFor(() => expect(result.current.counts).toEqual(countsWith(20)));
    expect(get).toHaveBeenCalledTimes(24);
    expect(client.getQueryData(boardKey)).toEqual(boardData);
    expect(client.getQueryState(boardKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.dashboard.all)?.isInvalidated).toBe(true);
  });
});
