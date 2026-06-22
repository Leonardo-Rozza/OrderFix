import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { ReparacionFormModal } from './ReparacionFormModal';
import type { Equipo } from '../types';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('ReparacionFormModal — alta rápida (modo nuevo)', () => {
  it('crea cliente+equipo+reparación con el endpoint de ingreso rápido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { clienteId: 1, equipoId: 2, clienteNuevo: true, reparacion: { id: 9 } },
          { status: 201 }
        );
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} equipos={[]} />);

    await user.type(screen.getByLabelText(/^nombre/i), 'Juan');
    await user.type(screen.getByLabelText(/teléfono/i), '1155551234');
    await user.type(screen.getByLabelText(/^marca/i), 'Apple');
    await user.type(screen.getByLabelText(/^modelo/i), 'iPhone 12');
    await user.type(screen.getByLabelText(/problema/i), 'Pantalla rota');
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      clienteNombre: 'Juan',
      clienteTelefono: '1155551234',
      equipoMarca: 'Apple',
      equipoModelo: 'iPhone 12',
      descripcionProblema: 'Pantalla rota',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('valida los campos mínimos antes de enviar', async () => {
    const user = userEvent.setup();
    let llamado = false;
    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, () => {
        llamado = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={null} equipos={[]} />);
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(llamado).toBe(false);
  });
});

describe('ReparacionFormModal — equipo existente', () => {
  it('crea la reparación contra el equipo elegido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    const equipos: Equipo[] = [
      {
        id: 5,
        marca: 'Samsung',
        modelo: 'A52',
        imei: null,
        color: null,
        descripcion: null,
        clienteId: 1,
        clienteNombre: 'Ana',
        clienteApellido: 'Gómez',
      },
    ];

    server.use(
      http.post(`${API}/reparaciones`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 10, ...body }, { status: 201 });
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} equipos={equipos} />);

    await user.click(screen.getByRole('button', { name: /elegir equipo existente/i }));
    await user.click(screen.getByLabelText(/^equipo/i));
    await user.click(await screen.findByRole('option', { name: /samsung a52/i }));
    await user.type(screen.getByLabelText(/problema/i), 'No enciende');
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ equipoId: 5, descripcionProblema: 'No enciende' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
