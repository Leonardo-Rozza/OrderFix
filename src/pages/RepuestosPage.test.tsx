import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { server, API } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../components/RepuestoFormModal', () => ({
  RepuestoFormModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="repuesto-form-mock" /> : null
  ),
}));

import { RepuestosPage } from './RepuestosPage';

describe('RepuestosPage — asociación global', () => {
  it('abre el formulario sin precargar el catálogo de reparaciones', async () => {
    const user = userEvent.setup();
    let optionRequests = 0;

    server.use(
      http.get(`${API}/repuestos`, () => HttpResponse.json({
        content: [{
          id: 3,
          nombre: 'Módulo pantalla',
          descripcion: 'OLED',
          precio: 8000,
          reparacionId: null,
        }],
        page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
      })),
      http.get(`${API}/reparaciones`, ({ request }) => {
        optionRequests += 1;
        expect(new URL(request.url).searchParams.get('size')).toBe('20');
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
    );

    renderWithProviders(<RepuestosPage />);
    expect(optionRequests).toBe(0);
    expect(screen.getByRole('searchbox', { name: /buscar repuestos/i })).toHaveClass('min-h-11', 'text-base');
    expect(await screen.findByRole('button', { name: 'Editar' })).toHaveClass('h-11', 'w-11');

    await user.click(screen.getByRole('button', { name: /nuevo repuesto/i }));

    expect(await screen.findByTestId('repuesto-form-mock')).toBeInTheDocument();
    expect(optionRequests).toBe(0);
  });
});
