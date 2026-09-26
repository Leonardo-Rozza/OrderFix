import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
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

import { prepareCharge, chargeAccount, readPendingCharge } from '../utils/pendingCharge';
import { authStore } from '../store/auth.store';
import { showError } from '../utils/toast';

describe('CobroFormModal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    authStore.getState().login(`header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`, 'a@a.com');
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
      operacionId: expect.any(String),
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar el mismo cobro' })).toBeEnabled());

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


describe('recuperación de cobros pendientes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    authStore.getState().login(`header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`, 'a@a.com');
  });

  it.each([402, 403, 404, 409, 429, 500, 0])('conserva payload y UUID después del error incierto %s y de recargar', async (status) => {
    const bodies: Record<string, unknown>[] = [];
    const account = chargeAccount(authStore.getState().token, true)!;
    server.use(http.post(`${API}/reparaciones/9/cobros`, async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      bodies.push(body);
      expect(readPendingCharge(account, 9)?.payload).toEqual(body);
      if (bodies.length > 1) return HttpResponse.json({ id: 7, estado: 'ACTIVO' });
      if (status === 0) return HttpResponse.error();
      return HttpResponse.json({ code: status === 403 ? 'EMAIL_NO_VERIFICADO' : 'COBRO_OPERACION_CONFLICTO' }, { status });
    }));
    const first = renderWithProviders(<CobroFormModal isOpen onClose={vi.fn()} reparacionId={9} saldo={500} />);
    await userEvent.type(screen.getByLabelText(/referencia/i), ' OP-1 ');
    await userEvent.type(screen.getByLabelText(/observaciones/i), ' nota ');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar el mismo cobro' })).toBeEnabled());
    expect(screen.getByLabelText(/^monto/i)).toBeDisabled();
    first.unmount();
    await act(async () => { await authStore.persist.rehydrate(); });
    const onClose = vi.fn();
    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={0} requiereRevision />);
    expect(screen.getByLabelText(/^monto/i)).toHaveValue('500');
    expect(screen.getByLabelText(/referencia/i)).toHaveValue('OP-1');
    expect(bodies).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar el mismo cobro' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(bodies).toEqual([bodies[0], bodies[0]]);
    expect(readPendingCharge(account, 9)).toBeNull();
  });

  it('conserva el intento al cerrar y reabrir sin enviar automáticamente', async () => {
    const account = chargeAccount(authStore.getState().token, true)!;
    const saved = prepareCharge(account, 9, { monto: 500, metodo: 'TARJETA', referencia: 'OP-1' });
    let calls = 0;
    server.use(http.post(`${API}/reparaciones/9/cobros`, () => { calls += 1; return HttpResponse.json({ id: 7 }); }));
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return <><button onClick={() => setOpen(true)}>Abrir</button><CobroFormModal isOpen={open} onClose={() => setOpen(false)} reparacionId={9} saldo={0} /></>;
    };
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByLabelText(/^método/i)).toHaveValue('TARJETA');
    expect(readPendingCharge(account, 9)).toEqual(saved);
    expect(calls).toBe(0);
  });

  it.each(['denied', 'silent-write', 'corrupt'])('no envía nada si el almacenamiento está %s', async (failure) => {
    const account = chargeAccount(authStore.getState().token, true)!;
    if (failure === 'corrupt') {
      prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO' });
      sessionStorage.setItem(sessionStorage.key(0)!, '{broken');
    }
    if (failure === 'denied') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    if (failure === 'silent-write') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    let calls = 0;
    server.use(http.post(`${API}/reparaciones/9/cobros`, () => { calls += 1; return HttpResponse.json({ id: 7 }); }));
    renderWithProviders(<CobroFormModal isOpen onClose={vi.fn()} reparacionId={9} saldo={500} />);
    if (failure !== 'corrupt') await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo recuperar o conservar/);
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
    expect(calls).toBe(0);
  });

  it('corrige solamente COBRO_SUPERA_SALDO con el mismo UUID', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(http.post(`${API}/reparaciones/9/cobros`, async ({ request }) => {
      bodies.push(await request.json() as Record<string, unknown>);
      return bodies.length === 1
        ? HttpResponse.json({ code: 'COBRO_SUPERA_SALDO', details: { pendiente: 300 } }, { status: 409 })
        : HttpResponse.json({ id: 7, estado: 'ACTIVO' });
    }));
    const onClose = vi.fn();
    renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={500} />);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await screen.findByRole('alert');
    await userEvent.clear(screen.getByLabelText(/^monto/i));
    await userEvent.type(screen.getByLabelText(/^monto/i), '300');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(bodies[1]).toEqual({ ...bodies[0], monto: 300 });
  });
});


it('un pago confirmado permite otra operación genuina del mismo importe con otro UUID', async () => {
  sessionStorage.clear();
  authStore.getState().login(`header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`, 'a@a.com');
  const bodies: Record<string, unknown>[] = [];
  server.use(http.post(`${API}/reparaciones/9/cobros`, async ({ request }) => {
    bodies.push(await request.json() as Record<string, unknown>);
    return HttpResponse.json({ id: bodies.length, estado: 'ACTIVO' });
  }));
  const firstClose = vi.fn();
  const first = renderWithProviders(<CobroFormModal isOpen onClose={firstClose} reparacionId={9} saldo={500} />);
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await waitFor(() => expect(firstClose).toHaveBeenCalledOnce());
  first.unmount();
  const secondClose = vi.fn();
  renderWithProviders(<CobroFormModal isOpen onClose={secondClose} reparacionId={9} saldo={500} />);
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await waitFor(() => expect(secondClose).toHaveBeenCalledOnce());
  expect(bodies[0].monto).toBe(bodies[1].monto);
  expect(bodies[0].operacionId).not.toBe(bodies[1].operacionId);
});

it('una confirmación tardía no cierra ni limpia el intento de una nueva sesión de la misma cuenta', async () => {
  sessionStorage.clear();
  const token = `header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`;
  authStore.getState().login(token, 'a@a.com');
  const account = chargeAccount(token, true)!;
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const sent = new Promise<void>((resolve) => { started = resolve; });
  server.use(http.post(`${API}/reparaciones/9/cobros`, async () => {
    started(); await held; return HttpResponse.json({ id: 7, estado: 'ACTIVO' });
  }));
  const onClose = vi.fn();
  renderWithProviders(<CobroFormModal isOpen onClose={onClose} reparacionId={9} saldo={500} />);
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await sent;
  let next!: ReturnType<typeof prepareCharge>;
  act(() => {
    authStore.getState().logout();
    authStore.getState().login(token, 'a@a.com');
    next = prepareCharge(account, 9, { monto: 300, metodo: 'TRANSFERENCIA' });
  });
  await act(async () => { release(); await held; });
  await waitFor(() => expect(screen.getByLabelText(/^monto/i)).toHaveValue('300'));
  expect(onClose).not.toHaveBeenCalled();
  expect(readPendingCharge(account, 9)).toEqual(next);
});
