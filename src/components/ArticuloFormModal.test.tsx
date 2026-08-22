import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { ArticuloFormModal } from './ArticuloFormModal';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('ArticuloFormModal', () => {
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

    renderUI(<ArticuloFormModal isOpen onClose={onClose} editing={null} />);

    const submit = screen.getByRole('button', { name: /crear artículo/i });
    expect(submit).toHaveAttribute('form', 'articulo-form');
    expect(document.getElementById('articulo-form')).toBeInstanceOf(HTMLFormElement);

    await user.type(screen.getByLabelText(/^nombre/i), '  Pantalla A52  ');
    await user.type(screen.getByLabelText(/precio venta/i), '15000');
    await user.click(submit);

    await waitFor(() => expect(body).toMatchObject({ nombre: 'Pantalla A52', precio: 15000 }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('no acepta un nombre compuesto sólo por espacios', async () => {
    const user = userEvent.setup();
    renderUI(<ArticuloFormModal isOpen onClose={vi.fn()} editing={null} />);

    await user.type(screen.getByLabelText(/^nombre/i), '   ');
    await user.type(screen.getByLabelText(/precio venta/i), '1');
    await user.click(screen.getByRole('button', { name: /crear artículo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/el nombre es requerido/i);
  });
});
