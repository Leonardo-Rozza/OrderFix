import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../store/auth.store';
import { API, server } from '../../test/server';
import { useLoginMutation, useRegisterMutation } from './auth.mutations';

vi.mock('../../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  authStore.getState().logout();
  authStore.getState().login('bearer-anterior', 'cuenta-anterior@taller.com');
});

describe('mutaciones públicas de autenticación', () => {
  it('login no adjunta el Bearer de una sesión anterior', async () => {
    let authorization: string | null = 'sin-request';
    server.use(
      http.post(`${API}/auth/login`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({
          token: 'token-nuevo',
          type: 'Bearer',
          email: 'admin@taller.com',
          emailVerificado: true,
        });
      })
    );
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: 'admin@taller.com', password: 'secreto' });
    });

    expect(authorization).toBeNull();
  });

  it('registro no adjunta el Bearer de una sesión anterior', async () => {
    let authorization: string | null = 'sin-request';
    let idempotencyKey: string | null = 'sin-request';
    let body: unknown;
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        authorization = request.headers.get('authorization');
        idempotencyKey = request.headers.get('idempotency-key');
        body = await request.json();
        return HttpResponse.json({
          token: 'token-nuevo',
          type: 'Bearer',
          email: 'admin@nuevo.com',
          emailVerificado: false,
        });
      })
    );
    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        nombreTaller: 'Taller Nuevo',
        nombreAdmin: 'Ana',
        email: 'admin@nuevo.com',
        password: 'secreto',
      });
    });

    expect(authorization).toBeNull();
    expect(idempotencyKey).toBeNull();
    expect(body).toEqual({ nombreTaller: 'Taller Nuevo', nombreAdmin: 'Ana', email: 'admin@nuevo.com', password: 'secreto' });
  });
});
