import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { UsuarioFormModal } from './UsuarioFormModal';
import { renderWithProviders } from '../test/renderWithProviders';

describe('UsuarioFormModal', () => {
  it('crea un empleado con rol USER por defecto', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/usuarios`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 5, ...body }, { status: 201 });
      })
    );

    renderWithProviders(<UsuarioFormModal isOpen onClose={onClose} />);

    await user.type(screen.getByLabelText(/usuario/i), 'juan');
    await user.type(screen.getByLabelText(/email/i), 'juan@taller.com');
    await user.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'secreto1');
    await user.click(screen.getByRole('button', { name: /crear empleado/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ username: 'juan', email: 'juan@taller.com', password: 'secreto1', role: 'USER' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('valida contraseña mínima', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<UsuarioFormModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText(/usuario/i), 'x');
    await user.type(screen.getByLabelText(/email/i), 'x@x.com');
    await user.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), '123');
    await user.click(screen.getByRole('button', { name: /crear empleado/i }));
    expect(await screen.findByText(/mínimo 6/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('protege la contraseña sin exponerla y conserva el valor al continuar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<UsuarioFormModal isOpen onClose={onClose} />);

    const password = screen.getByLabelText(/contraseña/i, { selector: 'input' });
    await user.type(password, 'secreto-super-privado');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    const dialog = screen.getByRole('dialog', { name: '¿Descartar los cambios?' });
    expect(dialog).not.toHaveTextContent('secreto-super-privado');
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(password).toHaveValue('secreto-super-privado');
  });

  it('cierra sin confirmación cuando permanece en el baseline', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<UsuarioFormModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('conserva credenciales y protección si falla la creación', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/usuarios`, () => (
        HttpResponse.json({ message: 'Error temporal' }, { status: 500 })
      )),
    );
    renderWithProviders(<UsuarioFormModal isOpen onClose={onClose} />);

    await user.type(screen.getByLabelText(/usuario/i), 'juan');
    await user.type(screen.getByLabelText(/email/i), 'juan@taller.com');
    const password = screen.getByLabelText(/contraseña/i, { selector: 'input' });
    await user.type(password, 'secreto1');
    await user.click(screen.getByRole('button', { name: /crear empleado/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear empleado' })).toBeEnabled());

    expect(password).toHaveValue('secreto1');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
  });
});
