import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import type { Reparacion } from '../types';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../components/RepuestoFormModal', () => ({
  RepuestoFormModal: ({
    isOpen,
    reparaciones,
  }: {
    isOpen: boolean;
    reparaciones?: Reparacion[];
  }) => isOpen ? (
    <div data-testid="repuesto-form-mock">
      {reparaciones?.map((reparacion) => (
        <span key={reparacion.id}>Orden disponible #{reparacion.id}</span>
      ))}
    </div>
  ) : null,
}));

import { RepuestosPage } from './RepuestosPage';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('RepuestosPage — asociación global', () => {
  it('carga las reparaciones al abrir el formulario y se las entrega al selector', async () => {
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
        expect(new URL(request.url).searchParams.get('size')).toBe('1000');
        return HttpResponse.json({
          content: [{
            id: 42,
            equipoId: 8,
            descripcionProblema: 'No enciende',
            estado: 'EN_DIAGNOSTICO',
            precioEstimado: null,
            precioFinal: null,
            fechaIngreso: '2026-08-13',
            fechaEstimadaEntrega: null,
            fechaEntrega: null,
          }],
          page: { size: 1000, number: 0, totalElements: 1, totalPages: 1 },
        });
      }),
    );

    renderUI(<RepuestosPage />);
    expect(optionRequests).toBe(0);
    expect(screen.getByRole('searchbox', { name: /buscar repuestos/i })).toHaveClass('min-h-11', 'text-base');
    expect(await screen.findByRole('button', { name: 'Editar' })).toHaveClass('h-11', 'w-11');

    await user.click(screen.getByRole('button', { name: /nuevo repuesto/i }));

    expect(await screen.findByText('Orden disponible #42')).toBeInTheDocument();
    await waitFor(() => expect(optionRequests).toBe(1));
  });
});
