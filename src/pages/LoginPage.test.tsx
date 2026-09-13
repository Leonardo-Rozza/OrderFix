import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { LoginPage } from './LoginPage';
import { AccountRoute } from '../router/AccountRoute';
import { useAccountProfile } from '../router/accountProfile';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';

vi.mock('../components/AuthAside', () => ({ AuthAside: () => null }));
vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(), showSuccess: vi.fn(), showError: vi.fn(),
}));

const profile = {
  accesoTaller: 'RESTRICTED',
  usuario: { id: 1, username: 'Titular', email: 'titular@taller.invalid', role: 'ADMIN' },
  taller: { id: 1, nombre: 'Taller de prueba', telefono: null },
};
const FreshClosure = () => <h1>Estado observado: {useAccountProfile().accesoTaller}</h1>;
const mount = (state: unknown) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <LoginPage /> },
    { path: '/dashboard', element: <h1>Inicio del taller</h1> },
    { path: '/cuenta/cierre', element: <AccountRoute><FreshClosure /></AccountRoute> },
  ], { initialEntries: [{ pathname: '/login', state }] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
};
beforeEach(() => {
  authStore.getState().logout();
  window.history.replaceState({}, '', '/login');
  server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({
    token: `header.${btoa(JSON.stringify({ role: 'ROLE_ADMIN', tallerId: 1, exp: 4_000_000_000 }))}.signature`,
    email: profile.usuario.email, emailVerificado: true, type: 'Bearer',
  })));
});

describe('Login después de cerrar o restaurar el taller', () => {
  it.each([
    ['CLOSED', 'El cierre fue confirmado.'],
    ['RESTORED', 'La restauración fue confirmada.'],
    ['UNKNOWN', 'No pudimos confirmar el resultado de la operación.'],
  ])('muestra %s una sola vez y vuelve a consultar el estado remoto tras login', async (outcome, message) => {
    let profiles = 0;
    server.use(http.get(`${API}/perfil`, () => { profiles++; return HttpResponse.json(profile); }));
    const router = mount({ workshopClosureNotice: outcome, from: { pathname: '/cuenta/cierre' } });
    expect(screen.getByText(message, { exact: false })).toBeVisible();
    await waitFor(() => expect(router.state.location.state).toEqual({ from: { pathname: '/cuenta/cierre' } }));
    if (outcome === 'UNKNOWN') expect(screen.queryByText(/fue confirmado|fue confirmada/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email', { exact: true }), profile.usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña', { exact: true }), 'clave-sintetica');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: 'Estado observado: RESTRICTED' })).toBeVisible();
    expect(profiles).toBe(1);
    expect(router.state.location.search).toBe('');
    expect(router.state.location.state).toBeNull();
    expect(JSON.stringify(sessionStorage)).not.toContain(outcome);
    await act(async () => { await router.navigate('/login'); });
    expect(screen.queryByText(message, { exact: false })).not.toBeInTheDocument();
  });

  it('no acepta un destino externo ni un aviso desconocido desde navigation state', async () => {
    mount({ workshopClosureNotice: 'APPROVED', from: { pathname: 'https://otro.invalid' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email', { exact: true }), profile.usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña', { exact: true }), 'clave-sintetica');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: 'Inicio del taller' })).toBeVisible();
  });

  it('conserva el aviso existente de baja personal', () => {
    mount({ accessDeactivated: true });
    expect(screen.getByText(/Tu acceso fue desactivado/)).toBeVisible();
  });
});
