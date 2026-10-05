import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authStore } from '../../store/auth.store';
import { server, API } from '../../test/server';
import { captureRepairEmailSession, type RepairEmailStatus } from '../repairEmail';
import * as repairEmail from '../repairEmail';
import { queryKeys } from '../queryKeys';
import { useRepairEmailNotification } from './repairEmail.queries';

vi.mock('../../utils/toast', () => ({ showSuccess: vi.fn(), showError: vi.fn(), getErrorMessage: vi.fn() }));
import { showSuccess, showError } from '../../utils/toast';

const login = (workshop = 3) => {
  const token = `header.${btoa(JSON.stringify({ sub: 'technician@workshop.test', tallerId: workshop, exp: Date.now() / 1000 + 3600 }))}.sig`;
  authStore.getState().login(token, 'technician@workshop.test');
  return captureRepairEmailSession()!;
};
const createHarness = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
};
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
const statusUrl = `${API}/reparaciones/:id/notificacion-email`;
const retryUrl = `${statusUrl}/reintentos`;

beforeEach(() => { authStore.getState().logout(); login(); vi.mocked(showSuccess).mockClear(); vi.mocked(showError).mockClear(); });

describe('repair email notification hook', () => {
  it('refreshes with GET only, skips invalid scope and does not automatically retry failed reads', async () => {
    let reads = 0;
    let posts = 0;
    server.use(
      http.get(statusUrl, () => { reads++; return new HttpResponse(null, { status: 503 }); }),
      http.post(retryUrl, () => { posts++; return HttpResponse.json({ estado: 'PENDIENTE', reintentable: false }); }),
    );
    const { wrapper } = createHarness();
    const { result, rerender } = renderHook(({ id }) => useRepairEmailNotification(id), { wrapper, initialProps: { id: 0 } });
    expect(reads).toBe(0);
    rerender({ id: 9 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(reads).toBe(1);
    expect(result.current.canRetry).toBe(false);
    act(() => result.current.refresh());
    await waitFor(() => expect(reads).toBe(2));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(posts).toBe(0);
    expect(showError).not.toHaveBeenCalled();
  });

  it('deduplicates a pending manual POST and publishes only its authoritative current DTO', async () => {
    let reads = 0;
    let posts = 0;
    const started = deferred();
    const held = deferred();
    server.use(
      http.get(statusUrl, () => { reads++; return HttpResponse.json({ estado: 'FALLO_PREVIO', reintentable: true }); }),
      http.post(retryUrl, async ({ request }) => {
        posts++; expect(await request.text()).toBe(''); expect(new URL(request.url).search).toBe('');
        started.resolve(); await held.promise;
        return HttpResponse.json({ estado: 'INCIERTO', reintentable: false });
      }),
    );
    const { client, wrapper } = createHarness();
    const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.retry(); void result.current.retry(); });
    try {
      await started.promise;
      await waitFor(() => expect(result.current.isRetrying).toBe(true));
      expect(result.current.canRetry).toBe(false);
      act(() => result.current.refresh());
      expect(reads).toBe(1);
      expect(posts).toBe(1);
      const session = captureRepairEmailSession()!;
      expect(client.getQueryData(queryKeys.repairEmail.detail(9, session.generation)))
        .toEqual({ estado: 'FALLO_PREVIO', reintentable: false });
      await act(async () => { held.resolve(); await pending; });
      await waitFor(() => expect(result.current.status).toEqual({ estado: 'INCIERTO', reintentable: false }));
      expect(result.current.canRetry).toBe(false);
      expect(showSuccess).not.toHaveBeenCalled();
    } finally { held.resolve(); }
  });

  it('does not restore old retry permission after an uncertain POST; a fresh GET is required', async () => {
    let reads = 0;
    let posts = 0;
    server.use(
      http.get(statusUrl, () => { reads++; return HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true }); }),
      http.post(retryUrl, () => { posts++; return new HttpResponse(null, { status: 503 }); }),
    );
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    await act(async () => { await result.current.retry(); });
    await waitFor(() => expect(result.current.retryFailed).toBe(true));
    expect(result.current.canRetry).toBe(false);
    await act(async () => { await result.current.retry(); });
    expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.retryFailed).toBe(false);
    expect(reads).toBe(2);
    expect(showError).not.toHaveBeenCalled();
  });

  it.each(['repair', 'workshop', 'unmount'])('does not publish a late POST into a changed %s scope', async (change) => {
    const session = captureRepairEmailSession()!;
    const started = deferred();
    const held = deferred();
    server.use(
      http.get(statusUrl, () => HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true })),
      http.post(retryUrl, async () => { started.resolve(); await held.promise; return HttpResponse.json({ estado: 'PENDIENTE', reintentable: false }); }),
    );
    const { client, wrapper } = createHarness();
    const { result, rerender, unmount } = renderHook(({ id }) => useRepairEmailNotification(id), { wrapper, initialProps: { id: 9 } });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.retry(); });
    try {
      await started.promise;
      if (change === 'repair') rerender({ id: 10 });
      else if (change === 'workshop') act(() => { login(4); });
      else unmount();
      if (change !== 'unmount') await waitFor(() => expect(result.current.canRetry).toBe(true));
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      await act(async () => { held.resolve(); await pending; });
      expect(client.getQueryData<RepairEmailStatus>(queryKeys.repairEmail.detail(9, session.generation))?.estado).not.toBe('PENDIENTE');
      if (change !== 'unmount') {
        expect(result.current.status?.estado).toBe('SIN_EMAIL');
        expect(result.current.retryFailed).toBe(false);
      }
      expect(invalidate).not.toHaveBeenCalled();
      expect(showSuccess).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally { held.resolve(); }
  });

  it('ignores a late failed POST after replacement without showing the old error', async () => {
    const started = deferred();
    const held = deferred();
    server.use(
      http.get(statusUrl, () => HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true })),
      http.post(retryUrl, async () => { started.resolve(); await held.promise; return new HttpResponse(null, { status: 401 }); }),
    );
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.retry(); });
    try {
      await started.promise;
      act(() => { authStore.getState().logout(); login(); });
      await waitFor(() => expect(result.current.canRetry).toBe(true));
      await act(async () => { held.resolve(); await pending; });
      expect(authStore.getState().isAuthenticated).toBe(true);
      expect(result.current.retryFailed).toBe(false);
      expect(showError).not.toHaveBeenCalled();
    } finally { held.resolve(); }
  });

  it('cancels an old GET on repair navigation and never publishes its status into the new repair', async () => {
    const started = deferred();
    const held = deferred();
    server.use(http.get(statusUrl, async ({ params }) => {
      if (params.id === '9') { started.resolve(); await held.promise; return HttpResponse.json({ estado: 'ACEPTADO', reintentable: false }); }
      return HttpResponse.json({ estado: 'DESHABILITADO', reintentable: false });
    }));
    const { wrapper } = createHarness();
    const { result, rerender } = renderHook(({ id }) => useRepairEmailNotification(id), { wrapper, initialProps: { id: 9 } });
    try {
      await started.promise; rerender({ id: 10 });
      await waitFor(() => expect(result.current.status?.estado).toBe('DESHABILITADO'));
      await act(async () => { held.resolve(); await held.promise; });
      expect(result.current.status?.estado).toBe('DESHABILITADO');
    } finally { held.resolve(); }
  });
});

