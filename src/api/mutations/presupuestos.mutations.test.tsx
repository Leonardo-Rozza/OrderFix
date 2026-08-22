import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '../../test/server';
import { useCrearPresupuestoMutation } from './presupuestos.mutations';

vi.mock('../../utils/toast', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../utils/toast')>();
  return { ...original, showError: vi.fn(), showSuccess: vi.fn() };
});

describe('mutaciones de presupuesto', () => {
  it('refresca presupuesto, reparación, recibo y seguimiento porque puede mover el estado', async () => {
    server.use(
      http.post(`${API}/reparaciones/9/presupuestos`, () =>
        HttpResponse.json({ id: 4, reparacionId: 9 }),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCrearPresupuestoMutation(9), { wrapper });

    act(() => {
      result.current.mutate({
        items: [{ descripcion: 'Mano de obra', cantidad: 1, precioUnitario: 20000 }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['presupuestos', 9] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reparacion', 9] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reparaciones'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recibo', 9] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['seguimiento'] });
  });
});
