import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '../../test/server';
import { useUpdateClienteMutation } from './clientes.mutations';
import { useUpdateEquipoMutation } from './equipos.mutations';
import { useUpdateRepuestoMutation } from './repuestos.mutations';

vi.mock('../../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('cuerpos PUT contractuales', () => {
  it('usa el id de cliente solo en la URL', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/clientes/7`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 7, ...body });
      }),
    );
    const { result } = renderHook(useUpdateClienteMutation, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 7,
        nombre: 'Ana',
        apellido: 'Paz',
        telefono: '111',
      });
    });

    expect(body).toEqual({ nombre: 'Ana', apellido: 'Paz', telefono: '111' });
  });

  it('usa el id de equipo solo en la URL', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/equipos/8`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 8, ...body });
      }),
    );
    const { result } = renderHook(useUpdateEquipoMutation, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 8, marca: 'Apple', modelo: 'X', clienteId: 2 });
    });

    expect(body).toEqual({ marca: 'Apple', modelo: 'X', clienteId: 2 });
  });

  it('usa el id de repuesto solo en la URL', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/repuestos/9`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 9, ...body });
      }),
    );
    const { result } = renderHook(useUpdateRepuestoMutation, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 9, nombre: 'Pantalla', precio: 20 });
    });

    expect(body).toEqual({ nombre: 'Pantalla', precio: 20 });
  });
});
