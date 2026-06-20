import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { authStore, useAuth } from './auth.store';

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (role: string) =>
  `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'a@a.com', role, exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

beforeEach(() => {
  authStore.getState().logout();
});

describe('useAuth — derivación de rol', () => {
  it('isAdmin true para ROLE_ADMIN', () => {
    authStore.getState().login(makeToken('ROLE_ADMIN'), 'a@a.com');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe('ROLE_ADMIN');
  });

  it('isAdmin false para ROLE_USER', () => {
    authStore.getState().login(makeToken('ROLE_USER'), 'a@a.com');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(false);
  });

  it('isAdmin false sin sesión', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBeNull();
  });
});
