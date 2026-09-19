import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { authStore } from '../store/auth.store';
import { AccountRoute } from './AccountRoute';
import { useAccountProfile } from './accountProfile';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PERFIL_KEY } from '../api/queries/perfil.queries';
import type { Perfil } from '../types';

vi.mock('../components/ThemeToggle', () => ({ ThemeToggle: () => null }));

const token = (email = 'ana@taller.test', expired = false) => {
  const encode = (data: object) => btoa(JSON.stringify(data)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: email, role: 'ROLE_ADMIN', tallerId: 1,
    exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600) })}.firma`;
};
const profile: Perfil = {
  usuario: { id: 1, username: 'Ana', email: 'ana@taller.test', role: 'ADMIN', emailVerificado: true },
  taller: { id: 1, nombre: 'Taller Uno', telefono: null },
};
const Identity = () => {
  const profile = useAccountProfile();
  return <><p>Perfil privado: {profile.usuario.email}</p><p>Acceso: {profile.accesoTaller ?? 'anterior'}</p></>;
};
const mount = (layout = false, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => ({
  client,
  ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/cuenta']}><Routes>
    <Route path="/cuenta" element={<AccountRoute>{layout
      ? <DashboardLayout accountMode title="Cuenta"><Identity /></DashboardLayout> : <Identity />}</AccountRoute>} />
    <Route path="/login" element={<p>LOGIN</p>} />
  </Routes></MemoryRouter></QueryClientProvider>),
});

beforeEach(() => {
  authStore.getState().logout();
  window.history.replaceState({}, '', '/login');
});

describe('acceso independiente a Cuenta', () => {
  it('conserva el estado restringido y limita la navegación sin consultar suscripción', async () => {
    let subscriptions = 0;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...profile, accesoTaller: 'RESTRICTED' })),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return new HttpResponse(null, { status: 423 }); }),
    );
    authStore.getState().login(token(), profile.usuario.email);
    mount(true);
    expect(await screen.findByText('Acceso: RESTRICTED')).toBeVisible();
    expect(screen.getAllByRole('link').every((link) => ['#contenido', '/cuenta'].includes(link.getAttribute('href')!))).toBe(true);
    expect(screen.queryByRole('link', { name: 'Reparaciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    expect(subscriptions).toBe(0);
  });

  it.each(['UNKNOWN', null, 1])('un estado de acceso desconocido %s falla cerrado', async (accesoTaller) => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json({ ...profile, accesoTaller })));
    authStore.getState().login(token(), profile.usuario.email);
    mount();
    expect(await screen.findByText('No pudimos validar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByText(/Perfil privado:/)).not.toBeInTheDocument();
  });
  it.each([false, true])('redirige sin sesión válida (vencida: %s) sin pedir perfil', (expired) => {
    if (expired) authStore.getState().login(token(undefined, true), profile.usuario.email);
    mount();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('exige perfil remoto aun con caché fresca, y el layout no consulta suscripción', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    let subscriptionRequests = 0;
    server.use(
      http.get(`${API}/perfil`, async () => { requests++; await pending; return HttpResponse.json(profile); }),
      http.get(`${API}/suscripcion`, () => { subscriptionRequests++; return new HttpResponse(null, { status: 500 }); }),
    );
    authStore.getState().login(token(), profile.usuario.email);
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(PERFIL_KEY, { ...profile, usuario: { ...profile.usuario, email: 'cache@vieja.test' } });
    mount(true, client);
    expect(screen.getByText('Validando acceso a Cuenta…')).toBeInTheDocument();
    expect(screen.queryByText(/Perfil privado:/)).not.toBeInTheDocument();
    release();
    expect(await screen.findByText('Perfil privado: ana@taller.test')).toBeInTheDocument();
    expect(screen.queryByText(/cache@vieja.test/)).not.toBeInTheDocument();
    expect(requests).toBe(1);
    expect(subscriptionRequests).toBe(0);
  });

  it.each([401, 403])('cierra la sesión ante perfil %s', async (status) => {
    server.use(http.get(`${API}/perfil`, () => new HttpResponse(null, { status })));
    authStore.getState().login(token(), profile.usuario.email);
    mount();
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(false);
    expect(screen.queryByText(/Perfil privado:/)).not.toBeInTheDocument();
  });

  it('un 503 permite reintentar sin perder la sesión ni exponer el perfil', async () => {
    let requests = 0;
    server.use(http.get(`${API}/perfil`, () => ++requests === 1
      ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(profile)));
    authStore.getState().login(token(), profile.usuario.email);
    mount();
    expect(await screen.findByText('No pudimos validar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByText(/Perfil privado:/)).not.toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Perfil privado: ana@taller.test')).toBeInTheDocument();
    expect(requests).toBe(2);
  });

  it('un perfil mal formado falla cerrado y permite cerrar sesión', async () => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json({ usuario: { role: 'SUPERADMIN' } })));
    authStore.getState().login(token(), profile.usuario.email);
    mount();
    expect(await screen.findByText('No pudimos validar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByText(/Perfil privado:/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
  });

  it('descarta el perfil anterior al cambiar la sesión y vuelve a validar', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    server.use(http.get(`${API}/perfil`, async () => {
      if (++requests === 1) return HttpResponse.json(profile);
      await pending;
      return HttpResponse.json({ ...profile, usuario: { ...profile.usuario, id: 2, email: 'bea@taller.test' } });
    }));
    authStore.getState().login(token(), profile.usuario.email);
    mount();
    expect(await screen.findByText('Perfil privado: ana@taller.test')).toBeInTheDocument();
    act(() => authStore.getState().login(token('bea@taller.test'), 'bea@taller.test'));
    expect(screen.queryByText('Perfil privado: ana@taller.test')).not.toBeInTheDocument();
    expect(screen.getByText('Validando acceso a Cuenta…')).toBeInTheDocument();
    release();
    expect(await screen.findByText('Perfil privado: bea@taller.test')).toBeInTheDocument();
    expect(requests).toBe(2);
  });

  it('cancela el perfil pendiente al cambiar identidad e ignora su respuesta tardía', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let firstStarted = false;
    server.use(http.get(`${API}/perfil`, async ({ request }) => {
      if (request.headers.get('authorization') === `Bearer ${token()}`) {
        firstStarted = true;
        await pending;
        return HttpResponse.json(profile);
      }
      return HttpResponse.json({ ...profile, usuario: { ...profile.usuario, id: 2, email: 'bea@taller.test' } });
    }));
    authStore.getState().login(token(), profile.usuario.email);
    const { client } = mount();
    await waitFor(() => expect(firstStarted).toBe(true));
    act(() => authStore.getState().login(token('bea@taller.test'), 'bea@taller.test'));
    expect(await screen.findByText('Perfil privado: bea@taller.test')).toBeInTheDocument();
    await act(async () => { release(); await pending; });
    expect(screen.queryByText('Perfil privado: ana@taller.test')).not.toBeInTheDocument();
    expect(client.getQueryData<Perfil>(PERFIL_KEY)?.usuario.email).toBe('bea@taller.test');
  });
});
