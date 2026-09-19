import type { ReactNode } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ cobros: true, inventario: true, empleadosMultiples: true }),
}));
vi.mock('../components/DatosCobroCard', () => ({ DatosCobroCard: () => null }));

import { CajaPage } from './CajaPage';

it('restaura el rango si Atrás llega antes de confirmar el render de Hoy', async () => {
  server.use(http.get(`${API}/caja`, () => HttpResponse.json({
    desde: '2026-08-01', hasta: '2026-08-15',
    totalCobrado: 0, cantidad: 0, porMetodo: {}, cobros: [],
  })));
  const initialSearch = '?desde=2026-08-01&hasta=2026-08-15&externo=1';
  const { router } = renderWithProviders(<CajaPage />, {
    initialEntries: [`/caja${initialSearch}`],
  });
  await screen.findByText('Sin cobros en el período');
  const initialKey = router.state.location.key;

  // El router publica la URL antes de que React confirme su transición.
  // Atrás puede llegar durante esa ventana; no esperamos el render intermedio.
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(router.state.location.search).toBe('?externo=1');
    expect(router.state.location.key).not.toBe(initialKey);
    await router.navigate(-1);
  });

  expect(router.state.location.search).toBe(initialSearch);
  expect(router.state.location.key).toBe(initialKey);
  expect(screen.getByLabelText('Desde')).toHaveValue('01/08/2026');
  expect(screen.getByLabelText('Hasta')).toHaveValue('15/08/2026');
});
