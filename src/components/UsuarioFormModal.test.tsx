import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { UsuarioFormModal } from './UsuarioFormModal';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

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

    renderUI(<UsuarioFormModal isOpen onClose={onClose} />);

    await user.type(screen.getByLabelText(/usuario/i), 'juan');
    await user.type(screen.getByLabelText(/email/i), 'juan@taller.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto1');
    await user.click(screen.getByRole('button', { name: /crear empleado/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ username: 'juan', email: 'juan@taller.com', password: 'secreto1', role: 'USER' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('valida contraseña mínima', async () => {
    const user = userEvent.setup();
    renderUI(<UsuarioFormModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(/usuario/i), 'x');
    await user.type(screen.getByLabelText(/email/i), 'x@x.com');
    await user.type(screen.getByLabelText(/contraseña/i), '123');
    await user.click(screen.getByRole('button', { name: /crear empleado/i }));
    expect(await screen.findByText(/mínimo 6/i)).toBeInTheDocument();
  });
});
