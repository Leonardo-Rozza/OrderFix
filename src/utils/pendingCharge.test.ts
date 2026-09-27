import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chargeAccount, chargeAccountIdentity, readPendingCharge, prepareCharge, allowChargeCorrection, clearPendingCharge, purgePendingCharges, chargeGeneration } from './pendingCharge';

const token = (sub = ' A@Example.com ', tallerId = 2, exp = Date.now() / 1000 + 3600) =>
  `header.${btoa(JSON.stringify({ sub, tallerId, exp }))}.signature`;
const account = JSON.stringify(['a@example.com', 2]);
const payload = { monto: 500, metodo: 'EFECTIVO' as const, referencia: '  OP-1 ', observaciones: ' nota ' };

beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); purgePendingCharges(); });

describe('pending charge recovery', () => {
  it('separates stable account identity from the exact expiry boundary', () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const captured = token(' A@Example.com ', 2, now / 1000 + 60);
    expect(chargeAccountIdentity(captured, true)).toBe(account);
    expect(chargeAccount(captured, true)).toBe(account);

    clock.mockReturnValue(now + 60_000);
    expect(chargeAccountIdentity(captured, true)).toBe(account);
    expect(chargeAccount(captured, true)).toBeNull();
    expect(chargeAccountIdentity(captured, false)).toBeNull();
  });

  it.each([
    { sub: '', tallerId: 2 },
    { sub: 'a', tallerId: 0 },
    { sub: 'a', tallerId: 1.5 },
    { sub: 'a', tallerId: '2' },
  ])('rejects malformed account scope %j independently of expiry', (claims) => {
    const malformed = `header.${btoa(JSON.stringify(claims))}.signature`;
    expect(chargeAccountIdentity(malformed, true)).toBeNull();
  });

  it.each([undefined, '2000000000', null])('does not permit dispatch with invalid expiry %s', (exp) => {
    const malformed = `header.${btoa(JSON.stringify({ sub: 'a', tallerId: 2, exp }))}.signature`;
    expect(chargeAccount(malformed, true)).toBeNull();
  });

  it('requires valid authenticated claims and normalizes subject', () => {
    expect(chargeAccount(token(), true)).toBe(account);
    expect(chargeAccount(token(), false)).toBeNull();
    expect(chargeAccount(token('', 2), true)).toBeNull();
    expect(chargeAccount(token('a', 0), true)).toBeNull();
    expect(chargeAccount(token('a', 2, 1), true)).toBeNull();
    expect(chargeAccount('invalid', true)).toBeNull();
  });

  it('persists a canonical exact request and never rotates an uncertain operation', () => {
    const first = prepareCharge(account, 9, payload);
    expect(first.payload).toEqual({ monto: 500, metodo: 'EFECTIVO', referencia: 'OP-1', observaciones: 'nota', operacionId: expect.any(String) });
    expect(JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!)).toEqual(first);
    expect(readPendingCharge(account, 9)).toEqual(first);
    expect(prepareCharge(account, 9, { monto: 900, metodo: 'TARJETA' })).toEqual(first);
    expect(readPendingCharge(account, 10)).toBeNull();
    expect(readPendingCharge('another-account', 9)).toBeNull();
  });

  it('only permits correction after explicit balance rejection and retains its UUID', () => {
    const first = prepareCharge(account, 9, payload);
    allowChargeCorrection(first);
    const corrected = prepareCharge(account, 9, { monto: 300, metodo: 'TARJETA' });
    expect(corrected.payload.operacionId).toBe(first.payload.operacionId);
    expect(corrected.payload.monto).toBe(300);
    expect(corrected.phase).toBe('pending');
  });

  it('clears only the exact captured request and allocates a new genuine operation', () => {
    const first = prepareCharge(account, 9, payload);
    allowChargeCorrection(first);
    const corrected = prepareCharge(account, 9, { ...payload, monto: 300 });
    clearPendingCharge(first);
    expect(readPendingCharge(account, 9)).toEqual(corrected);
    clearPendingCharge(corrected);
    expect(readPendingCharge(account, 9)).toBeNull();
    expect(prepareCharge(account, 9, payload).payload.operacionId).not.toBe(first.payload.operacionId);
  });

  it.each(['read', 'write', 'silent-write', 'corrupt'])('fails closed on %s without generating replacement identity', (failure) => {
    const first = prepareCharge(account, 9, payload);
    const key = sessionStorage.key(0)!;
    if (failure === 'corrupt') sessionStorage.setItem(key, '{broken');
    if (failure === 'read') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    if (failure === 'write') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    if (failure === 'silent-write') {
      allowChargeCorrection(first);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    }
    expect(() => prepareCharge(account, 9, { ...payload, monto: 300 })).toThrow();
  });

  it('purges only its namespace and advances the late-callback generation', () => {
    prepareCharge(account, 9, payload);
    sessionStorage.setItem('unrelated', 'keep');
    const generation = chargeGeneration();
    purgePendingCharges();
    expect(chargeGeneration()).toBeGreaterThan(generation);
    expect(readPendingCharge(account, 9)).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });
});


it.each([100000000, 1.001, -1, 0])('blocks an invalid stored monetary amount %s before replay', (monto) => {
  const attempt = prepareCharge(account, 9, payload);
  const key = sessionStorage.key(0)!;
  sessionStorage.setItem(key, JSON.stringify({ ...attempt, payload: { ...attempt.payload, monto } }));
  expect(() => readPendingCharge(account, 9)).toThrow();
});
