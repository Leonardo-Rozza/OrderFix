import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepairEmailState } from '../api/repairEmail';

const mocks = vi.hoisted(() => ({ notification: vi.fn(), refresh: vi.fn(), retry: vi.fn() }));
vi.mock('../api/queries/repairEmail.queries', () => ({ useRepairEmailNotification: mocks.notification }));
import { RepairEmailStatusCard } from './RepairEmailStatusCard';

const value = (estado: RepairEmailState = 'NO_EVENTO') => ({
  status: { estado, reintentable: false }, isLoading: false, isRefreshing: false,
  isRetrying: false, isError: false, retryFailed: false, isAvailable: true, canRetry: false,
  refresh: mocks.refresh, retry: mocks.retry,
});
beforeEach(() => { mocks.refresh.mockReset(); mocks.retry.mockReset(); mocks.notification.mockReturnValue(value()); });

describe('repair email status card', () => {
  it.each([
    ['NO_EVENTO', 'Sin aviso registrado'], ['DESHABILITADO', 'Envío desactivado'],
    ['SIN_EMAIL', 'Sin email válido'], ['PENDIENTE', 'Pendiente'], ['EN_CURSO', 'En proceso'],
    ['ACEPTADO', 'Aceptado por el servicio de correo'], ['FALLO_PREVIO', 'No se pudo iniciar el envío'],
    ['INCIERTO', 'Resultado incierto'], ['UNKNOWN', 'Estado no disponible'],
  ] as const)('shows honest %s metadata without offering unauthorized retry', (state, label) => {
    mocks.notification.mockReturnValue(value(state));
    render(<RepairEmailStatusCard repairId={9} />);
    const panel = screen.getByRole('region', { name: 'Notificación por email' });
    expect(within(panel).getByRole('status')).toHaveTextContent(label);
    expect(within(panel).queryByRole('button', { name: 'Reintentar email' })).not.toBeInTheDocument();
    expect(mocks.retry).not.toHaveBeenCalled();
  });
  it('explains provider acceptance is not inbox delivery and uncertain results cannot be resent', () => {
    mocks.notification.mockReturnValue(value('ACEPTADO'));
    const { rerender } = render(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('status')).toHaveTextContent('Esto no confirma que haya llegado a la bandeja del cliente.');
    mocks.notification.mockReturnValue(value('INCIERTO'));
    rerender(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('status')).toHaveTextContent('Para evitar duplicados, no se permite reenviar este aviso.');
  });
  it('exposes loading and fixed inline read errors without raw diagnostics', () => {
    mocks.notification.mockReturnValue({ ...value(), isLoading: true, isRefreshing: true });
    const { rerender } = render(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('status')).toHaveTextContent('Consultando el estado del email');
    expect(screen.getByRole('button', { name: 'Actualizando estado…' })).toBeDisabled();
    mocks.notification.mockReturnValue({ ...value(), isError: true });
    rerender(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('status')).toHaveTextContent('La reparación sigue disponible.');
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.retry).not.toHaveBeenCalled();
  });
  it('disables both actions for a pending retry and keeps the completion controls outside the card', () => {
    mocks.notification.mockReturnValue({ ...value('SIN_EMAIL'), canRetry: true });
    const { rerender } = render(<RepairEmailStatusCard repairId={9} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar email' }));
    expect(mocks.retry).toHaveBeenCalledOnce();
    mocks.notification.mockReturnValue({ ...value('SIN_EMAIL'), isRetrying: true });
    rerender(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('button', { name: 'Solicitando reintento…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeDisabled();
  });
  it('requires refreshing after a failed attempt without claiming success', () => {
    mocks.notification.mockReturnValue({ ...value('SIN_EMAIL'), retryFailed: true });
    render(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo confirmar el reintento.');
    expect(screen.queryByRole('button', { name: 'Reintentar email' })).not.toBeInTheDocument();
  });
  it('does not allow refresh when there is no valid authenticated scope', () => {
    mocks.notification.mockReturnValue({ ...value(), isAvailable: false });
    render(<RepairEmailStatusCard repairId={9} />);
    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeDisabled();
  });
});
