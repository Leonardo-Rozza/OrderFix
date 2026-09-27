import { chargeAccount, chargeGeneration, prepareCharge, readPendingCharge } from '../utils/pendingCharge';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { server, API } from '../test/server';

// Espiamos los toasts (manteniendo getErrorMessage real).
vi.mock('../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));

import { apiClient, LIMITE_PLAN_EVENT, EMAIL_VERIFICATION_REQUIRED_EVENT } from './axios';
import { queryClient } from './queryClient';
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
  it.each(['/suscripcion', '/clientes'])('email no verificado en %s conserva la sesión y solicita revalidación sin toast', async (path) => {
    authStore.getState().login('token-email', 'cuenta@taller.test');
    const listener = vi.fn();
    window.addEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, listener);
    server.use(http.get(`${API}${path}`, () => HttpResponse.json({ code: 'EMAIL_NO_VERIFICADO' }, { status: 403 })));
    try {
      await expect(apiClient.get(path)).rejects.toMatchObject({ response: { status: 403 } });
      expect(authStore.getState().token).toBe('token-email');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail.token).toBe('token-email');
      expect(showError).not.toHaveBeenCalled();
      expect(captureError).not.toHaveBeenCalled();
    } finally { window.removeEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, listener); }
  });

  it('la validación de un 403 de rol no confunde email pendiente con sesión revocada', async () => {
    authStore.getState().login('token-email', 'cuenta@taller.test');
    server.use(
      http.delete(`${API}/clientes/1`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/suscripcion`, () => HttpResponse.json({ code: 'EMAIL_NO_VERIFICADO' }, { status: 403 })),
    );
    await expect(apiClient.delete('/clientes/1')).rejects.toBeTruthy();
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('un 403 por email de otra sesión no publica un bloqueo para la cuenta nueva', async () => {
    authStore.getState().login('token-anterior', 'anterior@taller.test');
    let started!: () => void;
    let release!: () => void;
    const sent = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const listener = vi.fn();
    window.addEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, listener);
    server.use(http.get(`${API}/clientes`, async () => { started(); await held; return HttpResponse.json({ code: 'EMAIL_NO_VERIFICADO' }, { status: 403 }); }));
    const result = expect(apiClient.get('/clientes')).rejects.toBeTruthy();
    try {
      await sent;
      authStore.getState().login('token-nuevo', 'nuevo@taller.test');
      release();
      await result;
      expect(listener).not.toHaveBeenCalled();
      expect(authStore.getState().token).toBe('token-nuevo');
    } finally { release(); window.removeEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, listener); }
  });
  it.each([401, 403, 423, 429, 503])('cierre %s queda a cargo de la página sin perder el aviso o abrir validaciones', async (status) => {
    authStore.getState().login('sesion-cierre', 'titular@taller.invalid');
    let validations = 0;
    server.use(
      http.post(`${API}/cuenta/cierre/operaciones`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer sesion-cierre');
        return HttpResponse.json({ code: 'CIERRE_CONFLICTO', message: 'diagnóstico privado' }, { status });
      }),
      http.get(`${API}/perfil`, () => { validations++; return HttpResponse.json({}); }),
      http.get(`${API}/suscripcion`, () => { validations++; return HttpResponse.json({}); }),
    );
    const released = vi.fn();
    const unsubscribe = subscribeUnsavedChangesRelease(released);
    try {
      await expect(apiClient.post('/cuenta/cierre/operaciones', {}, {
        sessionValidation: 'closure', errorMode: 'inline',
      })).rejects.toMatchObject({ response: { status } });
      expect(authStore.getState().token).toBe('sesion-cierre');
      expect(validations).toBe(0);
      expect(released).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
      expect(captureError).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
  it.each([
    { path: '/perfil', method: 'GET', status: 401 },
    { path: '/perfil', method: 'GET', status: 403 },
    { path: '/cuenta/baja-acceso', method: 'POST', status: 401 },
    { path: '/cuenta/baja-acceso', method: 'POST', status: 403 },
  ])('un $status tardío de $method $path conserva la nueva sesión, caché y guards', async ({ path, method, status }) => {
    authStore.getState().login('token-anterior', 'anterior@taller.com');
    let markSent!: () => void;
    const sent = new Promise<void>((resolve) => { markSent = resolve; });
    let releaseResponse!: () => void;
    const held = new Promise<void>((resolve) => { releaseResponse = resolve; });
    const releaseGuard = vi.fn();
    const unsubscribe = subscribeUnsavedChangesRelease(releaseGuard);
    let validations = 0;
    const respond = async ({ request }: { request: Request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer token-anterior');
      markSent();
      await held;
      return new HttpResponse(null, { status });
    };
    server.use(
      method === 'GET' ? http.get(`${API}${path}`, respond) : http.post(`${API}${path}`, respond),
      http.get(`${API}/perfil`, () => { validations++; return HttpResponse.json({}); }),
      http.get(`${API}/suscripcion`, () => { validations++; return HttpResponse.json({}); }),
    );
    const config = { sessionValidation: 'profile' as const, errorMode: 'inline' as const };
    const pending = method === 'GET' ? apiClient.get(path, config) : apiClient.post(path, {}, config);
    const result = expect(pending).rejects.toMatchObject({ response: { status } });
    try {
      await sent;
      authStore.getState().login('token-nuevo', 'nuevo@taller.com');
      queryClient.setQueryData(['nuevo-taller'], { reparacion: 91 });
      releaseResponse();
      await result;

      expect(authStore.getState()).toMatchObject({ token: 'token-nuevo', email: 'nuevo@taller.com', isAuthenticated: true });
      expect(queryClient.getQueryData(['nuevo-taller'])).toEqual({ reparacion: 91 });
      expect(releaseGuard).not.toHaveBeenCalled();
      expect(validations).toBe(0);
      expect(showError).not.toHaveBeenCalled();
      expect(captureError).not.toHaveBeenCalled();
    } finally { releaseResponse(); unsubscribe(); }
  });

  it('un cambio de sesión durante la validación del 403 tampoco cierra la nueva identidad', async () => {
    authStore.getState().login('token-anterior', 'anterior@taller.com');
    let markValidation!: () => void;
    const validationStarted = new Promise<void>((resolve) => { markValidation = resolve; });
    let releaseValidation!: () => void;
    const held = new Promise<void>((resolve) => { releaseValidation = resolve; });
    const releaseGuard = vi.fn();
    const unsubscribe = subscribeUnsavedChangesRelease(releaseGuard);
    server.use(
      http.post(`${API}/cuenta/baja-acceso`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${API}/perfil`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token-anterior');
        markValidation();
        await held;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const result = expect(apiClient.post('/cuenta/baja-acceso', {}, {
      sessionValidation: 'profile', errorMode: 'inline',
    })).rejects.toMatchObject({ response: { status: 403 } });
    try {
      await validationStarted;
      authStore.getState().login('token-nuevo', 'nuevo@taller.com');
      queryClient.setQueryData(['nuevo-taller'], { reparacion: 92 });
      releaseValidation();
      await result;

      expect(authStore.getState()).toMatchObject({ token: 'token-nuevo', isAuthenticated: true });
      expect(queryClient.getQueryData(['nuevo-taller'])).toEqual({ reparacion: 92 });
      expect(releaseGuard).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally { releaseValidation(); unsubscribe(); }
  });

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


describe('axios — sesión de un cobro recuperable', () => {
  const login = () => {
    const token = `header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`;
    authStore.getState().login(token, 'a@a.com');
    return { account: chargeAccount(token, true)!, generation: chargeGeneration() };
  };

  it.each([401, 403])('logs out when expiry occurs while awaiting the current charge %s response or validation', async (status) => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const session = login();
    const attempt = prepareCharge(session.account, 9, { monto: 500, metodo: 'EFECTIVO' });
    queryClient.setQueryData(['dashboard'], { reparaciones: 4 });
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const waiting = new Promise<void>((resolve) => { started = resolve; });
    const released = vi.fn();
    const unsubscribe = subscribeUnsavedChangesRelease(released);
    let validations = 0;
    server.use(
      http.post(`${API}/reparaciones/9/cobros`, async () => {
        if (status === 401) { started(); await held; }
        return new HttpResponse(null, { status });
      }),
      http.get(`${API}/suscripcion`, async () => {
        validations += 1;
        started();
        await held;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const result = expect(apiClient.post('/reparaciones/9/cobros', attempt.payload, {
      chargeSession: session,
    })).rejects.toMatchObject({ response: { status } });
    try {
      await waiting;
      clock.mockReturnValue(now + 3_600_000);
      release();
      await result;
      expect(authStore.getState().isAuthenticated).toBe(false);
      expect(readPendingCharge(session.account, 9)).toBeNull();
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(chargeGeneration()).toBeGreaterThan(session.generation);
      expect(released).toHaveBeenCalledTimes(1);
      expect(validations).toBe(status === 403 ? 1 : 0);
      expect(showError).not.toHaveBeenCalled();
      expect(captureError).not.toHaveBeenCalled();
    } finally {
      release();
      unsubscribe();
    }
  });

  it('rejects a captured charge before dispatch if its token has already expired', async () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const session = login();
    const attempt = prepareCharge(session.account, 9, { monto: 500, metodo: 'EFECTIVO' });
    let calls = 0;
    server.use(http.post(`${API}/reparaciones/9/cobros`, () => {
      calls += 1;
      return HttpResponse.json({ id: 7 });
    }));

    clock.mockReturnValue(now + 3_600_000);
    await expect(apiClient.post('/reparaciones/9/cobros', attempt.payload, {
      chargeSession: session,
    })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(calls).toBe(0);
    expect(readPendingCharge(session.account, 9)).toEqual(attempt);
    expect(chargeGeneration()).toBe(session.generation);
  });

  it('mantiene el logout y la purga cuando el 401 corresponde a la sesión actual', async () => {
    const session = login();
    const attempt = prepareCharge(session.account, 9, { monto: 500, metodo: 'EFECTIVO' });
    server.use(http.post(`${API}/reparaciones/9/cobros`, () => new HttpResponse(null, { status: 401 })));
    await expect(apiClient.post('/reparaciones/9/cobros', attempt.payload, { chargeSession: session })).rejects.toBeTruthy();
    expect(authStore.getState().isAuthenticated).toBe(false);
    expect(readPendingCharge(session.account, 9)).toBeNull();
  });

  it('no despacha un intento capturado antes de un logout y login de la misma cuenta', async () => {
    const oldSession = login();
    authStore.getState().logout();
    login();
    let calls = 0;
    server.use(http.post(`${API}/reparaciones/9/cobros`, () => { calls += 1; return HttpResponse.json({ id: 7 }); }));
    await expect(apiClient.post('/reparaciones/9/cobros', {}, { chargeSession: oldSession })).rejects.toBeTruthy();
    expect(calls).toBe(0);
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('no publica upgrades ni verificación para una sesión reemplazada', async () => {
    const session = login();
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const sent = new Promise<void>((resolve) => { started = resolve; });
    const listener = vi.fn();
    window.addEventListener(LIMITE_PLAN_EVENT, listener);
    server.use(http.post(`${API}/reparaciones/9/cobros`, async () => {
      started(); await held;
      return new HttpResponse(null, { status: 402 });
    }));
    try {
      const result = apiClient.post('/reparaciones/9/cobros', {}, { chargeSession: session }).catch(() => undefined);
      await sent;
      authStore.getState().logout();
      login();
      release();
      await result;
      expect(listener).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally {
      release();
      window.removeEventListener(LIMITE_PLAN_EVENT, listener);
    }
  });
});

it('ignora la validación tardía del 403 de un cobro tras logout/login con el mismo token', async () => {
  const token = `header.${btoa(JSON.stringify({ sub: 'a@a.com', tallerId: 1, exp: Date.now() / 1000 + 3600 }))}.sig`;
  authStore.getState().login(token, 'a@a.com');
  const session = { account: chargeAccount(token, true)!, generation: chargeGeneration() };
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const validating = new Promise<void>((resolve) => { started = resolve; });
  server.use(
    http.post(`${API}/reparaciones/9/cobros`, () => new HttpResponse(null, { status: 403 })),
    http.get(`${API}/suscripcion`, async () => { started(); await held; return new HttpResponse(null, { status: 403 }); }),
  );
  const result = apiClient.post('/reparaciones/9/cobros', {}, { chargeSession: session }).catch(() => undefined);
  await validating;
  authStore.getState().logout();
  authStore.getState().login(token, 'a@a.com');
  release();
  await result;
  expect(authStore.getState().isAuthenticated).toBe(true);
  expect(authStore.getState().token).toBe(token);
});
