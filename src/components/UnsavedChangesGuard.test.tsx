import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

describe('UnsavedChangesGuard', () => {
  it('no monta blockers para formularios cerrados y protege sólo la sesión activa', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const closedChild = vi.fn(() => <p>No debe montarse</p>);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { router } = renderWithProviders(
      <>
        <UnsavedChangesGuard isOpen={false} isDirty onClose={onClose}>
          {closedChild}
        </UnsavedChangesGuard>
        <UnsavedChangesGuard isOpen={false} isDirty onClose={onClose}>
          {closedChild}
        </UnsavedChangesGuard>
        <UnsavedChangesGuard isOpen isDirty onClose={onClose}>
          {(guard) => (
            <>
              <span data-testid="suspended">{String(guard.isSuspended)}</span>
              <Link to="/destino">Salir</Link>
            </>
          )}
        </UnsavedChangesGuard>
      </>,
      {
        initialEntries: ['/formulario'],
        additionalRoutes: [{ path: '/destino', element: <p>Destino</p> }],
      },
    );

    expect(closedChild).not.toHaveBeenCalled();
    await user.click(screen.getByRole('link', { name: 'Salir' }));
    expect(screen.getByTestId('suspended')).toHaveTextContent('true');
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument();
    expect(warn.mock.calls.flat().join(' ')).not.toContain('A router only supports one blocker at a time');

    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/destino'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
