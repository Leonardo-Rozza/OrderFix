import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DiscardChangesDialog } from '../components/DiscardChangesDialog';
import { releaseUnsavedChangesGuards } from '../lib/unsavedChangesLifecycle';
import { renderWithProviders } from '../test/renderWithProviders';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

interface GuardHarnessProps {
  initialDirty?: boolean;
  initialBusy?: boolean;
  onClose: () => void;
  onNavigationDiscard?: () => void;
}

const GuardHarness = ({
  initialDirty = false,
  initialBusy = false,
  onClose,
  onNavigationDiscard,
}: GuardHarnessProps) => {
  const [value, setValue] = useState(initialDirty ? 'Cambio local' : '');
  const [isBusy, setIsBusy] = useState(initialBusy);
  const location = useLocation();
  const navigate = useNavigate();
  const guard = useUnsavedChangesGuard({
    isOpen: true,
    isDirty: value !== '',
    isBusy,
    onClose,
    onNavigationDiscard,
  });

  return (
    <>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="suspended">{String(guard.isSuspended)}</span>
      <label>
        Detalle
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button type="button" onClick={guard.requestClose}>Cerrar formulario</button>
      <button type="button" onClick={() => setValue('')}>Restablecer</button>
      <button type="button" onClick={() => setIsBusy(false)}>Finalizar operación</button>
      <button
        type="button"
        onClick={() => {
          guard.commitAndClose();
          void navigate('/destino');
        }}
      >
        Guardar y navegar
      </button>
      <Link to="/destino">Ir a destino</Link>
      <DiscardChangesDialog {...guard.dialog} />
    </>
  );
};

const renderGuard = (props: GuardHarnessProps, options = {}) => renderWithProviders(
  <GuardHarness {...props} />,
  {
    initialEntries: ['/formulario'],
    additionalRoutes: [{ path: '/destino', element: <p>Página destino</p> }],
    ...options,
  },
);

describe('useUnsavedChangesGuard', () => {
  it('cierra inmediatamente cuando el formulario está limpio', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderGuard({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma un cierre local, conserva al continuar y descarta una sola vez', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderGuard({ initialDirty: true, onClose });

    const close = screen.getByRole('button', { name: 'Cerrar formulario' });
    await user.click(close);
    expect(screen.getByTestId('suspended')).toHaveTextContent('true');
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));

    expect(screen.getByLabelText('Detalle')).toHaveValue('Cambio local');
    await waitFor(() => expect(close).toHaveFocus());
    expect(onClose).not.toHaveBeenCalled();

    await user.click(close);
    const discard = screen.getByRole('button', { name: 'Descartar cambios' });
    act(() => {
      discard.click();
      discard.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserva el destino de una navegación y sólo continúa al descartar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard({ initialDirty: true, onClose });

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    expect(router.state.location.pathname).toBe('/formulario');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(router.state.location.pathname).toBe('/formulario');

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/destino'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('usa un cleanup dedicado al descartar una navegación', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNavigationDiscard = vi.fn();
    const { router } = renderGuard({ initialDirty: true, onClose, onNavigationDiscard });

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/destino'));
    expect(onNavigationDiscard).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('conserva la primera intención local aunque después llegue un Back', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderWithProviders(
      <GuardHarness initialDirty onClose={onClose} />,
      {
        initialEntries: ['/anterior', '/formulario'],
        initialIndex: 1,
        additionalRoutes: [
          { path: '/anterior', element: <p>Página anterior</p> },
          { path: '/destino', element: <p>Página destino</p> },
        ],
      },
    );

    await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
    await act(async () => { await router.navigate(-1); });

    expect(router.state.location.pathname).toBe('/formulario');
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/formulario');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('conserva el primer PUSH aunque una navegación posterior reemplace el blocker', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard(
      { initialDirty: true, onClose },
      {
        additionalRoutes: [
          { path: '/destino', element: <p>Primer destino</p> },
          { path: '/alternativo', element: <p>Destino alternativo</p> },
        ],
      },
    );

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    await act(async () => { await router.navigate('/alternativo'); });
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/destino'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('conserva el primer POP aunque después llegue un PUSH', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderWithProviders(
      <GuardHarness initialDirty onClose={onClose} />,
      {
        initialEntries: ['/anterior', '/formulario'],
        initialIndex: 1,
        additionalRoutes: [
          { path: '/anterior', element: <p>Página anterior</p> },
          { path: '/destino', element: <p>Página destino</p> },
        ],
      },
    );

    await act(async () => { await router.navigate(-1); });
    await act(async () => { await router.navigate('/destino'); });
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/anterior'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('protege una navegación POP del historial', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderWithProviders(
      <GuardHarness initialDirty onClose={onClose} />,
      {
        initialEntries: ['/anterior', '/formulario'],
        initialIndex: 1,
        additionalRoutes: [
          { path: '/anterior', element: <p>Página anterior</p> },
          { path: '/destino', element: <p>Página destino</p> },
        ],
      },
    );

    await act(async () => { await router.navigate(-1); });
    expect(router.state.location.pathname).toBe('/formulario');
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(router.state.location.pathname).toBe('/formulario');

    await act(async () => { await router.navigate(-1); });
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/anterior'));
  });

  it('no permite descartar busy ni deja la navegación encolada al continuar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard({ initialBusy: true, onClose });

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    await user.click(screen.getByRole('button', { name: 'Finalizar operación' }));

    expect(router.state.location.pathname).toBe('/formulario');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('libera sincrónicamente antes de cerrar y navegar por un éxito', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard({ initialDirty: true, initialBusy: true, onClose });

    await user.click(screen.getByRole('button', { name: 'Guardar y navegar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/destino'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancela un bloqueo si los datos vuelven legítimamente al baseline', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard({ initialDirty: true, onClose });

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/formulario');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('previene beforeunload sólo mientras hay cambios y limpia al desmontar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = renderGuard({ onClose });

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await user.type(screen.getByLabelText('Detalle'), 'Pendiente');
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    unmount();
    const unmountedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unmountedEvent);
    expect(unmountedEvent.defaultPrevented).toBe(false);
  });

  it('un release global libera blocker y beforeunload sin esperar un render de sesión', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { router } = renderGuard({ initialDirty: true, onClose });

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole('link', { name: 'Ir a destino' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => releaseUnsavedChangesGuards());

    const releasedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(releasedEvent);
    expect(releasedEvent.defaultPrevented).toBe(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => { await router.navigate('/destino'); });
    expect(router.state.location.pathname).toBe('/destino');
    expect(onClose).not.toHaveBeenCalled();
  });
});
