import { render as renderUi, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '../types';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), layout: vi.fn() }));

vi.mock('../router/accountProfile', () => ({ useAccountProfile: mocks.profile }));
vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children, ...props }: { children: ReactNode; accountMode: boolean; title: string }) => {
    mocks.layout(props);
    return <>{children}</>;
  },
}));
vi.mock('../components/AccountLegalHistory', () => ({
  AccountLegalHistory: () => <section aria-label="Historial legal propio">Historial legal propio</section>,
}));

import { AccountPage } from './AccountPage';

const render = (content: ReactNode) => renderUi(<MemoryRouter>{content}</MemoryRouter>);

const profile: Perfil = {
  usuario: { id: 8, username: 'Ana Técnica', email: 'ana@taller.com', role: 'ADMIN' },
  taller: { id: 2, nombre: 'Taller del Centro', telefono: '+54 11 4567-8900' },
};

describe('AccountPage', () => {
  beforeEach(() => {
    mocks.layout.mockClear();
    mocks.profile.mockReturnValue(profile);
    vi.stubEnv('VITE_PRIVACY_EMAIL', '');
    vi.stubEnv('VITE_LEGAL_EMAIL', '');
    vi.stubEnv('VITE_SUPPORT_EMAIL', '');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('muestra la identidad remota y el rol del titular, con historial propio', () => {
    render(<AccountPage />);

    expect(screen.getByRole('heading', { name: 'Tu cuenta', level: 1 })).toBeVisible();
    expect(screen.getByText('Ana Técnica')).toBeVisible();
    expect(screen.getByText('ana@taller.com')).toBeVisible();
    expect(screen.getByText('Titular del taller')).toBeVisible();
    expect(screen.getByText('Taller del Centro')).toBeVisible();
    expect(screen.getByText('+54 11 4567-8900')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Historial legal propio' })).toBeVisible();
    expect(mocks.layout).toHaveBeenCalledWith({ accountMode: true, title: 'Cuenta' });
    expect(screen.queryByText(/email verificado|email sin verificar|confirmá tu email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exportar datos' })).toHaveAttribute('href', '/cuenta/exportacion');
    expect(screen.queryByRole('button', { name: /cerrar|exportar|enviar/i })).not.toBeInTheDocument();
  });

  it('distingue al empleado y su baja personal sin ofrecer acciones administrativas', () => {
    mocks.profile.mockReturnValue({
      ...profile,
      usuario: { ...profile.usuario, role: 'USER' },
    });
    render(<AccountPage />);

    expect(screen.getByText('Empleado', { exact: true })).toBeVisible();
    expect(screen.getByText(/Podés dar de baja tu propio acceso/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dar de baja mi acceso' })).toHaveAttribute('href', '/cuenta/baja-acceso');
    expect(screen.queryByText('Titular del taller', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /empleados|cerrar|exportar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('no inventa un teléfono cuando el perfil no lo informa', () => {
    mocks.profile.mockReturnValue({ ...profile, taller: { ...profile.taller, telefono: null } });
    render(<AccountPage />);

    expect(screen.getByText('No informado')).toBeVisible();
  });
});
