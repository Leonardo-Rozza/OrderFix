import { describe, it, expect } from 'vitest';
import { decodeToken, isTokenExpired, normalizeRole } from './jwt';

// Arma un JWT de mentira (header.payload.signature) con el payload dado.
const b64url = (obj: object) =>
  btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`;

describe('decodeToken', () => {
  it('decodifica el payload de un JWT válido', () => {
    const token = makeToken({ sub: 'admin@mvgr.com', role: 'ROLE_ADMIN', exp: 1782063282 });
    const claims = decodeToken(token);
    expect(claims?.sub).toBe('admin@mvgr.com');
    expect(claims?.role).toBe('ROLE_ADMIN');
  });

  it('devuelve null ante token nulo o malformado', () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken('no-es-jwt')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('true si exp está en el pasado', () => {
    const token = makeToken({ sub: 'x', exp: Math.floor(Date.now() / 1000) - 60 });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('false si exp está en el futuro', () => {
    const token = makeToken({ sub: 'x', exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(token)).toBe(false);
  });

  it('false si el token no trae exp', () => {
    const token = makeToken({ sub: 'x' });
    expect(isTokenExpired(token)).toBe(false);
  });
});

describe('normalizeRole', () => {
  it('normaliza claims Spring Security y roles planos', () => {
    expect(normalizeRole('ROLE_ADMIN')).toBe('ADMIN');
    expect(normalizeRole('user')).toBe('USER');
  });

  it('rechaza coincidencias parciales y roles desconocidos', () => {
    expect(normalizeRole('ROLE_NOT_ADMIN')).toBeNull();
    expect(normalizeRole('SUPERUSER')).toBeNull();
  });
});
