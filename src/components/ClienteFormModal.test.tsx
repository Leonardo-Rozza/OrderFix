import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { ClienteFormModal } from './ClienteFormModal';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

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
  });

  it('valida los campos requeridos', async () => {
    const user = userEvent.setup();
    renderUI(<ClienteFormModal isOpen onClose={vi.fn()} editing={null} />);
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));
    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
  });
});
