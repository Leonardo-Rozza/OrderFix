import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import { RegisterPage } from './RegisterPage';

vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(), showError: vi.fn(), showSuccess: vi.fn(),
}));

const requirements = (revision = 'a', statement = 'Acepto los términos de mi cuenta.') => ({
  contexto: 'REGISTRO', locale: 'es-AR', requiredSetRevision: `sha256:${revision.repeat(64)}`,
  requisitos: [{
    id: '557a8ce8-c72e-4088-a6b5-e2b0f775eb98', contexto: 'REGISTRO', tipoActo: 'ACEPTACION',
    afirmacion: statement, afirmacionSha256: 'b'.repeat(64), requerido: true,
    documentos: [{ id: '77aa2a48-af19-4f80-92bb-d9f220c166d1', tipo: 'TERMINOS_SERVICIO', version: '2026.1',
      titulo: 'Términos de OrdenFix', contenidoMarkdown: '# Términos de OrdenFix\n\nTexto íntegro de la versión. <script>peligroso()</script>',
      sha256: 'c'.repeat(64), vigenteDesde: '2026-09-01T03:00:00Z', estado: 'VIGENTE', locale: 'es-AR' }],
  }],
});
const registration = { nombreTaller: 'Taller Ana', nombreAdmin: 'Ana', email: 'ana@test.com', password: 'password-secreto' };
type Seen = { key: string | null; body: Record<string, unknown> };
const success = () => HttpResponse.json({ token: 'sesion-nueva', type: 'Bearer', email: registration.email, emailVerificado: true }, { status: 201 });
const errorResponse = (status: number, code: string, headers?: Record<string, string>) => HttpResponse.json({
  timestamp: '2026-09-08T12:00:00', status, error: 'Error', message: 'Mensaje contractual',
  path: '/api/auth/register', code, details: { operacion: 'REGISTRO' },
}, { status, headers });

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/register']}><Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<h1>Taller abierto</h1>} />
      <Route path="/login" element={<h1>Iniciar sesión</h1>} />
    </Routes></MemoryRouter>
  </QueryClientProvider>) };
};
const fill = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nombre del taller'), registration.nombreTaller);
  await user.type(screen.getByLabelText('Tu nombre'), registration.nombreAdmin);
  await user.type(screen.getByLabelText('Email'), registration.email);
  await user.type(screen.getByLabelText('Contraseña'), registration.password);
  return user;
};
const confirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('checkbox', { name: /Acepto los términos/ }));
};

