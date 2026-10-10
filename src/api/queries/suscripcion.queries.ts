import { useEffect } from 'react';
import { authStore } from '../../store/auth.store';
import { chargeGeneration } from '../../utils/pendingCharge';
import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { CanceledError } from 'axios';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import { captureSubscriptionSession, isSubscriptionSessionCurrent } from '../subscriptionSession';
import { purgeRestrictedSubscriptionData } from '../cacheConsistency';
import { observeSubscriptionExpiry } from './subscriptionExpiry';
import type { Suscripcion } from '../../types';

export const SUSCRIPCION_KEY = queryKeys.suscripcion.all;

export const fetchSuscripcion = async (signal?: AbortSignal): Promise<Suscripcion> => {
  const session = captureSubscriptionSession();
  if (!session.authenticated || !session.token) throw new CanceledError('Subscription requires a current session');
  const { data } = await apiClient.get<Suscripcion>('/suscripcion', { signal, subscriptionSession: session });
  if (!isSubscriptionSessionCurrent(session)) throw new CanceledError('Subscription session changed');
  return data;
};

/** Shared read transaction; cleanup does not publish or cancel its own read. */
export const suscripcionQueryOptions = (client: QueryClient) => queryOptions({
  queryKey: SUSCRIPCION_KEY,
  queryFn: async ({ signal }) => {
    const session = captureSubscriptionSession();
    const current = () => !signal.aborted && isSubscriptionSessionCurrent(session);
    const data = await fetchSuscripcion(signal);
    if (!current()) throw new CanceledError('Subscription read replaced');
    await purgeRestrictedSubscriptionData(client, data, current);
    if (!current()) throw new CanceledError('Subscription read replaced');
    return data;
  },
});

export const useSubscriptionExpiry = (enabled = true) => {
  const client = useQueryClient();
  const token = authStore(state => state.token);
  const authenticated = authStore(state => state.isAuthenticated);
  const generation = authStore(() => chargeGeneration());
  useEffect(() => enabled && authenticated && token ? observeSubscriptionExpiry(client) : undefined, [client, enabled, token, authenticated, generation]);
};
export const useSuscripcionQuery = (enabled = true) => {
  const client = useQueryClient();
  const authenticated = authStore(state => state.isAuthenticated);
  const token = authStore(state => state.token);
  const active = enabled && authenticated && !!token;
  const query = useQuery({ ...suscripcionQueryOptions(client), enabled: active });
  useSubscriptionExpiry(active);
  return query;
};

/** Server functions remain authoritative; errors and missing maps fail closed. */
export const useFunciones = (enabled = true) => {
  const query = useSuscripcionQuery(enabled);
  const funciones = query.data?.funciones;
  const contratoValido = query.isSuccess && funciones != null;
  return {
    inventario: contratoValido && funciones.inventario === true,
    cobros: contratoValido && funciones.cobros === true,
    empleadosMultiples: contratoValido && funciones.empleadosMultiples === true,
    isLoading: query.isPending,
    isError: query.isError || (query.isSuccess && funciones == null),
    refetch: query.refetch,
  };
};
