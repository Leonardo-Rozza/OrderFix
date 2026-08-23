import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cobro } from '../types';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';

vi.mock('../utils/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import { showError } from '../utils/toast';
import { CobroAnulacionModal } from './CobroAnulacionModal';

const cobro: Cobro = {
  id: 4,
  reparacionId: 9,
  monto: 15000,
  metodo: 'TRANSFERENCIA',
  referencia: 'OP-123',
  observaciones: 'Seña',
  fecha: '2026-08-20T10:00:00',
  estado: 'ACTIVO',
  anuladoAt: null,
  anuladoPorNombre: null,
  motivoAnulacion: null,
};

describe('CobroAnulacionModal', () => {
  beforeEach(() => {
    vi.mocked(showError).mockClear();
  });

  it('envía el motivo normalizado al endpoint canónico y conserva el movimiento', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: unknown;
    server.use(
      http.post(`${API}/reparaciones/9/cobros/4/anulacion`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...cobro,
          estado: 'ANULADO',
          anuladoAt: '2026-08-23T12:00:00',
          anuladoPorNombre: 'Juan Pérez',
          motivoAnulacion: 'Carga duplicada',
        });
      }),
    );

    renderWithProviders(
      <CobroAnulacionModal isOpen onClose={onClose} reparacionId={9} cobro={cobro} />,
    );

    const motivo = screen.getByLabelText(/motivo de anulación/i);
    expect(screen.getByText(/Transferencia/)).toHaveTextContent(/15\.000/);
    expect(motivo).toHaveFocus();
    expect(motivo).toHaveAttribute('maxlength', '255');
    await user.type(motivo, '  Carga duplicada  ');
    screen.getByRole('button', { name: 'Anular cobro' }).focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(body).toEqual({ motivo: 'Carga duplicada' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('exige un motivo y protege el borrador antes de cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <CobroAnulacionModal isOpen onClose={onClose} reparacionId={9} cobro={cobro} />,
    );

    await user.type(screen.getByLabelText(/motivo de anulación/i), '   ');
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El motivo es requerido');
    expect(screen.getByLabelText(/motivo de anulación/i)).toHaveFocus();

    fireEvent.change(screen.getByLabelText(/motivo de anulación/i), {
      target: { value: 'x'.repeat(256) },
    });
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Máximo 255 caracteres');

    await user.clear(screen.getByLabelText(/motivo de anulación/i));
    await user.type(screen.getByLabelText(/motivo de anulación/i), 'Carga incorrecta');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText(/motivo de anulación/i)).toHaveValue('Carga incorrecta');
  });

  it('resuelve COBRO_YA_ANULADO inline, sin toast ni pérdida del motivo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/reparaciones/9/cobros/4/anulacion`, () => HttpResponse.json({
        status: 409,
        code: 'COBRO_YA_ANULADO',
        message: 'El cobro ya fue anulado.',
      }, { status: 409 })),
    );
    renderWithProviders(
      <CobroAnulacionModal isOpen onClose={onClose} reparacionId={9} cobro={cobro} />,
    );

    const motivo = screen.getByLabelText(/motivo de anulación/i);
    await user.type(motivo, 'Duplicado en otra pestaña');
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }));

    const conflicto = await screen.findByRole('alert');
    expect(conflicto).toHaveTextContent(/ya fue anulado.*historial/i);
    expect(conflicto).toHaveFocus();
    expect(motivo).toHaveValue('Duplicado en otra pestaña');
    expect(motivo).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anular cobro' })).toBeDisabled();
    expect(showError).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Listo' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('conserva motivo y guard si falla por un error general', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/reparaciones/9/cobros/4/anulacion`, () => (
        HttpResponse.json({ message: 'Error temporal' }, { status: 500 })
      )),
    );
    renderWithProviders(
      <CobroAnulacionModal isOpen onClose={vi.fn()} reparacionId={9} cobro={cobro} />,
    );

    const motivo = screen.getByLabelText(/motivo de anulación/i);
    await user.type(motivo, 'Carga duplicada');
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anular cobro' })).toBeEnabled());

    expect(motivo).toHaveValue('Carga duplicada');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
  });

  it('bloquea cierre y doble submit mientras la anulación está pendiente', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let requests = 0;
    let releaseResponse: () => void = () => undefined;
    const pendingResponse = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.post(`${API}/reparaciones/9/cobros/4/anulacion`, async () => {
        requests += 1;
        await pendingResponse;
        return HttpResponse.json({
          ...cobro,
          estado: 'ANULADO',
          anuladoAt: '2026-08-23T12:00:00',
          anuladoPorNombre: 'Juan Pérez',
          motivoAnulacion: 'Carga duplicada',
        });
      }),
    );
    renderWithProviders(
      <CobroAnulacionModal isOpen onClose={onClose} reparacionId={9} cobro={cobro} />,
    );

    await user.type(screen.getByLabelText(/motivo de anulación/i), 'Carga duplicada');
    const submit = screen.getByRole('button', { name: 'Anular cobro' });
    await user.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    await user.click(submit);
    expect(requests).toBe(1);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    releaseResponse();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
