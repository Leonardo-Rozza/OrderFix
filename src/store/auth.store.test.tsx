import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { authStore, useAuth } from './auth.store';
import { queryClient } from '../api/queryClient';

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (role: string, tallerId = 1) =>
  `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'a@a.com', role, tallerId, exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

beforeEach(() => {
  authStore.getState().logout();
});

describe('useAuth — derivación de rol', () => {
  it('isAdmin true para ROLE_ADMIN', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'a@a.com');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe('ADMIN');
  });

  it('isAdmin false para ROLE_USER', () => {
    authStore.getState().login(makeToken('ROLE_USER'), 'a@a.com');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBe('USER');
  });

  it('no eleva roles desconocidos que contienen la palabra ADMIN', () => {
    authStore.getState().login(makeToken('ROLE_NOT_ADMIN'), 'a@a.com');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBeNull();
  });

  it('isAdmin false sin sesión', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBeNull();
  });
});

describe('authStore — aislamiento de caché por identidad', () => {
  it('purga los datos tenant-scoped al cerrar sesión', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'a@a.com');
    queryClient.setQueryData(['clientes'], [{ id: 1, nombre: 'Cliente del taller A' }]);
    queryClient.setQueryData(['perfil'], { usuario: { id: 1 }, taller: { id: 1 } });

    authStore.getState().logout();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('purga la caché antes de reemplazar una identidad por otra', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'admin@taller-a.com');
    queryClient.setQueryData(['reparaciones'], [{ id: 99, taller: 'A' }]);

    authStore.getState().login(makeToken('ROLE_USER'), 'empleado@taller-b.com');

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('conserva la caché al renovar la sesión de la misma identidad', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'admin@taller.com');
    queryClient.setQueryData(['dashboard'], { reparaciones: 4 });

    authStore.getState().login(makeToken('ROLE_ADMIN'), 'admin@taller.com');

    expect(queryClient.getQueryData(['dashboard'])).toEqual({ reparaciones: 4 });
  });

  it('purga la caché si el mismo email cambia de tenant', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN', 1), 'admin@taller.com');
    queryClient.setQueryData(['perfil'], { usuario: { id: 1 }, taller: { id: 1 } });

    authStore.getState().login(makeToken('ROLE_ADMIN', 2), 'admin@taller.com');

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('purga el perfil si la misma cuenta cambia de rol', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN', 1), 'admin@taller.com');
    queryClient.setQueryData(['perfil'], { usuario: { id: 1 }, taller: { id: 1 } });

    authStore.getState().login(makeToken('ROLE_USER', 1), 'admin@taller.com');

    expect(queryClient.getQueryState(['perfil'])).toBeUndefined();
  });

  it('purga el perfil si cambia el email de la sesión', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN', 1), 'admin@taller.com');
    queryClient.setQueryData(['perfil'], { usuario: { id: 1 }, taller: { id: 1 } });

    authStore.getState().login(makeToken('ROLE_ADMIN', 1), 'otro@taller.com');

    expect(queryClient.getQueryState(['perfil'])).toBeUndefined();
  });
});
