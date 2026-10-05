import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { authStore } from '../store/auth.store';
import { chargeGeneration } from '../utils/pendingCharge';
import {
  captureRepairEmailSession, canRetryRepairEmail, fetchRepairEmailStatus,
  isRepairEmailSessionCurrent, parseRepairEmailStatus, repairEmailStates, retryRepairEmail,
} from './repairEmail';

const login = (workshop = 3, subject = 'technician@workshop.test') => {
  const token = `header.${btoa(JSON.stringify({ sub: subject, tallerId: workshop, exp: Date.now() / 1000 + 3600 }))}.sig`;
  authStore.getState().login(token, subject);
  return captureRepairEmailSession()!;
};
beforeEach(() => { authStore.getState().logout(); window.history.pushState({}, '', '/login'); });

describe('repair email public metadata', () => {
  it.each(repairEmailStates)('retains %s without recipient or bearer data', (estado) => {
    expect(parseRepairEmailStatus({ estado, reintentable: false, email: 'private', codigoSeguimiento: 'private' }))
      .toEqual({ estado, reintentable: false });
  });
  it.each(['SIN_EMAIL', 'FALLO_PREVIO'])('requires explicit server permission for %s', (estado) => {
    expect(canRetryRepairEmail(parseRepairEmailStatus({ estado, reintentable: true }))).toBe(true);
    expect(canRetryRepairEmail(parseRepairEmailStatus({ estado, reintentable: false }))).toBe(false);
  });
  it.each([
    null, undefined, [], {}, { estado: 'NEW_STATE', reintentable: true },
    { estado: 'SIN_EMAIL', reintentable: 'true' }, { estado: 'SIN_EMAIL', reintentable: 1 },
    { estado: 'SIN_EMAIL' }, { estado: 3, reintentable: true },
    ...repairEmailStates.filter((estado) => !['SIN_EMAIL', 'FALLO_PREVIO'].includes(estado))
      .map((estado) => ({ estado, reintentable: true })),
  ])('fails closed for malformed, unknown or incoherent metadata %#', (data) => {
    expect(parseRepairEmailStatus(data)).toEqual({ estado: 'UNKNOWN', reintentable: false });
  });
});

describe('repair email transport', () => {
  it('reads inline and posts only an empty body with no query or automatic resends', async () => {
    const session = login();
    let reads = 0;
    let posts = 0;
    server.use(
      http.get(`${API}/reparaciones/9/notificacion-email`, () => {
        reads++; return HttpResponse.json({ estado: 'FALLO_PREVIO', reintentable: true });
      }),
      http.post(`${API}/reparaciones/9/notificacion-email/reintentos`, async ({ request }) => {
        posts++;
        expect(await request.text()).toBe('');
        expect(new URL(request.url).search).toBe('');
        expect(request.headers.has('authorization')).toBe(true);
        // A race can return current state without a new queue admission.
        return HttpResponse.json({ estado: 'INCIERTO', reintentable: false });
      }),
    );
    expect(await fetchRepairEmailStatus(9, session)).toEqual({ estado: 'FALLO_PREVIO', reintentable: true });
    expect(await retryRepairEmail(9, session)).toEqual({ estado: 'INCIERTO', reintentable: false });
    expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
  });
  it.each([0, -1, NaN, Infinity, 1.2, Number.MAX_SAFE_INTEGER + 1])('rejects invalid repair scope %s', async (id) => {
    await expect(fetchRepairEmailStatus(id, login())).rejects.toThrow('Invalid repair email scope');
  });
  it.each(['account', 'workshop', 'logout'])('rejects a captured %s replacement', async (reason) => {
    const captured = login();
    if (reason === 'account') login(3, 'other@workshop.test');
    else if (reason === 'workshop') login(4);
    else { authStore.getState().logout(); login(); }
    await expect(fetchRepairEmailStatus(9, captured)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await expect(retryRepairEmail(9, captured)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });
  it('preserves same-account renewal scope and rejects new dispatch after expiry', async () => {
    const now = 2_000_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const captured = login();
    const generation = chargeGeneration();
    clock.mockReturnValue(now + 3_600_000);
    expect(isRepairEmailSessionCurrent(captured)).toBe(true);
    expect(captureRepairEmailSession()).toBeNull();
    await expect(retryRepairEmail(9, captured)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    const renewed = login();
    expect(renewed).toEqual(captured);
    expect(chargeGeneration()).toBe(generation);
  });
});
