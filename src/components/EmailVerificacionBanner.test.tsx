import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountProfileContext, AccountSessionStatusContext, type AccountSessionStatus } from '../router/accountProfile';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import type { Perfil } from '../types';
import { EmailVerificacionBanner } from './EmailVerificacionBanner';

vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(), showError: vi.fn(), showSuccess: vi.fn(),
}));

const profile: Perfil = {
  usuario: { id: 1, username: 'Ana', email: 'ana@taller.test', role: 'ADMIN', emailVerificado: false },
  taller: { id: 1, nombre: 'Taller Ana', telefono: null },
};
const renderBanner = (perfil: Perfil | null = profile, status: AccountSessionStatus | null = {
  isFetching: false, error: null, refetch: vi.fn().mockResolvedValue(undefined),
}) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    <AccountProfileContext value={perfil}>
      <AccountSessionStatusContext value={status}><EmailVerificacionBanner /></AccountSessionStatusContext>
    </AccountProfileContext>
  </QueryClientProvider>,
);

beforeEach(() => authStore.getState().logout());

describe('EmailVerificacionBanner', () => {
  it('usa el email y estado remoto aunque el valor persistido diga verificado', () => {
    authStore.getState().login('sesion-prueba', 'otra@cuenta.test', true);
    renderBanner();
    expect(screen.getByText('Confirmá tu email: ana@taller.test')).toBeVisible();
    expect(screen.queryByText(/otra@cuenta.test/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya lo confirmé' })).toBeEnabled();
  });

  it('no usa el boolean persistido cuando falta contexto remoto o está verificado', () => {
    authStore.getState().login('sesion-prueba', profile.usuario.email, false);
    const first = renderBanner(null, null);
    expect(screen.queryByRole('button', { name: 'Ya lo confirmé' })).not.toBeInTheDocument();
    first.unmount();
    renderBanner({ ...profile, usuario: { ...profile.usuario, emailVerificado: true } });
    expect(screen.queryByRole('button', { name: 'Ya lo confirmé' })).not.toBeInTheDocument();
  });

  it('comprueba la misma sesión remota, evita duplicados y explica si sigue pendiente', async () => {
    let release!: () => void;
    const refetch = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    renderBanner(profile, { isFetching: false, error: null, refetch });
    fireEvent.click(screen.getByRole('button', { name: 'Ya lo confirmé' }));
    expect(screen.getByRole('button', { name: 'Comprobando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeDisabled();
    expect(refetch).toHaveBeenCalledOnce();
    release();
    expect(await screen.findByRole('status')).toHaveTextContent('La verificación sigue pendiente');
  });

  it('conserva la posibilidad de reintentar si falla la comprobación', async () => {
    renderBanner(profile, { isFetching: false, error: null, refetch: vi.fn().mockRejectedValue(new Error('offline')) });
    fireEvent.click(screen.getByRole('button', { name: 'Ya lo confirmé' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar la verificación');
    expect(screen.getByRole('button', { name: 'Ya lo confirmé' })).toBeEnabled();
  });

  it('reenvía al email remoto y respeta Retry-After sin repetir solicitudes', async () => {
    const bodies: unknown[] = [];
    server.use(http.post(`${API}/auth/verificar-email/reenviar`, async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '5' } });
    }));
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }));
    expect(await screen.findByRole('button', { name: 'Reintentá en 5 s' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentá en 5 s' }));
    await waitFor(() => expect(bodies).toEqual([{ email: profile.usuario.email }]));
  });
});
