import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { server, API } from '../test/server';

// Espiamos los toasts (manteniendo getErrorMessage real).
vi.mock('../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));

import { apiClient, LIMITE_PLAN_EVENT } from './axios';
import { showError } from '../utils/toast';
import { captureError } from '../lib/sentry';
import { authStore } from '../store/auth.store';
import { subscribeUnsavedChangesRelease } from '../lib/unsavedChangesLifecycle';

// Dejamos el pathname en /login (vía history) para que el 401 no intente navegar.
beforeEach(() => {
  authStore.getState().logout();
  window.history.pushState({}, '', '/login');
  vi.mocked(showError).mockClear();
  vi.mocked(captureError).mockClear();
});
afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('axios interceptor de errores', () => {
  it.each([200, 503])('un 403 de Cuenta comprueba perfil %s sin consultar la suscripción ni duplicar errores', async (status) => {
    authStore.getState().login('token-cuenta', 'cuenta@taller.com');
    let subscriptions = 0;
    let profiles = 0;
    server.use(
      http.get(`${API}/aceptaciones-legales`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/perfil`, ({ request }) => {
        profiles++;
        expect(request.headers.get('authorization')).toBe('Bearer token-cuenta');
        return HttpResponse.json({}, { status });
      }),
      http.get(`${API}/suscripcion`, () => { subscriptions++; return new HttpResponse(null, { status: 403 }); }),
    );
    await expect(apiClient.get('/aceptaciones-legales', { sessionValidation: 'profile', errorMode: 'inline' })).rejects.toBeTruthy();
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(profiles).toBe(1);
    expect(subscriptions).toBe(0);
    expect(showError).not.toHaveBeenCalled();
  });

  it.each([401, 403])('un 403 de Cuenta cierra sesión si el perfil remoto responde %s', async (status) => {
    authStore.getState().login('token-cuenta', 'cuenta@taller.com');
    server.use(
      http.get(`${API}/aceptaciones-legales`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/perfil`, () => new HttpResponse(null, { status })),
    );
    await expect(apiClient.get('/aceptaciones-legales', { sessionValidation: 'profile', errorMode: 'inline' })).rejects.toBeTruthy();
    expect(authStore.getState().isAuthenticated).toBe(false);
  });

  it('muestra toast ante un error en un GET', async () => {
    server.use(http.get(`${API}/clientes`, () => new HttpResponse(null, { status: 500 })));
    await expect(apiClient.get('/clientes')).rejects.toBeTruthy();
    expect(showError).toHaveBeenCalled();
  });

  it('deja el error visible a cargo de un GET inline y conserva la telemetría', async () => {
    server.use(http.get(`${API}/clientes`, () => new HttpResponse(null, { status: 500 })));

    await expect(apiClient.get('/clientes', { errorMode: 'inline' })).rejects.toBeTruthy();

    expect(showError).not.toHaveBeenCalled();
    expect(captureError).toHaveBeenCalledTimes(1);
  });

  it('trata una cancelación como concurrencia esperada sin toast ni telemetría', async () => {
    server.use(
      http.get(`${API}/clientes`, async () => {
        await delay(100);
        return HttpResponse.json([]);
      })
    );
    const controller = new AbortController();
    const request = apiClient.get('/clientes', {
      errorMode: 'inline',
      signal: controller.signal,
    });

    controller.abort();

    await expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(showError).not.toHaveBeenCalled();
    expect(captureError).not.toHaveBeenCalled();
  });

  it('NO toastea errores de mutaciones (POST) — las maneja cada mutation', async () => {
    server.use(http.post(`${API}/clientes`, () => new HttpResponse(null, { status: 500 })));
    await expect(apiClient.post('/clientes', {})).rejects.toBeTruthy();
    expect(showError).not.toHaveBeenCalled();
  });

  it('mantiene el evento de límite de plan ante un 402 inline', async () => {
    const handler = vi.fn();
    window.addEventListener(LIMITE_PLAN_EVENT, handler);
    server.use(
      http.post(`${API}/reparaciones`, () => HttpResponse.json({ message: 'Tope del plan' }, { status: 402 }))
    );

    await expect(
      apiClient.post('/reparaciones', {}, { errorMode: 'inline' })
    ).rejects.toBeTruthy();

    expect(handler).toHaveBeenCalledTimes(1);
    const evento = handler.mock.calls[0][0] as CustomEvent<{ message: string }>;
    expect(evento.detail.message).toContain('Tope del plan');
    window.removeEventListener(LIMITE_PLAN_EVENT, handler);
  });

  it('conserva una sesión válida y avisa sin permisos ante un 403 inline de rol', async () => {
    authStore.getState().login('token-vigente', 'empleado@taller.com');
    server.use(
      http.delete(`${API}/clientes/1`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => HttpResponse.json({ plan: 'FREE', estado: 'ACTIVA' }))
    );

    await expect(
      apiClient.delete('/clientes/1', { errorMode: 'inline' })
    ).rejects.toBeTruthy();

    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('permisos'));
  });

  it('cierra la sesión ante un 401 inline', async () => {
    authStore.getState().login('token-falso', 'a@a.com');
    expect(authStore.getState().isAuthenticated).toBe(true);
    const sessionStateAtRelease: boolean[] = [];
    const unsubscribe = subscribeUnsavedChangesRelease(() => {
      sessionStateAtRelease.push(authStore.getState().isAuthenticated);
    });

    server.use(http.get(`${API}/clientes`, () => new HttpResponse(null, { status: 401 })));
    await expect(apiClient.get('/clientes', { errorMode: 'inline' })).rejects.toBeTruthy();

    unsubscribe();
    expect(sessionStateAtRelease).toEqual([true]);
    expect(authStore.getState().isAuthenticated).toBe(false);
  });

  it('cierra una sesión desactivada aunque el 403 original sea de un POST', async () => {
    authStore.getState().login('token-desactivado', 'empleado@taller.com');
    server.use(
      http.post(`${API}/clientes`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 403 }))
    );

    await expect(apiClient.post('/clientes', {})).rejects.toBeTruthy();

    expect(authStore.getState().isAuthenticated).toBe(false);
    expect(showError).not.toHaveBeenCalled();
  });

  it('trata un 403 directo de /suscripcion como sesión inválida', async () => {
    authStore.getState().login('token-revocado', 'empleado@taller.com');
    const release = vi.fn();
    const unsubscribe = subscribeUnsavedChangesRelease(release);
    server.use(http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 403 })));

    await expect(apiClient.get('/suscripcion')).rejects.toBeTruthy();

    unsubscribe();
    expect(release).toHaveBeenCalledTimes(1);
    expect(authStore.getState().isAuthenticated).toBe(false);
  });

  it('trata un 403 directo de /perfil como sesión inválida sin revalidar', async () => {
    authStore.getState().login('token-revocado', 'empleado@taller.com');
    let validaciones = 0;
    server.use(
      http.get(`${API}/perfil`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => {
        validaciones += 1;
        return HttpResponse.json({ plan: 'FREE', estado: 'ACTIVA' });
      }),
    );

    await expect(apiClient.get('/perfil', { errorMode: 'inline' })).rejects.toBeTruthy();

    expect(validaciones).toBe(0);
    expect(authStore.getState().isAuthenticated).toBe(false);
    expect(showError).not.toHaveBeenCalled();
  });

  it('conserva la sesión si la validación del 403 queda indeterminada por un 500', async () => {
    authStore.getState().login('token-vigente', 'empleado@taller.com');
    server.use(
      http.patch(`${API}/clientes/1`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 500 }))
    );

    await expect(apiClient.patch('/clientes/1', {})).rejects.toBeTruthy();

    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('verificar tu sesión'));
  });

  it('deduplica la validación base de dos respuestas 403 concurrentes', async () => {
    authStore.getState().login('token-vigente', 'empleado@taller.com');
    let validaciones = 0;
    server.use(
      http.delete(`${API}/clientes/1`, () => new HttpResponse(null, { status: 403 })),
      http.delete(`${API}/equipos/2`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, async () => {
        validaciones += 1;
        await delay(30);
        return HttpResponse.json({ plan: 'FREE', estado: 'ACTIVA' });
      })
    );

    await Promise.allSettled([apiClient.delete('/clientes/1'), apiClient.delete('/equipos/2')]);

    expect(validaciones).toBe(1);
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(showError).toHaveBeenCalledTimes(2);
  });
});
