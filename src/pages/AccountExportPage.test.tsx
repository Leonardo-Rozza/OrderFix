import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { authStore } from '../store/auth.store';
import { queryClient } from '../api/queryClient';
import { AccountExportPage } from './AccountExportPage';

const mocks = vi.hoisted(() => ({ role: 'ADMIN', accesoTaller: 'OPERATIVE' }));
vi.mock('../router/accountProfile', () => ({ useAccountProfile: () => ({
  accesoTaller: mocks.accesoTaller,
  usuario: { id: 1, role: mocks.role, username: 'Ana', email: 'ana@taller.test', emailVerificado: true },
  taller: { id: 1, nombre: 'Taller del Centro', telefono: null },
}) }));
vi.mock('../layouts/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));
const id = '10000000-0000-4000-8000-000000000001';
const status = { id, estado: 'READY', expiresAt: '2042-01-01T00:00:00Z', reused: false };
const password = 'clave-de-prueba';
const proof = 'a'.repeat(43);
const login = (suffix = 'firma') => authStore.getState().login(
  `header.${btoa(JSON.stringify({ role: 'ROLE_ADMIN', exp: 4_000_000_000 }))}.${suffix}`, 'ana@taller.test',
);
const setup = () => render(<MemoryRouter><AccountExportPage /></MemoryRouter>);
const fillConfirmation = async () => {
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Contraseña actual', { exact: false }), password);
  return within(dialog).getByRole('button', { name: /confirmar solicitud|confirmar descarga/i });
};

beforeEach(() => {
  vi.restoreAllMocks(); mocks.role = 'ADMIN'; mocks.accesoTaller = 'OPERATIVE'; login(); queryClient.clear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:export-test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  server.use(
    http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: true, exportacion: null })),
    http.post(`${API}/cuenta/reauthenticaciones`, async ({ request }) => {
      const body = await request.json() as { proposito: string };
      return HttpResponse.json({ reauthToken: proof, proposito: body.proposito, expiresAt: status.expiresAt });
    }),
  );
});
afterEach(() => { vi.useRealTimers(); queryClient.clear(); });

