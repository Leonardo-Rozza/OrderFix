import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import type { Articulo } from '../types';
import { AjusteStockModal } from './AjusteStockModal';

const articulo: Articulo = {
  id: 12,
  nombre: 'Pantalla A52',
  descripcion: null,
  sku: null,
  precio: 15000,
  costo: null,
  stock: 5,
  stockMinimo: 1,
  activo: true,
  stockBajo: false,
};

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('AjusteStockModal', () => {
  it('exige una cantidad entera positiva y no permite una salida que deje stock negativo', async () => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(
      http.post(`${API}/inventario/${articulo.id}/ajuste`, () => {
        requests += 1;
        return HttpResponse.json(articulo);
      }),
    );

    renderUI(<AjusteStockModal articulo={articulo} onClose={vi.fn()} />);

    const cantidad = screen.getByLabelText(/cantidad/i);
    await user.type(cantidad, '1.5');
    expect(screen.getByRole('alert')).toHaveTextContent(/número entero mayor a 0/i);
    expect(cantidad).toHaveAttribute('aria-invalid', 'true');

    await user.clear(cantidad);
    await user.click(screen.getByRole('button', { name: /salida/i }));
    await user.type(cantidad, '6');
    expect(screen.getByRole('alert')).toHaveTextContent(/no puede superar el stock actual \(5\)/i);

    await user.click(screen.getByRole('button', { name: /aplicar ajuste/i }));
    expect(requests).toBe(0);
  });

  it('envía el formulario con Enter y recorta el motivo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/inventario/${articulo.id}/ajuste`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...articulo, stock: 8 });
      }),
    );

    renderUI(<AjusteStockModal articulo={articulo} onClose={onClose} />);

    expect(screen.getByRole('button', { name: /aplicar ajuste/i })).toHaveAttribute('form', 'ajuste-stock-form');
    await user.type(screen.getByLabelText(/motivo/i), '  compra mayorista  ');
    await user.type(screen.getByLabelText(/cantidad/i), '3{Enter}');

    await waitFor(() => expect(body).toEqual({ delta: 3, motivo: 'compra mayorista' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
