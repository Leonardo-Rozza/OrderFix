import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, PublicRoute } from './guards';
import { authStore } from '../store/auth.store';
import { server, API } from '../test/server';

// JWT de mentira con el exp dado (segundos).
const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (expSec: number) => `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'a@a.com', exp: expSec })}.firma`;
const tokenVigente = () => makeToken(Math.floor(Date.now() / 1000) + 3600);
const tokenVencido = () => makeToken(Math.floor(Date.now() / 1000) - 60);

const suscripcion = {
  plan: 'FREE',
  estado: 'ACTIVA',
  fechaInicio: '2026-08-01',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 2,
  limiteReparacionesMes: 20,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
};

const perfil = {
  usuario: { id: 1, username: 'Ada Lovelace', email: 'a@a.com', role: 'ADMIN' },
  taller: { id: 1, nombre: 'Taller A', telefono: null },
};

const renderProtegida = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/priv']}>
          <Routes>
            <Route path="/priv" element={<ProtectedRoute><div>PRIVADO</div></ProtectedRoute>} />
            <Route path="/login" element={<div>LOGIN</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
};

beforeEach(() => {
  authStore.getState().logout();
  window.history.pushState({}, '', '/login');
  server.use(http.get(`${API}/perfil`, () => HttpResponse.json(perfil)));
});

describe('ProtectedRoute', () => {
  it('redirige a /login sin sesión', () => {
    renderProtegida();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('valida la sesión base antes de dejar pasar un token vigente', async () => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)));
    authStore.getState().login(tokenVigente(), 'a@a.com');
    renderProtegida();
    expect(screen.getByText('Validando sesión…')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(await screen.findByText('PRIVADO')).toBeInTheDocument();
  });

  it('redirige a /login con token vencido', () => {
    authStore.getState().login(tokenVencido(), 'a@a.com');
    renderProtegida();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('mantiene el contenido privado oculto mientras la validación está pendiente', async () => {
    let responder: (() => void) | undefined;
    const pendiente = new Promise<void>((resolve) => {
      responder = resolve;
    });
    server.use(
      http.get(`${API}/suscripcion`, async () => {
        await pendiente;
        return HttpResponse.json(suscripcion);
      })
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    expect(screen.getByText('Validando sesión…')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    responder?.();
    expect(await screen.findByText('PRIVADO')).toBeInTheDocument();
  });

  it('cierra la sesión si la validación base responde 403', async () => {
    server.use(http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 403 })));
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(false);
  });

  it('conserva la sesión ante un 500 y permite reintentar', async () => {
    let intentos = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => {
        intentos += 1;
        return intentos === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(suscripcion);
      })
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');
    const user = userEvent.setup();

    renderProtegida();

    expect(await screen.findByText('No pudimos validar tu sesión')).toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByText('PRIVADO')).toBeInTheDocument());
    expect(intentos).toBe(2);
  });

  it('inicia perfil y suscripción en paralelo sin bloquear por el perfil', async () => {
    let perfilSolicitado = false;
    let responderPerfil: (() => void) | undefined;
    const perfilPendiente = new Promise<void>((resolve) => {
      responderPerfil = resolve;
    });
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)),
      http.get(`${API}/perfil`, async () => {
        perfilSolicitado = true;
        await perfilPendiente;
        return HttpResponse.json(perfil);
      }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    await waitFor(() => expect(perfilSolicitado).toBe(true));
    expect(await screen.findByText('PRIVADO')).toBeInTheDocument();
    responderPerfil?.();
  });

  it('mantiene visible la aplicación si el perfil falla de forma recuperable', async () => {
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)),
      http.get(`${API}/perfil`, () => new HttpResponse(null, { status: 500 })),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    expect(await screen.findByText('PRIVADO')).toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('cierra la sesión ante 403 de perfil sin una segunda validación base', async () => {
    let validacionesSuscripcion = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => {
        validacionesSuscripcion += 1;
        return HttpResponse.json(suscripcion);
      }),
      http.get(`${API}/perfil`, () => new HttpResponse(null, { status: 403 })),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(validacionesSuscripcion).toBeLessThanOrEqual(1);
    expect(authStore.getState().isAuthenticated).toBe(false);
  });
});

describe('PublicRoute', () => {
  it('redirige al dashboard si hay sesión válida', () => {
    authStore.getState().login(tokenVigente(), 'a@a.com');
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });

  it('muestra el login si no hay sesión', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('FORM LOGIN')).toBeInTheDocument();
  });
});