describe('AccountExportPage', () => {
  it.each(['QUEUED', 'RUNNING', 'FAILED', 'EXPIRED', 'REVOKED', null])('acceso restringido y estado %s no ofrecen ZIP ni Excel nuevos', async (estado) => {
    mocks.accesoTaller = 'RESTRICTED';
    let writes = 0;
    server.use(
      http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: true, exportacion: estado ? { ...status, estado } : null })),
      http.post(`${API}/exportaciones`, () => { writes++; return HttpResponse.json({}); }),
      http.post(`${API}/export/excel`, () => { writes++; return HttpResponse.json({}); }),
    );
    setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Consultar estado' })).toBeEnabled());
    expect(screen.getByText(/el cierre no amplía su vencimiento/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Solicitar.*respaldo|Descargar reporte Excel|Descargar respaldo ZIP/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Solicitá uno nuevo|Podés solicitar otro archivo/)).not.toBeInTheDocument();
    expect(writes).toBe(0);
  });

  it('acceso restringido no permite descargar un READY que alcanzó su vencimiento', async () => {
    mocks.accesoTaller = 'RESTRICTED';
    server.use(http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({
      habilitada: true, exportacion: { ...status, expiresAt: '2000-01-01T00:00:00Z' },
    })));
    setup();
    expect(await screen.findByText('El respaldo venció')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Descargar respaldo ZIP' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Solicitar/ })).not.toBeInTheDocument();
  });
  it('no monta ni consulta exportaciones para un empleado', async () => {
    mocks.role = 'USER'; let reads = 0;
    server.use(http.get(`${API}/exportaciones/actual`, () => { reads++; return HttpResponse.json({}); }));
    setup();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(reads).toBe(0);
  });
  it('ZIP apagado conserva Excel protegido y no ofrece solicitar ZIP', async () => {
    server.use(http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: false, exportacion: null })));
    setup();
    expect(await screen.findByText(/respaldos ZIP todavía no está habilitada/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Solicitar respaldo ZIP' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar reporte Excel' })).toBeEnabled();
  });
  it('sólo confirma un request, limpia contraseña y no introduce secretos en caches o storage', async () => {
    let calls = 0; let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    server.use(http.post(`${API}/exportaciones`, async ({ request }) => {
      expect(request.headers.get('x-reauth-token')).toBe(proof);
      expect(request.headers.get('idempotency-key')).toMatch(/^[a-f0-9-]{36}$/);
      expect(new URL(request.url).search).toBe(''); calls++;
      await pending;
      return HttpResponse.json({ ...status, estado: 'QUEUED' }, { status: 202 });
    }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' }));
    const button = await fillConfirmation();
    fireEvent.click(button); fireEvent.click(button);
    try {
      await waitFor(() => expect(calls).toBe(1));
      expect(screen.getByLabelText('Contraseña actual', { exact: false })).toHaveValue('');
      expect(button).toBeDisabled();
      expect(JSON.stringify(queryClient.getMutationCache().getAll())).not.toContain(password);
      expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(JSON.stringify(localStorage)).not.toContain(password);
      expect(JSON.stringify(localStorage)).not.toContain(proof);
      expect(JSON.stringify(sessionStorage)).not.toContain(proof);
      finish();
      expect(await screen.findByText('Solicitud recibida')).toBeVisible();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally { finish(); }
  });
  it.each(['OPERATIVE', 'RESTRICTED'])('%s recupera READY y exige una nueva contraseña y proof en cada descarga', async (accesoTaller) => {
    mocks.accesoTaller = accesoTaller;
    server.use(http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: true, exportacion: status })));
    let grants = 0, downloads = 0;
    const tokens = ['b'.repeat(43), 'c'.repeat(43)];
    server.use(
      http.post(`${API}/cuenta/reauthenticaciones`, async ({ request }) => {
        expect(await request.json()).toEqual({ passwordActual: password, proposito: 'DESCARGAR_EXPORTACION' });
        return HttpResponse.json({ reauthToken: tokens[grants++], proposito: 'DESCARGAR_EXPORTACION', expiresAt: status.expiresAt });
      }),
      http.post(`${API}/exportaciones/${id}/archivo`, ({ request }) => {
        expect(request.headers.get('x-reauth-token')).toBe(tokens[downloads++]);
        return new HttpResponse('PK sintético', { headers: { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="taller.zip"' } });
      }),
    );
    setup();
    for (let index = 0; index < 2; index++) {
      await userEvent.click(await screen.findByRole('button', { name: 'Descargar respaldo ZIP' }));
      expect(screen.getByLabelText('Contraseña actual', { exact: false })).toHaveValue('');
      await userEvent.click(await fillConfirmation());
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
    expect(grants).toBe(2); expect(downloads).toBe(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(document.querySelector('a[download]')).toBeNull();
  });
  it('la contraseña incorrecta queda inline, se borra y no cierra la sesión', async () => {
    server.use(http.post(`${API}/cuenta/reauthenticaciones`, () => HttpResponse.json({
      code: 'PASSWORD_ACTUAL_INVALIDA', message: 'Detalle no presentado',
    }, { status: 400 })));
    setup(); await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' });
    await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte Excel' }));
    await userEvent.click(await fillConfirmation());
    expect(await screen.findByText(/La contraseña actual no es correcta/)).toBeVisible();
    expect(screen.getByLabelText('Contraseña actual', { exact: false })).toHaveValue('');
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('no habilita solicitudes tras resultado incierto hasta consultar; reintenta con la misma key', async () => {
    const keys: string[] = []; let requests = 0;
    server.use(http.post(`${API}/exportaciones`, ({ request }) => {
      keys.push(request.headers.get('idempotency-key')!);
      return ++requests === 1 ? HttpResponse.error() : HttpResponse.json({ ...status, estado: 'QUEUED' }, { status: 202 });
    }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' }));
    await userEvent.click(await fillConfirmation());
    expect(await screen.findByText(/No pudimos confirmar la solicitud/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Solicitar respaldo ZIP' })).not.toBeInTheDocument();
    expect(requests).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Consultar estado' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' }));
    await userEvent.click(await fillConfirmation());
    expect(await screen.findByText('Solicitud recibida')).toBeVisible();
    expect(keys[0]).toBe(keys[1]);
  });
  it('una lectura de otro trabajo anterior no cambia la clave de una solicitud incierta', async () => {
    const keys: string[] = []; let requests = 0, reads = 0;
    server.use(
      http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: true,
        exportacion: ++reads === 1 ? null : { ...status, id: '20000000-0000-4000-8000-000000000002', estado: 'FAILED' },
      })),
      http.post(`${API}/exportaciones`, ({ request }) => {
        keys.push(request.headers.get('idempotency-key')!);
        return ++requests === 1 ? HttpResponse.error() : HttpResponse.json({ ...status, estado: 'QUEUED' }, { status: 202 });
      }),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' }));
    await userEvent.click(await fillConfirmation());
    await screen.findByText(/No pudimos confirmar la solicitud/);
    await userEvent.click(screen.getByRole('button', { name: 'Consultar estado' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar nuevo respaldo ZIP' }));
    await userEvent.click(await fillConfirmation());
    expect(await screen.findByText('Solicitud recibida')).toBeVisible();
    expect(keys[0]).toBe(keys[1]);
  });
  it('un 403 con perfil vigente explica los requisitos y conserva la sesión sin consultar suscripción', async () => {
    let profiles = 0;
    server.use(
      http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ code: 'EXPORTACION_NO_PERMITIDA' }, { status: 403 })),
      http.get(`${API}/perfil`, () => { profiles++; return HttpResponse.json({}); }),
    );
    setup();
    expect(await screen.findByText(/ser titular del taller, tener el email verificado/)).toBeVisible();
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(screen.getByRole('button', { name: 'Descargar reporte Excel' })).toBeDisabled();
    expect(profiles).toBe(1);
  });

  it('respeta Retry-After sin reintentar automáticamente', async () => {
    let calls = 0;
    server.use(http.post(`${API}/cuenta/reauthenticaciones`, () => {
      calls++; return HttpResponse.json({ code: 'EXPORTACION_LIMITE' }, { status: 429, headers: { 'retry-after': '45' } });
    }));
    setup(); await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' });
    await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte Excel' }));
    await userEvent.click(await fillConfirmation());
    expect(await screen.findByText(/Por ahora no podemos iniciar otra operación/)).toBeVisible();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Reintentá en \d+ s/ })).toBeDisabled();
    expect(calls).toBe(1);
  });
  it.each(['EXPIRED', 'FAILED', 'REVOKED'])('estado $s permite solicitar otro y no descargar', async (estado) => {
    server.use(http.get(`${API}/exportaciones/actual`, () => HttpResponse.json({ habilitada: true, exportacion: { ...status, estado } })));
    setup();
    expect(await screen.findByRole('button', { name: 'Solicitar nuevo respaldo ZIP' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Descargar respaldo ZIP' })).not.toBeInTheDocument();
  });
  it('una respuesta de descarga posterior al cambio de sesión no crea un archivo', async () => {
    let reached!: () => void; let finish!: () => void;
    const received = new Promise<void>((resolve) => { reached = resolve; });
    const response = new Promise<void>((resolve) => { finish = resolve; });
    server.use(http.post(`${API}/export/excel`, async () => {
      reached(); await response; return new HttpResponse('PK', { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    }));
    setup(); await screen.findByRole('button', { name: 'Solicitar respaldo ZIP' });
    await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte Excel' }));
    await userEvent.click(await fillConfirmation());
    await received;
    await act(async () => { login('sesion-nueva'); finish(); await response; });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
