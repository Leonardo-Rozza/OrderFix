import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { RepuestoFormModal } from './RepuestoFormModal';

// Al crear, el modal consulta el plan (funciones) y lista el inventario.
beforeEach(() => {
  server.use(
    http.get(`${API}/suscripcion`, () =>
      HttpResponse.json({
        plan: 'PRO',
        estado: 'ACTIVA',
        reparacionesEsteMes: 0,
        limiteReparacionesMes: null,
        funciones: { inventario: true, cobros: true, empleadosMultiples: true },
      })
    ),
    http.get(`${API}/inventario`, () => HttpResponse.json({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } }))
  );
});

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('RepuestoFormModal', () => {
  it('crea un repuesto asociado a la reparación bloqueada (oculta el selector)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/repuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 3, ...body }, { status: 201 });
      })
    );

    renderUI(<RepuestoFormModal isOpen onClose={onClose} editing={null} lockedReparacionId={7} />);

    // El selector de reparación no debe mostrarse cuando viene bloqueada
    expect(screen.queryByLabelText(/reparación asociada/i)).not.toBeInTheDocument();

    const submit = await screen.findByRole('button', { name: /crear repuesto/i });
    expect(submit).toHaveAttribute('form', 'repuesto-form');
    await user.type(screen.getByLabelText(/^nombre/i), '  Módulo pantalla  ');
    await user.type(screen.getByLabelText(/precio/i), '8000');
    await user.click(submit);

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ nombre: 'Módulo pantalla', precio: 8000, reparacionId: 7 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('valida que el precio sea requerido', async () => {
    const user = userEvent.setup();
    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} lockedReparacionId={1} />);
    await user.type(screen.getByLabelText(/^nombre/i), 'X');
    await user.click(await screen.findByRole('button', { name: /crear repuesto/i }));
    expect(await screen.findByText(/el precio es requerido/i)).toBeInTheDocument();
  });

  it('no acepta un nombre compuesto sólo por espacios', async () => {
    const user = userEvent.setup();
    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} lockedReparacionId={1} />);
    await user.type(screen.getByLabelText(/^nombre/i), '   ');
    await user.type(screen.getByLabelText(/precio/i), '100');
    await user.click(await screen.findByRole('button', { name: /crear repuesto/i }));
    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
  });
});
