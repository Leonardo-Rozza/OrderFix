import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { server, API } from '../test/server';
import { CobroFormModal } from './CobroFormModal';
import { renderWithProviders } from '../test/renderWithProviders';

vi.mock('../utils/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import { showError } from '../utils/toast';

describe('CobroFormModal', () => {
  beforeEach(() => {
    vi.mocked(showError).mockClear();
  });

  it('registra el cobro y normaliza referencia y observaciones por separado', async () => {
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
    await user.type(screen.getByLabelText(/referencia/i), '  OP-123  ');
    await user.type(screen.getByLabelText(/observaciones/i), '  seña inicial  ');
    await user.click(submit);

    await waitFor(() => expect(body).toEqual({
      monto: 5000,
      metodo: 'EFECTIVO',
      referencia: 'OP-123',
      observaciones: 'seña inicial',
    }));
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

  it('conserva monto y dirty cuando baja el pendiente, y valida contra el valor vigente', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const Harness = () => {
      const [saldo, setSaldo] = useState(2500);
      return (
        <>
          <button type="button" onClick={() => setSaldo(1000)}>Actualizar pendiente</button>
          <CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={saldo} />
        </>
      );
    };
    renderWithProviders(<Harness />);

    const monto = screen.getByLabelText(/^monto/i);
    expect(monto).toHaveValue('2.500');
    await user.clear(monto);
    await user.type(monto, '1500');
    await user.click(screen.getByRole('button', { name: 'Actualizar pendiente' }));

    expect(screen.getByText(/pendiente de cobro/i)).toHaveTextContent('$ 1.000');
    expect(monto).toHaveValue('1.500');
    await user.click(screen.getByRole('button', { name: /registrar cobro/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede superar.*\$ 1\.000/i);
    expect(monto).toHaveValue('1.500');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(monto).toHaveValue('1.500');
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
    expect(screen.getByText(/pendiente de cobro/i)).toHaveTextContent('$ 2.500');
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

  it('muestra COBRO_SUPERA_SALDO junto al monto sin toast ni pérdida de valores', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/reparaciones/11/cobros`, () => HttpResponse.json({
        status: 409,
        code: 'COBRO_SUPERA_SALDO',
        message: 'El monto supera el pendiente de cobro.',
        details: { reparacionId: 11, total: 5000, cobrado: 2000, monto: 4000, pendiente: 3000 },
      }, { status: 409 })),
    );
    renderWithProviders(
      <CobroFormModal isOpen onClose={onClose} reparacionId={11} saldo={5000} />,
    );

    const monto = screen.getByLabelText(/^monto/i);
    await user.clear(monto);
    await user.type(monto, '4000');
    await user.type(screen.getByLabelText(/referencia/i), 'OP-409');
    await user.type(screen.getByLabelText(/observaciones/i), 'seña mostrador');
    await user.click(screen.getByRole('button', { name: /registrar cobro/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/pendiente actualizado.*\$ 3\.000/i);
    expect(monto).toHaveValue('4.000');
    expect(monto).toHaveFocus();
    expect(screen.getByLabelText(/referencia/i)).toHaveValue('OP-409');
    expect(screen.getByLabelText(/observaciones/i)).toHaveValue('seña mostrador');
    expect(onClose).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
  });

  it('bloquea el registro cuando no hay pendiente', () => {
    renderWithProviders(<CobroFormModal isOpen onClose={vi.fn()} reparacionId={12} saldo={0} />);

    expect(screen.getByText('No hay pendiente de cobro para esta orden.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
    expect(screen.getByLabelText(/^monto/i)).toBeDisabled();
  });

  it('prioriza y bloquea una revisión de excedente aunque exista pendiente', () => {
    renderWithProviders(
      <CobroFormModal
        isOpen
        onClose={vi.fn()}
        reparacionId={13}
        saldo={2000}
        excedente={800}
        requiereRevision
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/excedente a revisar.*\$ 800/i);
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
  });
});
