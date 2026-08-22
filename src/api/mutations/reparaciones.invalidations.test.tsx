import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '../../test/server';
import { SUSCRIPCION_KEY } from '../queries/suscripcion.queries';
import {
  useCreateReparacionMutation,
  useDeleteReparacionMutation,
  useReclamoGarantiaMutation,
  useUpdateReparacionMutation,
} from './reparaciones.mutations';

vi.mock('../../utils/toast', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../utils/toast')>();
  return { ...original, showError: vi.fn(), showSuccess: vi.fn() };
});

const response = {
  id: 12,
  equipoId: 5,
  descripcionProblema: 'No carga',
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const setup = <T,>(hook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { ...renderHook(hook, { wrapper }), client, invalidatedKeys };
};

describe('mutaciones de reparación — agregados contractuales', () => {
  it('un alta refresca consumo, dashboard, relaciones y dimensión de pago', async () => {
    server.use(
      http.post(`${API}/reparaciones`, () => HttpResponse.json(response, { status: 201 })),
    );
    const { result, client, invalidatedKeys } = setup(useCreateReparacionMutation);

    await act(async () => {
      await result.current.mutateAsync({ equipoId: 5, descripcionProblema: 'No carga' });
    });

    expect(invalidatedKeys()).toEqual(expect.arrayContaining([
      ['reparaciones'],
      ['dashboard'],
      ['clientes'],
      ['equipos'],
      ['cobros', 12],
      ['recibo', 12],
      SUSCRIPCION_KEY,
    ]));
    expect(client.getQueryData(['reparacion', 12])).toEqual(response);
  });

  it('un reclamo actualiza agregados pero no el cupo mensual', async () => {
    server.use(
      http.post(`${API}/reparaciones/4/garantia`, () =>
        HttpResponse.json({ ...response, id: 13, esGarantia: true }, { status: 201 }),
      ),
    );
    const { result, client, invalidatedKeys } = setup(useReclamoGarantiaMutation);

    await act(async () => {
      await result.current.mutateAsync({ id: 4, descripcionProblema: 'Volvió a fallar' });
    });

    const keys = invalidatedKeys();
    expect(keys).toEqual(expect.arrayContaining([
      ['reparaciones'],
      ['reparacion', 4],
      ['dashboard'],
      ['clientes'],
      ['equipos'],
    ]));
    expect(client.getQueryData(['reparacion', 13])).toEqual({ ...response, id: 13, esGarantia: true });
    expect(keys).not.toContainEqual(SUSCRIPCION_KEY);
  });

  it('una edición refresca los repuestos cuyo equipo se muestra denormalizado', async () => {
    server.use(
      http.put(`${API}/reparaciones/12`, () =>
        HttpResponse.json({ ...response, equipoId: 8 }),
      ),
    );
    const { result, client, invalidatedKeys } = setup(useUpdateReparacionMutation);

    await act(async () => {
      await result.current.mutateAsync({
        id: 12,
        equipoId: 8,
        descripcionProblema: 'No carga',
      });
    });

    expect(invalidatedKeys()).toEqual(expect.arrayContaining([
      ['repuestos'],
      ['reparaciones'],
      ['dashboard'],
    ]));
    expect(client.getQueryData(['reparacion', 12])).toEqual({ ...response, equipoId: 8 });
  });

  it('purga detalle e hijos únicamente después de eliminar con éxito', async () => {
    server.use(
      http.delete(`${API}/reparaciones/12`, () => new HttpResponse(null, { status: 204 })),
    );
    const { result, client } = setup(useDeleteReparacionMutation);
    const childKeys = [
      ['reparacion', 12],
      ['repuestos', 'reparacion', 12],
      ['presupuestos', 12],
      ['cobros', 12],
      ['recibo', 12],
    ] as const;
    childKeys.forEach((key) => client.setQueryData(key, { persisted: true }));

    await act(async () => {
      await result.current.mutateAsync(12);
    });

    childKeys.forEach((key) => expect(client.getQueryData(key)).toBeUndefined());
  });

  it('conserva detalle e hijos cuando la baja falla', async () => {
    server.use(
      http.delete(`${API}/reparaciones/12`, () =>
        HttpResponse.json({ message: 'No se puede eliminar' }, { status: 409 }),
      ),
    );
    const { result, client } = setup(useDeleteReparacionMutation);
    const childKeys = [
      ['reparacion', 12],
      ['repuestos', 'reparacion', 12],
      ['presupuestos', 12],
      ['cobros', 12],
      ['recibo', 12],
    ] as const;
    childKeys.forEach((key) => client.setQueryData(key, { persisted: true }));

    await act(async () => {
      await expect(result.current.mutateAsync(12)).rejects.toBeTruthy();
    });

    childKeys.forEach((key) => expect(client.getQueryData(key)).toEqual({ persisted: true }));
  });
});
