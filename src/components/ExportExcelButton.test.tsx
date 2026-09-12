import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportExcelButton } from './ExportExcelButton';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import { showError, showSuccess } from '../utils/toast';
import { apiClient } from '../api/axios';

vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));

const login = (role = 'ROLE_ADMIN') => authStore.getState().login(
  `header.${btoa(JSON.stringify({ role, exp: 4_000_000_000 }))}.signature`,
  'prueba@taller.invalid',
);
const renderButton = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    <ExportExcelButton />
  </QueryClientProvider>,
);

describe('ExportExcelButton — descarga operativa', () => {
  beforeEach(() => {
    login();
    // Evita la navegación no implementada por JSDOM cuando se revoca la sesión.
    window.history.pushState({}, '', '/login');
    vi.mocked(showError).mockClear();
    vi.mocked(showSuccess).mockClear();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:export-test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    authStore.getState().logout();
    window.history.pushState({}, '', '/');
  });

  it('informa el alcance, bloquea durante la generación y descarga con el nombre del servidor', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    const downloads: Array<{ filename: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ filename: this.download, href: this.href });
    });
    server.use(http.get(`${API}/export/excel`, async ({ request }) => {
      expect(request.headers.get('authorization')).toContain('Bearer ');
      requests++;
      await pending;
      return new HttpResponse('PK archivo sintético', {
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': 'attachment; filename="ordenfix-export-2042-03-04.xlsx"',
        },
      });
    }));
    renderButton();
    const button = screen.getByRole('button', { name: 'Exportar a Excel' });
    expect(button).toHaveAttribute('title', 'Descargar clientes, órdenes, cobros y presupuestos del taller');
    fireEvent.click(button);

    try {
      await waitFor(() => expect(button).toHaveTextContent('Generando…'));
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(button);
      await waitFor(() => expect(requests).toBe(1));
      release();

      await waitFor(() => expect(showSuccess).toHaveBeenCalledTimes(1));
      expect(downloads).toEqual([{ filename: 'ordenfix-export-2042-03-04.xlsx', href: 'blob:export-test' }]);
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export-test');
      expect(document.querySelector('a[download]')).toBeNull();
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('aria-busy', 'false');
      expect(showError).not.toHaveBeenCalled();
    } finally { release(); }
  });

  it('no ofrece exportación al empleado', () => {
    login('ROLE_USER');
    renderButton();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each(['server', 'network'])('muestra un único aviso prudente ante un fallo %s', async (failure) => {
    server.use(http.get(`${API}/export/excel`, () => failure === 'server'
      ? HttpResponse.json({ message: 'Detalle interno del servidor' }, { status: 500 })
      : HttpResponse.error()));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    expect(showError).toHaveBeenCalledWith('No se pudo exportar. Probá de nuevo.');
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled();
    expect(showSuccess).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([
    { body: '{"message":"No se pudo preparar el archivo."}', expected: 'No se pudo preparar el archivo.' },
    { body: 'JSON incompleto', expected: 'No se pudo exportar. Probá de nuevo.' },
    { body: '{"message":{"detalle":"no es texto"}}', expected: 'No se pudo exportar. Probá de nuevo.' },
  ])('resuelve el cuerpo JSON del fallo sin descargarlo: $body', async ({ body, expected }) => {
    // JSDOM no implementa Blob.text; el E2E cubre la lectura nativa del navegador.
    const data = Object.assign(new Blob([body], { type: 'application/json' }), {
      text: () => Promise.resolve(body),
    });
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data } });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    expect(showError).toHaveBeenCalledWith(expected);
    expect(showSuccess).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('deja un único aviso de permisos al interceptor y conserva una sesión válida', async () => {
    server.use(
      http.get(`${API}/export/excel`, () => HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })),
      http.get(`${API}/suscripcion`, () => HttpResponse.json({ plan: 'FREE', estado: 'ACTIVA' })),
    );
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled());
    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    expect(showError).toHaveBeenCalledWith('No tenés permisos para esta acción.');
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(showSuccess).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([401, 403])('conserva el cierre compartido de una sesión revocada con %s sin otro aviso', async (status) => {
    server.use(
      http.get(`${API}/export/excel`, () => new HttpResponse(null, { status })),
      http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 403 })),
    );
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(authStore.getState().isAuthenticated).toBe(false));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(showError).not.toHaveBeenCalled();
    expect(showSuccess).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
