import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';
import { ClienteFormModal } from './ClienteFormModal';

const renderUI = renderWithProviders;

describe('ClienteFormModal', () => {
  it('crea un cliente con los datos mínimos (email/dirección quedan fuera si vacíos)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/clientes`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1, ...body }, { status: 200 });
      })
    );

    renderUI(<ClienteFormModal isOpen onClose={onClose} editing={null} />);

    await user.type(screen.getByLabelText(/^nombre/i), 'Pedro');
    await user.type(screen.getByLabelText(/apellido/i), 'Gómez');
    await user.type(screen.getByLabelText(/teléfono/i), '1144556677');
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ nombre: 'Pedro', apellido: 'Gómez', telefono: '1144556677' });
    expect(body).not.toHaveProperty('email');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: /¿descartar los cambios\?/i })).not.toBeInTheDocument();
  });

  it('valida los campos requeridos', async () => {
    const user = userEvent.setup();
    renderUI(<ClienteFormModal isOpen onClose={vi.fn()} editing={null} />);
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));
    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
  });

  it('conserva los datos al seguir editando y cierra sólo al confirmar el descarte', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderUI(<ClienteFormModal isOpen onClose={onClose} editing={null} />);

    await user.type(screen.getByLabelText(/^nombre/i), 'Pedro');
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(await screen.findByRole('dialog', { name: /¿descartar los cambios\?/i })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /seguir editando/i }));
    expect(screen.queryByRole('dialog', { name: /¿descartar los cambios\?/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Pedro');

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    await user.click(await screen.findByRole('button', { name: /descartar cambios/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('congela los campos mientras el guardado está pendiente', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let releaseRequest: (() => void) | undefined;
    const pendingResponse = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    server.use(
      http.post(`${API}/clientes`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        await pendingResponse;
        return HttpResponse.json({ id: 1, ...body }, { status: 201 });
      }),
    );

    renderUI(<ClienteFormModal isOpen onClose={onClose} editing={null} />);

    const nombre = screen.getByLabelText(/^nombre/i);
    await user.type(nombre, 'Pedro');
    await user.type(screen.getByLabelText(/apellido/i), 'Gómez');
    await user.type(screen.getByLabelText(/teléfono/i), '1144556677');
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => expect(nombre).toBeDisabled());
    await user.type(nombre, ' tardío');
    expect(nombre).toHaveValue('Pedro');

    releaseRequest?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
