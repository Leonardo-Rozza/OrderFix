import type { QueryClient } from '@tanstack/react-query';
import type { Suscripcion } from '../../types';
import { paidAccessDeadline } from '../../utils/subscriptionPresentation';
import { queryKeys } from '../queryKeys';
import { captureSubscriptionSession, isSubscriptionSessionCurrent } from '../subscriptionSession';

interface Coordinator { subscribers: number; release: () => void }
const coordinators = new WeakMap<QueryClient, Coordinator>();
const MAX_DELAY = 2_147_483_647;

/** One timer per client, shared by enabled observers; dates only trigger server reads. */
export const observeSubscriptionExpiry = (client: QueryClient): (() => void) => {
  const existing = coordinators.get(client);
  if (existing) {
    existing.subscribers++;
    return () => { if (--existing.subscribers === 0) existing.release(); };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let scheduled: number | null = null;
  let attempted: number | null = null;
  const session = captureSubscriptionSession();
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; scheduled = null; };
  const update = () => {
    if (!isSubscriptionSessionCurrent(session)) { clear(); return; }
    const query = client.getQueryCache().find({ queryKey: queryKeys.suscripcion.all, exact: true });
    const data = query?.state.data as Suscripcion | undefined;
    const deadline = data?.plan === 'PRO' && data.estado === 'ACTIVA' ? paidAccessDeadline(data) : null;
    if (!query?.isActive() || deadline === null || deadline === attempted) { clear(); return; }
    if (timer !== undefined && scheduled === deadline) return;
    clear(); scheduled = deadline;
    const remaining = deadline - Date.now();
    timer = setTimeout(() => {
      timer = undefined; scheduled = null;
      if (!isSubscriptionSessionCurrent(session)) return;
      if (deadline > Date.now()) { update(); return; }
      attempted = deadline;
      void client.invalidateQueries({ queryKey: queryKeys.suscripcion.all, exact: true }, { cancelRefetch: false });
    }, Math.min(MAX_DELAY, Math.max(0, remaining)));
  };
  const unsubscribe = client.getQueryCache().subscribe(event => {
    if (event.query.queryKey[0] === queryKeys.suscripcion.all[0]) update();
  });
  const coordinator: Coordinator = { subscribers: 1, release: () => { clear(); unsubscribe(); coordinators.delete(client); } };
  coordinators.set(client, coordinator);
  update();
  return () => { if (--coordinator.subscribers === 0) coordinator.release(); };
};
