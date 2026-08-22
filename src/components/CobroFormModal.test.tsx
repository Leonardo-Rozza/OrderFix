import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { CobroFormModal } from './CobroFormModal';

const renderUI = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('CobroFormModal', () => {
  it('registra el cobro desde las acciones compartidas y normaliza observaciones', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/reparaciones/9/cobros`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 2, reparacionId: 9, ...body }, { status: 201 });
      }),
    );

    renderUI(<CobroFormModal isOpen onClose={onClose} reparacionId={9} />);

    const submit = screen.getByRole('button', { name: /registrar cobro/i });
    expect(submit).toHaveAttribute('form', 'cobro-form');
    await user.type(screen.getByLabelText(/^monto/i), '5000');
    await user.type(screen.getByLabelText(/observaciones/i), '  seña inicial  ');
    await user.click(submit);

    await waitFor(() => expect(body).toEqual({ monto: 5000, metodo: 'EFECTIVO', observaciones: 'seña inicial' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
