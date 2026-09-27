import { chargeAccount, chargeGeneration, prepareCharge, readPendingCharge } from '../utils/pendingCharge';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { authStore, isChargeSessionCurrent, useAuth } from './auth.store';
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

describe('authStore — recuperación de cobros', () => {
  it('preserves the exact pending operation and cache when the same account renews after expiry', () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const token = makeToken('ROLE_ADMIN');
    authStore.getState().login(token, 'a@a.com');
    const account = chargeAccount(token, true)!;
    const generation = chargeGeneration();
    const saved = prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO', referencia: 'OP-1' });
    const storageKey = sessionStorage.key(0)!;
    const serialized = sessionStorage.getItem(storageKey);
    queryClient.setQueryData(['dashboard'], { reparaciones: 4 });

    clock.mockReturnValue(now + 3_600_000);
    const renewedToken = makeToken('ROLE_ADMIN');
    expect(renewedToken).not.toBe(token);
    authStore.getState().login(renewedToken, 'a@a.com');

    expect(readPendingCharge(account, 9)).toEqual(saved);
    expect(sessionStorage.getItem(storageKey)).toBe(serialized);
    expect(chargeGeneration()).toBe(generation);
    expect(isChargeSessionCurrent({ account, generation })).toBe(true);
    expect(queryClient.getQueryData(['dashboard'])).toEqual({ reparaciones: 4 });
    expect(authStore.getState().token).toBe(renewedToken);
  });

  it('keeps captured session identity across expiry but invalidates it after logout and login', () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const token = makeToken('ROLE_ADMIN');
    authStore.getState().login(token, 'a@a.com');
    const session = { account: chargeAccount(token, true)!, generation: chargeGeneration() };

    clock.mockReturnValue(now + 3_600_000);
    expect(chargeAccount(token, true)).toBeNull();
    expect(isChargeSessionCurrent(session)).toBe(true);

    authStore.getState().logout();
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'a@a.com');
    expect(isChargeSessionCurrent(session)).toBe(false);
  });

  it('conserva el intento durante la rehidratación inicial de una sesión válida', async () => {
    const token = makeToken('ROLE_ADMIN');
    authStore.getState().login(token, 'a@a.com');
    const account = chargeAccount(token, true)!;
    const saved = prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO' });
    const persisted = localStorage.getItem('ordenfix-auth')!;
    authStore.setState({ token: null, email: null, isAuthenticated: false });
    localStorage.setItem('ordenfix-auth', persisted);
    await authStore.persist.rehydrate();
    expect(readPendingCharge(account, 9)).toEqual(saved);
  });

  it('still logs out and purges recovery when an expired session is rehydrated', async () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const token = makeToken('ROLE_ADMIN');
    authStore.getState().login(token, 'a@a.com');
    const account = chargeAccount(token, true)!;
    const generation = chargeGeneration();
    prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO' });
    const persisted = localStorage.getItem('ordenfix-auth')!;
    authStore.setState({ token: null, email: null, isAuthenticated: false });
    localStorage.setItem('ordenfix-auth', persisted);

    clock.mockReturnValue(now + 3_600_000);
    await authStore.persist.rehydrate();

    expect(authStore.getState().isAuthenticated).toBe(false);
    expect(authStore.getState().token).toBeNull();
    expect(readPendingCharge(account, 9)).toBeNull();
    expect(chargeGeneration()).toBeGreaterThan(generation);
  });

  it.each(['logout', 'tenant', 'subject', 'role'])('purga sólo la recuperación de cobros al cambiar %s', (change) => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'a@a.com');
    const account = chargeAccount(authStore.getState().token, true)!;
    prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO' });
    sessionStorage.setItem('unrelated', 'keep');
    if (change === 'logout') authStore.getState().logout();
    if (change === 'tenant') authStore.getState().login(makeToken('ROLE_ADMIN', 2), 'a@a.com');
    if (change === 'role') authStore.getState().login(makeToken('ROLE_USER'), 'a@a.com');
    if (change === 'subject') {
      const token = `header.${b64url({ sub: 'another@example.com', tallerId: 1, role: 'ROLE_ADMIN', exp: Date.now() / 1000 + 3600 })}.sig`;
      authStore.getState().login(token, 'a@a.com');
    }
    expect(readPendingCharge(account, 9)).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('renueva la misma identidad sin borrar la operación', () => {
    const token = makeToken('ROLE_ADMIN');
    authStore.getState().login(token, 'a@a.com');
    const account = chargeAccount(token, true)!;
    const saved = prepareCharge(account, 9, { monto: 500, metodo: 'EFECTIVO' });
    authStore.getState().login(token, 'a@a.com');
    expect(readPendingCharge(account, 9)).toEqual(saved);
  });
});
