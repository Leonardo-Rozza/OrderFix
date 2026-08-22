import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { PresupuestoFormModal } from './PresupuestoFormModal';
import { renderWithProviders } from '../test/renderWithProviders';

describe('PresupuestoFormModal', () => {
  it('envía desde el footer, recorta el detalle y expone controles táctiles etiquetados', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/reparaciones/7/presupuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 20, ...body }, { status: 201 });
      }),
    );

    renderWithProviders(<PresupuestoFormModal isOpen onClose={onClose} reparacionId={7} />);

    const submit = screen.getByRole('button', { name: /crear presupuesto/i });
    expect(submit).toHaveAttribute('form', 'presupuesto-form');
    expect(screen.getByRole('button', { name: /quitar ítem/i })).toHaveClass('h-11', 'w-11');

    await user.type(screen.getByLabelText(/^detalle$/i), '  Pin de carga  ');
    await user.type(screen.getByLabelText(/precio unitario/i), '12000');
    await user.click(submit);

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      items: [{ descripcion: 'Pin de carga', cantidad: 1, precioUnitario: 12000, tipoItem: 'MANO_DE_OBRA' }],
      tipo: 'ORIGINAL',
      validezDias: 7,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('rechaza detalles compuestos sólo por espacios', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<PresupuestoFormModal isOpen onClose={onClose} reparacionId={8} />);

    await user.type(screen.getByLabelText(/^detalle$/i), '   ');
    await user.type(screen.getByLabelText(/precio unitario/i), '100');
    await user.click(screen.getByRole('button', { name: /crear presupuesto/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/escribí el detalle del ítem/i);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('protege filas agregadas y vuelve a limpio al quitar la fila nueva', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<PresupuestoFormModal isOpen onClose={onClose} reparacionId={8} />);

    await user.click(screen.getByRole('button', { name: /agregar ítem/i }));
    expect(screen.getAllByLabelText(/^detalle$/i)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    await user.click(screen.getAllByRole('button', { name: /quitar ítem/i })[1]);
    expect(screen.getAllByLabelText(/^detalle$/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('conserva la edición de un ítem al cancelar el descarte', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PresupuestoFormModal isOpen onClose={vi.fn()} reparacionId={8} />);

    const detalle = screen.getByLabelText(/^detalle$/i);
    await user.type(detalle, 'Cambio de módulo');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));

    expect(detalle).toHaveValue('Cambio de módulo');
  });

  it('conserva los ítems y la protección si falla el envío', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/reparaciones/11/presupuestos`, () => (
        HttpResponse.json({ message: 'Error temporal' }, { status: 500 })
      )),
    );
    renderWithProviders(<PresupuestoFormModal isOpen onClose={onClose} reparacionId={11} />);

    const detalle = screen.getByLabelText(/^detalle$/i);
    await user.type(detalle, 'Cambio de módulo');
    await user.type(screen.getByLabelText(/precio unitario/i), '12000');
    await user.click(screen.getByRole('button', { name: /crear presupuesto/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear presupuesto' })).toBeEnabled());

    expect(detalle).toHaveValue('Cambio de módulo');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
  });
});
