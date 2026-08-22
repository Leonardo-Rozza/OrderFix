import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ cobros: true, inventario: true, empleadosMultiples: true }),
}));

import { CajaPage } from './CajaPage';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('CajaPage — rango de fechas', () => {
  it('no consulta un rango invertido y retoma al corregirlo', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/caja`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({
          desde: '2026-08-13',
          hasta: '2026-08-13',
          totalCobrado: 0,
          cantidad: 0,
          porMetodo: {},
          cobros: [],
        });
      }),
    );

    renderUI(<CajaPage />);
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Desde')).toHaveClass('min-h-11', 'w-full', 'text-base');
    expect(screen.getByLabelText('Hasta')).toHaveClass('min-h-11', 'w-full', 'text-base');

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-08-20' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-10' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede ser posterior/i);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests.some((url) => {
      const params = new URL(url).searchParams;
      return params.get('desde') === '2026-08-20' && params.get('hasta') === '2026-08-10';
    })).toBe(false);

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-25' } });

    await waitFor(() => expect(requests.some((url) => {
      const params = new URL(url).searchParams;
      return params.get('desde') === '2026-08-20' && params.get('hasta') === '2026-08-25';
    })).toBe(true));
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

    renderUI(<CajaPage />);

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

    renderUI(<CajaPage />);

    const resumen = screen.getByRole('region', { name: 'Resumen de caja' });
    expect(await within(resumen).findByText('No pudimos cargar el resumen de caja.')).toBeInTheDocument();
    expect(within(resumen).queryByText(/\$|0/)).not.toBeInTheDocument();

    fireEvent.click(within(resumen).getByRole('button', { name: 'Reintentar' }));

    expect((await within(resumen).findAllByText(/2\.500/)).length).toBeGreaterThan(0);
    expect(requests).toBe(2);
  });
});
