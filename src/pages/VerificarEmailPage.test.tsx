import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERFIL_KEY } from '../api/queries/perfil.queries';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import type { Perfil } from '../types';
import { VerificarEmailPage } from './VerificarEmailPage';

vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(), showError: vi.fn(), showSuccess: vi.fn(),
}));

const profile: Perfil = {
  usuario: { id: 1, username: 'Ana', email: 'ana@taller.test', role: 'ADMIN', emailVerificado: false },
  taller: { id: 1, nombre: 'Taller Ana', telefono: null },
};
const login = () => {
  const payload = btoa(JSON.stringify({ sub: profile.usuario.email, tallerId: 1, role: 'ROLE_ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  authStore.getState().login(`eyJhbGciOiJIUzI1NiJ9.${payload}.firma-test`, profile.usuario.email, false);
};
const renderPage = (url = '/verificar-email?token=token-del-enlace') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[url]}><VerificarEmailPage /></MemoryRouter>
  </QueryClientProvider>) };
};

beforeEach(() => authStore.getState().logout());

describe('VerificarEmailPage', () => {
  it('requiere un click y verifica anónimamente sin consultar un perfil', async () => {
    const bodies: unknown[] = [];
    server.use(http.post(`${API}/auth/verificar-email`, async ({ request }) => {
      expect(request.headers.get('Authorization')).toBeNull();
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 200 });
    }));
    renderPage();
    expect(bodies).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mi email' }));
    expect(await screen.findByRole('heading', { name: /Email verificado/ })).toBeVisible();
    expect(bodies).toEqual([{ token: 'token-del-enlace' }]);
    expect(authStore.getState().isAuthenticated).toBe(false);
  });

  it.each([false, true])('refresca el perfil actual con emailVerificado=%s sin marcar cualquier cuenta como verificada', async (emailVerificado) => {
    login();
    const remoto = { ...profile, usuario: { ...profile.usuario, emailVerificado } };
    server.use(
      http.post(`${API}/auth/verificar-email`, () => new HttpResponse(null, { status: 200 })),
      http.get(`${API}/perfil`, ({ request }) => {
        expect(request.headers.get('Authorization')).toMatch(/^Bearer /);
        return HttpResponse.json(remoto);
      }),
    );
    const { client } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mi email' }));
    await waitFor(() => expect(client.getQueryData(PERFIL_KEY)).toEqual(remoto));
    expect(authStore.getState().emailVerificado).toBe(false);
    if (!emailVerificado) expect(await screen.findByText('La sesión abierta todavía necesita confirmar su propio email.')).toBeVisible();
  });

  it('permite reintentar el perfil sin consumir otra vez el token de verificación', async () => {
    login();
    let posts = 0;
    let gets = 0;
    server.use(
      http.post(`${API}/auth/verificar-email`, () => { posts++; return new HttpResponse(null, { status: 200 }); }),
      http.get(`${API}/perfil`, () => ++gets === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(profile)),
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mi email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no pudimos actualizar la sesión');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar actualización' }));
    expect(await screen.findByText('La sesión abierta todavía necesita confirmar su propio email.')).toBeVisible();
    expect(posts).toBe(1);
    expect(gets).toBe(2);
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('un token vencido ofrece reenvío y un 429 respeta la espera', async () => {
    server.use(
      http.post(`${API}/auth/verificar-email`, () => new HttpResponse(null, { status: 400 })),
      http.post(`${API}/auth/verificar-email/reenviar`, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '5' } })),
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mi email' }));
    expect(await screen.findByRole('heading', { name: 'El link no es válido o venció' })).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: profile.usuario.email } });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar email de verificación' }));
    expect(await screen.findByRole('button', { name: 'Reintentá en 5 s' })).toBeDisabled();
  });

  it('no confunde un límite de verificación con un token vencido', async () => {
    server.use(http.post(`${API}/auth/verificar-email`, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '5' } })));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mi email' }));
    expect(await screen.findByRole('button', { name: 'Reintentá en 5 s' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'El link no es válido o venció' })).not.toBeInTheDocument();
  });
});