it('does not restore retry permission from a competing invalidation GET after an uncertain POST', async () => {
  const session = captureRepairEmailSession()!;
  const postStarted = deferred();
  const heldPost = deferred();
  const competingStarted = deferred();
  const heldCompeting = deferred();
  const freshStarted = deferred();
  const heldFresh = deferred();
  let reads = 0;
  let posts = 0;
  server.use(
    http.get(statusUrl, async () => {
      reads++;
      if (reads === 2) {
        // This response captured the pre-POST eligibility, not a new manual read.
        competingStarted.resolve(); await heldCompeting.promise;
      } else if (reads === 3) {
        freshStarted.resolve(); await heldFresh.promise;
      }
      return HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true });
    }),
    http.post(retryUrl, async () => {
      posts++;
      postStarted.resolve(); await heldPost.promise;
      return new HttpResponse(null, { status: 503 });
    }),
  );
  const { client, wrapper } = createHarness();
  const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
  await waitFor(() => expect(result.current.canRetry).toBe(true));
  let pending!: Promise<void>;
  act(() => { pending = result.current.retry(); });
  try {
    await postStarted.promise;
    act(() => { void client.invalidateQueries({ queryKey: queryKeys.repairEmail.byReparacion(9) }); });
    await competingStarted.promise;
    await act(async () => { heldPost.resolve(); await pending; });
    await waitFor(() => expect(result.current.retryFailed).toBe(true));
    await act(async () => { heldCompeting.resolve(); await heldCompeting.promise; });
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(client.getQueryData(queryKeys.repairEmail.detail(9, session.generation)))
      .toEqual({ estado: 'SIN_EMAIL', reintentable: true });
    expect(result.current.canRetry).toBe(false);
    await act(async () => { await result.current.retry(); });
    expect(posts).toBe(1);

    act(() => result.current.refresh());
    await freshStarted.promise;
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.canRetry).toBe(false);
    await act(async () => { await result.current.retry(); });
    expect(posts).toBe(1);
    await act(async () => { heldFresh.resolve(); await heldFresh.promise; });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.retryFailed).toBe(false);
    await act(async () => { await result.current.retry(); });
    expect({ reads, posts }).toEqual({ reads: 3, posts: 2 });
  } finally { heldPost.resolve(); heldCompeting.resolve(); heldFresh.resolve(); }
});

