import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { server, API } from '../test/server';

// Espiamos los toasts (manteniendo getErrorMessage real).
vi.mock('../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import { apiClient, LIMITE_PLAN_EVENT } from './axios';
import { showError } from '../utils/toast';
import { authStore } from '../store/auth.store';

// Dejamos el pathname en /login (vía history) para que el 401 no intente navegar.
beforeEach(() => {
  authStore.getState().logout();
  window.history.pushState({}, '', '/login');
  vi.mocked(showError).mockClear();
});
afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('axios interceptor de errores', () => {
  it('muestra toast ante un error en un GET', async () => {
    server.use(http.get(`${API}/clientes`, () => new HttpResponse(null, { status: 500 })));
    await expect(apiClient.get('/clientes')).rejects.toBeTruthy();
    expect(showError).toHaveBeenCalled();
  });

  it('NO toastea errores de mutaciones (POST) — las maneja cada mutation', async () => {
    server.use(http.post(`${API}/clientes`, () => new HttpResponse(null, { status: 500 })));
    await expect(apiClient.post('/clientes', {})).rejects.toBeTruthy();
    expect(showError).not.toHaveBeenCalled();
  });

  it('dispara el evento de límite de plan ante un 402', async () => {
    const handler = vi.fn();
    window.addEventListener(LIMITE_PLAN_EVENT, handler);
    server.use(
      http.post(`${API}/reparaciones`, () => HttpResponse.json({ message: 'Tope del plan' }, { status: 402 }))
    );

    await expect(apiClient.post('/reparaciones', {})).rejects.toBeTruthy();

    expect(handler).toHaveBeenCalledTimes(1);
    const evento = handler.mock.calls[0][0] as CustomEvent<{ message: string }>;
    expect(evento.detail.message).toContain('Tope del plan');
    window.removeEventListener(LIMITE_PLAN_EVENT, handler);
  });

  it('conserva una sesión válida y avisa sin permisos ante un 403 de rol', async () => {
    authStore.getState().login('token-vigente', 'empleado@taller.com');
    server.use(
      http.delete(`${API}/clientes/1`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => HttpResponse.json({ plan: 'FREE', estado: 'ACTIVA' }))
    );

    await expect(apiClient.delete('/clientes/1')).rejects.toBeTruthy();

    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('permisos'));
  });

  it('cierra la sesión ante un 401', async () => {
    authStore.getState().login('token-falso', 'a@a.com');
    expect(authStore.getState().isAuthenticated).toBe(true);

    server.use(http.get(`${API}/clientes`, () => new HttpResponse(null, { status: 401 })));
    await expect(apiClient.get('/clientes')).rejects.toBeTruthy();

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
    server.use(http.get(`${API}/suscripcion`, () => new HttpResponse(null, { status: 403 })));

    await expect(apiClient.get('/suscripcion')).rejects.toBeTruthy();

    expect(authStore.getState().isAuthenticated).toBe(false);
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
