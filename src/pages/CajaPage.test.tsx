import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { server, API } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ cobros: true, inventario: true, empleadosMultiples: true }),
}));

import { CajaPage } from './CajaPage';

const cajaVacia = {
  desde: '2026-08-13',
  hasta: '2026-08-13',
  totalCobrado: 0,
  cantidad: 0,
  porMetodo: {},
  cobros: [],
};

const renderUI = (initialEntries: string[] = ['/caja']) => renderWithProviders(
  <CajaPage />,
  { initialEntries },
);

describe('CajaPage — rango de fechas', () => {
  it('restaura un rango desde un deep link y lo usa en la consulta', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/caja`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(cajaVacia);
      }),
    );

    const { router } = renderUI(['/caja?desde=2026-08-01&hasta=2026-08-15&externo=1']);

    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-08-15');
    expect(screen.getByLabelText('Desde')).toHaveClass('min-h-11', 'w-full', 'text-base');
    expect(screen.getByLabelText('Hasta')).toHaveClass('min-h-11', 'w-full', 'text-base');
    await waitFor(() => expect(requests).toHaveLength(1));
    const requestParams = new URL(requests[0]).searchParams;
    expect(requestParams.get('desde')).toBe('2026-08-01');
    expect(requestParams.get('hasta')).toBe('2026-08-15');
    expect(new URLSearchParams(router.state.location.search).get('externo')).toBe('1');
  });

  it('canonicaliza fechas inválidas con REPLACE y preserva parámetros desconocidos', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/caja`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(cajaVacia);
      }),
    );

    const { router } = renderUI(['/caja?desde=2026-02-30&hasta=fecha&externo=1']);

    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(() => expect(requests).toHaveLength(1));
    const requestParams = new URL(requests[0]).searchParams;
    expect(requestParams.has('desde')).toBe(false);
    expect(requestParams.has('hasta')).toBe(false);
  });

  it('mantiene visible un rango ISO invertido, no lo consulta y retoma al corregirlo', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/caja`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(cajaVacia);
      }),
    );

    const { router } = renderUI(['/caja?desde=2026-08-20&hasta=2026-08-10&externo=1']);

    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-20');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-08-10');
    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede ser posterior/i);
    expect(requests).toHaveLength(0);
    expect(router.state.location.search).toContain('desde=2026-08-20');
    expect(router.state.location.search).toContain('hasta=2026-08-10');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-25' } });

    await waitFor(() => expect(requests.some((url) => {
      const params = new URL(url).searchParams;
      return params.get('desde') === '2026-08-20' && params.get('hasta') === '2026-08-25';
    })).toBe(true));
    expect(router.state.historyAction).toBe('PUSH');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Hoy elimina ambas fechas en un solo PUSH y preserva parámetros desconocidos', async () => {
    server.use(http.get(`${API}/caja`, () => HttpResponse.json(cajaVacia)));
    const { router } = renderUI(['/caja?desde=2026-08-01&hasta=2026-08-15&externo=1']);

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(router.state.historyAction).toBe('PUSH');
    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-08-15');
  });

  it('crea una entrada PUSH por cambio y restaura el rango con back/forward', async () => {
    server.use(http.get(`${API}/caja`, () => HttpResponse.json(cajaVacia)));
    const { router } = renderUI(['/caja?externo=1']);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-08-01' } });
    await waitFor(() => expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-01'));
    expect(router.state.historyAction).toBe('PUSH');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-15' } });
    await waitFor(() => expect(screen.getByLabelText('Hasta')).toHaveValue('2026-08-15'));
    expect(router.state.historyAction).toBe('PUSH');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    expect(new URLSearchParams(router.state.location.search).get('externo')).toBe('1');

    await act(async () => { await router.navigate(1); });
    await act(async () => { await router.navigate(1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-08-15');
  });

  it('no presenta importes ni vacíos mientras el resumen sigue cargando', async () => {
    let releaseRequest: () => void = () => undefined;
    const pendingResponse = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    server.use(
      http.get(`${API}/caja`, async () => {
        await pendingResponse;
        return HttpResponse.json({
          desde: '2026-08-20',
          hasta: '2026-08-20',
          totalCobrado: 0,
          cantidad: 0,
          porMetodo: {},
          cobros: [],
        });
      }),
    );

    renderUI();

    const resumen = screen.getByRole('region', { name: 'Resumen de caja' });
    const movimientos = screen.getByRole('region', { name: 'Movimientos de caja' });
    expect(resumen).toHaveAttribute('aria-busy', 'true');
    expect(movimientos).toHaveAttribute('aria-busy', 'true');
    expect(within(resumen).queryByText(/\$|0/)).not.toBeInTheDocument();
    expect(within(movimientos).queryByText('Sin cobros en el período')).not.toBeInTheDocument();

    releaseRequest();
    expect(await within(movimientos).findByText('Sin cobros en el período')).toBeInTheDocument();
  });

  it('reemplaza los totales desconocidos por error y permite reintentar', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/caja`, () => {
        requests += 1;
        if (requests === 1) return new HttpResponse(null, { status: 503 });
        return HttpResponse.json({
          desde: '2026-08-20',
          hasta: '2026-08-20',
          totalCobrado: 2500,
          cantidad: 1,
          porMetodo: { EFECTIVO: 2500 },
          cobros: [],
        });
      }),
    );

    renderUI();

    const resumen = screen.getByRole('region', { name: 'Resumen de caja' });
    expect(await within(resumen).findByText('No pudimos cargar el resumen de caja.')).toBeInTheDocument();
    expect(within(resumen).queryByText(/\$|0/)).not.toBeInTheDocument();

    fireEvent.click(within(resumen).getByRole('button', { name: 'Reintentar' }));

    expect((await within(resumen).findAllByText(/2\.500/)).length).toBeGreaterThan(0);
    expect(requests).toBe(2);
  });

  it('muestra la referencia separada de la observación del cobro', async () => {
    server.use(
      http.get(`${API}/caja`, () => HttpResponse.json({
        desde: '2026-08-20',
        hasta: '2026-08-20',
        totalCobrado: 2500,
        cantidad: 1,
        porMetodo: { TRANSFERENCIA: 2500 },
        cobros: [{
          id: 1,
          reparacionId: 7,
          monto: 2500,
          metodo: 'TRANSFERENCIA',
          referencia: 'OP-123',
          observaciones: 'Seña inicial',
          fecha: '2026-08-20T10:00:00',
          estado: 'ACTIVO',
          anuladoAt: null,
          anuladoPorNombre: null,
          motivoAnulacion: null,
        }],
      })),
    );

    renderUI();

    expect(await screen.findByText(/Referencia:/)).toHaveTextContent('Referencia: OP-123');
    expect(screen.getByText('Observación: Seña inicial')).toBeVisible();
    expect(screen.queryByText(/OP-123.*Seña inicial/)).not.toBeInTheDocument();
  });
});
