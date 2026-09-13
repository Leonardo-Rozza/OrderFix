import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, PublicRoute } from './guards';
import { authStore } from '../store/auth.store';
import { server, API } from '../test/server';

const flags = vi.hoisted(() => ({ enabled: false }));
vi.mock('../config/workshopClosure', () => ({ get workshopClosureEnabled() { return flags.enabled; } }));

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
            <Route path="/cuenta" element={<div>CUENTA</div>} />
            <Route path="/cuenta/cierre" element={<div>CIERRE</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
};

beforeEach(() => {
  flags.enabled = false;
  authStore.getState().logout();
  window.history.pushState({}, '', '/login');
  server.use(http.get(`${API}/perfil`, () => HttpResponse.json(perfil)));
});

describe('ProtectedRoute', () => {
  it.each([false, true])('el perfil restringido evita operación y suscripción (flag %s)', async (enabled) => {
    flags.enabled = enabled;
    let subscriptions = 0;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, accesoTaller: 'RESTRICTED' })),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return new HttpResponse(null, { status: 423 }); }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');
    const { client } = renderProtegida();
    client.setQueryData(['perfil'], { ...perfil, accesoTaller: 'OPERATIVE' });
    expect(await screen.findByText(enabled ? 'CIERRE' : 'CUENTA')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(subscriptions).toBe(0);
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('no permite operar con un enum remoto desconocido aunque el plan esté cacheado', async () => {
    let subscriptions = 0;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, accesoTaller: 'ELIMINADO' })),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return HttpResponse.json(suscripcion); }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');
    renderProtegida();
    expect(await screen.findByText('No pudimos validar tu sesión')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(subscriptions).toBe(0);
  });
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
    expect(screen.getByRole('link', { name: 'Ir a Cuenta y privacidad' })).toHaveAttribute('href', '/cuenta');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByText('PRIVADO')).toBeInTheDocument());
    expect(intentos).toBe(2);
  });

  it('espera el perfil fresco antes de consultar el plan y mostrar la operación', async () => {
    let perfilSolicitado = false;
    let subscriptions = 0;
    let responderPerfil: (() => void) | undefined;
    const perfilPendiente = new Promise<void>((resolve) => {
      responderPerfil = resolve;
    });
    server.use(
      http.get(`${API}/suscripcion`, () => { subscriptions++; return HttpResponse.json(suscripcion); }),
      http.get(`${API}/perfil`, async () => {
        perfilSolicitado = true;
        await perfilPendiente;
        return HttpResponse.json(perfil);
      }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    await waitFor(() => expect(perfilSolicitado).toBe(true));
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(subscriptions).toBe(0);
    responderPerfil?.();
    expect(await screen.findByText('PRIVADO')).toBeInTheDocument();
  });

  it('un fallo recuperable del perfil conserva sesión y oculta la operación', async () => {
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)),
      http.get(`${API}/perfil`, () => new HttpResponse(null, { status: 500 })),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');

    renderProtegida();

    expect(await screen.findByText('No pudimos validar tu sesión')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
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
  it.each([false, true])('una sesión vigente restringida vuelve a Cuenta (flag %s) sin plan', async (enabled) => {
    flags.enabled = enabled;
    let subscriptions = 0;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, accesoTaller: 'RESTRICTED' })),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return new HttpResponse(null, { status: 423 }); }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/login']}><Routes>
        <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        <Route path="/cuenta" element={<div>CUENTA</div>} />
        <Route path="/cuenta/cierre" element={<div>CIERRE</div>} />
      </Routes></MemoryRouter>
    </QueryClientProvider>);
    expect(screen.queryByText('FORM LOGIN')).not.toBeInTheDocument();
    expect(await screen.findByText(enabled ? 'CIERRE' : 'CUENTA')).toBeInTheDocument();
    expect(subscriptions).toBe(0);
  });
  it('redirige al dashboard después de confirmar el perfil remoto', async () => {
    authStore.getState().login(tokenVigente(), 'a@a.com');
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        </Routes>
      </MemoryRouter></QueryClientProvider>
    );
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
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
