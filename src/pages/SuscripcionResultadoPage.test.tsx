import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { SuscripcionResultadoPage } from './SuscripcionResultadoPage';
import { ProtectedRoute } from '../router/guards';
import { authStore } from '../store/auth.store';
import { queryClient } from '../api/queryClient';
import { SUSCRIPCION_KEY } from '../api/queries/suscripcion.queries';
import { API, server } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));

const free = {
  plan: 'FREE', estado: 'ACTIVA', fechaInicio: '2026-09-12', fechaFinTrial: null,
  proximoCobro: null, reparacionesEsteMes: 1, limiteReparacionesMes: 25,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
};
const pro = {
  ...free, plan: 'PRO', limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
};
const perfil = {
  usuario: { id: 1, username: 'Titular sintético', email: 'mp-probe@taller.invalid', role: 'ADMIN' },
  taller: { id: 1, nombre: 'Taller sintético', telefono: null },
};

const renderReturn = () => {
  const router = createMemoryRouter([
    { path: '/suscripcion/resultado', element: <ProtectedRoute><SuscripcionResultadoPage /></ProtectedRoute> },
    { path: '/dashboard', element: <ProtectedRoute><h1>Inicio del taller</h1></ProtectedRoute> },
    { path: '/login', element: <h1>Login</h1> },
  ], { initialEntries: ['/suscripcion/resultado'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
};

beforeEach(() => {
  queryClient.clear();
  authStore.getState().login(
    `header.${btoa(JSON.stringify({ role: 'ROLE_ADMIN', tallerId: 1, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`,
    'mp-probe@taller.invalid',
  );
  server.use(http.get(`${API}/perfil`, () => HttpResponse.json(perfil)));
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  authStore.getState().logout();
});

describe('SuscripcionResultadoPage — retorno con guard y caché reales', () => {
  it('al regresar por historial reconsulta y no confirma desde el PRO anterior mientras espera', async () => {
    let remoto: typeof free | typeof pro = pro;
    let consultas = 0;
    let retenerRespuesta = false;
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get(`${API}/suscripcion`, async () => {
      consultas++;
      if (retenerRespuesta) await held;
      return HttpResponse.json(remoto);
    }));
    const router = renderReturn();
    expect(await screen.findByRole('heading', { name: /ya sos pro/i })).toBeVisible();
    const consultasConfirmadas = consultas;

    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(await screen.findByRole('heading', { name: 'Inicio del taller' })).toBeVisible();
    // Una baja remota/webhook posterior no avisa al navegador ya abierto.
    remoto = free;
    retenerRespuesta = true;
    try {
      await act(async () => { await router.navigate(-1); });
      expect(screen.queryByRole('heading', { name: /ya sos pro/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /confirmando tu suscripción/i })).toBeVisible();
      await waitFor(() => expect(consultas).toBeGreaterThan(consultasConfirmadas));
      release();
      await waitFor(() => expect(queryClient.getQueryData(SUSCRIPCION_KEY)).toMatchObject({ plan: 'FREE', estado: 'ACTIVA' }));
      expect(screen.queryByRole('heading', { name: /ya sos pro/i })).not.toBeInTheDocument();
    } finally { release(); }
  }, 10000);

  it('un retorno nuevo con caché vacía confirma sólo después de leer PRO remoto', async () => {
    let remoto: typeof free | typeof pro = free;
    let consultas = 0;
    server.use(http.get(`${API}/suscripcion`, () => {
      consultas++;
      return HttpResponse.json(remoto);
    }));
    renderReturn();
    expect(await screen.findByRole('heading', { name: /confirmando tu suscripción/i })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /ya sos pro/i })).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.getQueryState(SUSCRIPCION_KEY)?.fetchStatus).toBe('idle'));
    const consultasPendientes = consultas;
    remoto = pro;

    expect(await screen.findByRole('heading', { name: /ya sos pro/i }, { timeout: 6000 })).toBeVisible();
    expect(consultas).toBe(consultasPendientes + 1);
  }, 8000);

  it('un fallo durante polling lo muestra SessionGate y su reintento recupera la confirmación', async () => {
    let fase: 'pendiente' | 'error' | 'confirmado' = 'pendiente';
    let consultas = 0;
    server.use(http.get(`${API}/suscripcion`, () => {
      consultas++;
      return fase === 'error'
        ? HttpResponse.json({ message: 'Fallo temporal sintético' }, { status: 500 })
        : HttpResponse.json(fase === 'confirmado' ? pro : free);
    }));
    renderReturn();
    expect(await screen.findByRole('heading', { name: /confirmando tu suscripción/i })).toBeVisible();
    await waitFor(() => expect(queryClient.getQueryState(SUSCRIPCION_KEY)?.fetchStatus).toBe('idle'));
    fase = 'error';

    expect(await screen.findByText('No pudimos validar tu sesión', {}, { timeout: 9500 })).toBeVisible();
    expect(screen.queryByText('Todavía no pudimos confirmarlo')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ya sos pro/i })).not.toBeInTheDocument();
    expect(authStore.getState().isAuthenticated).toBe(true);
    const consultasAntesDeReintentar = consultas;
    fase = 'confirmado';
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /ya sos pro/i })).toBeVisible());
    expect(consultas).toBeGreaterThan(consultasAntesDeReintentar);
  }, 15000);
});
