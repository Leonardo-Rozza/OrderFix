import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, PublicRoute, VerifiedEmailRoute } from './guards';
import { AccountRoute } from './AccountRoute';
import { apiClient, EMAIL_VERIFICATION_REQUIRED_EVENT } from '../api/axios';
import { authStore } from '../store/auth.store';
import { server, API } from '../test/server';

const flags = vi.hoisted(() => ({ enabled: false }));
vi.mock('../config/workshopClosure', () => ({ get workshopClosureEnabled() { return flags.enabled; } }));
vi.mock('../components/ThemeToggle', () => ({ ThemeToggle: () => null }));

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
  usuario: { id: 1, username: 'Ada Lovelace', email: 'a@a.com', role: 'ADMIN', emailVerificado: true },
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
  it.each([true, false, undefined])('el perfil pendiente bloquea operación y plan aunque el store diga %s', async (persisted) => {
    let subscriptions = 0;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, usuario: { ...perfil.usuario, emailVerificado: false } })),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return HttpResponse.json(suscripcion); }),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com', persisted);
    const { client } = renderProtegida();
    client.setQueryData(['clientes'], { contenido: 'privado' });
    expect(await screen.findByText('Vista previa')).toBeInTheDocument();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva reparación' })).toBeDisabled();
    expect(client.getQueryData(['clientes'])).toBeUndefined();
    expect(subscriptions).toBe(0);
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('un perfil sin estado de verificación falla cerrado aunque el store diga true', async () => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, usuario: { ...perfil.usuario, emailVerificado: undefined } })));
    authStore.getState().login(tokenVigente(), 'a@a.com', true);
    renderProtegida();
    expect(await screen.findByText('No pudimos validar tu sesión')).toBeVisible();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
  });

  it.each(['manual', 'otra pestaña'])('consulta el perfil fresco para habilitar operación (%s)', async (source) => {
    let verified = false;
    server.use(
      http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, usuario: { ...perfil.usuario, emailVerificado: verified } })),
      http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com', false);
    renderProtegida();
    expect(await screen.findByText('Vista previa')).toBeVisible();
    verified = true;
    if (source === 'manual') await userEvent.click(screen.getByRole('button', { name: 'Ya lo confirmé' }));
    else act(() => { focusManager.setFocused(false); focusManager.setFocused(true); });
    expect(await screen.findByText('PRIVADO')).toBeVisible();
    expect(screen.queryByText('Vista previa')).not.toBeInTheDocument();
    expect(authStore.getState().emailVerificado).toBe(false);
  });

  it('un 403 específico oculta inmediatamente la operación y refresca sin cerrar sesión', async () => {
    let verified = true;
    let hold = false;
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    server.use(
      http.get(`${API}/perfil`, async () => { if (hold) await held; return HttpResponse.json({ ...perfil, usuario: { ...perfil.usuario, emailVerificado: verified } }); }),
      http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)),
      http.get(`${API}/clientes`, () => HttpResponse.json({ code: 'EMAIL_NO_VERIFICADO' }, { status: 403 })),
    );
    authStore.getState().login(tokenVigente(), 'a@a.com', true);
    const { client } = renderProtegida();
    expect(await screen.findByText('PRIVADO')).toBeVisible();
    client.setQueryData(['clientes'], { contenido: 'privado' });
    verified = false;
    hold = true;
    await act(async () => { await expect(apiClient.get('/clientes')).rejects.toMatchObject({ response: { status: 403 } }); });
    expect(await screen.findByText('Vista previa')).toBeVisible();
    expect(screen.queryByText('PRIVADO')).not.toBeInTheDocument();
    expect(client.getQueryData(['clientes'])).toBeUndefined();
    expect(authStore.getState().isAuthenticated).toBe(true);
    release();
    expect(await screen.findByRole('button', { name: 'Ya lo confirmé' })).toBeVisible();
  });

  it('ignora avisos de una sesión anterior', async () => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(suscripcion)));
    authStore.getState().login(tokenVigente(), 'a@a.com', true);
    renderProtegida();
    expect(await screen.findByText('PRIVADO')).toBeVisible();
    act(() => window.dispatchEvent(new CustomEvent(EMAIL_VERIFICATION_REQUIRED_EVENT, { detail: { token: 'anterior' } })));
    expect(screen.getByText('PRIVADO')).toBeVisible();
    expect(screen.queryByText('Vista previa')).not.toBeInTheDocument();
  });

  it('la URL de exportación no monta la exportación cuando el email está pendiente', async () => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json({ ...perfil, usuario: { ...perfil.usuario, emailVerificado: false } })));
    authStore.getState().login(tokenVigente(), 'a@a.com');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/cuenta/exportacion']}><AccountRoute><VerifiedEmailRoute><div>EXPORTAR PRIVADO</div></VerifiedEmailRoute></AccountRoute></MemoryRouter>
    </QueryClientProvider>);
    expect(await screen.findByText('Vista previa')).toBeVisible();
    expect(screen.queryByText('EXPORTAR PRIVADO')).not.toBeInTheDocument();
  });

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
