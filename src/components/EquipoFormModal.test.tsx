import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { EquipoFormModal } from './EquipoFormModal';
import type { Cliente } from '../types';

const clientes: Cliente[] = [
  { id: 1, nombre: 'Ana', apellido: 'Gómez', telefono: '111', email: null, direccion: null },
];

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('EquipoFormModal', () => {
  it('crea un equipo asociado al cliente seleccionado', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/equipos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 9, ...body }, { status: 201 });
      })
    );

    renderUI(<EquipoFormModal isOpen onClose={onClose} editing={null} clientes={clientes} />);

    await user.type(screen.getByLabelText(/^marca/i), 'Samsung');
    await user.type(screen.getByLabelText(/^modelo/i), 'A52');
    await user.click(screen.getByLabelText(/cliente/i));
    await user.click(await screen.findByRole('option', { name: /ana/i }));
    await user.click(screen.getByRole('button', { name: /crear equipo/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ marca: 'Samsung', modelo: 'A52', clienteId: 1 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('preselecciona el cliente con defaultClienteId', async () => {
    renderUI(<EquipoFormModal isOpen onClose={vi.fn()} editing={null} clientes={clientes} defaultClienteId={1} />);
    await waitFor(() => expect(screen.getByLabelText(/cliente/i)).toHaveTextContent(/ana/i));
  });

  it('bloquea el alta y permite reintentar si no cargan los clientes', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderUI(
      <EquipoFormModal
        isOpen
        onClose={vi.fn()}
        editing={null}
        clientes={[]}
        clientesError
        onRetryClientes={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos cargar los clientes/i);
    expect(screen.getByRole('button', { name: /no se cargaron clientes/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
