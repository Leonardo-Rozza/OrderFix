import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiClient } from '../axios';
import type { Page } from '../pagination';
import { queryKeys } from '../queryKeys';
import { API, server } from '../../test/server';
import type { EstadoReparacion, Reparacion, ReparacionDetalle } from '../../types';
import {
  separarReparacionDetalle,
  useReparacionQuery,
  useReparacionesBoardInfiniteQuery,
} from './reparaciones.queries';

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

const reparacion = (id: number, estado: EstadoReparacion = 'INGRESADO'): Reparacion => ({
  id,
  equipoId: 3,
  descripcionProblema: `Problema ${id}`,
  estado,
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
});

const page = (
  content: Reparacion[],
  number: number,
  totalPages: number,
  totalElements = content.length,
): Page<Reparacion> => ({
  content,
  page: { size: 20, number, totalElements, totalPages },
});

const setupBoard = ({
  estado = 'INGRESADO',
  q = '',
}: {
  estado?: EstadoReparacion;
  q?: string;
} = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    ({ search }: { search: string }) => useReparacionesBoardInfiniteQuery({ estado, q: search }),
    { wrapper, initialProps: { search: q } },
  );
  return { client, ...hook };
};

describe('consulta incremental del kanban', () => {
  it('usa una key exclusiva por estado y valores estables de búsqueda', () => {
    const ingresado = queryKeys.reparaciones.board('INGRESADO', {
      q: 'Ada',
      size: 20,
      sort: 'id,desc',
    });
    const diagnosticado = queryKeys.reparaciones.board('EN_DIAGNOSTICO', {
      q: 'Ada',
      size: 20,
      sort: 'id,desc',
    });

    expect(queryKeys.reparaciones.boards).toEqual(['reparaciones', 'board']);
    expect(queryKeys.reparaciones.boardState('INGRESADO')).toEqual([
      'reparaciones',
      'board',
      'INGRESADO',
    ]);
    expect(ingresado).not.toEqual(diagnosticado);
    expect(ingresado).not.toEqual(queryKeys.reparaciones.list({
      estado: 'INGRESADO',
      q: 'Ada',
      page: 0,
      size: 20,
      sort: 'id,desc',
    }));
  });

  it('pide página cero y continúa con el número informado por metadata', async () => {
    const first = page([reparacion(20)], 0, 3, 41);
    const second = page([reparacion(19)], 1, 3, 41);
    const get = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: first } as never)
      .mockResolvedValueOnce({ data: second } as never);

    const { result } = setupBoard({ q: '  pantalla  ' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenNthCalledWith(1, '/reparaciones', {
      params: {
        q: 'pantalla',
        page: 0,
        size: 20,
        sort: 'id,desc',
        estado: 'INGRESADO',
      },
      signal: expect.any(AbortSignal),
      errorMode: 'inline',
    });
    expect(result.current.hasNextPage).toBe(true);

    let nextData = result.current.data;
    await act(async () => {
      const nextResult = await result.current.fetchNextPage();
      nextData = nextResult.data;
    });

    expect(get).toHaveBeenNthCalledWith(2, '/reparaciones', {
      params: {
        q: 'pantalla',
        page: 1,
        size: 20,
        sort: 'id,desc',
        estado: 'INGRESADO',
      },
      signal: expect.any(AbortSignal),
      errorMode: 'inline',
    });
    expect(nextData?.pageParams).toEqual([0, 1]);
    expect(nextData?.pages).toEqual([first, second]);
  });

  it.each([0, 1])('no ofrece continuación cuando totalPages=%s', async (totalPages) => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: page([], 0, totalPages, 0),
    } as never);

    const { result } = setupBoard();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('rechaza respuestas sin metadata contractual', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { content: [] } } as never);

    const { result } = setupBoard();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(
      expect.objectContaining({
        message: 'La respuesta paginada no incluye metadata de página.',
      }),
    );
  });

  it('al cambiar q crea otra sesión y vuelve a solicitar página cero', async () => {
    const get = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: page([reparacion(2)], 0, 2, 21) } as never)
      .mockResolvedValueOnce({ data: page([reparacion(1)], 0, 1, 1) } as never);
    const { result, rerender } = setupBoard({ q: 'pantalla' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ search: 'batería' });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

    expect(get.mock.calls.map(([, config]) => config?.params)).toEqual([
      {
        q: 'pantalla',
        page: 0,
        size: 20,
        sort: 'id,desc',
        estado: 'INGRESADO',
      },
      {
        q: 'batería',
        page: 0,
        size: 20,
        sort: 'id,desc',
        estado: 'INGRESADO',
      },
    ]);
  });
});

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
