import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { apiClient } from '../axios';
import { authStore } from '../../store/auth.store';
import { server, API } from '../../test/server';
import { fetchPerfil, PERFIL_KEY, refreshCurrentSessionProfile, usePerfilQuery } from './perfil.queries';
import type { Perfil } from '../../types';

const b64url = (value: object) => btoa(JSON.stringify(value))
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const tokenVigente = () => `${b64url({ alg: 'HS256' })}.${b64url({
  sub: 'juan@celexpress.com',
  role: 'ROLE_ADMIN',
  tallerId: 7,
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.firma`;

const perfil: Perfil = {
  usuario: {
    id: 12,
    username: 'Juan Pérez',
    email: 'juan@celexpress.com',
    role: 'ADMIN',
    emailVerificado: true,
  },
  taller: {
    id: 7,
    nombre: 'CelExpress',
    telefono: '1133334444',
  },
};

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  authStore.getState().logout();
});

describe('perfil query', () => {
  it('Cuenta puede limitar la espera del perfil sin alterar los demás consumidores', async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: perfil });
    await expect(fetchPerfil(signal, 20_000)).resolves.toEqual(perfil);
    expect(get).toHaveBeenCalledWith('/perfil', { signal, errorMode: 'inline', sessionValidation: 'profile', timeout: 20_000 });
  });
  it('envía la señal de cancelación y delega el error a la superficie inline', async () => {
    const controller = new AbortController();
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: perfil });

    await expect(fetchPerfil(controller.signal)).resolves.toEqual(perfil);

    expect(get).toHaveBeenCalledWith('/perfil', {
      signal: controller.signal,
      errorMode: 'inline',
      sessionValidation: 'profile',
    });
  });

  it('deduplica el request cuando dos observadores usan la identidad actual', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/perfil`, async () => {
        requests += 1;
        await delay(25);
        return HttpResponse.json(perfil);
      }),
    );
    authStore.getState().login(tokenVigente(), perfil.usuario.email);

    const { result } = renderHook(
      () => ({ first: usePerfilQuery(), second: usePerfilQuery() }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.first.isSuccess).toBe(true));
    expect(result.current.second.data).toEqual(perfil);
    expect(requests).toBe(1);
  });

  it('no consulta el backend cuando no existe una sesión autenticada vigente', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/perfil`, () => {
        requests += 1;
        return HttpResponse.json(perfil);
      }),
    );

    const { result } = renderHook(() => usePerfilQuery(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toBe(0);
  });

  it.each([undefined, null, 'true'])('rechaza verificación ausente o inválida: %s', async (emailVerificado) => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json({
      ...perfil, usuario: { ...perfil.usuario, emailVerificado },
    })));
    await expect(fetchPerfil()).rejects.toThrow();
  });

  it('refresca desde el servidor sin convertir el boolean persistido en permiso', async () => {
    const client = new QueryClient();
    const remoto = { ...perfil, usuario: { ...perfil.usuario, emailVerificado: false } };
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json(remoto)));
    authStore.getState().login(tokenVigente(), perfil.usuario.email, true);
    client.setQueryData(PERFIL_KEY, perfil);
    client.setQueryData(['account-session', 'prueba'], perfil);

    await expect(refreshCurrentSessionProfile(client)).resolves.toEqual(remoto);

    expect(client.getQueryData(PERFIL_KEY)).toEqual(remoto);
    expect(client.getQueryState(PERFIL_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(['account-session', 'prueba'])?.isInvalidated).toBe(true);
    expect(authStore.getState().emailVerificado).toBe(true);
  });

  it('no publica un refresco pendiente si cambió la sesión', async () => {
    const client = new QueryClient();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requested = false;
    server.use(http.get(`${API}/perfil`, async () => {
      requested = true;
      await pending;
      return HttpResponse.json(perfil);
    }));
    authStore.getState().login(tokenVigente(), perfil.usuario.email, false);
    const refresh = refreshCurrentSessionProfile(client);
    await waitFor(() => expect(requested).toBe(true));
    authStore.getState().logout();
    release();

    await expect(refresh).resolves.toBeNull();
    expect(client.getQueryData(PERFIL_KEY)).toBeUndefined();
  });

  it('no pide perfil para una visita anónima', async () => {
    const get = vi.spyOn(apiClient, 'get');
    await expect(refreshCurrentSessionProfile(new QueryClient())).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});
