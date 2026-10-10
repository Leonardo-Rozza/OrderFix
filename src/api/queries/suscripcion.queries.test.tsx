import { authStore } from '../../store/auth.store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server, API } from '../../test/server';
import { useFunciones } from './suscripcion.queries';

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const suscripcion = (
  plan: 'FREE' | 'PRO',
  estado: 'TRIAL' | 'ACTIVA' | 'VENCIDA',
  funciones: { inventario: boolean; cobros: boolean; empleadosMultiples: boolean },
) => ({
  plan,
  estado,
  fechaInicio: '2026-08-01',
  fechaFinTrial: estado === 'TRIAL' ? '2026-08-31' : null,
  proximoCobro: null,
  reparacionesEsteMes: 0,
  limiteReparacionesMes: plan === 'FREE' && estado === 'ACTIVA' ? 25 : null,
  funciones,
});

describe('useFunciones', () => {
  it('falla cerrado mientras la suscripción todavía se está resolviendo', async () => {
    server.use(
      http.get(`${API}/suscripcion`, async () => {
        await delay(80);
        return HttpResponse.json(
          suscripcion('FREE', 'TRIAL', {
            inventario: true,
            cobros: true,
            empleadosMultiples: true,
          }),
        );
      }),
    );

    const { result } = renderHook(() => useFunciones(), { wrapper: createWrapper() });

    expect(result.current).toMatchObject({
      inventario: false,
      cobros: false,
      empleadosMultiples: false,
      isLoading: true,
      isError: false,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      inventario: true,
      cobros: true,
      empleadosMultiples: true,
      isError: false,
    });
  });

  it.each([
    {
      nombre: 'FREE/ACTIVA',
      respuesta: suscripcion('FREE', 'ACTIVA', {
        inventario: false,
        cobros: false,
        empleadosMultiples: false,
      }),
      esperado: { inventario: false, cobros: false, empleadosMultiples: false },
    },
    {
      nombre: 'FREE/TRIAL',
      respuesta: suscripcion('FREE', 'TRIAL', {
        inventario: true,
        cobros: true,
        empleadosMultiples: true,
      }),
      esperado: { inventario: true, cobros: true, empleadosMultiples: true },
    },
    {
      nombre: 'PRO/ACTIVA',
      respuesta: suscripcion('PRO', 'ACTIVA', {
        inventario: true,
        cobros: true,
        empleadosMultiples: true,
      }),
      esperado: { inventario: true, cobros: true, empleadosMultiples: true },
    },
    {
      nombre: 'PRO/VENCIDA',
      respuesta: suscripcion('PRO', 'VENCIDA', {
        inventario: false,
        cobros: false,
        empleadosMultiples: false,
      }),
      esperado: { inventario: false, cobros: false, empleadosMultiples: false },
    },
  ])('respeta los flags contractuales para $nombre', async ({ respuesta, esperado }) => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(respuesta)));

    const { result } = renderHook(() => useFunciones(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ ...esperado, isError: false });
  });

  it('mantiene todas las capacidades cerradas y expone el error si falla el contrato', async () => {
    server.use(
      http.get(`${API}/suscripcion`, () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useFunciones(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({
      inventario: false,
      cobros: false,
      empleadosMultiples: false,
      isLoading: false,
    });
    expect(result.current.refetch).toEqual(expect.any(Function));
  });

  it('trata una respuesta sin funciones como inválida y no abre capacidades', async () => {
    const respuesta = suscripcion('PRO', 'ACTIVA', {
      inventario: true,
      cobros: true,
      empleadosMultiples: true,
    });
    const sinFunciones: Record<string, unknown> = { ...respuesta };
    delete sinFunciones.funciones;
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(sinFunciones)));

    const { result } = renderHook(() => useFunciones(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      inventario: false,
      cobros: false,
      empleadosMultiples: false,
      isError: true,
    });
  });
});

beforeEach(() => {
  const token = `header.${btoa(JSON.stringify({ sub: 'owner@synthetic.invalid', tallerId: 1, role: 'ROLE_ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
  authStore.getState().login(token, 'owner@synthetic.invalid');
});
afterEach(() => { cleanup(); act(() => { authStore.getState().logout(); }); });
