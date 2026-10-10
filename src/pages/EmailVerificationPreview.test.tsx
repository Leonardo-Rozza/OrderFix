import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERFIL_KEY } from '../api/queries/perfil.queries';
import { AccountProfileContext, AccountSessionStatusContext } from '../router/accountProfile';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import type { Perfil, Suscripcion } from '../types';
import { EmailVerificationPreview, UnverifiedSubscriptionPage } from './EmailVerificationPreview';

vi.mock('../components/ThemeToggle', () => ({ ThemeToggle: () => <button type="button">Tema</button> }));
vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(), showError: vi.fn(), showSuccess: vi.fn(),
}));

const profile: Perfil = {
  usuario: { id: 1, username: 'Ana', email: 'ana@taller.test', role: 'ADMIN', emailVerificado: false },
  taller: { id: 1, nombre: 'Taller Ana', telefono: null },
};
const pro: Suscripcion = {
  plan: 'PRO', estado: 'ACTIVA', fechaInicio: null, fechaFinTrial: null, proximoCobro: null,
  reparacionesEsteMes: 0, limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
  ofertaPro: { precioMensual: 100, moneda: 'ARS', contratacionDisponible: true },
};
const free: Suscripcion = {
  ...pro, plan: 'FREE', limiteReparacionesMes: 25,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
};
const renderPage = (path = '/planes') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300_000 }, mutations: { retry: false } } });
  client.setQueryData(PERFIL_KEY, profile);
  return { client, ...render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[path]}>
      <AccountProfileContext value={profile}>
        <AccountSessionStatusContext value={{ isFetching: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) }}>
          {path === '/planes' ? <UnverifiedSubscriptionPage /> : <EmailVerificationPreview />}
        </AccountSessionStatusContext>
      </AccountProfileContext>
    </MemoryRouter>
  </QueryClientProvider>) };
};

beforeEach(() => {
  authStore.getState().logout();
  const payload = btoa(JSON.stringify({ sub: profile.usuario.email, tallerId: 1, role: 'ROLE_ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  authStore.getState().login(`eyJhbGciOiJIUzI1NiJ9.${payload}.firma-test`, profile.usuario.email, false);
});

describe('vista previa sin email verificado', () => {
  it('permite al titular cancelar PRO sin checkout ni consultas operativas', async () => {
    const requests: string[] = [];
    server.use(http.all(`${API}/*`, ({ request }) => {
      const route = `${request.method} ${new URL(request.url).pathname}`;
      requests.push(route);
      if (route === 'GET /api/suscripcion') return HttpResponse.json(pro);
      if (route === 'POST /api/pagos/suscripcion/cancelar') return HttpResponse.json(free);
      return HttpResponse.json({ message: `Solicitud inesperada: ${route}` }, { status: 500 });
    }));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Plan PRO' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /contratar|activar pro|suscribirme/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar PRO' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar PRO' });
    expect(requests).toEqual(['GET /api/suscripcion']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar PRO' }));
    expect(await screen.findByRole('heading', { name: 'Plan FREE' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(requests).toEqual(['GET /api/suscripcion', 'POST /api/pagos/suscripcion/cancelar']);
    expect(screen.queryByRole('button', { name: 'Cancelar PRO' })).not.toBeInTheDocument();
    expect(authStore.getState().emailVerificado).toBe(false);
  });

  it('una cuenta FREE conserva ayuda sin ofrecer contratación ni cancelación', async () => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(free)));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Plan FREE' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /cancelar pro|contratar|activar pro|suscribirme/i })).not.toBeInTheDocument();
    expect(screen.getByText('No tenés una suscripción PRO activa para cancelar.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ya lo confirmé' })).toBeEnabled();
  });

  it('si falla cancelar, mantiene el plan y permite reintentar sin iniciar checkout', async () => {
    let cancels = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(pro)),
      http.post(`${API}/pagos/suscripcion/cancelar`, () => {
        cancels++;
        return cancels === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(free);
      }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar PRO' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar PRO' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar PRO' }));
    await waitFor(() => expect(cancels).toBe(1));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancelar PRO' })).toBeEnabled());
    expect(screen.getByRole('heading', { name: 'Plan PRO', hidden: true })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar PRO' }));
    expect(await screen.findByRole('heading', { name: 'Plan FREE' })).toBeVisible();
    expect(cancels).toBe(2);
  });

  it.each(['/dashboard', '/reparaciones', '/caja'])('la estructura de %s no monta consultas operativas', (path) => {
    const requests: string[] = [];
    server.use(http.all(`${API}/*`, ({ request }) => {
      requests.push(request.url);
      return new HttpResponse(null, { status: 500 });
    }));
    const { client } = renderPage(path);
    expect(screen.getByText('Vista previa')).toBeVisible();
    expect(screen.getByRole('button', { name: path === '/caja' ? 'Registrar cobro' : 'Nueva reparación' })).toBeDisabled();
    expect(requests).toEqual([]);
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([['perfil'], ['suscripcion']]);
    expect(client.getQueryState(['suscripcion'])?.fetchStatus).toBe('idle');
  });
  it('preserves the unverified owner exit without checkout or operational access after paid cancellation', async () => {
    const requests: string[] = [];
    server.use(http.all(`${API}/*`, ({ request }) => {
      const route = `${request.method} ${new URL(request.url).pathname}`;
      requests.push(route);
      if (route === 'GET /api/suscripcion') return HttpResponse.json({ ...pro, accesoProHasta: '2030-11-08T13:45:00Z' });
      if (route === 'POST /api/pagos/suscripcion/cancelar') return HttpResponse.json({ ...pro, renovacionCancelada: true, accesoProHasta: '2030-11-08T13:45:00Z' });
      return new HttpResponse(null, { status: 500 });
    }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar PRO' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar PRO' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Plan PRO' })).toBeVisible();
    expect(screen.getByText(/Renovación cancelada.*08\/11\/2030, 13:45:00 UTC/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /cancelar pro|contratar|activar pro|suscribirme/i })).not.toBeInTheDocument();
    expect(authStore.getState().emailVerificado).toBe(false);
    expect(requests).toEqual(['GET /api/suscripcion', 'POST /api/pagos/suscripcion/cancelar']);
  });

});
