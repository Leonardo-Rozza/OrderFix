import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { server, API } from '../test/server';

const mocks = vi.hoisted(() => ({ cobrosHabilitado: true }));

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div data-testid="dashboard-layout" data-title={title}>{children}</div>
  ),
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({
    cobros: mocks.cobrosHabilitado,
    inventario: true,
    empleadosMultiples: true,
  }),
}));

vi.mock('../components/DatosCobroCard', () => ({ DatosCobroCard: () => null }));

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
  beforeEach(() => {
    mocks.cobrosHabilitado = true;
  });

  it('presenta Cobros como registro manual sin semántica bancaria o contable', async () => {
    server.use(http.get(`${API}/caja`, () => HttpResponse.json(cajaVacia)));

    renderUI();

    expect(screen.getByTestId('dashboard-layout')).toHaveAttribute('data-title', 'Cobros');
    const alcance = screen.getByRole('note', { name: 'Qué muestra Cobros' });
    expect(alcance).toHaveTextContent(/registrados manualmente.*período seleccionado/i);
    expect(alcance).toHaveTextContent(/no es un balance contable/i);
    expect(alcance).toHaveTextContent(/cuenta bancaria o billetera/i);
    expect(alcance).toHaveTextContent(/no.*acreditaciones reales/i);
    expect(alcance).toHaveTextContent(/egresos, gastos ni comisiones/i);
    expect(alcance).toHaveTextContent(/efectivo.*registre el taller/i);
    const resumen = screen.getByRole('region', { name: 'Resumen de cobros' });
    expect(await within(resumen).findByText('Cobrado en el período')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Cobros registrados' })).toBeVisible();
  });

  it('mantiene el gate PRO con la semántica Cobros y sin prometer un recibo imprimible', () => {
    mocks.cobrosHabilitado = false;

    renderUI();

    expect(screen.getByTestId('dashboard-layout')).toHaveAttribute('data-title', 'Cobros');
    expect(screen.getByRole('heading', { name: 'Cobros es una función PRO' })).toBeVisible();
    expect(screen.getByText(/registro manual de cobros por período/i)).toBeVisible();
    expect(screen.getByText(/datos para cobrar/i)).toBeVisible();
    expect(screen.getByText(/resumen digital de cada orden/i)).toBeVisible();
    expect(screen.queryByText(/caja por período|recibo imprimible/i)).not.toBeInTheDocument();
  });

  it('restaura un rango desde un deep link y lo usa en la consulta', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/caja`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(cajaVacia);
      }),
    );

    const { router } = renderUI(['/caja?desde=2026-08-01&hasta=2026-08-15&externo=1']);

    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
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

    expect(screen.getByLabelText('Desde')).toHaveValue('20/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('10/08/2026');
    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede ser posterior/i);
    expect(requests).toHaveLength(0);
    expect(router.state.location.search).toContain('desde=2026-08-20');
    expect(router.state.location.search).toContain('hasta=2026-08-10');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '25/08/2026' } });

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
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
  });

  it('crea una entrada PUSH por cambio y restaura el rango con back/forward', async () => {
    server.use(http.get(`${API}/caja`, () => HttpResponse.json(cajaVacia)));
    const { router } = renderUI(['/caja?externo=1']);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '01/08/2026' } });
    await waitFor(() => expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026'));
    expect(router.state.historyAction).toBe('PUSH');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '15/08/2026' } });
    await waitFor(() => expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026'));
    expect(router.state.historyAction).toBe('PUSH');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    expect(new URLSearchParams(router.state.location.search).get('externo')).toBe('1');

    await act(async () => { await router.navigate(1); });
    await act(async () => { await router.navigate(1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
  });

  it('conserva borradores inválidos fuera de la URL y oculta resultados hasta confirmar el rango completo', async () => {
    const requests: string[] = [];
    server.use(http.get(`${API}/caja`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(cajaVacia);
    }));
    const { router, queryClient } = renderUI(['/caja?desde=2028-02-01&hasta=2028-02-28&externo=1']);
    await screen.findByText('Sin cobros en el período');
    expect(requests).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '31/02/2028' } });
    fireEvent.blur(screen.getByLabelText('Desde'));
    expect(screen.getByLabelText('Desde')).toHaveValue('31/02/2028');
    expect(screen.getByLabelText('Desde')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('region', { name: 'Resumen de cobros' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cobros registrados' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?desde=2028-02-01&hasta=2028-02-28&externo=1');

    // Tampoco confirmar el otro extremo puede descartar el borrador ni consultar
    // resultados de un rango diferente al que la persona está viendo.
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '15/03/2028' } });
    expect(screen.getByLabelText('Desde')).toHaveValue('31/02/2028');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/03/2028');
    await act(async () => { await queryClient.invalidateQueries(); });
    expect(requests).toHaveLength(1);
    expect(router.state.location.search).toBe('?desde=2028-02-01&hasta=2028-02-28&externo=1');

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '29/02/2028' } });
    await waitFor(() => expect(requests).toHaveLength(2));
    const params = new URL(requests[1]).searchParams;
    expect(params.get('desde')).toBe('2028-02-29');
    expect(params.get('hasta')).toBe('2028-03-15');
    expect(router.state.location.search).toBe('?desde=2028-02-29&hasta=2028-03-15&externo=1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText('Sin cobros en el período')).toBeVisible();

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/02/2028');
    expect(screen.getByLabelText('Hasta')).toHaveValue('28/02/2028');
    await act(async () => { await router.navigate(1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('29/02/2028');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/03/2028');
  });

  it('no confirma un rango escrito invertido y Hoy limpia los borradores en una sola navegación', async () => {
    const requests: string[] = [];
    server.use(http.get(`${API}/caja`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(cajaVacia);
    }));
    const { router } = renderUI(['/caja?desde=2026-08-01&hasta=2026-08-15&externo=1']);
    await screen.findByText('Sin cobros en el período');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '20/08/2026' } });
    fireEvent.blur(screen.getByLabelText('Desde'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/no puede ser posterior/i);
    expect(requests).toHaveLength(1);
    expect(router.state.location.search).toBe('?desde=2026-08-01&hasta=2026-08-15&externo=1');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '25/08' } });
    expect(screen.queryByRole('region', { name: 'Resumen de cobros' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    await waitFor(() => expect(requests).toHaveLength(2));
    const params = new URL(requests[1]).searchParams;
    expect(params.has('desde')).toBe(false);
    expect(params.has('hasta')).toBe(false);
    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
  });

  it('descarta un borrador parcial al recorrer atrás y adelante', async () => {
    server.use(http.get(`${API}/caja`, () => HttpResponse.json(cajaVacia)));
    const { router } = renderUI(['/caja?desde=2026-08-01']);
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '15/08/2026' } });
    await waitFor(() => expect(router.state.location.search).toContain('hasta=2026-08-15'));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '12/' } });
    expect(screen.getByLabelText('Desde')).toHaveValue('12/');

    await act(async () => { await router.navigate(-1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    await act(async () => { await router.navigate(1); });
    expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

    const resumen = screen.getByRole('region', { name: 'Resumen de cobros' });
    const movimientos = screen.getByRole('region', { name: 'Cobros registrados' });
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

    const resumen = screen.getByRole('region', { name: 'Resumen de cobros' });
    expect(await within(resumen).findByText('No pudimos cargar el resumen de cobros.')).toBeInTheDocument();
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