it.each(['PENDIENTE', 'INCIERTO'] as const)(
  'keeps the successful %s DTO when an obsolete GET finishes after the POST',
  async (estado) => {
    const session = captureRepairEmailSession()!;
    const key = queryKeys.repairEmail.detail(9, session.generation);
    const status: RepairEmailStatus = { estado, reintentable: false };
    const eligible: RepairEmailStatus = { estado: 'SIN_EMAIL', reintentable: true };
    const fresh: RepairEmailStatus = { estado: 'FALLO_PREVIO', reintentable: true };
    const postStarted = deferred();
    const heldPost = deferred();
    const competingStarted = deferred();
    const heldCompeting = deferred();
    const competingCompleted = deferred();
    let reads = 0;
    let competingSignal: AbortSignal | undefined;
    // This unit model deliberately ignores AbortSignal so a cancelled transport
    // still completes. Query cancellation, not cooperative HTTP abort, must fence it.
    vi.spyOn(repairEmail, 'fetchRepairEmailStatus').mockImplementation(async (_id, _session, signal) => {
      reads++;
      if (reads === 2) {
        competingSignal = signal;
        competingStarted.resolve();
        await heldCompeting.promise;
        competingCompleted.resolve();
      }
      return reads > 2 ? fresh : eligible;
    });
    const post = vi.spyOn(repairEmail, 'retryRepairEmail').mockImplementation(async () => {
      postStarted.resolve();
      await heldPost.promise;
      return status;
    });
    const { client, wrapper } = createHarness();
    const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    let pending!: Promise<void>;
    let competingRead!: Promise<void>;
    act(() => { pending = result.current.retry(); });
    try {
      await postStarted.promise;
      act(() => { competingRead = client.invalidateQueries({ queryKey: key, exact: true }); });
      await competingStarted.promise;
      await act(async () => { heldPost.resolve(); await pending; });
      await act(async () => {
        heldCompeting.resolve();
        await competingCompleted.promise;
        await competingRead;
      });
      expect(client.getQueryData(key)).toEqual(status);
      await waitFor(() => expect(result.current.status).toEqual(status));
      expect(competingSignal?.aborted).toBe(true);
      expect(result.current.canRetry).toBe(false);
      expect(result.current.retryFailed).toBe(false);
      await act(async () => { await result.current.retry(); });
      expect(post).toHaveBeenCalledTimes(1);
      expect(reads).toBe(2);

      act(() => result.current.refresh());
      await waitFor(() => expect(result.current.canRetry).toBe(true));
      expect(client.getQueryData(key)).toEqual(fresh);
      expect(result.current.status).toEqual(fresh);
      expect(reads).toBe(3);
      expect(post).toHaveBeenCalledTimes(1);
    } finally { heldPost.resolve(); heldCompeting.resolve(); }
  },
);

