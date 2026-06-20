import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LimitePlanModal } from './LimitePlanModal';
import { LIMITE_PLAN_EVENT } from '../api/axios';

const renderModal = () =>
  render(
    <MemoryRouter initialEntries={['/reparaciones']}>
      <Routes>
        <Route path="/reparaciones" element={<LimitePlanModal />} />
        <Route path="/planes" element={<div>PANTALLA PLANES</div>} />
      </Routes>
    </MemoryRouter>
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
    expect(screen.getByText(/límite de tu plan/i)).toBeInTheDocument();
    expect(screen.getByText(/50 reparaciones/i)).toBeInTheDocument();
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
