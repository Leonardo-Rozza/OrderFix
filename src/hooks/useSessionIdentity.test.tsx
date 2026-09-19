import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { authStore } from '../store/auth.store';
import { server, API } from '../test/server';
import { useSessionIdentity } from './useSessionIdentity';

const b64url = (value: object) => btoa(JSON.stringify(value))
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const tokenVigente = (role = 'ROLE_ADMIN') => `${b64url({ alg: 'HS256' })}.${b64url({
  sub: 'fallback@taller.com',
  role,
  tallerId: 7,
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.firma`;

const perfil = {
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

describe('useSessionIdentity', () => {
  it('deriva usuario, saludo, taller, rol e iniciales desde el perfil remoto', async () => {
    server.use(http.get(`${API}/perfil`, () => HttpResponse.json(perfil)));
    authStore.getState().login(tokenVigente(), 'fallback@taller.com');

    const { result } = renderHook(() => useSessionIdentity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      nombre: 'Juan Pérez',
      nombreSaludo: 'Juan Pérez',
      taller: 'CelExpress',
      email: 'juan@celexpress.com',
      rol: 'ADMIN',
      rolVisible: 'Administrador',
      iniciales: 'JP',
      isFallback: false,
      isError: false,
    });
  });

  it('degrada al email y al rol del JWT, y permite reintentar el perfil', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/perfil`, () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json({ message: 'No disponible' }, { status: 500 })
          : HttpResponse.json({
              ...perfil,
              usuario: { ...perfil.usuario, role: 'USER' },
            });
      }),
    );
    authStore.getState().login(tokenVigente('ROLE_USER'), 'fallback@taller.com');

    const { result } = renderHook(() => useSessionIdentity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({
      nombre: 'fallback@taller.com',
      nombreSaludo: 'fallback',
      taller: 'Mi taller',
      email: 'fallback@taller.com',
      rol: 'USER',
      rolVisible: 'Empleado',
      iniciales: 'F',
      isFallback: true,
    });
    expect(result.current.refetch).toEqual(expect.any(Function));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isFallback).toBe(false));
    expect(result.current.nombre).toBe('Juan Pérez');
    expect(requests).toBe(2);
  });
});
