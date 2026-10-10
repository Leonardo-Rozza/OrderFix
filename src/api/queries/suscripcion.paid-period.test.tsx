import { apiClient } from '../axios';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCancelarSuscripcionMutation } from '../mutations/pagos.mutations';
import { useSuscripcionQuery, SUSCRIPCION_KEY } from './suscripcion.queries';
import { authStore } from '../../store/auth.store';
import { API, server } from '../../test/server';
import { showError, showSuccess } from '../../utils/toast';

vi.mock('../../utils/toast', async (original) => ({
  ...await original<typeof import('../../utils/toast')>(), showError: vi.fn(), showSuccess: vi.fn(),
}));
let tokenExpiry = 0;
const token = (email = 'owner@synthetic.invalid') => `header.${btoa(JSON.stringify({
  sub: email, tallerId: 1, role: 'ROLE_ADMIN', exp: tokenExpiry,
}))}.signature`;
const login = (email = 'owner@synthetic.invalid') => authStore.getState().login(token(email), email);
const paid = {
  plan: 'PRO' as const, estado: 'ACTIVA' as const, fechaInicio: null, fechaFinTrial: null,
  proximoCobro: null, reparacionesEsteMes: 0, limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
  accesoProHasta: '2030-11-08T13:45:00Z', renovacionCancelada: true,
};
const free = { ...paid, plan: 'FREE' as const, limiteReparacionesMes: 25,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false } };
const restricted = [['inventario'], ['caja'], ['cobros', 7], ['datos-cobro'], ['recibo', 7]];
const clients: QueryClient[] = [];
const gates: (() => void)[] = [];
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  restricted.forEach(key => client.setQueryData(key, { retained: true }));
  client.setQueryData(['clientes'], { retained: true });
  return { client, wrapper };
};
beforeEach(() => { tokenExpiry = Math.floor(Date.now() / 1000) + 3600; login(); vi.mocked(showSuccess).mockClear(); vi.mocked(showError).mockClear(); });
afterEach(async () => {
  await act(async () => { gates.splice(0).forEach(release => release()); });
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  act(() => { authStore.getState().logout(); });
  if (vi.isFakeTimers()) vi.clearAllTimers();
  vi.restoreAllMocks(); vi.useRealTimers();
});

describe('server-confirmed paid access', () => {
  it('retains PRO and restricted caches after renewal cancellation', async () => {
    server.use(http.post(`${API}/pagos/suscripcion/cancelar`, () => HttpResponse.json(paid)));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });
    await act(async () => { await result.current.mutateAsync(); });
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(paid);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
    expect(showSuccess).not.toHaveBeenCalledWith('Tu plan volvió a FREE.');
  });
  it('purges only restricted data on server-confirmed effective FREE reads without self-aborting', async () => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(free)));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useSuscripcionQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(free);
    restricted.forEach(key => expect(client.getQueryData(key)).toBeUndefined());
    expect(client.getQueryData(['clientes'])).toEqual({ retained: true });
  });
  it('retains trial capabilities and caches on FREE/TRIAL reads', async () => {
    const trial = { ...paid, plan: 'FREE', estado: 'TRIAL', accesoProHasta: null, renovacionCancelada: false };
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(trial)));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useSuscripcionQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
  });
  it.each([0, 502, 401])('ignores a late cancellation after A to B to A (failure=%s)', async failure => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    let started = false;
    server.use(http.post(`${API}/pagos/suscripcion/cancelar`, async () => {
      started = true; await gate;
      return failure ? HttpResponse.json({ message: 'Old failure' }, { status: failure }) : HttpResponse.json(free);
    }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });
    let request!: Promise<unknown>;
    act(() => { request = result.current.mutateAsync().catch(() => undefined); });
    await waitFor(() => expect(started).toBe(true));
    act(() => { login('other@synthetic.invalid'); login(); });
    client.setQueryData(SUSCRIPCION_KEY, paid);
    await act(async () => { release(); await request; });
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(paid);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
    expect(showSuccess).not.toHaveBeenCalled(); expect(showError).not.toHaveBeenCalled();
  });
  it('does not publish a stale successful read after the session changes', async () => {
    let release!: () => void; let started = false;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    server.use(http.get(`${API}/suscripcion`, async () => { started = true; await gate; return HttpResponse.json(free); }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useSuscripcionQuery(), { wrapper });
    await waitFor(() => expect(started).toBe(true));
    act(() => { login('other@synthetic.invalid'); login(); });
    await act(async () => { release(); });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data).not.toEqual(free);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
  });
});

