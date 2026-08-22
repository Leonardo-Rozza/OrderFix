import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { server, API } from '../test/server';
import { CobroFormModal } from './CobroFormModal';
import { renderWithProviders } from '../test/renderWithProviders';

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

    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} />);

    const submit = screen.getByRole('button', { name: /registrar cobro/i });
    expect(submit).toHaveAttribute('form', 'cobro-form');
    await user.type(screen.getByLabelText(/^monto/i), '5000');
    await user.type(screen.getByLabelText(/observaciones/i), '  seña inicial  ');
    await user.click(submit);

    await waitFor(() => expect(body).toEqual({ monto: 5000, metodo: 'EFECTIVO', observaciones: 'seña inicial' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('toma saldo y EFECTIVO como baseline y cierra limpio sin confirmar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={5000} />);

    expect(screen.getByLabelText(/^monto/i)).toHaveValue('5.000');
    expect(screen.getByLabelText(/^método/i)).toHaveValue('EFECTIVO');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('conserva monto y dirty cuando cambia el saldo sugerido durante la edición', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const Harness = () => {
      const [saldo, setSaldo] = useState(1000);
      return (
        <>
          <button type="button" onClick={() => setSaldo(2500)}>Actualizar saldo</button>
          <CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={saldo} />
        </>
      );
    };
    renderWithProviders(<Harness />);

    const monto = screen.getByLabelText(/^monto/i);
    expect(monto).toHaveValue('1.000');
    await user.clear(monto);
    await user.type(monto, '750');
    await user.click(screen.getByRole('button', { name: 'Actualizar saldo' }));

    expect(screen.getByText(/saldo pendiente/i)).toHaveTextContent('$ 2.500');
    expect(monto).toHaveValue('750');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(monto).toHaveValue('750');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('inicia un baseline nuevo cuando cambia la reparación activa', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [context, setContext] = useState({ reparacionId: 9, saldo: 1000 });
      return (
        <>
          <button
            type="button"
            onClick={() => setContext({ reparacionId: 10, saldo: 2500 })}
          >
            Cambiar reparación
          </button>
          <CobroFormModal
            isOpen
            onClose={vi.fn()}
            reparacionId={context.reparacionId}
            saldo={context.saldo}
          />
        </>
      );
    };
    renderWithProviders(<Harness />);

    expect(screen.getByLabelText(/^monto/i)).toHaveValue('1.000');
    await user.click(screen.getByRole('button', { name: 'Cambiar reparación' }));

    await waitFor(() => expect(screen.getByLabelText(/^monto/i)).toHaveValue('2.500'));
    expect(screen.getByText(/saldo pendiente/i)).toHaveTextContent('$ 2.500');
  });

  it('mantiene protegido un cobro inválido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} />);

    await user.type(screen.getByLabelText(/^monto/i), '0');
    await user.click(screen.getByRole('button', { name: /registrar cobro/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/mayor a 0/i);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('conserva el monto y la protección si falla el registro', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/reparaciones/10/cobros`, () => (
        HttpResponse.json({ message: 'Error temporal' }, { status: 500 })
      )),
    );
    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={10} />);

    const monto = screen.getByLabelText(/^monto/i);
    await user.type(monto, '500');
    await user.click(screen.getByRole('button', { name: /registrar cobro/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeEnabled());

    expect(monto).toHaveValue('500');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
  });
});
