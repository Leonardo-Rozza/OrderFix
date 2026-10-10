import { authStore } from '../store/auth.store';
import { chargeGeneration } from '../utils/pendingCharge';

/** Scope fence only; server authorization and entitlement remain authoritative. */
export interface SubscriptionSession {
  token: string | null;
  authenticated: boolean;
  generation: number;
}
export const captureSubscriptionSession = (): SubscriptionSession => {
  const auth = authStore.getState();
  return { token: auth.token, authenticated: auth.isAuthenticated, generation: chargeGeneration() };
};
export const isSubscriptionSessionCurrent = (session: SubscriptionSession) => {
  const auth = authStore.getState();
  return auth.token === session.token && auth.isAuthenticated === session.authenticated
    && chargeGeneration() === session.generation;
};