beforeEach(() => {
  vi.stubEnv('VITE_REGISTRATION_CONSENT', 'true');
  authStore.getState().logout();
  server.use(http.get(`${API}/public/requisitos-legales`, () => HttpResponse.json(requirements())));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('registro con consentimiento', () => {
  it.each([undefined, 'false'])('preserva body legacy y no consulta requisitos con flag %s', async (flag) => {
    vi.stubEnv('VITE_REGISTRATION_CONSENT', flag);
    let gets = 0;
    const seen: Seen[] = [];
    server.use(http.get(`${API}/public/requisitos-legales`, () => { gets++; return HttpResponse.json(requirements()); }),
      http.post(`${API}/auth/register`, async ({ request }) => {
        seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
        return success();
      }));
    renderPage();
    const user = await fill();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    expect(await screen.findByText('Taller abierto')).toBeInTheDocument();
    expect(seen).toEqual([{ key: null, body: registration }]);
    expect(gets).toBe(0);
  });

  it('un flag inválido bloquea el registro sin degradarlo a legacy', async () => {
    vi.stubEnv('VITE_REGISTRATION_CONSENT', 'TRUE');
    let posts = 0;
    server.use(http.post(`${API}/auth/register`, () => { posts++; return success(); }));
    renderPage();
    await fill();
    expect(screen.getByRole('alert')).toHaveTextContent('problema de configuración');
    expect(screen.getByRole('button', { name: 'Crear taller' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Crear taller' }).closest('form')!);
    await act(async () => {});
    expect(posts).toBe(0);
  });

  it('presenta el texto completo sin HTML activo y exige confirmación antes del POST exacto y sesión nueva', async () => {
    const seen: Seen[] = [];
    server.use(http.post(`${API}/auth/register`, async ({ request }) => {
      expect(request.headers.get('Authorization')).toBeNull();
      seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
      return success();
    }));
    const { container, client } = renderPage();
    const user = await fill();
    expect(screen.getByRole('button', { name: 'Crear taller' })).toBeDisabled();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByText('Leer Términos de OrdenFix · versión 2026.1'));
    expect(screen.getByRole('region', { name: 'Términos de OrdenFix' })).toHaveTextContent('Texto íntegro de la versión. <script>peligroso()</script>');
    expect(container.querySelector('script')).toBeNull();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    expect(await screen.findByText('Taller abierto')).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0].key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(seen[0].body).toEqual({ ...registration, requiredSetRevision: requirements().requiredSetRevision,
      aceptacionesLegales: [{ requisitoVersionId: requirements().requisitos[0].id, tipoActo: 'ACEPTACION', afirmacionSha256: 'b'.repeat(64),
        documentos: [{ documentoVersionId: requirements().requisitos[0].documentos[0].id, sha256: 'c'.repeat(64) }], confirmado: true }] });
    expect(authStore.getState()).toMatchObject({ token: 'sesion-nueva', emailVerificado: true, isAuthenticated: true });
    expect(JSON.stringify(localStorage)).not.toContain(registration.password);
    expect(JSON.stringify(localStorage)).not.toContain(seen[0].key!);
    expect(JSON.stringify(localStorage)).not.toContain('aceptacionesLegales');
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });

  it.each(['unavailable', 'malformed'])('no permite fallback si los requisitos están %s', async (failure) => {
    let gets = 0;
    let posts = 0;
    server.use(http.get(`${API}/public/requisitos-legales`, () => {
      gets++;
      return failure === 'unavailable' ? errorResponse(503, 'CONTRATO_LEGAL_NO_DISPONIBLE') : HttpResponse.json({ ...requirements(), requisitos: [] });
    }), http.post(`${API}/auth/register`, () => { posts++; return success(); }));
    renderPage();
    const user = await fill();
    expect(await screen.findByText(/No pudimos cargar las condiciones/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear taller' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar condiciones' }));
    await waitFor(() => expect(gets).toBe(2));
    expect(posts).toBe(0);
    expect(screen.getByLabelText('Contraseña')).toHaveValue(registration.password);
  });

  it.each(['network', '503'])('reintenta %s con exactamente la misma clave y body; editar crea otro intento', async (failure) => {
    const seen: Seen[] = [];
    server.use(http.post(`${API}/auth/register`, async ({ request }) => {
      seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
      return failure === 'network' ? HttpResponse.error() : errorResponse(503, 'CONTRATO_LEGAL_NO_DISPONIBLE');
    }));
    renderPage();
    const user = await fill();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText(/No pudimos confirmar el resultado/);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    await waitFor(() => expect(screen.getByLabelText('Nombre del taller')).toBeEnabled());
    expect(seen[1]).toEqual(seen[0]);
    await user.type(screen.getByLabelText('Nombre del taller'), ' nuevo');
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await waitFor(() => expect(seen).toHaveLength(3));
    expect(seen[2].key).not.toBe(seen[0].key);
    expect(seen[2].body.nombreTaller).toBe('Taller Ana nuevo');
    expect(JSON.stringify(localStorage)).not.toContain(registration.password);
  });

  it.each([409, 428])('recarga ante %s, conserva campos y exige nuevas confirmaciones', async (status) => {
    let gets = 0;
    const seen: Seen[] = [];
    server.use(http.get(`${API}/public/requisitos-legales`, () => HttpResponse.json(++gets === 1 ? requirements() : requirements('d', 'Acepto los términos actualizados.'))),
      http.post(`${API}/auth/register`, async ({ request }) => {
        seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
        return seen.length === 1 ? errorResponse(status, status === 409 ? 'DOCUMENTOS_LEGALES_DESACTUALIZADOS' : 'ACEPTACION_LEGAL_REQUERIDA') : success();
      }));
    renderPage();
    const user = await fill();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    expect(await screen.findByRole('checkbox', { name: /actualizados/ })).not.toBeChecked();
    expect(screen.getByLabelText('Contraseña')).toHaveValue(registration.password);
    expect(screen.getByLabelText('Nombre del taller')).toHaveValue(registration.nombreTaller);
    expect(screen.getByRole('button', { name: 'Crear taller' })).toBeDisabled();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText('Taller abierto');
    expect(seen[1].key).not.toBe(seen[0].key);
    expect(seen[1].body.requiredSetRevision).toBe(`sha256:${'d'.repeat(64)}`);
  });

  it('una clave reutilizada exige revisar; no hace POST automático', async () => {
    const seen: Seen[] = [];
    server.use(http.post(`${API}/auth/register`, async ({ request }) => {
      seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
      return errorResponse(409, 'IDEMPOTENCY_KEY_REUTILIZADA');
    }));
    renderPage();
    const user = await fill();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText(/Este intento corresponde a otros datos/);
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
    expect(seen).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Crear taller' })).toBeDisabled();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1].key).not.toBe(seen[0].key);
  });

  it('respeta Retry-After de in-progress y luego reenvía el mismo intento', async () => {
    const seen: Seen[] = [];
    server.use(http.post(`${API}/auth/register`, async ({ request }) => {
      seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
      return seen.length === 1 ? errorResponse(409, 'IDEMPOTENCY_EN_PROGRESO', { 'Retry-After': '1' }) : success();
    }));
    renderPage();
    const user = await fill();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText(/El registro sigue en curso/);
    expect(screen.getAllByRole('button', { name: 'Reintentá en 1 s' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(seen).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear taller' })).toBeEnabled(), { timeout: 2500 });
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText('Taller abierto');
    expect(seen[1]).toEqual(seen[0]);
  });

  it('bloquea una segunda presentación mientras el POST está pendiente', async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let posts = 0;
    server.use(http.post(`${API}/auth/register`, async () => { posts++; await pending; return success(); }));
    renderPage();
    const user = await fill();
    await confirm(user);
    const form = screen.getByRole('button', { name: 'Crear taller' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(posts).toBe(1));
    expect(screen.getByLabelText('Nombre del taller')).toBeDisabled();
    release?.();
    await screen.findByText('Taller abierto');
  });

  it('desmontar descarta el intento; otra pantalla no recupera contraseña ni consentimientos', async () => {
    const seen: Seen[] = [];
    server.use(http.post(`${API}/auth/register`, async ({ request }) => {
      seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.json() as Record<string, unknown> });
      return errorResponse(503, 'CONTRATO_LEGAL_NO_DISPONIBLE');
    }));
    const first = renderPage();
    const user = await fill();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Crear taller' }));
    await screen.findByText(/No pudimos confirmar el resultado/);
    first.unmount();
    await waitFor(() => expect(first.client.getMutationCache().getAll()).toHaveLength(0));
    renderPage();
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
    const secondUser = await fill();
    await confirm(secondUser);
    await secondUser.click(screen.getByRole('button', { name: 'Crear taller' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1].key).not.toBe(seen[0].key);
  });
});