describe('subscription read ordering', () => {
  it('aborts the older GET before publishing the newer cancellation response', async () => {
    let release!: () => void; let started = false;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    server.use(
      http.get(`${API}/suscripcion`, async () => { started = true; await gate; return HttpResponse.json({ ...paid, renovacionCancelada: false }); }),
      http.post(`${API}/pagos/suscripcion/cancelar`, () => HttpResponse.json(paid)),
    );
    const { client, wrapper } = setup();
    const get = vi.spyOn(apiClient, 'get');
    const { result } = renderHook(() => ({ read: useSuscripcionQuery(), cancel: useCancelarSuscripcionMutation() }), { wrapper });
    await waitFor(() => expect(started).toBe(true));
    let cancellation!: Promise<unknown>;
    act(() => { cancellation = result.current.cancel.mutateAsync(); });
    try {
      await waitFor(() => expect(get.mock.calls[0][1]?.signal?.aborted).toBe(true));
    } finally { release(); }
    await act(async () => { await cancellation; });
    await waitFor(() => expect(result.current.read.isFetching).toBe(false));
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(paid);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
  });
});


describe('mutation completion scope', () => {
  it('rejects UI completion if the account changes during reconciliation', async () => {
    server.use(http.post(`${API}/pagos/suscripcion/cancelar`, () => HttpResponse.json(paid)));
    const { client, wrapper } = setup();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    const cancel = vi.spyOn(client, 'cancelQueries').mockImplementationOnce(async () => { await gate; });
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });
    let completion!: Promise<{ resolved: boolean }>;
    act(() => { completion = result.current.mutateAsync().then(() => ({ resolved: true }), () => ({ resolved: false })); });
    await waitFor(() => expect(cancel).toHaveBeenCalled());
    act(() => { login('other@synthetic.invalid'); client.setQueryData(SUSCRIPCION_KEY, free); });
    await act(async () => { release(); expect(await completion).toEqual({ resolved: false }); });
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(free);
    expect(showSuccess).not.toHaveBeenCalled(); expect(showError).not.toHaveBeenCalled();
  });
});

describe('scoped forbidden-response validation', () => {
  it.each([401, 403])('does not affect a replacement account after delayed validation status %s', async status => {
    let release!: () => void; let validating = false;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    server.use(
      http.post(`${API}/pagos/suscripcion/cancelar`, () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 })),
      http.get(`${API}/suscripcion`, async () => {
        validating = true; await gate;
        return HttpResponse.json(status === 403 ? { code: 'EMAIL_NO_VERIFICADO' } : {}, { status });
      }),
    );
    const notification = vi.fn();
    window.addEventListener('ofx:email-verification-required', notification);
    const { wrapper } = setup();
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });
    let completion!: Promise<unknown>;
    act(() => { completion = result.current.mutateAsync().catch(() => undefined); });
    try {
      await waitFor(() => expect(validating).toBe(true));
      act(() => { login('other@synthetic.invalid'); login(); });
      await act(async () => { release(); await completion; });
      expect(authStore.getState().isAuthenticated).toBe(true);
      expect(notification).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally { release(); window.removeEventListener('ofx:email-verification-required', notification); }
  });
});

describe('unauthenticated cancellation dispatch', () => {
  it('does not dispatch cancellation without a current authenticated session', async () => {
    act(() => { authStore.getState().logout(); });
    let requests = 0;
    server.use(http.post(`${API}/pagos/suscripcion/cancelar`, () => { requests++; return HttpResponse.json(paid); }));
    const { wrapper } = setup();
    const { result } = renderHook(() => useCancelarSuscripcionMutation(), { wrapper });
    await act(async () => { await result.current.mutateAsync().catch(() => undefined); });
    expect(requests).toBe(0); expect(showSuccess).not.toHaveBeenCalled();
  });
});

