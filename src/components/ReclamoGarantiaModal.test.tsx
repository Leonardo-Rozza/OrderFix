import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';
import type { Reparacion } from '../types';
import { ReclamoGarantiaModal } from './ReclamoGarantiaModal';

const reparacion: Reparacion = {
  id: 20,
  equipoId: 5,
  descripcionProblema: 'No responde el táctil',
  estado: 'ENTREGADO',
  precioEstimado: null,
  precioFinal: 45000,
  fechaIngreso: '2026-08-01',
  fechaEstimadaEntrega: null,
  fechaEntrega: '2026-08-05',
  numeroOrden: 'ORD-2026-0020',
};

describe('ReclamoGarantiaModal', () => {
  it('conserva la descripción al seguir editando y la limpia sólo al descartar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <ReclamoGarantiaModal isOpen onClose={onClose} reparacion={reparacion} />,
    );

    const descripcion = screen.getByLabelText(/¿qué problema tiene ahora\?/i);
    await user.type(descripcion, 'La pantalla volvió a fallar');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /seguir editando/i }));
    expect(descripcion).toHaveValue('La pantalla volvió a fallar');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /descartar cambios/i }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(descripcion).toHaveValue('');
  });

  it('mantiene los cambios protegidos cuando el backend rechaza el reclamo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/reparaciones/${reparacion.id}/garantia`, () => (
        HttpResponse.json({ message: 'Falla temporal' }, { status: 500 })
      )),
    );

    renderWithProviders(
      <ReclamoGarantiaModal isOpen onClose={onClose} reparacion={reparacion} />,
    );

    const descripcion = screen.getByLabelText(/¿qué problema tiene ahora\?/i);
    await user.type(descripcion, '  Sigue fallando el táctil  ');
    await user.click(screen.getByRole('button', { name: /crear reclamo/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /crear reclamo/i })).toBeEnabled());
    expect(descripcion).toHaveValue('  Sigue fallando el táctil  ');
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
  });

  it('libera el guard antes de cerrar y navegar tras crear el reclamo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/reparaciones/${reparacion.id}/garantia`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
          ...reparacion,
          id: 31,
          descripcionProblema: body.descripcionProblema,
          esGarantia: true,
          reparacionOrigenId: reparacion.id,
        }, { status: 201 });
      }),
    );

    renderWithProviders(
      <ReclamoGarantiaModal isOpen onClose={onClose} reparacion={reparacion} />,
      {
        initialEntries: ['/'],
        additionalRoutes: [{
          path: '/reparaciones/:id',
          element: <p>Ficha del nuevo reclamo</p>,
        }],
      },
    );

    await user.type(screen.getByLabelText(/¿qué problema tiene ahora\?/i), '  Pantalla intermitente  ');
    await user.click(screen.getByRole('button', { name: /crear reclamo/i }));

    await waitFor(() => expect(body).toEqual({ descripcionProblema: 'Pantalla intermitente' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(await screen.findByText('Ficha del nuevo reclamo')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });
});
