import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { PresupuestoFormModal } from './PresupuestoFormModal';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

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

    renderUI(<PresupuestoFormModal isOpen onClose={onClose} reparacionId={7} />);

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
  });

  it('rechaza detalles compuestos sólo por espacios', async () => {
    const user = userEvent.setup();
    renderUI(<PresupuestoFormModal isOpen onClose={vi.fn()} reparacionId={8} />);

    await user.type(screen.getByLabelText(/^detalle$/i), '   ');
    await user.type(screen.getByLabelText(/precio unitario/i), '100');
    await user.click(screen.getByRole('button', { name: /crear presupuesto/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/escribí el detalle del ítem/i);
  });
});