describe('server revalidation at the paid deadline', () => {
  const prepare = () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2030-11-08T13:44:59Z')); tokenExpiry = Math.floor(Date.now() / 1000) + 3600; act(() => { login(); });
    const setupValue = setup();
    setupValue.client.setQueryData(SUSCRIPCION_KEY, paid);
    return setupValue;
  };
  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };
  it('shares one deadline timer and keeps PRO while the server read is pending', async () => {
    let reads = 0; let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    server.use(http.get(`${API}/suscripcion`, async () => { reads++; await gate; return HttpResponse.json(free); }));
    const { client, wrapper } = prepare();
    const { result } = renderHook(() => [useSuscripcionQuery(), useSuscripcionQuery(), useSuscripcionQuery(false)], { wrapper });
    await advance(0); // Flush React Query notification work before counting deadline timers.
    expect(vi.getTimerCount()).toBe(1);
    await advance(1001);
    expect(reads).toBe(1);
    expect(result.current[0].data).toEqual(paid);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
    await act(async () => { release(); await vi.advanceTimersByTimeAsync(100); });
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(free);
    restricted.forEach(key => expect(client.getQueryData(key)).toBeUndefined());
    expect(result.current[0].isSuccess).toBe(true);
  });
  it('preserves an in-flight server read spanning the deadline without aborting or duplicating it', async () => {
    let reads = 0; let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; gates.push(resolve); });
    server.use(http.get(`${API}/suscripcion`, async () => { reads++; await gate; return HttpResponse.json(free); }));
    const { client, wrapper } = prepare();
    const get = vi.spyOn(apiClient, 'get');
    renderHook(() => useSuscripcionQuery(), { wrapper });
    let read!: Promise<void>;
    act(() => { read = client.refetchQueries({ queryKey: SUSCRIPCION_KEY, exact: true }); });
    await advance(100);
    expect(reads).toBe(1);
    const signal = get.mock.calls[0][1]?.signal;
    await advance(1000);
    expect(signal?.aborted).toBe(false); expect(reads).toBe(1);
    await act(async () => { release(); await read; await vi.advanceTimersByTimeAsync(0); });
    expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(free);
  });
  it('never locally downgrades or loops if the server still confirms PRO', async () => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(paid); }));
    const { client, wrapper } = prepare();
    renderHook(() => useSuscripcionQuery(), { wrapper });
    await advance(1001); await advance(10000);
    expect(reads).toBe(1); expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(paid);
    restricted.forEach(key => expect(client.getQueryData(key)).toEqual({ retained: true }));
  });
  it('does not create an expiry read for disabled-only observers', async () => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { wrapper } = prepare();
    renderHook(() => useSuscripcionQuery(false), { wrapper });
    await advance(2000); expect(reads).toBe(0);
  });
  it('releases the timer when the last enabled observer leaves', async () => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { wrapper } = prepare();
    const { rerender } = renderHook(({ enabled }) => useSuscripcionQuery(enabled), { initialProps: { enabled: true }, wrapper });
    rerender({ enabled: false }); await advance(2000); expect(reads).toBe(0);
  });
  it('releases an unmounted observer timer', async () => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { wrapper } = prepare();
    const hook = renderHook(() => useSuscripcionQuery(), { wrapper });
    hook.unmount(); await advance(2000); expect(reads).toBe(0);
  });
  it('replaces the obsolete deadline without losing paid access', async () => {
    let reads = 0;
    const extended = { ...paid, accesoProHasta: '2030-11-08T13:45:02Z' };
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { client, wrapper } = prepare();
    renderHook(() => useSuscripcionQuery(), { wrapper });
    act(() => client.setQueryData(SUSCRIPCION_KEY, extended));
    await advance(1001); expect(reads).toBe(0); expect(client.getQueryData(SUSCRIPCION_KEY)).toEqual(extended);
    await advance(2000); expect(reads).toBe(1);
  });
  it('stops an obsolete account timer when session data is cleared', async () => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { client, wrapper } = prepare();
    renderHook(() => useSuscripcionQuery(), { wrapper });
    act(() => { authStore.getState().logout(); client.clear(); });
    await advance(2000); expect(reads).toBe(0);
  });
  it.each([null, undefined, 'invalid', '2030-11-08'])('does not infer a deadline from invalid or absent expiry %s', async expiry => {
    let reads = 0;
    server.use(http.get(`${API}/suscripcion`, () => { reads++; return HttpResponse.json(free); }));
    const { client, wrapper } = prepare();
    client.setQueryData(SUSCRIPCION_KEY, { ...paid, accesoProHasta: expiry, proximoCobro: '2030-11-08' });
    renderHook(() => useSuscripcionQuery(), { wrapper });
    await advance(10000); expect(reads).toBe(0); expect(client.getQueryData(SUSCRIPCION_KEY)).toMatchObject({ plan: 'PRO' });
  });
});