it.each(['SIN_EMAIL', 'FALLO_PREVIO'] as const)(
  'preserves an authoritative eligible %s DTO from a successful POST',
  async (estado) => {
    const session = captureRepairEmailSession()!;
    const status: RepairEmailStatus = { estado, reintentable: true };
    let reads = 0;
    let posts = 0;
    server.use(
      http.get(statusUrl, () => { reads++; return HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true }); }),
      http.post(retryUrl, () => { posts++; return HttpResponse.json(status); }),
    );
    const { client, wrapper } = createHarness();
    const { result } = renderHook(() => useRepairEmailNotification(9), { wrapper });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    await act(async () => { await result.current.retry(); });
    await waitFor(() => expect(result.current.status).toEqual(status));
    expect(client.getQueryData(queryKeys.repairEmail.detail(9, session.generation))).toEqual(status);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.retryFailed).toBe(false);
    expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
  },
);

it.each(['repair', 'workshop', 'unmount'])(
  'rechecks %s scope after successful-response cancellation before publishing',
  async (change) => {
    const session = captureRepairEmailSession()!;
    const cancellationStarted = deferred();
    const heldCancellation = deferred();
    server.use(
      http.get(statusUrl, () => HttpResponse.json({ estado: 'SIN_EMAIL', reintentable: true })),
      http.post(retryUrl, () => HttpResponse.json({ estado: 'PENDIENTE', reintentable: false })),
    );
    const { client, wrapper } = createHarness();
    const cancelQueries = client.cancelQueries.bind(client);
    let cancellations = 0;
    const cancel = vi.spyOn(client, 'cancelQueries').mockImplementation(async (...args) => {
      await cancelQueries(...args);
      if (++cancellations === 2) {
        cancellationStarted.resolve();
        await heldCancellation.promise;
      }
    });
    const { result, rerender, unmount } = renderHook(({ id }) => useRepairEmailNotification(id), {
      wrapper, initialProps: { id: 9 },
    });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.retry(); });
    try {
      await waitFor(() => expect(cancel).toHaveBeenCalledTimes(2));
      await cancellationStarted.promise;
      expect(cancel.mock.calls[1]).toEqual([{ queryKey: queryKeys.repairEmail.detail(9, session.generation), exact: true }]);
      if (change === 'repair') rerender({ id: 10 });
      else if (change === 'workshop') act(() => { login(4); });
      else unmount();
      if (change !== 'unmount') await waitFor(() => expect(result.current.canRetry).toBe(true));
      await act(async () => { heldCancellation.resolve(); await pending; });
      expect(client.getQueryData<RepairEmailStatus>(queryKeys.repairEmail.detail(9, session.generation))?.estado).not.toBe('PENDIENTE');
      if (change !== 'unmount') {
        expect(result.current.status?.estado).toBe('SIN_EMAIL');
        expect(result.current.retryFailed).toBe(false);
      }
      expect(showSuccess).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally { heldCancellation.resolve(); }
  },
);
