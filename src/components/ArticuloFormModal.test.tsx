import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { ArticuloFormModal } from './ArticuloFormModal';
import { renderWithProviders } from '../test/renderWithProviders';

describe('ArticuloFormModal', () => {
  it('cierra limpio sin confirmar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('toma el stock oculto como baseline al editar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <ArticuloFormModal
        isOpen
        onClose={onClose}
        editing={{
          id: 4,
          nombre: 'Pantalla A52',
          descripcion: null,
          sku: 'PANT-A52',
          precio: 15000,
          costo: null,
          stock: 42,
          stockMinimo: 3,
          activo: true,
          stockBajo: false,
        }}
      />,
    );

    expect(screen.queryByLabelText(/stock inicial/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('crea desde las acciones externas y recorta el nombre obligatorio', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/inventario`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 4, ...body }, { status: 201 });
      }),
    );

    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    const submit = screen.getByRole('button', { name: /crear artículo/i });
    expect(submit).toHaveAttribute('form', 'articulo-form');
    expect(document.getElementById('articulo-form')).toBeInstanceOf(HTMLFormElement);

    await user.type(screen.getByLabelText(/^nombre/i), '  Pantalla A52  ');
    await user.type(screen.getByLabelText(/precio venta/i), '15000');
    await user.click(submit);

    await waitFor(() => expect(body).toMatchObject({ nombre: 'Pantalla A52', precio: 15000 }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('no acepta un nombre compuesto sólo por espacios', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    await user.type(screen.getByLabelText(/^nombre/i), '   ');
    await user.type(screen.getByLabelText(/precio venta/i), '1');
    await user.click(screen.getByRole('button', { name: /crear artículo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/el nombre es requerido/i);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('conserva el borrador al seguir editando y deja de proteger al volver al baseline', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    const nombre = screen.getByLabelText(/^nombre/i);
    await user.type(nombre, 'Pantalla A52');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(nombre).toHaveValue('Pantalla A52');

    await user.clear(nombre);
    await waitFor(() => expect(nombre).toHaveValue(''));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('deja de proteger al deshacer antes de intentar cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    const nombre = screen.getByLabelText(/^nombre/i);
    await user.type(nombre, 'Pantalla A52');
    await user.clear(nombre);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('descarta los cambios sólo después de confirmarlos', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    await user.type(screen.getByLabelText(/^nombre/i), 'Pantalla A52');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('conserva el borrador y la protección si falla el guardado', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/inventario`, () => (
        HttpResponse.json({ message: 'Error temporal' }, { status: 500 })
      )),
    );
    renderWithProviders(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    const nombre = screen.getByLabelText(/^nombre/i);
    await user.type(nombre, 'Pantalla A52');
    await user.type(screen.getByLabelText(/precio venta/i), '15000');
    await user.click(screen.getByRole('button', { name: /crear artículo/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear artículo' })).toBeEnabled());

    expect(nombre).toHaveValue('Pantalla A52');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
  });
});
