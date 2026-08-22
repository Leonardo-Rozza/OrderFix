import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LimitePlanModal } from './LimitePlanModal';
import { LIMITE_PLAN_EVENT } from '../api/axios';
import { Modal } from './Modal';

const renderModal = (withBaseForm = false) =>
  render(
    <MemoryRouter initialEntries={['/reparaciones']}>
      <Routes>
        <Route
          path="/reparaciones"
          element={(
            <>
              {withBaseForm ? (
                <Modal isOpen onClose={() => undefined} title="Editar reparación">
                  <input aria-label="Detalle de la reparación" />
                </Modal>
              ) : null}
              <LimitePlanModal />
            </>
          )}
        />
        <Route path="/planes" element={<div>PANTALLA PLANES</div>} />
      </Routes>
    </MemoryRouter>,
  );

const dispararLimite = (message?: string) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(LIMITE_PLAN_EVENT, { detail: { message } }));
  });

describe('LimitePlanModal', () => {
  it('no muestra nada hasta que llega el evento de límite', () => {
    renderModal();
    expect(screen.queryByText(/límite de tu plan/i)).not.toBeInTheDocument();
  });

  it('aparece con el mensaje del backend al recibir el evento 402', () => {
    renderModal();
    dispararLimite('Alcanzaste el límite de 50 reparaciones.');
    expect(screen.getByRole('dialog', { name: /límite de tu plan/i })).toBeInTheDocument();
    expect(screen.getByText(/50 reparaciones/i)).toBeInTheDocument();
  });

  it('queda como único diálogo, atrapa el foco y reactiva el formulario al cerrar', async () => {
    const { container } = renderModal(true);
    const baseField = screen.getByLabelText('Detalle de la reparación');
    await waitFor(() => expect(baseField).toHaveFocus());

    dispararLimite('Alcanzaste el límite de 50 reparaciones.');

    const planDialog = await screen.findByRole('dialog', { name: /límite de tu plan/i });
    const safeAction = screen.getByRole('button', { name: 'Ahora no' });
    const baseLayer = document.querySelector('[data-modal-layer="base"]');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(planDialog).toHaveAttribute('aria-modal', 'true');
    expect(planDialog).toHaveAccessibleDescription(/50 reparaciones/i);
    expect(planDialog.closest('[data-modal-layer]')).toHaveAttribute('data-modal-layer', 'global');
    expect(baseLayer).toHaveAttribute('aria-hidden', 'true');
    expect(baseLayer).toHaveAttribute('inert');
    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveAttribute('inert');
    await waitFor(() => expect(safeAction).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Editar reparación' })).toBeVisible());
    await waitFor(() => expect(baseField).toHaveFocus());
    expect(container).not.toHaveAttribute('aria-hidden');
    expect(container).not.toHaveAttribute('inert');

    dispararLimite();
    const reopenedDialog = await screen.findByRole('dialog', { name: /límite de tu plan/i });
    const backdrop = reopenedDialog.parentElement?.firstElementChild;
    fireEvent.click(backdrop as Element);

    await waitFor(() => expect(reopenedDialog).not.toBeInTheDocument());
    await waitFor(() => expect(baseField).toHaveFocus());
  });

  it('navega a /planes al tocar "Ver planes PRO"', async () => {
    const user = userEvent.setup();
    renderModal();
    dispararLimite();
    await user.click(screen.getByRole('button', { name: /ver planes pro/i }));
    expect(screen.getByText('PANTALLA PLANES')).toBeInTheDocument();
  });

  it('se cierra con "Ahora no"', async () => {
    const user = userEvent.setup();
    renderModal();
    dispararLimite();
    await user.click(screen.getByRole('button', { name: /ahora no/i }));
    expect(screen.queryByText(/límite de tu plan/i)).not.toBeInTheDocument();
  });
});
